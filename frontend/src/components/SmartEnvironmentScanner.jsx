import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import {
  MapPin, Crosshair, Loader2, Thermometer, Droplets, CloudRain, Wind,
  CheckCircle, XCircle, AlertTriangle, Target, Sprout, Dna, TestTube,
  Globe, Search, ChevronRight, Gauge, ShieldAlert, Route
} from 'lucide-react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';

const STATUS = {
  idle: { icon: null, color: 'text-stone-600' },
  loading: { icon: Loader2, color: 'text-yellow-400' },
  success: { icon: CheckCircle, color: 'text-green-400' },
  error: { icon: XCircle, color: 'text-red-400' },
};

const GradBg = () => <div className="fixed inset-0 pointer-events-none bg-gradient-to-b from-[#84cc16]/5 via-transparent to-[#0c0a09]" />;

const SmartEnvironmentScanner = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  // ── Mode ──
  const [mode, setMode] = useState('auto'); // auto | manual

  // ── Manual inputs ──
  const [manualCity, setManualCity] = useState('');
  const [manualLat, setManualLat] = useState('');
  const [manualLon, setManualLon] = useState('');
  const [citySuggestions, setCitySuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const cityRef = React.useRef(null);

  React.useEffect(() => {
    if (manualCity.length < 2) { setCitySuggestions([]); return; }
    const t = setTimeout(async () => {
      try {
        const r = await axios.get(`/api/cities?q=${encodeURIComponent(manualCity)}`);
        setCitySuggestions(r.data.cities || []);
        setShowDropdown(r.data.cities?.length > 0);
      } catch { }
    }, 300);
    return () => clearTimeout(t);
  }, [manualCity]);

  React.useEffect(() => {
    const h = (e) => { if (cityRef.current && !cityRef.current.contains(e.target)) setShowDropdown(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // ── Detection state ──
  const [coords, setCoords] = useState(null);
  const [locationName, setLocationName] = useState('');
  const [phase, setPhase] = useState('idle');
  const [statuses, setStatuses] = useState({ location: 'idle', weather: 'idle', soil: 'idle' });
  const [statusMsgs, setStatusMsgs] = useState({});

  // ── Data ──
  const [weatherData, setWeatherData] = useState(null);
  const [soilData, setSoilData] = useState(null);
  const [waterScore, setWaterScore] = useState(null);

  // ── Error ──
  const [error, setError] = useState(null);

  const setSt = (key, state, msg) => {
    setStatuses(p => ({ ...p, [key]: state }));
    if (msg) setStatusMsgs(p => ({ ...p, [key]: msg }));
  };

  // ── Core scan function ──
  const runScan = async (lat, lon) => {
    setCoords({ lat, lon });
    setPhase('scanning');
    setError(null);
    setWeatherData(null);
    setSoilData(null);
    setWaterScore(null);
    setStatuses({ location: 'loading', weather: 'loading', soil: 'loading' });

    try {
      // Reverse geocode
      const geo = await axios.get(`/api/env/geocode?lat=${lat}&lon=${lon}`);
      const city = geo.data.city;
      const display = geo.data.display;
      setLocationName(display);
      setSt('location', 'success', display);

      // Weather
      try {
        const w = await axios.get(`/api/env/weather?lat=${lat}&lon=${lon}`);
        setWeatherData(w.data);
        setSt('weather', 'success', `${w.data.temperature}°C, ${w.data.humidity}%`);
      } catch {
        setSt('weather', 'error', t('scanner.unavailable'));
      }

      // Soil
      try {
        const s = await axios.get(`/api/env/soilgrids?lat=${lat}&lon=${lon}`, { timeout: 20000 });
        setSoilData(s.data);
        setSt('soil', 'success', `pH ${s.data.ph}, N ${s.data.nitrogen ?? '?'}`);
      } catch {
        setSt('soil', 'error', t('scanner.unavailable'));
      }

      setPhase('done');
    } catch (e) {
      setError(t('scanner.scanFailed'));
      setPhase('error');
    }
  };

  // ── Auto detect ──
  const autoDetect = () => {
    if (!navigator.geolocation) {
      setError(t('scanner.gpsNotSupported'));
      return;
    }
    setPhase('detecting');
    setError(null);
    navigator.geolocation.getCurrentPosition(
      pos => runScan(pos.coords.latitude, pos.coords.longitude),
      () => { setPhase('error'); setError(t('scanner.gpsDenied')); },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // ── Manual detect ──
  const manualDetect = async (e) => {
    e.preventDefault();
    setPhase('detecting');
    setError(null);

    let lat, lon;
    if (manualLat && manualLon) {
      lat = parseFloat(manualLat);
      lon = parseFloat(manualLon);
      if (isNaN(lat) || isNaN(lon)) { setError(t('scanner.invalidCoords')); setPhase('idle'); return; }
      await runScan(lat, lon);
    } else if (manualCity.trim()) {
      try {
        const ow = await axios.get(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(manualCity.trim())},IN&limit=1`, { timeout: 8, headers: { 'User-Agent': 'VaniAI/1.0' } });
        if (ow.data?.length > 0) {
          lat = parseFloat(ow.data[0].lat);
          lon = parseFloat(ow.data[0].lon);
          await runScan(lat, lon);
        } else {
          setError(t('scanner.cityNotFound'));
          setPhase('error');
        }
      } catch {
        setError(t('scanner.geocodeFailed'));
        setPhase('error');
      }
    } else {
      setError(t('scanner.enterCityOrCoords'));
      setPhase('idle');
    }
  };

  // ── Water score ──
  const calcWaterScore = () => {
    if (!weatherData) return null;
    const rain = weatherData.rainfall || 0;
    const hum = weatherData.humidity || 0;
    const score = Math.min(100, (rain * 3 + hum * 0.5));
    const label = score >= 60 ? t('scanner.waterHigh') : score >= 30 ? t('scanner.waterMedium') : t('scanner.waterLow');
    const color = score >= 60 ? 'text-green-400' : score >= 30 ? 'text-yellow-400' : 'text-red-400';
    const bar = score >= 60 ? 'bg-green-500' : score >= 30 ? 'bg-yellow-500' : 'bg-red-500';
    return { score: Math.round(score), label, color, bar };
  };

  // ── Generate AI explanation ──
  const generateExplanations = () => {
    const items = [];
    if (soilData?.ph) {
      const ph = soilData.ph;
      if (ph >= 5.5 && ph <= 7.0) items.push({ icon: '🧪', text: `Soil pH ${ph} is ideal for most crops (5.5-7.0)`, type: 'positive' });
      else items.push({ icon: '⚠️', text: `Soil pH ${ph} may need amendment — target 5.5-7.0`, type: 'warning' });
    }
    if (weatherData?.temperature) {
      const t = weatherData.temperature;
      if (t >= 20 && t <= 35) items.push({ icon: '🌡️', text: `Temperature ${t}°C supports active crop growth`, type: 'positive' });
      else items.push({ icon: '🌡️', text: `Temperature ${t}°C is suboptimal — choose hardy crops`, type: 'warning' });
    }
    if (soilData?.nitrogen) {
      const n = soilData.nitrogen;
      if (n >= 40) items.push({ icon: '🌿', text: `Nitrogen ${n} mg/kg is adequate for leafy growth`, type: 'positive' });
      else items.push({ icon: '🌿', text: `Nitrogen ${n} mg/kg is low — consider compost or urea`, type: 'warning' });
    }
    if (weatherData?.humidity) {
      const h = weatherData.humidity;
      if (h >= 60) items.push({ icon: '💧', text: `Humidity ${h}% favours most crops — watch for fungal risks`, type: 'positive' });
      else items.push({ icon: '💧', text: `Humidity ${h}% is low — some crops may need extra moisture`, type: 'warning' });
    }
    if (weatherData?.rainfall !== undefined) {
      const r = weatherData.rainfall;
      if (r >= 5) items.push({ icon: '☔', text: `Rainfall ${r}mm provides natural irrigation`, type: 'positive' });
      else items.push({ icon: '☔', text: `Minimal rainfall (${r}mm) — irrigation recommended`, type: 'warning' });
    }
    if (soilData?.sand !== undefined && soilData?.clay !== undefined) {
      const s = soilData.sand;
      if (s >= 60) items.push({ icon: '🏖️', text: `Sandy soil (${s}%) — good drainage, low water retention`, type: 'warning' });
      else if (s <= 30) items.push({ icon: '🏖️', text: `Clayey soil (${soilData.clay}%) — high water retention`, type: 'positive' });
    }
    return items;
  };

  // ── Push to prediction ──
  const goToPrediction = () => {
    navigate('/predict', {
      state: {
        envData: {
          coords,
          location: locationName,
          city: locationName.split(',')[0],
          ph: soilData?.ph,
          N: soilData?.nitrogen,
          P: soilData?.phosphorus,
          K: soilData?.potassium,
          weather: weatherData,
          soil: soilData,
          waterScore: calcWaterScore(),
        }
      }
    });
  };

  const water = calcWaterScore();
  const explanations = generateExplanations();
  const allDone = phase === 'done' && weatherData && soilData;

  return (
    <div className="pt-20 min-h-screen bg-[#0c0a09] px-4 pb-20 text-white relative">
      <GradBg />

      <header className="text-center pt-6 pb-6 max-w-2xl mx-auto relative z-10">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Globe size={16} className="text-[#84cc16]" />
          <span className="text-[9px] font-black uppercase tracking-[0.4em] text-[#84cc16]">{t('scanner.step1')}</span>
        </div>
        <h1 className="font-serif text-4xl md:text-5xl font-black text-white mb-2">
          {t('scanner.title')}
        </h1>
        <p className="text-stone-400 text-sm">Detect your farm's weather, soil, and water profile — then use it for intelligent crop prediction.</p>
      </header>

      <div className="max-w-5xl mx-auto relative z-10">
        {/* ── Mode Selector ── */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <button onClick={() => { setMode('auto'); setPhase('idle'); setError(null); }}
            className={`px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${mode === 'auto' ? 'bg-[#84cc16]/20 text-[#84cc16] border border-[#84cc16]/40' : 'bg-white/5 text-stone-400 border border-white/10'}`}>
            <Crosshair size={16} /> {t('scanner.autoDetect')}
          </button>
          <button onClick={() => { setMode('manual'); setPhase('idle'); setError(null); }}
            className={`px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${mode === 'manual' ? 'bg-[#84cc16]/20 text-[#84cc16] border border-[#84cc16]/40' : 'bg-white/5 text-stone-400 border border-white/10'}`}>
            <Search size={16} /> {t('scanner.manualEntry')}
          </button>
        </div>

        {/* ── Auto Mode ── */}
        {mode === 'auto' && (
          <div className="text-center mb-8">
            {phase === 'idle' && (
              <motion.button onClick={autoDetect} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                className="px-10 py-5 bg-[#84cc16] text-[#0c0a09] font-black text-base uppercase tracking-widest rounded-2xl shadow-lg hover:bg-[#facc15] transition-all flex items-center gap-3 mx-auto">
                <Crosshair size={22} /> {t('scanner.detectEnvironment')}
              </motion.button>
            )}
            {phase === 'detecting' && (
              <div className="flex items-center justify-center gap-3 text-yellow-400"><Loader2 size={22} className="animate-spin" /> {t('scanner.detecting')}</div>
            )}
          </div>
        )}

        {/* ── Manual Mode ── */}
        {mode === 'manual' && (
          <motion.form initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            onSubmit={manualDetect} className="max-w-lg mx-auto bg-white/5 border border-white/10 rounded-2xl p-6 mb-8">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><MapPin size={16} className="text-[#84cc16]" /> Enter Location</h3>
            <div className="space-y-3">
              <div ref={cityRef} className="relative">
                <label className="text-[9px] font-bold text-stone-500 uppercase tracking-wider mb-1.5 block">{t('scanner.cityLabel')}</label>
                <input type="text" placeholder={t('scanner.cityPlaceholder')} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#84cc16]"
                  value={manualCity} onChange={e => { setManualCity(e.target.value); setShowDropdown(true); }}
                  onFocus={() => citySuggestions.length > 0 && setShowDropdown(true)} />
                {showDropdown && citySuggestions.length > 0 && (
                  <div className="absolute z-50 mt-1 bg-[#1c1917] border border-white/10 rounded-xl shadow-xl max-h-44 overflow-y-auto w-full">
                    {citySuggestions.map((c, i) => (
                      <button key={i} type="button" onMouseDown={() => { setManualCity(c.city); setShowDropdown(false); }}
                        className="w-full text-left px-4 py-2.5 text-sm font-bold text-white hover:bg-[#84cc16]/20 border-b border-white/5 last:border-0">
                        {c.city} <span className="text-stone-400 text-xs">{c.district}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3"><div className="flex-1 h-px bg-white/10" /><span className="text-[10px] text-stone-600 uppercase">{t('scanner.or')}</span><div className="flex-1 h-px bg-white/10" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-[9px] font-bold text-stone-500 uppercase mb-1.5 block">{t('scanner.latLabel')}</label>
                  <input type="text" placeholder={t('scanner.latPlaceholder')} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#84cc16]"
                    value={manualLat} onChange={e => setManualLat(e.target.value)} /></div>
                <div><label className="text-[9px] font-bold text-stone-500 uppercase mb-1.5 block">{t('scanner.lonLabel')}</label>
                  <input type="text" placeholder={t('scanner.lonPlaceholder')} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#84cc16]"
                    value={manualLon} onChange={e => setManualLon(e.target.value)} /></div>
              </div>
              <button type="submit" disabled={phase === 'detecting'}
                className="w-full mt-2 py-4 bg-[#84cc16] text-[#0c0a09] font-black text-sm uppercase tracking-widest rounded-xl hover:bg-[#facc15] transition-all disabled:opacity-30 flex items-center justify-center gap-2">
                {phase === 'detecting' ? <><Loader2 size={16} className="animate-spin" /> {t('scanner.scanning')}</> : <><Search size={16} /> {t('scanner.scanEnvironment')}</>}
              </button>
            </div>
          </motion.form>
        )}

        {/* ── Error ── */}
        <AnimatePresence>{error && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="max-w-lg mx-auto mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm flex items-center gap-3">
            <AlertTriangle size={16} /> {error}
          </motion.div>
        )}</AnimatePresence>

        {/* ── Status Indicators ── */}
        {phase !== 'idle' && (
          <div className="flex flex-wrap gap-2 justify-center mb-8">
            {[
              { key: 'location', label: `📍 ${t('scanner.location')}` },
              { key: 'weather', label: `🌤 ${t('scanner.weatherLabel')}` },
              { key: 'soil', label: `🌱 ${t('scanner.soilLabel')}` },
            ].map(({ key, label }) => {
              const st = statuses[key];
              const cfg = STATUS[st] || STATUS.idle;
              const Icon = cfg.icon;
              return (
                <div key={key} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider ${st === 'success' ? 'bg-green-500/10 text-green-400' : st === 'loading' ? 'bg-yellow-500/10 text-yellow-400' : st === 'error' ? 'bg-red-500/10 text-red-400' : 'bg-stone-800 text-stone-600'}`}>
                  {Icon ? <Icon size={12} className={st === 'loading' ? 'animate-spin' : ''} /> : <div className="w-3 h-3 rounded-full bg-stone-700" />}
                  <span>{label}</span>
                  {statusMsgs[key] && <span className="opacity-60 normal-case font-normal">— {statusMsgs[key]}</span>}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Scanning animation ── */}
        {phase === 'scanning' && (
          <div className="text-center py-12">
            <Loader2 size={36} className="animate-spin text-[#84cc16] mx-auto mb-4" />
            <p className="text-stone-400 text-sm">{t('scanner.fetchingData')}</p>
          </div>
        )}

        {/* ── RESULTS ── */}
        <AnimatePresence>{phase === 'done' && weatherData && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">

            {/* Location */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center gap-4">
              <MapPin size={20} className="text-[#84cc16]" />
              <div>
                <div className="text-xs text-stone-500 uppercase tracking-wider">{t('scanner.detectedLocation')}</div>
                <div className="text-lg font-bold">{locationName}</div>
                {coords && <div className="text-[10px] text-stone-600">Lat {coords.lat.toFixed(4)}, Lon {coords.lon.toFixed(4)}</div>}
              </div>
            </div>

            {/* Weather Cards */}
            <div>
              <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3 flex items-center gap-2"><Thermometer size={14} /> {t('scanner.weather')}</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                  { icon: Thermometer, label: t('scanner.temperature'), value: `${weatherData.temperature}°C`, color: 'text-orange-400' },
                  { icon: Droplets, label: t('scanner.humidity'), value: `${weatherData.humidity}%`, color: 'text-blue-400' },
                  { icon: CloudRain, label: t('scanner.rainfall'), value: `${weatherData.rainfall}mm`, color: 'text-cyan-400' },
                  { icon: Wind, label: t('scanner.windSpeed'), value: `${weatherData.wind_speed} km/h`, color: 'text-stone-400' },
                  { icon: ShieldAlert, label: t('scanner.condition'), value: weatherData.condition || 'Clear', color: 'text-[#84cc16]' },
                ].map(({ icon: Icon, label, value, color }) => (
                  <div key={label} className="bg-white/5 border border-white/10 rounded-xl p-4 text-center hover:border-[#84cc16]/30 transition-all">
                    <Icon size={18} className={`mx-auto mb-2 ${color}`} />
                    <div className="text-[8px] text-stone-500 uppercase tracking-wider">{label}</div>
                    <div className="text-base font-black mt-0.5">{value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Soil Intelligence */}
            {soilData && (
              <div>
                <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3 flex items-center gap-2"><Dna size={14} /> {t('scanner.soil')}</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: t('scanner.phLevel'), value: soilData.ph ?? 'N/A', unit: '', color: soilData.ph >= 5.5 && soilData.ph <= 7 ? 'text-green-400' : 'text-yellow-400' },
                    { label: t('scanner.nitrogen'), value: soilData.nitrogen != null ? Math.round(soilData.nitrogen) : 'N/A', unit: 'mg/kg', color: 'text-[#84cc16]' },
                    { label: t('scanner.phosphorus'), value: soilData.phosphorus != null ? Math.round(soilData.phosphorus) : 'N/A', unit: 'mg/kg', color: 'text-blue-400' },
                    { label: t('scanner.potassium'), value: soilData.potassium != null ? Math.round(soilData.potassium) : 'N/A', unit: 'mg/kg', color: 'text-orange-400' },
                    ...(soilData.sand != null ? [{ label: t('scanner.sand'), value: Math.round(soilData.sand), unit: '%', color: 'text-yellow-400' }] : []),
                    ...(soilData.clay != null ? [{ label: t('scanner.clay'), value: Math.round(soilData.clay), unit: '%', color: 'text-red-400' }] : []),
                    ...(soilData.soc != null ? [{ label: t('scanner.orgCarbon'), value: soilData.soc, unit: 'g/kg', color: 'text-stone-300' }] : []),
                  ].map(({ label, value, unit, color }) => (
                    <div key={label} className="bg-white/5 border border-white/10 rounded-xl p-4 text-center hover:border-[#84cc16]/30 transition-all">
                      <div className="text-[8px] text-stone-500 uppercase tracking-wider">{label}</div>
                      <div className={`text-lg font-black mt-0.5 ${color}`}>{value}<span className="text-[10px] text-stone-600 font-normal ml-0.5">{unit}</span></div>
                    </div>
                  ))}
                </div>
                <p className="text-[9px] text-stone-600 mt-2 italic">{soilData.source} — {soilData.note}</p>
              </div>
            )}

            {/* Water Availability */}
            {water && (
              <div>
                <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3 flex items-center gap-2"><Droplets size={14} /> {t('scanner.water')}</h3>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-2xl font-black ${water.color}`}>{water.label}</span>
                    <span className="text-3xl font-black text-white">{water.score}<span className="text-base text-stone-500">/100</span></span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${water.score}%` }}
                      className={`h-full rounded-full ${water.bar}`} transition={{ duration: 1 }} />
                  </div>
                  <p className="text-[10px] text-stone-500 mt-2">
                    Based on rainfall ({weatherData.rainfall}mm), humidity ({weatherData.humidity}%), and soil moisture potential.
                  </p>
                </div>
              </div>
            )}

            {/* AI Explanation */}
            {explanations.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3 flex items-center gap-2"><Target size={14} /> {t('scanner.environment')}</h3>
                <div className="grid md:grid-cols-2 gap-3">
                  {explanations.map((item, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }}
                      className={`p-3 rounded-xl text-sm flex items-start gap-2.5 ${item.type === 'positive' ? 'bg-green-500/10 border border-green-500/20' : 'bg-yellow-500/10 border border-yellow-500/20'}`}>
                      <span className="text-base flex-shrink-0">{item.icon}</span>
                      <span className={item.type === 'positive' ? 'text-green-300' : 'text-yellow-300'}>{item.text}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Environment Score */}
            <div className="bg-gradient-to-r from-[#84cc16]/10 to-transparent border border-[#84cc16]/20 rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[9px] text-stone-500 uppercase tracking-wider mb-1">{t('scanner.suitability')}</div>
                  <div className="text-lg font-bold text-white">
                    {(() => {
                      const score = (water?.score || 0) * 0.4 + (soilData?.ph >= 5.5 && soilData?.ph <= 7 ? 30 : 10) + (weatherData?.temperature >= 20 && weatherData?.temperature <= 35 ? 30 : 10);
                      const avg = Math.min(100, Math.round(score));
                      return <>{avg}/100 — {avg >= 70 ? 'Favourable conditions' : avg >= 50 ? 'Moderate conditions' : 'Challenging conditions'}</>;
                    })()}
                  </div>
                </div>
                <Sprout size={32} className="text-[#84cc16] opacity-50" />
              </div>
            </div>

            {/* Use This Data for Prediction */}
            {allDone && (
              <motion.button onClick={goToPrediction} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className="w-full py-5 bg-[#84cc16] text-[#0c0a09] font-black text-base uppercase tracking-widest rounded-2xl hover:bg-[#facc15] transition-all shadow-lg flex items-center justify-center gap-3">
                <Route size={20} /> {t('scanner.useForPrediction')} <ChevronRight size={18} />
              </motion.button>
            )}
          </motion.div>
        )}</AnimatePresence>
      </div>
    </div>
  );
};

export default SmartEnvironmentScanner;
