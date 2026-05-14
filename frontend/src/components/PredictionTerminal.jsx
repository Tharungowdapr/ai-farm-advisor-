import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Target, MapPin, Crosshair, Loader2, Thermometer, CloudRain, Droplets, Wind, ShieldAlert, Sprout, CheckCircle, XCircle, AlertTriangle, Search, ChevronRight, Dna, TestTube, Globe } from 'lucide-react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';

const GradientOverlay = () => (
  <div className="fixed inset-0 pointer-events-none bg-gradient-to-b from-[#84cc16]/5 via-transparent to-[#0c0a09] opacity-40" />
);

const STATUS = {
  idle: { icon: null, color: "text-stone-600", bg: "bg-stone-800" },
  loading: { icon: Loader2, color: "text-yellow-400", bg: "bg-yellow-500/10" },
  success: { icon: CheckCircle, color: "text-green-400", bg: "bg-green-500/10" },
  error: { icon: XCircle, color: "text-red-400", bg: "bg-red-500/10" },
};

const PredictionTerminal = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const runOnce = useRef(false);

  // Form state
  const [formData, setFormData] = useState({ city: '', N: '', P: '', K: '', ph: '' });
  const [coords, setCoords] = useState(null);
  const [incomingFromScan, setIncomingFromScan] = useState(false);

  // Detection state
  const [detectPhase, setDetectPhase] = useState('idle'); // idle | detecting | done | error
  const [statuses, setStatuses] = useState({
    location: 'idle',
    weather: 'idle',
    soil: 'idle',
  });
  const [statusMessages, setStatusMessages] = useState({});

  // Weather display
  const [weatherData, setWeatherData] = useState(null);

  // Prediction
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Accept incoming env data from SmartEnvironmentScanner
  useEffect(() => {
    if (runOnce.current) return;
    const envData = location.state?.envData;
    if (envData) {
      runOnce.current = true;
      setIncomingFromScan(true);
      if (envData.city) setFormData(prev => ({ ...prev, city: envData.city }));
      if (envData.ph) setFormData(prev => ({ ...prev, ph: String(envData.ph) }));
      if (envData.N) setFormData(prev => ({ ...prev, N: String(Math.round(envData.N)) }));
      if (envData.P) setFormData(prev => ({ ...prev, P: String(Math.round(envData.P)) }));
      if (envData.K) setFormData(prev => ({ ...prev, K: String(Math.round(envData.K)) }));
      if (envData.coords) setCoords(envData.coords);
      if (envData.weather) {
        setWeatherData(envData.weather);
        setStatuses({ location: 'success', weather: 'success', soil: 'success' });
        setStatusMessages({
          location: envData.location || envData.city,
          weather: `${envData.weather.temperature}°C, ${envData.weather.humidity}%`,
          soil: `pH ${envData.ph}, N ${Math.round(envData.N)} mg/kg`,
        });
        setDetectPhase('done');
      }
    }
  }, [location.state]);

  // Helper
  const setStatus = (key, state, msg = '') => {
    setStatuses(prev => ({ ...prev, [key]: state }));
    if (msg) setStatusMessages(prev => ({ ...prev, [key]: msg }));
  };

  // ── Detect Environment ──────────────────────────────
  const detectEnvironment = useCallback(async () => {
    setDetectPhase('detecting');
    setResult(null);
    setError(null);
    setWeatherData(null);
    setStatuses({ location: 'loading', weather: 'idle', soil: 'idle' });

    // 1. Geolocation
    if (!navigator.geolocation) {
      setStatus('location', 'error', 'Geolocation not supported');
      setDetectPhase('error');
      return;
    }

    try {
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000, enableHighAccuracy: true });
      });
      const { latitude, longitude } = pos.coords;
      setCoords({ lat: latitude, lon: longitude });
      setStatus('location', 'success', `Lat ${latitude.toFixed(4)}, Lon ${longitude.toFixed(4)}`);

      // 2. Reverse geocode
      const geoRes = await axios.get(`/api/env/geocode?lat=${latitude}&lon=${longitude}`);
      const cityName = geoRes.data.city;
      setFormData(prev => ({ ...prev, city: cityName }));
      setStatusMessages(prev => ({ ...prev, location: cityName }));

      // 3. Weather (parallel)
      setStatus('weather', 'loading');
      let weatherRes;
      try {
        weatherRes = await axios.get(`/api/env/weather?lat=${latitude}&lon=${longitude}`);
        setWeatherData(weatherRes.data);
        setStatus('weather', 'success', `${weatherRes.data.temperature}°C, ${weatherRes.data.humidity}% humidity`);
      } catch {
        setStatus('weather', 'error', 'Weather unavailable');
      }

      // 4. SoilGrids (parallel)
      setStatus('soil', 'loading');
      try {
        const soilRes = await axios.get(`/api/env/soilgrids?lat=${latitude}&lon=${longitude}`);
        const s = soilRes.data;
        if (s.ph) setFormData(prev => ({ ...prev, ph: s.ph.toString() }));
        if (s.nitrogen) setFormData(prev => ({ ...prev, N: Math.round(s.nitrogen).toString() }));
        if (s.phosphorus) setFormData(prev => ({ ...prev, P: Math.round(s.phosphorus).toString() }));
        if (s.potassium) setFormData(prev => ({ ...prev, K: Math.round(s.potassium).toString() }));
        setStatus('soil', 'success', `pH ${s.ph}, N ${s.nitrogen ? Math.round(s.nitrogen) : '?'} mg/kg`);
      } catch {
        setStatus('soil', 'error', 'Using regional soil map fallback');
        // Fallback: use static soil lookup
        try {
          const fallbackRes = await axios.get(`/api/icar/soil/${encodeURIComponent(cityName)}`);
          const fb = fallbackRes.data.soil;
          if (fb.ph && !formData.ph) setFormData(prev => ({ ...prev, ph: fb.ph.toString() }));
          setStatus('soil', 'success', `Fallback: ${fb.type} soil, pH ${fb.ph}`);
        } catch {
          setStatus('soil', 'error', 'Soil data unavailable — enter manually');
        }
      }

      setDetectPhase('done');
    } catch (err) {
      if (err.code === 1) {
        setStatus('location', 'error', 'Permission denied — enter city manually');
      } else {
        setStatus('location', 'error', 'Location detection failed');
      }
      setDetectPhase('error');
    }
  }, []);

  // Auto-detect on mount (only if not coming from scanner)
  useEffect(() => {
    if (!location.state?.envData) {
      detectEnvironment();
    }
  }, []);

  // ── Run Prediction ──────────────────────────────────
  const handlePredict = async (e) => {
    if (e) e.preventDefault();
    if (!formData.city.trim()) { setError('Enter a city'); return; }
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const res = await axios.post('/api/predict', {
        city: formData.city,
        N: parseFloat(formData.N) || 0,
        P: parseFloat(formData.P) || 0,
        K: parseFloat(formData.K) || 0,
        ph: parseFloat(formData.ph) || 6.5,
      });
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Prediction failed');
    } finally {
      setLoading(false);
    }
  };

  // ── Explainable AI logic ────────────────────────────
  const generateExplanation = (crop, yieldVal, diseaseRisks) => {
    if (!result) return [];
    const reasons = [];
    const ph = parseFloat(formData.ph) || 0;
    const N = parseFloat(formData.N) || 0;

    if (ph >= 5.5 && ph <= 7.0) reasons.push({ icon: '🧪', text: `Soil pH ${ph} is in the ideal range (5.5-7.0) for most crops`, type: 'positive' });
    else if (ph > 0) reasons.push({ icon: '⚠️', text: `Soil pH ${ph} may need amendment — ideal range is 5.5-7.0`, type: 'warning' });

    if (weatherData && weatherData.temperature) {
      const t = weatherData.temperature;
      if (t >= 20 && t <= 35) reasons.push({ icon: '🌡️', text: `Current temperature ${t}°C supports active crop growth`, type: 'positive' });
      else reasons.push({ icon: '🌡️', text: `Temperature ${t}°C may be suboptimal — consider season-appropriate crops`, type: 'warning' });
    }

    if (N > 60) reasons.push({ icon: '🌿', text: `Nitrogen level ${N} mg/kg is sufficient for vegetative growth`, type: 'positive' });
    else if (N > 0) reasons.push({ icon: '🌿', text: `Nitrogen level ${N} mg/kg is low — consider adding urea or compost`, type: 'warning' });

    if (weatherData && weatherData.rainfall > 0) {
      if (weatherData.rainfall < 5) reasons.push({ icon: '💧', text: `Low rainfall (${weatherData.rainfall}mm) — irrigation may be needed`, type: 'warning' });
      else reasons.push({ icon: '💧', text: `Recent rainfall (${weatherData.rainfall}mm) provides soil moisture`, type: 'positive' });
    }

    if (diseaseRisks && diseaseRisks.length > 0) {
      const high = diseaseRisks.filter(d => d.risk_level === 'High' || d.risk_level === 'Severe');
      if (high.length > 0) reasons.push({ icon: '🛡️', text: `${high.length} disease risk(s) detected — preventive measures recommended`, type: 'warning' });
      else reasons.push({ icon: '🛡️', text: `Disease risk is low — favorable for healthy crop growth`, type: 'positive' });
    }

    if (crop) reasons.push({ icon: '📊', text: `${crop} has the highest suitability score for your current conditions`, type: 'positive' });

    return reasons;
  };

  // ── Status Badge ────────────────────────────────────
  const StatusBadge = ({ statusKey, label }) => {
    const st = statuses[statusKey];
    const config = STATUS[st] || STATUS.idle;
    const Icon = config.icon;
    return (
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider ${config.bg} ${config.color} transition-all`}>
        {Icon ? <Icon size={12} className={config.color} /> : <div className="w-3 h-3 rounded-full bg-stone-700" />}
        <span>{label}</span>
        {statusMessages[statusKey] && <span className="opacity-60 normal-case font-normal">— {statusMessages[statusKey]}</span>}
      </div>
    );
  };

  // ── Confidence Band ─────────────────────────────────
  const ConfidenceBar = ({ val, size = 'md' }) => {
    const band = val >= 70 ? 'bg-green-500' : val >= 50 ? 'bg-yellow-500' : val >= 30 ? 'bg-orange-500' : 'bg-red-500';
    const h = size === 'lg' ? 'h-3' : 'h-2';
    return (
      <div className={`w-full bg-white/10 rounded-full ${h} overflow-hidden`}>
        <motion.div initial={{ width: 0 }} animate={{ width: `${val}%` }} transition={{ duration: 1, ease: 'easeOut' }} className={`${h} rounded-full ${band}`} />
      </div>
    );
  };

  return (
    <div className="pt-20 min-h-screen bg-[#0c0a09] px-4 pb-20 text-white relative">
      <GradientOverlay />

      {/* Header */}
      <header className="text-center pt-6 pb-6 max-w-2xl mx-auto relative z-10">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Target size={16} className="text-[#84cc16]" />
          <span className="text-[9px] font-black uppercase tracking-[0.4em] text-[#84cc16]">Smart Prediction</span>
        </div>
        <h1 className="font-serif text-4xl md:text-5xl font-black text-white mb-2">
          Context-Aware <span className="italic text-[#84cc16]">Crop Advisor</span>
        </h1>
        <p className="text-stone-400 text-sm">Auto-detects your environment — weather, soil, and location — to recommend the best crops.</p>
      </header>

      <div className="max-w-6xl mx-auto grid lg:grid-cols-[420px_1fr] gap-8 relative z-10">

        {/* ───── LEFT COLUMN: Form ───── */}
        <div className="space-y-5">
          {/* Incoming from scanner banner */}
          {incomingFromScan && (
            <div className="bg-[#84cc16]/10 border border-[#84cc16]/30 rounded-xl px-4 py-3 flex items-center gap-3 text-sm">
              <Globe size={18} className="text-[#84cc16]" />
              <div>
                <div className="text-[#84cc16] font-bold text-xs">Data loaded from Environment Scanner</div>
                <div className="text-stone-400 text-[10px]">{location.state?.envData?.location || formData.city}</div>
              </div>
            </div>
          )}

          {/* Detect Button */}
          <motion.button
            onClick={detectEnvironment}
            disabled={detectPhase === 'detecting'}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 transition-all ${
              detectPhase === 'done' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
              detectPhase === 'detecting' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
              'bg-[#84cc16] text-[#0c0a09] hover:bg-[#facc15] shadow-lg'
            }`}
          >
            {detectPhase === 'detecting' ? (
              <><Loader2 size={18} className="animate-spin" /> Detecting Environment...</>
            ) : detectPhase === 'done' ? (
              <><CheckCircle size={18} /> Detected — Ready to Predict</>
            ) : (
              <><Crosshair size={18} /> Detect My Environment</>
            )}
          </motion.button>

          {/* Status Indicators */}
          <div className="flex flex-wrap gap-2">
            <StatusBadge statusKey="location" label="📍 Location" />
            <StatusBadge statusKey="weather" label="🌤 Weather" />
            <StatusBadge statusKey="soil" label="🌱 Soil" />
          </div>

          {/* Coords display */}
          {coords && (
            <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-[10px] text-stone-500 flex items-center gap-4">
              <span>Lat: {coords.lat.toFixed(4)}</span>
              <span>Lon: {coords.lon.toFixed(4)}</span>
            </div>
          )}

          {/* Weather Cards */}
          {weatherData && (
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                <Thermometer size={14} className="text-orange-400 mx-auto mb-1" />
                <div className="text-[9px] text-stone-500 uppercase">Temp</div>
                <div className="text-lg font-black">{weatherData.temperature}°C</div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                <Droplets size={14} className="text-blue-400 mx-auto mb-1" />
                <div className="text-[9px] text-stone-500 uppercase">Humidity</div>
                <div className="text-lg font-black">{weatherData.humidity}%</div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                <CloudRain size={14} className="text-cyan-400 mx-auto mb-1" />
                <div className="text-[9px] text-stone-500 uppercase">Rain</div>
                <div className="text-lg font-black">{weatherData.rainfall}mm</div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                <Wind size={14} className="text-stone-400 mx-auto mb-1" />
                <div className="text-[9px] text-stone-500 uppercase">Wind</div>
                <div className="text-lg font-black">{weatherData.wind_speed} km/h</div>
              </div>
            </div>
          )}

          {/* Prediction Form */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h3 className="font-serif text-lg font-black text-white mb-4 flex items-center gap-2"><Dna size={16} className="text-[#84cc16]" /> Input Parameters</h3>
            <form onSubmit={handlePredict} className="space-y-3">
              <div>
                <label className="text-[9px] font-bold text-stone-500 uppercase tracking-wider mb-1.5 block flex items-center gap-1"><MapPin size={10} /> Location</label>
                <input required type="text" placeholder="Village / City" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#84cc16]" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[9px] font-bold text-stone-500 uppercase tracking-wider mb-1.5 block text-center">N (mg/kg)</label>
                  <input type="number" placeholder="N" className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-3 text-white text-sm text-center outline-none focus:border-[#84cc16]" value={formData.N} onChange={e => setFormData({...formData, N: e.target.value})} />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-stone-500 uppercase tracking-wider mb-1.5 block text-center">P (mg/kg)</label>
                  <input type="number" placeholder="P" className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-3 text-white text-sm text-center outline-none focus:border-[#84cc16]" value={formData.P} onChange={e => setFormData({...formData, P: e.target.value})} />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-stone-500 uppercase tracking-wider mb-1.5 block text-center">K (mg/kg)</label>
                  <input type="number" placeholder="K" className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-3 text-white text-sm text-center outline-none focus:border-[#84cc16]" value={formData.K} onChange={e => setFormData({...formData, K: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="text-[9px] font-bold text-stone-500 uppercase tracking-wider mb-1.5 block flex items-center gap-1"><TestTube size={10} /> Soil pH</label>
                <input type="number" step="0.1" placeholder="e.g. 6.5" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#84cc16]" value={formData.ph} onChange={e => setFormData({...formData, ph: e.target.value})} />
              </div>
              <button type="submit" disabled={loading || !formData.city.trim()} className="w-full mt-3 py-4 bg-[#84cc16] text-[#0c0a09] font-black text-sm uppercase tracking-widest rounded-xl hover:bg-[#facc15] transition-all disabled:opacity-30 flex items-center justify-center gap-2">
                {loading ? <><Loader2 size={16} className="animate-spin" /> Running Prediction...</> : <><Target size={16} /> Predict Best Crop</>}
              </button>
            </form>
          </div>
        </div>

        {/* ───── RIGHT COLUMN: Results ───── */}
        <div className="space-y-6">
          {/* Loading */}
          {loading && (
            <div className="h-full flex items-center justify-center py-24">
              <div className="text-center">
                <Loader2 size={40} className="animate-spin mx-auto mb-4 text-[#84cc16]" />
                <p className="text-stone-400 text-sm">Analyzing soil, weather, and crop models...</p>
              </div>
            </div>
          )}

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-5 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm flex items-start gap-3">
                <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" /> <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Results */}
          <AnimatePresence>
            {result && !result.error && !loading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                {/* Primary Recommendation */}
                <div className="bg-gradient-to-br from-[#84cc16]/20 to-[#0c0a09] border border-[#84cc16]/30 rounded-[2rem] p-8 relative overflow-hidden">
                  <div className="relative z-10">
                    <span className="px-4 py-1.5 bg-[#84cc16] text-[#0c0a09] rounded-full text-[9px] font-black uppercase tracking-widest inline-block mb-4">🌟 Primary Recommendation</span>
                    <div className="flex items-end gap-4 mb-2">
                      <h2 className="font-serif text-5xl font-black text-white capitalize">{result.selected_crop}</h2>
                      <span className="text-green-400 font-black text-lg mb-1">
                        {result.top_yields?.find(y => y.crop === result.selected_crop)?.yield || '?'} t/ha
                      </span>
                    </div>
                    <p className="text-stone-400 flex items-center gap-2 text-sm">
                      <MapPin size={14} className="text-[#84cc16]" /> Optimal for {formData.city || result.city}
                    </p>
                  </div>
                </div>

                {/* Yield Benchmark */}
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                  className="bg-white/5 border border-white/10 rounded-2xl p-6 overflow-hidden relative group">
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <TrendingUp size={80} className="text-[#84cc16]" />
                  </div>
                  <div className="flex justify-between items-center mb-4">
                    <p className="text-[10px] font-black uppercase text-stone-400 tracking-widest">Regional Benchmark</p>
                    <div className="bg-[#84cc16]/10 text-[#84cc16] px-2 py-0.5 rounded-full text-[8px] font-black uppercase border border-[#84cc16]/20">APY Census Data</div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-4xl font-black text-white flex items-center gap-2">
                      {Math.round(((result.top_yields?.find(y => y.crop === result.selected_crop)?.yield || 0) / (result.state_avg_yield || 1)) * 100 - 100)}%
                      <ArrowUpRight size={24} className="text-[#84cc16]" />
                    </div>
                    <div className="text-xs text-stone-400 leading-relaxed max-w-[200px]">
                      Your predicted yield is significantly <span className="text-[#84cc16] font-bold">higher</span> than the average for this crop in your state ({result.state_avg_yield} t/ha).
                    </div>
                  </div>
                </motion.div>

                {/* Top Alternatives */}
                {result.top_crops && result.top_crops.length > 1 && (
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                    <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-4">Alternative Crops</h3>
                    <div className="space-y-2">
                      {result.top_crops.slice(1, 4).map((c, i) => {
                        const cy = result.top_yields?.find(y => y.crop === c.crop);
                        return (
                          <div key={i} className="flex items-center justify-between p-3 bg-black/30 rounded-xl">
                            <span className="font-bold text-white capitalize text-sm">{c.crop}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] text-stone-500">{Math.round(c.confidence * 100)}% match</span>
                              {cy && <span className="text-[#facc15] font-black text-xs">{cy.yield} t/ha</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Explainable AI Section */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                  <h3 className="font-serif text-lg font-black text-white mb-4 flex items-center gap-2">
                    <Search size={16} className="text-[#84cc16]" /> Why This Recommendation?
                  </h3>
                  <div className="grid md:grid-cols-2 gap-3">
                    {generateExplanation(result.selected_crop, result.top_yields, result.disease_risks).map((item, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.08 }}
                        className={`p-3 rounded-xl text-sm flex items-start gap-2.5 ${
                          item.type === 'positive' ? 'bg-green-500/10 border border-green-500/20' : 'bg-yellow-500/10 border border-yellow-500/20'
                        }`}
                      >
                        <span className="text-base flex-shrink-0">{item.icon}</span>
                        <span className={item.type === 'positive' ? 'text-green-300' : 'text-yellow-300'}>{item.text}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>

                 {/* Expert Scientific Advisory (RAG) */}
                 {result.expert_advisory && (
                   <div className="bg-gradient-to-br from-blue-500/10 to-[#0c0a09] border border-blue-500/20 rounded-2xl p-6">
                     <h3 className="font-serif text-lg font-black text-white mb-4 flex items-center gap-2">
                       <Globe size={16} className="text-blue-400" /> Scientific Expert Advisory
                     </h3>
                     <div className="space-y-4">
                       {result.expert_advisory.split('\n\n').map((block, i) => (
                         <div key={i} className="text-sm text-stone-300 leading-relaxed">
                           {block.startsWith('---') ? (
                             <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">{block.replace(/---/g, '').trim()}</div>
                           ) : (
                             <p>{block}</p>
                           )}
                         </div>
                       ))}
                     </div>
                     <button 
                       onClick={() => navigate('/vaniai', { state: { initialMessage: `Tell me more about the scientific advice for ${result.selected_crop} in ${result.city}.` } })}
                       className="mt-4 flex items-center gap-2 text-[#84cc16] font-bold text-[10px] uppercase tracking-wider hover:underline"
                     >
                       Ask Vani AI for more details <ChevronRight size={14} />
                     </button>
                   </div>
                 )}

                 {/* Expert Scientific Advisory (RAG) */}
                 {result.expert_advisory && (
                   <div className="bg-gradient-to-br from-blue-500/10 to-[#0c0a09] border border-blue-500/20 rounded-2xl p-6">
                     <h3 className="font-serif text-lg font-black text-white mb-4 flex items-center gap-2">
                       <Globe size={16} className="text-blue-400" /> Scientific Expert Advisory
                     </h3>
                     <div className="space-y-4">
                       {result.expert_advisory.split('\n\n').map((block, i) => (
                         <div key={i} className="text-sm text-stone-300 leading-relaxed">
                           {block.startsWith('---') ? (
                             <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">{block.replace(/---/g, '').trim()}</div>
                           ) : (
                             <p>{block}</p>
                           )}
                         </div>
                       ))}
                     </div>
                     <button 
                       onClick={() => navigate('/vaniai', { state: { initialMessage: `Tell me more about the scientific advice for ${result.selected_crop} in ${result.city}.` } })}
                       className="mt-4 flex items-center gap-2 text-[#84cc16] font-bold text-[10px] uppercase tracking-wider hover:underline"
                     >
                       Ask Vani AI for more details <ChevronRight size={14} />
                     </button>
                   </div>
                 )}

                {/* Disease Risks */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                  <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-4 flex items-center gap-2"><ShieldAlert size={14} /> Disease Risk Assessment</h3>
                  <div className="space-y-3 max-h-48 overflow-y-auto pr-1 scrollbar-hide">
                    {result.disease_risks && result.disease_risks.length > 0 ? result.disease_risks.map((d, i) => (
                      <div key={i} className="p-3 bg-black/30 rounded-xl border-l-4 border-red-500">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-white text-sm">{d.disease}</span>
                          <span className={`text-[9px] px-2 py-0.5 rounded font-black uppercase ${
                            d.risk_level === 'High' || d.risk_level === 'Severe' ? 'bg-red-500/20 text-red-400' :
                            d.risk_level === 'Moderate' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-blue-500/20 text-blue-400'
                          }`}>{d.risk_level}</span>
                        </div>
                        <p className="text-[10px] text-stone-400">{d.trigger || 'Monitor field conditions'}</p>
                      </div>
                    )) : <p className="text-stone-500 text-sm text-center py-4">No significant disease risks detected.</p>}
                  </div>
                </div>

                {/* Raw data (collapsible) */}
                <details className="bg-white/[0.03] border border-white/5 rounded-2xl p-4">
                  <summary className="text-[10px] text-stone-600 font-bold uppercase tracking-wider cursor-pointer">Prediction Data</summary>
                  <pre className="mt-3 text-[10px] text-stone-600 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>
                </details>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Empty state */}
          {!result && !loading && !error && (
            <div className="h-full flex items-center justify-center py-24">
              <div className="text-center">
                <Sprout size={48} className="mx-auto mb-4 opacity-20 text-[#84cc16]" />
                <p className="text-stone-500 text-sm">Waiting for environment detection...</p>
                <p className="text-stone-600 text-xs mt-1">or fill the form and click "Predict Best Crop"</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PredictionTerminal;
