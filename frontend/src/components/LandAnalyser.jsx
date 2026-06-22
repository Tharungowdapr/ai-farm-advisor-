import { useState, useEffect, useCallback } from 'react';
import { MapPin, Navigation, Search, Loader2, Thermometer, Droplets, CloudRain, Wind, AlertTriangle, Sun, ChevronDown, ChevronUp, Sprout, Gauge, Cloud, Waves, Layers, Target, Compass, Eye, FlaskConical, Zap } from 'lucide-react';
import axios from 'axios';
import { GrainOverlay } from './GrainOverlay';
import { useLanguage } from '../i18n/LanguageContext';

const wdg = (val, label, icon, color) => (
  <div className="bg-white rounded-xl p-3 border border-stone-200 shadow-sm">
    <div className="flex items-center gap-1.5 mb-1"><span style={{color}}>{icon}</span><span className="text-[8px] font-black uppercase text-stone-400">{label}</span></div>
    <p className="font-black text-lg text-[#0c0a09]">{val ?? '—'}</p>
  </div>
);

const LocationStep = ({ onGpsDetect, onCitySearch, detecting, error }) => {
  const { t } = useLanguage();
  return (
  <div className="min-h-screen pt-24 flex items-center justify-center bg-[#fafaf9] px-6">
    <GrainOverlay />
    <div className="max-w-lg w-full">
      {error && <div className="mb-4 bg-red-50 border-2 border-red-200 rounded-2xl p-4 flex gap-3 items-start"><AlertTriangle size={20} className="text-red-600 flex-shrink-0 mt-0.5" /><p className="text-red-700 font-bold text-sm">{error}</p></div>}
      <div className="text-center mb-10">
        <div className="w-16 h-16 bg-[#84cc16]/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
          <MapPin className="w-8 h-8 text-[#84cc16]" />
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#84cc16] mb-2">VaniAI Geospatial Intelligence</p>
        <h1 className="font-serif text-5xl font-black text-[#0c0a09]">Land <span className="italic text-[#84cc16]">Analyser</span></h1>
        <p className="text-stone-500 mt-2 font-medium max-w-md mx-auto">GPS-powered land analysis with real-time weather, soil intelligence & crop suitability</p>
      </div>
      <div className="space-y-4">
        <button onClick={onGpsDetect} disabled={detecting}
          className="w-full bg-white border-2 border-stone-200 rounded-[2rem] p-8 text-left hover:border-[#84cc16]/30 hover:shadow-lg transition-all group disabled:opacity-50">
          <div className="flex items-start gap-5">
            <div className="w-14 h-14 bg-[#84cc16]/10 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:bg-[#84cc16]/20 transition-colors">
              <Navigation className="w-7 h-7 text-[#84cc16]" />
            </div>
            <div className="flex-1">
              <h3 className="font-black text-lg text-[#0c0a09] mb-1">{t('landAnalyser.useMyLocation')}</h3>
              <p className="text-stone-500 text-sm font-medium">{t('landAnalyser.useMyLocationDesc')}</p>
              {detecting && <div className="flex items-center gap-2 mt-3 text-[#84cc16] font-bold text-sm"><Loader2 className="w-4 h-4 animate-spin" />{t('landAnalyser.detecting')}</div>}
            </div>
            <div className="w-6 h-6 rounded-full border-2 border-stone-300 flex items-center justify-center flex-shrink-0 mt-1 group-hover:border-[#84cc16] transition-colors">
              <div className="w-3 h-3 rounded-full group-hover:bg-[#84cc16] transition-colors"></div>
            </div>
          </div>
        </button>
        <div className="relative"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-stone-200"></div></div><div className="relative flex justify-center"><span className="bg-[#fafaf9] px-4 text-xs font-bold text-stone-400 uppercase">{t('landAnalyser.or')}</span></div></div>
        <button onClick={onCitySearch}
          className="w-full bg-white border-2 border-stone-200 rounded-[2rem] p-8 text-left hover:border-[#84cc16]/30 hover:shadow-lg transition-all group">
          <div className="flex items-start gap-5">
            <div className="w-14 h-14 bg-stone-100 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:bg-[#84cc16]/10 transition-colors">
              <Search className="w-7 h-7 text-stone-500 group-hover:text-[#84cc16] transition-colors" />
            </div>
            <div className="flex-1">
              <h3 className="font-black text-lg text-[#0c0a09] mb-1">{t('landAnalyser.searchCity')}</h3>
              <p className="text-stone-500 text-sm font-medium">{t('landAnalyser.searchCityDesc')}</p>
            </div>
            <div className="w-6 h-6 rounded-full border-2 border-stone-300 flex items-center justify-center flex-shrink-0 mt-1 group-hover:border-[#84cc16] transition-colors">
              <div className="w-3 h-3 rounded-full group-hover:bg-[#84cc16] transition-colors"></div>
            </div>
          </div>
        </button>
      </div>
    </div>
  </div>
  );
};

const CitySearchStep = ({ onBack, onSelect, loading }) => {
  const { t } = useLanguage();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (query.length < 2) { setSuggestions([]); return; }
    const timer = setTimeout(async () => {
      try {
        const res = await axios.get(`/api/cities?q=${encodeURIComponent(query)}`);
        if (res.data?.cities) setSuggestions(res.data.cities.slice(0, 8));
      } catch {}
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="min-h-screen pt-24 bg-[#fafaf9] px-6 flex items-start justify-center">
      <GrainOverlay />
      <div className="max-w-lg w-full mt-12">
        <button onClick={onBack} className="text-stone-400 hover:text-stone-600 font-bold text-sm mb-6 flex items-center gap-1 transition-colors">← {t('landAnalyser.back')}</button>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#84cc16] mb-2">{t('landAnalyser.step2of2')}</p>
        <h2 className="font-serif text-4xl font-black text-[#0c0a09] mb-2">{t('landAnalyser.searchCityTitle')} <span className="italic text-[#84cc16]">{t('landAnalyser.searchCityAccent')}</span></h2>
        <p className="text-stone-500 font-medium mb-6">{t('landAnalyser.searchCityDesc')}</p>
        <div className="relative">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-stone-400 w-5 h-5" />
          <input value={query} onChange={e => { setQuery(e.target.value); setSelected(null); }}
            placeholder={t('landAnalyser.searchCityPlaceholder')}
            className="w-full bg-white border-2 border-stone-200 rounded-2xl py-5 pl-14 pr-5 font-bold text-stone-700 outline-none focus:ring-4 focus:ring-[#84cc16]/10 focus:border-[#84cc16] transition-all"
          />
        </div>
        {suggestions.length > 0 && (
          <div className="mt-3 bg-white border-2 border-stone-200 rounded-2xl overflow-hidden shadow-lg">
            {suggestions.map((s, i) => (
              <button key={i} onClick={() => setSelected(s)}
                className={`w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-stone-50 transition-colors border-b border-stone-100 last:border-0 ${selected?.city === s.city ? 'bg-[#84cc16]/5' : ''}`}>
                <MapPin className="w-4 h-4 text-stone-400 flex-shrink-0" />
                <div>
                  <p className="font-bold text-stone-800">{s.city}</p>
                  <p className="text-xs text-stone-400">{s.district} District</p>
                </div>
              </button>
            ))}
          </div>
        )}
        {selected && (
          <button onClick={() => onSelect(selected.city, selected.lat, selected.lon)} disabled={loading}
            className="w-full mt-4 bg-[#84cc16] text-[#0c0a09] py-5 rounded-2xl font-black text-sm uppercase tracking-wider hover:bg-[#facc15] transition-all flex items-center justify-center gap-2 disabled:opacity-50">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Target className="w-4 h-4" />}
            {loading ? t('landAnalyser.analysing') : `${t('landAnalyser.analyse')} ${selected.city}`}
          </button>
        )}
      </div>
    </div>
  );
};

function ProcessingStep({ location }) {
  const { t } = useLanguage();
  const PROGRESS_STEPS = [
    { label: t('landAnalyser.progressWeather'), icon: '🌤' },
    { label: t('landAnalyser.progressSoil'), icon: '🧪' },
    { label: t('landAnalyser.progressWater'), icon: '💧' },
    { label: t('landAnalyser.progressCrops'), icon: '🌾' },
    { label: t('landAnalyser.progressRecommendations'), icon: '📋' },
  ];
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setProgress(p => Math.min(p + 1, PROGRESS_STEPS.length - 1));
    }, 1200);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="min-h-screen pt-24 flex items-center justify-center bg-[#fafaf9] px-6">
      <GrainOverlay />
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 bg-[#84cc16]/10 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
          <Loader2 className="w-10 h-10 animate-spin text-[#84cc16]" />
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#84cc16] mb-2">VaniAI Geospatial Intelligence</p>
        <h2 className="font-serif text-3xl font-black text-[#0c0a09] mb-2">{t('landAnalyser.analysingLand')} <span className="italic text-[#84cc16]">{location}</span></h2>
        <p className="text-stone-500 text-sm font-medium mb-8">{t('landAnalyser.runningDiagnostics')}</p>
        <div className="space-y-3 text-left">
          {PROGRESS_STEPS.map((s, i) => (
            <div key={i} className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-500 ${i <= progress ? 'opacity-100' : 'opacity-30'}`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${i < progress ? 'bg-[#84cc16]' : i === progress ? 'bg-[#84cc16]/20 animate-pulse' : 'bg-stone-100'}`}>
                {i < progress ? '✓' : s.icon}
              </div>
              <span className={`font-bold text-sm ${i <= progress ? 'text-stone-800' : 'text-stone-400'}`}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function LandAnalyser({ user }) {
  const { t } = useLanguage();
  const [step, setStep] = useState('choose');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [error, setError] = useState(null);
  const [expandedCrop, setExpandedCrop] = useState(null);
  const [processLocation, setProcessLocation] = useState('');

  const runAnalysis = useCallback(async (lat, lon, city) => {
    try {
      setLoading(true); setError(null);
      setProcessLocation(city || `${lat?.toFixed(4)}, ${lon?.toFixed(4)}`);
      setStep('processing');
      const payload = city ? { city } : { lat, lon };
      const res = await axios.post('/api/diagnostics/location', payload);
      setResult(res.data);
      setStep('results');
      const token = localStorage.getItem('token');
      if (user && token && res.data) {
        axios.post('/api/land-analyses', {
          city: city || res.data.location?.city || '',
          lat: lat ?? res.data.location?.lat,
          lon: lon ?? res.data.location?.lon,
          result: res.data
        }, { headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
      }
    } catch (err) {
      setError(err.response?.data?.error || t('landAnalyser.analysisFailed'));
      setStep(city ? 'city-search' : 'choose');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const handleGpsDetect = () => {
    if (!navigator.geolocation) { setError(t('landAnalyser.gpsNotAvailable')); return; }
    setDetecting(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setDetecting(false); runAnalysis(pos.coords.latitude, pos.coords.longitude, null); },
      (err) => {
        const msgs = {
          1: t('landAnalyser.gpsDenied'),
          2: t('landAnalyser.gpsUnavailable'),
          3: t('landAnalyser.gpsTimeout'),
        };
        setError(msgs[err.code] || t('landAnalyser.gpsDefault'));
        setDetecting(false);
      },
      { timeout: 15000, enableHighAccuracy: false }
    );
  };

  const handleCitySelect = (city, lat, lon) => runAnalysis(lat, lon, city);

  if (step === 'choose') return <LocationStep onGpsDetect={handleGpsDetect} onCitySearch={() => setStep('city-search')} detecting={detecting} error={error} />;
  if (step === 'city-search') return <CitySearchStep onBack={() => setStep('choose')} onSelect={handleCitySelect} loading={loading} />;
  if (step === 'processing') return <ProcessingStep location={processLocation} />;

  const r = result; const c = r?.climate; const s = r?.soil; const w = r?.water; const cr = r?.crop_suitability; const recs = r?.recommendations; const llmCrops = cr?.llm_suggestions || []; const mostGrown = cr?.most_grown_crops || [];

  return (
    <div className="pt-24 min-h-screen bg-[#fafaf9]">
      <GrainOverlay />
      <div className="max-w-7xl mx-auto px-6 pb-20 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#84cc16] mb-2">VaniAI Geospatial Intelligence</p>
            <h1 className="font-serif text-5xl font-black text-[#0c0a09]">{t('landAnalyser.title')} <span className="italic text-[#84cc16]">{t('landAnalyser.titleAccent')}</span></h1>
          </div>
          <button onClick={() => { setStep('choose'); setResult(null); setError(null); }}
            className="text-sm font-bold text-stone-500 hover:text-[#84cc16] flex items-center gap-1 transition-colors"><MapPin size={14} /> {t('landAnalyser.newAnalysis')}</button>
        </div>

        {error && <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 flex gap-3 items-start"><AlertTriangle size={20} className="text-red-600 flex-shrink-0 mt-0.5" /><p className="text-red-700 font-bold text-sm">{error}</p></div>}

        {/* Location */}
        <div className="bg-gradient-to-r from-[#84cc16]/10 to-transparent rounded-[2rem] p-6 border border-[#84cc16]/20 flex items-center justify-between">
          <div>
            <p className="text-[8px] font-black uppercase text-[#84cc16]">📍 {t('landAnalyser.liveLocation')}</p>
            <p className="font-black text-xl text-[#0c0a09]">{r.location?.city || '—'}</p>
            <p className="text-xs text-stone-500">{r.location?.lat?.toFixed(4)}, {r.location?.lon?.toFixed(4)} · {t('landAnalyser.elevation')}: {r.topography?.elevation_m ?? '—'}m</p>
          </div>
          <div className="text-right text-xs text-stone-400"><Sun size={20} className="ml-auto mb-1 text-yellow-500" />{c?.season?.name}</div>
        </div>

        {/* Weather */}
        {c?.current && (
          <div className="bg-white rounded-[2rem] p-6 border-2 border-stone-200 shadow-lg">
            <h3 className="text-[8px] font-black uppercase tracking-widest text-stone-400 mb-4">🌤 {t('landAnalyser.weather')}</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2 mb-4">
              {wdg(`${c.current.temperature_celsius ?? '—'}°C`, 'Temperature', <Thermometer size={14} />, '#f97316')}
              {wdg(`${c.current.humidity_percent ?? '—'}%`, 'Humidity', <Droplets size={14} />, '#3b82f6')}
              {wdg(`${c.current.rainfall_mm ?? '0'}mm`, 'Rainfall', <CloudRain size={14} />, '#6366f1')}
              {wdg(`${c.current.wind_speed_kmh ?? '—'} km/h`, 'Wind Speed', <Wind size={14} />, '#a3a3a3')}
              {wdg(c.current.wind_direction != null ? `${c.current.wind_direction}°` : '—', 'Wind Dir', <Compass size={14} />, '#78716c')}
              {wdg(c.current.pressure_msl != null ? `${c.current.pressure_msl} hPa` : '—', 'Pressure', <Gauge size={14} />, '#78716c')}
              {wdg(c.current.cloud_cover_pct != null ? `${c.current.cloud_cover_pct}%` : '—', 'Cloud Cover', <Cloud size={14} />, '#78716c')}
              {wdg(c.current.uv_index != null ? c.current.uv_index : '—', 'UV Index', <Sun size={14} />, '#eab308')}
            </div>
            {c.current.dew_point_c != null && <p className="text-xs text-stone-500 mb-3">Dew Point: {c.current.dew_point_c}°C</p>}
            {c.forecast_7day?.max_temp?.length > 0 && (
              <div className="bg-stone-50 rounded-xl p-4 border border-stone-200">
                <p className="text-[8px] font-black uppercase text-stone-500 mb-3">📅 7-Day Forecast</p>
                <div className="grid grid-cols-7 gap-2">
                  {c.forecast_7day.max_temp.map((t, i) => (
                    <div key={i} className="text-center">
                      <p className="text-[9px] font-bold text-stone-400">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][(new Date().getDay() + i) % 7]}</p>
                      <Thermometer size={14} className="mx-auto my-1 text-orange-500" />
                      <p className="font-black text-sm">{Math.round(t)}°</p>
                      <p className="text-[8px] text-stone-400">{c.forecast_7day.min_temp?.[i] != null ? `${Math.round(c.forecast_7day.min_temp[i])}°` : ''}</p>
                      <CloudRain size={10} className="mx-auto mt-1 text-blue-500" />
                      <p className="text-[8px] text-blue-500">{c.forecast_7day.precipitation?.[i] != null ? `${Math.round(c.forecast_7day.precipitation[i])}mm` : ''}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Soil */}
        <div className="bg-white rounded-[2rem] p-6 border-2 border-stone-200 shadow-lg">
          <h3 className="text-[8px] font-black uppercase tracking-widest text-stone-400 mb-4">🧪 {t('landAnalyser.soilIntelligence')}</h3>
          {s?.status === 'complete' ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2 mb-4">
                {wdg(s.texture, 'Texture', <Layers size={14} />, '#84cc16')}
                {wdg(s.ph, 'pH', <FlaskConical size={14} />, s.ph >= 6 && s.ph <= 7 ? '#84cc16' : '#f97316')}
                {wdg(`${s.organic_carbon_pct}%`, 'Org Carbon', <Sprout size={14} />, '#10b981')}
                {wdg(s.cec_value != null ? `${s.cec_value} ${s.cec_unit || ''}` : '—', 'CEC', <Target size={14} />, '#78716c')}
                {wdg(s.ec_ms_per_cm != null ? `${s.ec_ms_per_cm} mS/cm` : '—', 'EC', <Zap size={14} />, '#78716c')}
                {wdg(s.n != null ? `${s.n} kg/ha` : '—', 'Nitrogen (N)', <Sprout size={14} />, s.n >= 50 ? '#84cc16' : '#ef4444')}
                {wdg(s.p != null ? `${s.p} kg/ha` : '—', 'Phosphorus (P)', <Sprout size={14} />, s.p >= 20 ? '#84cc16' : '#ef4444')}
                {wdg(s.k != null ? `${s.k} kg/ha` : '—', 'Potassium (K)', <Sprout size={14} />, s.k >= 30 ? '#84cc16' : '#ef4444')}
                {wdg(s.moisture_pct != null ? `${s.moisture_pct}%` : '—', 'Moisture', <Droplets size={14} />, '#3b82f6')}
                {wdg(s.groundwater_depth_m != null ? `${s.groundwater_depth_m}m` : '—', 'GW Depth', <Waves size={14} />, '#3b82f6')}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs mb-3">
                <div className="bg-stone-50 rounded-lg p-3 border border-stone-200"><span className="font-bold text-stone-600">Water Retention:</span> {s.water_retention || '—'}</div>
                <div className="bg-stone-50 rounded-lg p-3 border border-stone-200"><span className="font-bold text-stone-600">Drainage:</span> {s.drainage || '—'}</div>
                <div className="bg-stone-50 rounded-lg p-3 border border-stone-200"><span className="font-bold text-stone-600">Data:</span> {s.data_source || s.source || '—'}</div>
              </div>
              {s.deficiencies?.length > 0 && (
                <div className="bg-red-50 rounded-xl p-3 border border-red-200">
                  <p className="text-[8px] font-black uppercase text-red-600 mb-2">⚠ {t('landAnalyser.defects')}</p>
                  {s.deficiencies.map((d, i) => <p key={i} className="text-xs text-stone-700 mb-1">• {d.element}: {d.status} — {d.advice}</p>)}
                </div>
              )}
            </>
          ) : <p className="text-stone-400 text-sm italic">{t('landAnalyser.noSoilData')}</p>}
        </div>

        {/* Water */}
        {w && (
          <div className="bg-white rounded-[2rem] p-6 border-2 border-stone-200 shadow-lg">
            <h3 className="text-[8px] font-black uppercase tracking-widest text-stone-400 mb-4">💧 {t('landAnalyser.waterAvailability')}</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
              {wdg(w.status, 'Status', <Droplets size={14} />, w.status === 'High' ? '#3b82f6' : w.status === 'Moderate' ? '#eab308' : '#ef4444')}
              {wdg(`${w.current_rainfall_mm}mm`, 'Rainfall', <CloudRain size={14} />, '#6366f1')}
              {wdg(`${w.evapotranspiration_mm}mm`, 'ET₀', <Sun size={14} />, '#f97316')}
              {wdg(w.irrigation_requirement || '—', 'Irrigation', <Waves size={14} />, '#3b82f6')}
            </div>
          </div>
        )}

        {/* Crop Suitability */}
        {cr && (
          <div className="bg-white rounded-[2rem] p-6 border-2 border-stone-200 shadow-lg">
            <h3 className="text-[8px] font-black uppercase tracking-widest text-stone-400 mb-2">🌾 {t('landAnalyser.cropSuitability')}</h3>
            <p className="text-[9px] text-stone-400 mb-4 italic">{cr.methodology}</p>

            {/* Score Distribution */}
            {cr.score_distribution && (
              <div className="flex gap-1 mb-6">
                {[{l:'Excellent',c:'bg-emerald-500',v:cr.score_distribution.excellent},{l:'Good',c:'bg-[#84cc16]',v:cr.score_distribution.good},{l:'Fair',c:'bg-yellow-400',v:cr.score_distribution.fair},{l:'Marginal',c:'bg-orange-400',v:cr.score_distribution.marginal},{l:'Poor',c:'bg-red-500',v:cr.score_distribution.poor}].map(gr => (
                  <div key={gr.l} className="flex-1 text-center p-2 rounded-lg bg-stone-50 border border-stone-200">
                    <div className={`h-1.5 rounded-full mb-1.5 ${gr.c}`} style={{ opacity: Math.max(0.15, gr.v * 0.25) }}></div>
                    <p className="font-black text-sm">{gr.v}</p>
                    <p className="text-[7px] font-bold uppercase text-stone-400">{gr.l}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Most Grown Crops in Region — hardcoded regional data */}
            {mostGrown.length > 0 && (
              <div className="bg-stone-50 rounded-2xl p-5 border border-stone-200 mb-6">
                <div className="mb-3 flex items-center gap-2">
                  <Sprout className="w-4 h-4 text-[#84cc16]" />
                  <span className="text-[11px] font-black uppercase tracking-widest text-stone-700">🌾 {t('landAnalyser.mostGrownCrops')}</span>
                </div>
                <p className="text-[9px] text-stone-500 mb-4">These crops are most commonly cultivated in your region, based on Karnataka agricultural statistics.</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {mostGrown.map((s, i) => (
                    <div key={i} className="bg-white rounded-xl p-4 border border-stone-200 hover:shadow-md transition-all">
                      <p className="font-black text-base text-stone-800">{s.crop}</p>
                      <p className="font-black text-[#84cc16] text-xl">{s.area_pct}%</p>
                      <p className="text-[9px] text-stone-400">{s.season} · {s.typical_yield}</p>
                    </div>
                  ))}
                </div>
                {llmCrops.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-stone-200">
                    <p className="text-[8px] font-black uppercase text-stone-500 mb-2">🤖 {t('landAnalyser.alsoConsider')}</p>
                    <div className="flex flex-wrap gap-2">
                      {llmCrops.map((s, i) => (
                        <span key={i} className="px-3 py-1.5 bg-white rounded-full border border-stone-200 text-xs font-bold text-stone-600">{s.crop} {s.score ? `(${s.score}%)` : ''}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* AI Suggested Best Crops — sorted by risk (low first) then profitability */}
            <div className="mb-3 flex items-center gap-2">
              <Sprout size={16} className="text-[#84cc16]" />
              <span className="text-[11px] font-black uppercase tracking-widest text-stone-700">🧠 {t('landAnalyser.aiSuggested')}</span>
            </div>
            <p className="text-[9px] text-stone-500 mb-4">These crops are ranked by risk level (low risk first) then profitability, based on your soil, weather, and location data.</p>
            <div className="space-y-2">
              {(cr.best_crops || []).slice().sort((a, b) => {
                const riskOrder = { Low: 0, Moderate: 1, High: 2 };
                const rDiff = (riskOrder[a.risk_level] ?? 1) - (riskOrder[b.risk_level] ?? 1);
                if (rDiff !== 0) return rDiff;
                const profitA = (parseInt(String(a.market_price_msp).replace(/[^0-9]/g, '')) || 0) - (parseInt(String(a.input_cost).replace(/[^0-9]/g, '')) || 0);
                const profitB = (parseInt(String(b.market_price_msp).replace(/[^0-9]/g, '')) || 0) - (parseInt(String(b.input_cost).replace(/[^0-9]/g, '')) || 0);
                return profitB - profitA;
              }).map((crop, i) => {
                const mspNum = parseInt(String(crop.market_price_msp).replace(/[^0-9]/g, '')) || 0;
                const costNum = parseInt(String(crop.input_cost).replace(/[^0-9]/g, '')) || 0;
                const estReturn = mspNum - costNum;
                const netProfitLabel = estReturn > 0 ? `₹${estReturn}/q` : '—';
                return (
                <div key={i}>
                  <button onClick={() => setExpandedCrop(expandedCrop === crop.crop ? null : crop.crop)}
                    className="w-full text-left bg-stone-50 rounded-xl p-4 border border-stone-200 hover:border-[#84cc16]/30 transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm ${i === 0 ? 'bg-[#84cc16] text-[#0c0a09]' : i < 3 ? 'bg-[#84cc16]/20 text-[#84cc16]' : 'bg-stone-200 text-stone-600'}`}>{i + 1}</span>
                        <div>
                          <p className="font-black text-[#0c0a09]">{crop.crop}</p>
                          <p className="text-[9px] text-stone-500">{crop.water_requirement} · {crop.duration_days}d</p>
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-4">
                        {/* Risk badge */}
                        <div className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase ${crop.risk_level === 'Low' ? 'bg-emerald-100 text-emerald-700' : crop.risk_level === 'Moderate' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                          {crop.risk_level} Risk
                        </div>
                        {/* Score */}
                        <div className="text-right">
                          <p className={`font-black text-lg ${crop.score >= 80 ? 'text-emerald-600' : crop.score >= 65 ? 'text-[#84cc16]' : crop.score >= 50 ? 'text-yellow-600' : 'text-orange-600'}`}>{crop.score}/100</p>
                          <p className="text-[8px] font-black uppercase text-stone-400">{crop.grade}</p>
                        </div>
                        {expandedCrop === crop.crop ? <ChevronUp size={16} className="text-stone-400" /> : <ChevronDown size={16} className="text-stone-400" />}
                      </div>
                    </div>
                  </button>
                  {expandedCrop === crop.crop && (
                    <div className="ml-4 mt-1 mb-3 p-4 bg-[#84cc16]/5 rounded-xl border border-[#84cc16]/20 space-y-3">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                        <div className="bg-white rounded-lg p-2 border border-stone-100"><p className="text-stone-400">Market Price (MSP)</p><p className="font-bold text-stone-800">₹{crop.market_price_msp}/q</p></div>
                        <div className="bg-white rounded-lg p-2 border border-stone-100"><p className="text-stone-400">Input Cost</p><p className="font-bold text-stone-800">{crop.input_cost}</p></div>
                        <div className="bg-white rounded-lg p-2 border border-stone-100"><p className="text-stone-400">Est. Net Return</p><p className={`font-bold ${estReturn > 0 ? 'text-emerald-600' : 'text-red-600'}`}>{netProfitLabel}</p></div>
                        <div className="bg-white rounded-lg p-2 border border-stone-100"><p className="text-stone-400">Companion Crops</p><p className="font-bold text-stone-800">{crop.companion_crops?.slice(0,2).join(', ') || '—'}</p></div>
                      </div>
                      {crop.strengths?.length > 0 && (
                        <div>
                          <p className="text-[8px] font-black uppercase text-emerald-600 mb-1">✅ Why It Scores Well Here</p>
                          {crop.strengths.map((s, i) => <p key={i} className="text-xs text-stone-700">• {s}</p>)}
                        </div>
                      )}
                      {crop.weaknesses?.length > 0 && (
                        <div>
                          <p className="text-[8px] font-black uppercase text-amber-600 mb-1">⚠ Things to Watch</p>
                          {crop.weaknesses.map((w, i) => <p key={i} className="text-xs text-stone-700">• {w}</p>)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );})}
            </div>

            <p className="text-[10px] text-stone-400 font-bold mt-4 text-center">{cr.total_crops_evaluated || 20} {t('landAnalyser.cropsEvaluated')}</p>
          </div>
        )}

        {/* Recommendations */}
        {recs && (
          <div className="grid md:grid-cols-2 gap-4">
            {recs.soil_amendments?.length > 0 && (
              <div className="bg-white rounded-[2rem] p-6 border-2 border-stone-200 shadow-lg">
                <h3 className="text-[8px] font-black uppercase text-emerald-600 mb-3">🧪 {t('landAnalyser.soilAmendments')}</h3>
                {recs.soil_amendments.map((r, i) => <p key={i} className="text-xs text-stone-700 mb-1">→ {r}</p>)}
              </div>
            )}
            {recs.irrigation_advice?.length > 0 && (
              <div className="bg-white rounded-[2rem] p-6 border-2 border-stone-200 shadow-lg">
                <h3 className="text-[8px] font-black uppercase text-blue-600 mb-3">💧 {t('landAnalyser.irrigationAdvice')}</h3>
                {recs.irrigation_advice.map((r, i) => <p key={i} className="text-xs text-stone-700 mb-1">→ {r}</p>)}
              </div>
            )}
            {recs.crop_rotation?.length > 0 && (
              <div className="bg-white rounded-[2rem] p-6 border-2 border-stone-200 shadow-lg">
                <h3 className="text-[8px] font-black uppercase text-[#84cc16] mb-3">🔄 {t('landAnalyser.cropRotation')}</h3>
                {recs.crop_rotation.map((r, i) => <p key={i} className="text-xs text-stone-700 mb-1">→ {r}</p>)}
              </div>
            )}
            {recs.conservation?.length > 0 && (
              <div className="bg-white rounded-[2rem] p-6 border-2 border-stone-200 shadow-lg">
                <h3 className="text-[8px] font-black uppercase text-amber-600 mb-3">🌍 {t('landAnalyser.conservation')}</h3>
                {recs.conservation.map((r, i) => <p key={i} className="text-xs text-stone-700 mb-1">→ {r}</p>)}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-[9px] text-stone-400 border-t border-stone-200 pt-6">
          Weather: Open-Meteo · Soil: ISRIC SoilGrids + Regional Estimates · Analysis: 12-dimension crop scoring + AI
        </div>
      </div>
    </div>
  );
}
