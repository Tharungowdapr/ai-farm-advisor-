import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Search, Loader2, Thermometer, Droplets, CloudRain, Wind, AlertTriangle, CheckCircle2, Sun, ChevronDown, ChevronUp, ChevronRight, DollarSign, Calendar, Shield, Sprout, Target, TrendingUp, Compass, Eye, Gauge, Cloud, Waves, Layers, Navigation, FlaskConical, Zap, Brain, Lightbulb } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const GrainOverlay = () => <div className="grain-overlay opacity-20" />;

export default function LandAnalyser() {
  const [city, setCity] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [gpsDetecting, setGpsDetecting] = useState(false);
  const [expandedCrop, setExpandedCrop] = useState(null);
  const [citySuggestions, setCitySuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [aiInsight, setAiInsight] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [dynamicCrops, setDynamicCrops] = useState(null);
  const [dynamicCropsLoading, setDynamicCropsLoading] = useState(false);
  const cityRef = useRef(null);

  useEffect(() => {
    if (city.length < 2) { setCitySuggestions([]); return; }
    const t = setTimeout(async () => {
      try { const r = await axios.get(`/api/cities?q=${encodeURIComponent(city)}`); setCitySuggestions(r.data.cities || []); setShowDropdown(r.data.cities?.length > 0); } catch {}
    }, 300);
    return () => clearTimeout(t);
  }, [city]);

  useEffect(() => {
    const h = (e) => { if (cityRef.current && !cityRef.current.contains(e.target)) setShowDropdown(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const getBrowserFallbackCrops = (data) => {
    const temp = data?.climate?.current?.temperature_celsius || 25;
    const ph = data?.soil?.ph || 6.5;
    const rain = data?.climate?.current?.rainfall_mm || 800;

    const fallbackDb = [
      { name: 'Paddy', scientific: 'Oryza sativa', duration_days: 120, reason: `Suitable due to ideal temperature (${temp}°C) and standard moisture levels.` },
      { name: 'Ragi', scientific: 'Eleusine coracana', duration_days: 110, reason: `Highly drought-resistant crop that thrives well in local soil and rainfall conditions.` },
      { name: 'Tomato', scientific: 'Solanum lycopersicum', duration_days: 135, reason: `Thrives under your current temperature of ${temp}°C and soil pH of ${ph}.` },
      { name: 'Sugarcane', scientific: 'Saccharum officinarum', duration_days: 360, reason: `Tropical crop that matches local moisture levels and warm seasonal climate.` },
      { name: 'Maize', scientific: 'Zea mays', duration_days: 110, reason: `Optimal vegetative cycle conditions with local light and soil aeration.` },
      { name: 'Coffee', scientific: 'Coffea arabica', duration_days: 240, reason: `Excellent high-value crop matches elevation, drainage and local conditions.` }
    ];

    // Score them locally
    const scored = fallbackDb.map(c => {
      let score = 70;
      if (c.name === 'Paddy' && rain > 1000) score += 20;
      if (c.name === 'Ragi' && rain < 700) score += 25;
      if (c.name === 'Tomato' && ph >= 6.0 && ph <= 7.0) score += 20;
      if (c.name === 'Sugarcane' && temp > 20 && rain > 1200) score += 20;
      if (c.name === 'Coffee' && temp < 24) score += 20;
      return { ...c, score };
    }).sort((a, b) => b.score - a.score);

    return {
      most_planted_crops: scored.slice(0, 3).map(x => ({ ...x, type: 'Commercial / Food Crop' })),
      alternative_crops: scored.slice(3, 6).map(x => ({ ...x, type: 'High-Value Alternative' }))
    };
  };

  const fetchDynamicCrops = async (data) => {
    setDynamicCropsLoading(true);
    setDynamicCrops(null);
    try {
      const apiKey = localStorage.getItem('vani_api_key');
      if (!apiKey) {
        // Fallback directly if no API key is set
        setDynamicCrops(getBrowserFallbackCrops(data));
        return;
      }

      const res = await axios.post('/api/location-suggestions', {
        location: data?.location?.city || city,
        weather: {
          temperature: data?.climate?.current?.temperature_celsius,
          humidity: data?.climate?.current?.humidity_percent,
          rainfall: data?.climate?.current?.rainfall_mm
        },
        soil: {
          ph: data?.soil?.ph,
          n: data?.soil?.n,
          p: data?.soil?.p,
          k: data?.soil?.k,
          texture: data?.soil?.texture
        }
      }, {
        headers: { 'X-Api-Key': apiKey }
      });

      if (res.data && (res.data.most_planted_crops || res.data.alternative_crops)) {
        setDynamicCrops(res.data);
      } else {
        setDynamicCrops(getBrowserFallbackCrops(data));
      }
    } catch (err) {
      console.error('Error fetching dynamic crop suggestions:', err);
      setDynamicCrops(getBrowserFallbackCrops(data));
    } finally {
      setDynamicCropsLoading(false);
    }
  };

  const detectLocation = () => {
    if (!navigator.geolocation) { setError('GPS not available'); return; }
    setGpsDetecting(true); setError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setCity(`${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
        setGpsDetecting(false); setLoading(true);
        try {
          const r = await axios.post('/api/diagnostics/location', { lat: pos.coords.latitude, lon: pos.coords.longitude });
          setResult(r.data);
          if (r.data.location?.city) setCity(r.data.location.city);
          
          if (r.data.location?.lat) {
            localStorage.setItem('user_lat', r.data.location.lat);
            localStorage.setItem('user_lon', r.data.location.lon);
            localStorage.setItem('user_city', r.data.location.city);
          }
          
          fetchAiInsights(r.data);
          fetchDynamicCrops(r.data);
        }
        catch (err) { setError(err.response?.data?.error || err.message); }
        finally { setLoading(false); }
      },
      () => { setGpsDetecting(false); setError('GPS failed'); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSubmit = async (e, forcedLat, forcedLon) => {
    e?.preventDefault();
    if (!city && !forcedLat) { setError('Enter a city'); return; }
    setLoading(true); setError(null); setResult(null);
    try {
      const payload = forcedLat ? { lat: forcedLat, lon: forcedLon } : { city };
      const r = await axios.post('/api/diagnostics/location', payload);
      setResult(r.data);
      if (r.data.location?.city) setCity(r.data.location.city);
      
      // Persist location for other components
      if (r.data.location?.lat) {
        localStorage.setItem('user_lat', r.data.location.lat);
        localStorage.setItem('user_lon', r.data.location.lon);
        localStorage.setItem('user_city', r.data.location.city);
      }
      
      // Auto-fetch AI insights & dynamic crop recommendations
      fetchAiInsights(r.data);
      fetchDynamicCrops(r.data);
    }
    catch (err) { setError(err.response?.data?.error || err.message); }
    finally { setLoading(false); }
  };


  const fetchAiInsights = async (data) => {
    setAiLoading(true); setAiInsight(null);
    try {
      const res = await axios.post('/api/land/ai-insights', {
        location: data?.location?.city || city,
        soil: { ph: data?.soil?.ph, n: data?.soil?.n, p: data?.soil?.p, k: data?.soil?.k, texture: data?.soil?.texture },
        weather: { temperature: data?.climate?.current?.temperature_celsius, humidity: data?.climate?.current?.humidity_percent, rainfall: data?.climate?.current?.rainfall_mm },
        crops: data?.crop_suitability?.best_crops?.slice(0, 5) || [],
        water: { status: data?.water?.status }
      }, {
        headers: { 'X-Api-Key': localStorage.getItem('vani_api_key') }
      });
      setAiInsight(res.data);
    } catch (err) { console.error('AI insights error:', err); }
    finally { setAiLoading(false); }
  };

  const r = result; const c = r?.climate; const s = r?.soil; const w = r?.water; const cr = r?.crop_suitability; const recs = r?.recommendations;

  const wid = (val, label, icon, color) => (
    <div className="t-bg-card rounded-xl p-3 border t-border shadow-sm">
      <div className="flex items-center gap-1.5 mb-1"><span style={{color}}>{icon}</span><span className="text-[8px] font-black uppercase t-text-muted">{label}</span></div>
      <p className="font-black text-lg t-text">{val ?? '—'}</p>
    </div>
  );

  return (
    <div className="pt-24 min-h-screen t-bg">
      <GrainOverlay />
      <div className="max-w-7xl mx-auto px-6 pb-20">
        {/* Header */}
        <div className="mb-8">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#84cc16] mb-2">VaniAI Geospatial Intelligence</p>
          <h1 className="font-serif text-5xl font-black t-text">Land <span className="italic text-[#84cc16]">Analyser</span></h1>
          <p className="t-text-secondary mt-2">GPS-powered land analysis with real-time weather, soil intelligence & crop suitability</p>
        </div>

        {/* Search Bar */}
        <div className="relative mb-12" ref={cityRef}>
          <form onSubmit={handleSubmit} className="flex gap-3">
            <div className="relative flex-1">
              <div className="absolute left-5 top-1/2 -translate-y-1/2 t-text-muted">
                <Search size={18} />
              </div>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Search your city or district (e.g. Hassan, Mysore...)"
                className="w-full t-bg-card border-2 t-border rounded-2xl py-5 pl-14 pr-6 font-bold t-text shadow-xl outline-none focus:border-[#84cc16] transition-all placeholder:text-stone-400"
              />
              
              {/* Autocomplete Dropdown */}
              <AnimatePresence>
                {showDropdown && citySuggestions.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute top-full left-0 w-full t-bg-elevated border t-border rounded-2xl mt-2 shadow-2xl z-50 overflow-hidden"
                  >
                    {citySuggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setCity(suggestion.name);
                          setShowDropdown(false);
                          setCitySuggestions([]);
                          handleSubmit({ preventDefault: () => {} }, suggestion.lat, suggestion.lon);
                        }}
                        className="w-full px-6 py-4 text-left hover:bg-stone-50 border-b border-stone-50 last:border-0 flex items-center justify-between group transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-stone-100 rounded-lg text-stone-400 group-hover:bg-[#84cc16]/10 group-hover:text-[#84cc16] transition-colors">
                            <MapPin size={16} />
                          </div>
                          <div>
                            <p className="font-bold text-stone-700 text-sm">{suggestion.display}</p>
                            <p className="text-[10px] text-stone-400 uppercase font-black tracking-wider">{suggestion.state || 'India'}</p>
                          </div>
                        </div>
                        {suggestion.is_corrected && (
                          <span className="text-[8px] bg-[#84cc16]/10 text-[#84cc16] px-2 py-1 rounded-full font-black uppercase tracking-tighter">AI Corrected</span>
                        )}
                        <ChevronRight size={14} className="text-stone-300 group-hover:translate-x-1 transition-transform" />
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            <button
              type="button"
              onClick={detectLocation}
              disabled={gpsDetecting}
              className="px-6 bg-white border-2 border-stone-100 rounded-2xl text-stone-400 hover:text-[#84cc16] hover:border-[#84cc16]/30 transition-all flex items-center justify-center shadow-xl shadow-stone-200/50 disabled:opacity-50"
              title="Detect GPS Location"
            >
              {gpsDetecting ? <Loader2 size={20} className="animate-spin" /> : <Navigation size={20} />}
            </button>
            
            <button
              type="submit"
              disabled={loading || !city}
              className="px-10 bg-[#84cc16] text-[#0c0a09] font-black rounded-2xl hover:bg-[#a3e635] shadow-xl shadow-[#84cc16]/20 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : 'Analyse'}
            </button>
          </form>
        </div>


        {loading && <div className="flex items-center justify-center py-20"><Loader2 size={32} className="animate-spin text-[#84cc16]" /><span className="ml-4 font-black text-stone-500">Analyzing your land...</span></div>}

        {r && !loading && (
          <div className="space-y-6">
            {/* 0. AI Analysis */}
            {aiInsight && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-stone-900 rounded-[2rem] p-8 border border-[#84cc16]/30 shadow-2xl overflow-hidden relative"
              >
                <div className="absolute top-0 right-0 p-8 opacity-10">
                  <Brain size={120} className="text-[#84cc16]" />
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-[#84cc16] rounded-xl flex items-center justify-center">
                      <Sprout size={22} className="text-[#0c0a09]" />
                    </div>
                    <div>
                      <h3 className="text-[#84cc16] font-black text-xl uppercase tracking-tighter">Vani AI Analysis</h3>
                      <p className="text-[10px] text-stone-500 font-black uppercase tracking-widest">Research-Backed Agronomic Intelligence</p>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-8">
                    <div>
                      <p className="text-stone-100 text-sm leading-relaxed mb-6 font-medium italic border-l-2 border-[#84cc16] pl-4 py-1">
                        "{aiInsight.summary}"
                      </p>
                      
                      <div className="space-y-4">
                        <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
                          <p className="text-[10px] font-black text-[#84cc16] uppercase tracking-widest mb-3 flex items-center gap-2">
                            <CheckCircle2 size={12} /> Scientific Advice
                          </p>
                          <p className="text-stone-300 text-xs leading-relaxed">{aiInsight.advice}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="bg-red-500/5 rounded-2xl p-5 border border-red-500/20">
                        <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                          <AlertTriangle size={12} /> Key Risks Identified
                        </p>
                        <p className="text-red-100/70 text-xs leading-relaxed">{aiInsight.risks}</p>
                      </div>

                      <div className="bg-[#84cc16]/5 rounded-2xl p-5 border border-[#84cc16]/20">
                        <p className="text-[10px] font-black text-[#84cc16] uppercase tracking-widest mb-3 flex items-center gap-2">
                          <TrendingUp size={12} /> Market Strategy
                        </p>
                        <p className="text-stone-300 text-xs leading-relaxed">{aiInsight.market_strategy}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 1. Location */}
            <div className="bg-white rounded-[2rem] p-6 border-2 border-stone-200 shadow-xl flex items-center justify-between">
              <div><p className="text-[8px] font-black uppercase text-[#84cc16]">📍 Analysis Focus</p><p className="font-black text-xl text-[#0c0a09]">{r.location?.city || '—'}</p><p className="text-xs text-stone-500">{r.location?.lat?.toFixed(4)}, {r.location?.lon?.toFixed(4)} · Elev: {r.topography?.elevation_m ?? '—'}m</p></div>
              <div className="text-right text-xs text-stone-400"><Sun size={20} className="ml-auto mb-1 text-yellow-500" />{c?.season?.name}</div>
            </div>

            {/* 2. Regional Dominance */}
            {r.regional_stats && r.regional_stats.most_grown?.length > 0 && (
              <div className="bg-white rounded-[2rem] p-6 border-2 border-stone-200 shadow-xl overflow-hidden relative">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-[8px] font-black uppercase tracking-widest text-stone-400">📊 Regional Dominance</h3>
                    <p className="text-xl font-black text-[#0c0a09]">{r.regional_stats.name}</p>
                  </div>
                  <div className="bg-[#84cc16]/10 text-[#84cc16] px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-[#84cc16]/20">
                    Most Grown in Area
                  </div>
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  {r.regional_stats.most_grown.map((mg, i) => (
                    <div key={i} className="bg-stone-50 rounded-2xl p-5 border border-stone-100 group hover:border-[#84cc16]/30 transition-all">
                      <div className="flex items-center justify-between mb-4">
                        <p className="font-black text-stone-700 text-sm uppercase tracking-tight">{mg.name}</p>
                        <span className="text-[10px] font-black text-[#84cc16]">{mg.acreage_pct}%</span>
                      </div>
                      <div className="w-full bg-stone-200 h-2 rounded-full overflow-hidden mb-4">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${mg.acreage_pct}%` }}
                          transition={{ duration: 1, delay: i * 0.2 }}
                          className="bg-[#84cc16] h-full rounded-full" 
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#84cc16] animate-pulse"></div>
                        <p className="text-[9px] font-bold text-stone-400 uppercase tracking-widest">
                          Production: <span className="text-stone-600">{mg.production || 'Significant'}</span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3. Weather */}
            <div className="bg-white rounded-[2rem] p-6 border-2 border-stone-200 shadow-lg">
              <h3 className="text-[8px] font-black uppercase tracking-widest text-stone-400 mb-4">🌤 Real-Time Weather</h3>
              {c?.current && (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2 mb-4">
                    {wid(`${c.current.temperature_celsius ?? '—'}°C`, 'Temperature', <Thermometer size={14} />, '#f97316')}
                    {wid(`${c.current.humidity_percent ?? '—'}%`, 'Humidity', <Droplets size={14} />, '#3b82f6')}
                    {wid(`${c.current.rainfall_mm ?? '0'}mm`, 'Rainfall', <CloudRain size={14} />, '#6366f1')}
                    {wid(`${c.current.wind_speed_kmh ?? '—'} km/h`, 'Wind Speed', <Wind size={14} />, '#a3a3a3')}
                    {wid(c.current.wind_direction != null ? `${c.current.wind_direction}°` : '—', 'Wind Dir', <Navigation size={14} />, '#78716c')}
                    {wid(c.current.pressure_msl != null ? `${c.current.pressure_msl} hPa` : '—', 'Pressure', <Gauge size={14} />, '#78716c')}
                    {wid(c.current.cloud_cover_pct != null ? `${c.current.cloud_cover_pct}%` : '—', 'Cloud Cover', <Cloud size={14} />, '#78716c')}
                    {wid(c.current.uv_index != null ? c.current.uv_index : '—', 'UV Index', <Sun size={14} />, '#eab308')}
                  </div>
                  {c.current.dew_point_c != null && <p className="text-xs text-stone-500 mb-3">Dew Point: {c.current.dew_point_c}°C · Source: {r.weather?.source || 'Open-Meteo'}</p>}

                  {/* 7-day forecast */}
                  {c.forecast_7day?.max_temp?.length > 0 && (
                    <div className="bg-stone-50 rounded-xl p-4 border border-stone-200">
                      <p className="text-[8px] font-black uppercase text-stone-500 mb-3">📅 7-Day Forecast</p>
                      <div className="grid grid-cols-7 gap-2">
                        {c.forecast_7day.max_temp.map((t, i) => (
                          <div key={i} className="text-center">
                            <p className="text-[9px] font-bold text-stone-400">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date().getDay() + i > 6 ? new Date().getDay() + i - 7 : new Date().getDay() + i]}</p>
                            <Thermometer size={14} className="mx-auto my-1 text-orange-500" />
                            <p className="font-black text-sm">{Math.round(t)}°</p>
                            <p className="text-[8px] text-stone-400">{c.forecast_7day.min_temp?.[i] != null ? `${Math.round(c.forecast_7day.min_temp[i])}°` : ''}</p>
                            <p className="text-[8px] text-blue-500">{c.forecast_7day.precipitation?.[i] != null ? `${Math.round(c.forecast_7day.precipitation[i])}mm` : ''}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* 3. Soil */}
            <div className="bg-white rounded-[2rem] p-6 border-2 border-stone-200 shadow-lg">
              <h3 className="text-[8px] font-black uppercase tracking-widest text-stone-400 mb-4">🧪 Soil Intelligence</h3>
              {s?.status === 'complete' ? (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2 mb-4">
                    {wid(s.texture, 'Texture', <Layers size={14} />, '#84cc16')}
                    {wid(s.ph, 'pH', <FlaskConical size={14} />, s.ph >= 6 && s.ph <= 7 ? '#84cc16' : '#f97316')}
                    {wid(`${s.organic_carbon_pct}%`, 'Org Carbon', <Sprout size={14} />, '#10b981')}
                    {wid(s.cec_meq_100g, 'CEC', <Target size={14} />, '#78716c')}
                    {wid(s.ec_ms_per_cm != null ? `${s.ec_ms_per_cm} mS/cm` : '—', 'EC', <Zap size={14} />, '#78716c')}
                    {wid(s.n != null ? `${s.n} kg/ha` : '—', 'Nitrogen', <Sprout size={14} />, s.n >= 50 ? '#84cc16' : '#ef4444')}
                    {wid(s.p != null ? `${s.p} kg/ha` : '—', 'Phosphorus', <Sprout size={14} />, s.p >= 20 ? '#84cc16' : '#ef4444')}
                    {wid(s.k != null ? `${s.k} kg/ha` : '—', 'Potassium', <Sprout size={14} />, s.k >= 30 ? '#84cc16' : '#ef4444')}
                    {wid(s.moisture_pct != null ? `${s.moisture_pct}%` : '—', 'Moisture', <Droplets size={14} />, '#3b82f6')}
                    {wid(s.groundwater_depth_m != null ? `${s.groundwater_depth_m}m` : '—', 'GW Depth', <Waves size={14} />, '#3b82f6')}
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                    <div className="bg-stone-50 rounded-lg p-3 border border-stone-200"><span className="font-bold text-stone-600">Water Retention:</span> {s.water_retention || '—'}</div>
                    <div className="bg-stone-50 rounded-lg p-3 border border-stone-200"><span className="font-bold text-stone-600">Drainage:</span> {s.drainage || '—'}</div>
                    <div className="bg-stone-50 rounded-lg p-3 border border-stone-200"><span className="font-bold text-stone-600">Data:</span> {s.data_source || s.source || '—'}</div>
                  </div>
                  {s.deficiencies?.length > 0 && (
                    <div className="bg-red-50 rounded-xl p-3 border border-red-200">
                      <p className="text-[8px] font-black uppercase text-red-600 mb-2">⚠️ Soil Deficiencies</p>
                      {s.deficiencies.map((d, i) => <p key={i} className="text-xs text-stone-700 mb-1">• {d.element}: {d.status} — {d.advice}</p>)}
                    </div>
                  )}
                </>
              ) : <p className="text-stone-400 text-sm italic">Enter location to see soil analysis</p>}
            </div>

            {/* 4. Water */}
            {w && (
              <div className="bg-white rounded-[2rem] p-6 border-2 border-stone-200 shadow-lg">
                <h3 className="text-[8px] font-black uppercase tracking-widest text-stone-400 mb-4">💧 Water Availability</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                  {wid(w.status, 'Status', <Droplets size={14} />, w.status === 'High' ? '#3b82f6' : w.status === 'Moderate' ? '#eab308' : '#ef4444')}
                  {wid(`${w.current_rainfall_mm}mm`, 'Rainfall', <CloudRain size={14} />, '#6366f1')}
                  {wid(`${w.evapotranspiration_mm}mm`, 'ET₀', <Sun size={14} />, '#f97316')}
                  {wid(w.irrigation_requirement, 'Irrigation', <Waves size={14} />, '#3b82f6')}
                </div>
              </div>
            )}

            {/* 6. Recommendations */}
            {recs && (
              <div className="grid md:grid-cols-2 gap-4">
                {recs.soil_amendments?.length > 0 && <div className="t-card rounded-[2rem] p-6 border-2 t-border shadow-lg"><h3 className="text-[8px] font-black uppercase text-green-600 mb-3">🧪 Soil Amendments</h3>{recs.soil_amendments.map((r, i) => <p key={i} className="text-xs t-text-secondary mb-1">→ {r}</p>)}</div>}
                {recs.irrigation_advice?.length > 0 && <div className="t-card rounded-[2rem] p-6 border-2 t-border shadow-lg"><h3 className="text-[8px] font-black uppercase text-blue-600 mb-3">💧 Irrigation</h3>{recs.irrigation_advice.map((r, i) => <p key={i} className="text-xs t-text-secondary mb-1">→ {r}</p>)}</div>}
                {recs.crop_rotation?.length > 0 && <div className="t-card rounded-[2rem] p-6 border-2 t-border shadow-lg"><h3 className="text-[8px] font-black uppercase text-[#84cc16] mb-3">🔄 Crop Rotation</h3>{recs.crop_rotation.map((r, i) => <p key={i} className="text-xs t-text-secondary mb-1">→ {r}</p>)}</div>}
                {recs.conservation?.length > 0 && <div className="t-card rounded-[2rem] p-6 border-2 t-border shadow-lg"><h3 className="text-[8px] font-black uppercase text-amber-600 mb-3">🌍 Conservation</h3>{recs.conservation.map((r, i) => <p key={i} className="text-xs t-text-secondary mb-1">→ {r}</p>)}</div>}
              </div>
            )}

            {/* Dynamic Crop Recommendations */}
            {dynamicCropsLoading && (
              <div className="bg-[#84cc16]/10 rounded-[2rem] p-8 border-2 border-[#84cc16]/20 shadow-lg flex items-center gap-4">
                <Loader2 size={24} className="animate-spin text-[#84cc16]" />
                <div>
                  <p className="font-black text-[#84cc16]">Evaluating Real-Time Crop Recommendations...</p>
                  <p className="text-xs text-[#84cc16]/80">Checking live regional plantation cycles & high-value agricultural alternatives</p>
                </div>
              </div>
            )}

            {!dynamicCropsLoading && dynamicCrops && (
              <div className="space-y-6">
                {/* Most Commonly Grown Crops */}
                {dynamicCrops.most_planted_crops?.length > 0 && (
                  <div className="t-card rounded-[2rem] p-6 border-2 border-[#84cc16]/20 shadow-lg">
                    <p className="text-[8px] font-black uppercase tracking-widest text-[#84cc16] mb-3 flex items-center gap-2">
                      <Layers size={14} className="text-[#84cc16]" /> Most Commonly Grown Crops in this Region
                    </p>
                    <p className="text-[10px] t-text-muted mb-4 italic">
                      These are the staple crops most successfully and widely planted by local farmers in this district/district profile.
                    </p>
                    <div className="grid md:grid-cols-3 gap-4">
                      {dynamicCrops.most_planted_crops.map((bc, i) => (
                        <div key={i} className="t-bg-input rounded-2xl p-4 border t-border hover:border-[#84cc16]/30 transition-all flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <p className="font-black t-text text-sm">{bc.name || bc.crop}</p>
                              <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase bg-[#84cc16]/10 text-[#84cc16]">
                                {bc.duration_days ? `${bc.duration_days} Days` : 'Standard'}
                              </span>
                            </div>
                            {bc.scientific && <p className="text-[9px] t-text-muted italic mb-2">{bc.scientific}</p>}
                            <p className="text-[10px] t-text-secondary leading-relaxed">{bc.reason}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Best Alternative / High-Value Crops */}
                {dynamicCrops.alternative_crops?.length > 0 && (
                  <div className="t-card rounded-[2rem] p-6 border-2 border-[#8b5cf6]/20 shadow-lg">
                    <p className="text-[8px] font-black uppercase tracking-widest text-[#8b5cf6] mb-3 flex items-center gap-2">
                      <Sprout size={14} className="text-[#8b5cf6]" /> Best High-Value Alternative Recommendations
                    </p>
                    <p className="text-[10px] t-text-muted mb-4 italic">
                      These crops are not typical but match your live environmental conditions perfectly for maximum commercial yield.
                    </p>
                    <div className="grid md:grid-cols-3 gap-4">
                      {dynamicCrops.alternative_crops.map((bc, i) => (
                        <div key={i} className="t-bg-input rounded-2xl p-4 border t-border hover:border-[#8b5cf6]/30 transition-all flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <p className="font-black t-text text-sm">{bc.name || bc.crop}</p>
                              <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase bg-[#8b5cf6]/10 text-[#8b5cf6]">
                                {bc.duration_days ? `${bc.duration_days} Days` : 'Standard'}
                              </span>
                            </div>
                            {bc.scientific && <p className="text-[9px] t-text-muted italic mb-2">{bc.scientific}</p>}
                            <p className="text-[10px] t-text-secondary leading-relaxed">{bc.reason}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 8. AI Insights */}
            {aiLoading && (
              <div className="bg-[#8b5cf6]/10 rounded-[2rem] p-8 border-2 border-[#8b5cf6]/20 shadow-lg flex items-center gap-4">
                <Loader2 size={24} className="animate-spin text-[#8b5cf6]" />
                <div><p className="font-black text-[#8b5cf6]">Generating AI Insights...</p><p className="text-xs text-[#8b5cf6]/80">Analyzing soil, weather & crop data</p></div>
              </div>
            )}
            {aiInsight && !aiLoading && (
              <div className="t-bg-elevated rounded-[2rem] p-6 border-2 border-[#8b5cf6]/20 shadow-lg">
                <div className="flex items-center gap-2 mb-4">
                  <Brain size={18} className="text-[#8b5cf6]" />
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-[#8b5cf6]">🧠 AI Expert Insights</h3>
                  <span className="ml-auto text-[8px] t-text-muted t-bg-input px-2 py-1 rounded-full">Powered by Groq</span>
                </div>
                {aiInsight.expert_summary && (
                  <div className="t-bg-card rounded-xl p-4 border border-[#8b5cf6]/20 mb-4">
                    <p className="text-sm t-text leading-relaxed">{aiInsight.expert_summary}</p>
                  </div>
                )}
                {aiInsight.soil_health_assessment && (
                  <div className="t-bg-card rounded-xl p-4 border t-border mb-3">
                    <p className="text-[8px] font-black uppercase text-[#84cc16] mb-1">🧪 Soil Health</p>
                    <p className="text-xs t-text-secondary">{aiInsight.soil_health_assessment}</p>
                  </div>
                )}
                {aiInsight.improvement_actions?.length > 0 && (
                  <div className="t-bg-card rounded-xl p-4 border t-border mb-3">
                    <p className="text-[8px] font-black uppercase text-amber-500 mb-2">📋 Improvement Plan</p>
                    {aiInsight.improvement_actions.map((a, i) => (
                      <div key={i} className="flex items-start gap-2 mb-2">
                        <span className={`text-[8px] px-1.5 py-0.5 rounded font-black ${a.priority === 'High' ? 'bg-red-500/10 text-red-500' : a.priority === 'Medium' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-green-500/10 text-green-500'}`}>{a.priority}</span>
                        <div><p className="text-xs font-bold t-text">{a.action}</p><p className="text-[10px] t-text-secondary">{a.benefit}</p></div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="grid md:grid-cols-2 gap-3">
                  {aiInsight.seasonal_advice && (
                    <div className="t-bg-card rounded-xl p-4 border t-border">
                      <p className="text-[8px] font-black uppercase text-[#8b5cf6] mb-2">📅 Seasonal Advice</p>
                      <p className="text-xs t-text-secondary mb-1"><span className="font-bold t-text">Now:</span> {aiInsight.seasonal_advice.current_season}</p>
                      <p className="text-xs t-text-secondary"><span className="font-bold t-text">Next:</span> {aiInsight.seasonal_advice.next_season}</p>
                    </div>
                  )}
                  {aiInsight.risk_warnings?.length > 0 && (
                    <div className="bg-red-500/10 rounded-xl p-4 border border-red-500/20">
                      <p className="text-[8px] font-black uppercase text-red-500 mb-2">⚠️ Risk Alerts</p>
                      {aiInsight.risk_warnings.map((w, i) => <p key={i} className="text-xs text-red-400 mb-1">• {w}</p>)}
                    </div>
                  )}
                </div>
                {aiInsight.profit_tip && (
                  <div className="mt-3 bg-[#84cc16]/10 rounded-xl p-4 border border-[#84cc16]/20">
                    <p className="text-[8px] font-black uppercase text-[#84cc16] mb-1"><Lightbulb size={12} className="inline" /> Profit Tip</p>
                    <p className="text-xs t-text">{aiInsight.profit_tip}</p>
                  </div>
                )}
                {aiInsight.additional_crops?.length > 0 && (
                  <div className="mt-4 t-bg-card rounded-xl p-4 border-2 border-[#84cc16]/20">
                    <p className="text-[8px] font-black uppercase tracking-widest text-[#84cc16] mb-3 flex items-center gap-2"><Brain size={14} /> AI-Discovered Crops for Your Land</p>
                    <p className="text-[10px] t-text-muted mb-3 italic">These crops aren't in our standard database but the AI identifies them as viable for your specific conditions.</p>
                    <div className="grid md:grid-cols-2 gap-3">
                      {aiInsight.additional_crops.map((ac, i) => (
                        <div key={i} className="t-bg-input rounded-xl p-4 border t-border hover:border-[#84cc16]/30 transition-all">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <p className="font-black t-text text-sm">{ac.name}</p>
                              <p className="text-[9px] t-text-muted italic">{ac.scientific}</p>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${ac.estimated_profit === 'High' ? 'bg-green-500/10 text-green-500' : ac.estimated_profit === 'Medium' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-stone-500/10 text-stone-400'}`}>
                              {ac.estimated_profit} Profit
                            </span>
                          </div>
                          <p className="text-[10px] t-text-secondary">{ac.reason}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 8. Footer */}
            <div className="text-center text-[9px] t-text-muted border-t t-border pt-6 mt-6">
              <p>Weather: Open-Meteo · Soil: ISRIC SoilGrids · Insights: Groq AI</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
