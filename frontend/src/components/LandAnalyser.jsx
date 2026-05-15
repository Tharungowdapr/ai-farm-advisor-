import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Search, Loader2, Thermometer, Droplets, CloudRain, Wind, AlertTriangle, CheckCircle2, Sun, ChevronDown, ChevronUp, DollarSign, Calendar, Shield, Sprout, Target, TrendingUp, Compass, Eye, Gauge, Cloud, Waves, Layers, Navigation, FlaskConical, Zap } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
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

  const detectLocation = () => {
    if (!navigator.geolocation) { setError('GPS not available'); return; }
    setGpsDetecting(true); setError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setCity(`${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
        setGpsDetecting(false); setLoading(true);
        try { const r = await axios.post('/api/diagnostics/location', { lat: pos.coords.latitude, lon: pos.coords.longitude }); setResult(r.data); if (r.data.location?.city) setCity(r.data.location.city); }
        catch (err) { setError(err.response?.data?.error || err.message); }
        finally { setLoading(false); }
      },
      () => { setGpsDetecting(false); setError('GPS failed'); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!city) { setError('Enter a city'); return; }
    setLoading(true); setError(null); setResult(null);
    try { const r = await axios.post('/api/diagnostics/location', { city }); setResult(r.data); if (r.data.location?.city) setCity(r.data.location.city); }
    catch (err) { setError(err.response?.data?.error || err.message); }
    finally { setLoading(false); }
  };

  const r = result; const c = r?.climate; const s = r?.soil; const w = r?.water; const cr = r?.crop_suitability; const recs = r?.recommendations;

  const wid = (val, label, icon, color) => (
    <div className="bg-white rounded-xl p-3 border border-stone-200 shadow-sm">
      <div className="flex items-center gap-1.5 mb-1"><span style={{color}}>{icon}</span><span className="text-[8px] font-black uppercase text-stone-400">{label}</span></div>
      <p className="font-black text-lg text-[#0c0a09]">{val ?? '—'}</p>
    </div>
  );

  return (
    <div className="pt-24 min-h-screen bg-[#fafaf9]">
      <GrainOverlay />
      <div className="max-w-7xl mx-auto px-6 pb-20">
        {/* Header */}
        <div className="mb-8">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#84cc16] mb-2">VaniAI Geospatial Intelligence</p>
          <h1 className="font-serif text-5xl font-black text-[#0c0a09]">Land <span className="italic text-[#84cc16]">Analyser</span></h1>
          <p className="text-stone-500 mt-2">GPS-powered land analysis with real-time weather, soil intelligence & crop suitability</p>
        </div>

        {/* Search */}
        <div className="bg-white rounded-[2rem] p-5 border-2 border-stone-200 shadow-lg mb-8" ref={cityRef}>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px]">
              <label className="block font-black text-[9px] text-stone-500 mb-1 uppercase">📍 Search Karnataka City</label>
              <div className="flex gap-2">
                <input value={city} onChange={e => { setCity(e.target.value); setShowDropdown(true); }}
                  placeholder={gpsDetecting ? 'Detecting...' : 'Type city name...'}
                  className="flex-1 bg-stone-50 border-2 border-stone-200 rounded-xl p-3 font-bold text-sm text-stone-700 outline-none focus:ring-4 focus:ring-[#84cc16]/10 focus:border-[#84cc16]"
                  onFocus={() => citySuggestions.length > 0 && setShowDropdown(true)} />
                <button onClick={detectLocation} disabled={gpsDetecting}
                  className="px-4 bg-[#0c0a09] text-white rounded-xl font-black text-xs hover:bg-stone-800 disabled:opacity-50 flex items-center gap-1.5">
                  {gpsDetecting ? <Loader2 size={13} className="animate-spin" /> : <Navigation size={13} />}GPS
                </button>
              </div>
              {showDropdown && citySuggestions.length > 0 && (
                <div className="absolute z-50 mt-1 bg-white border-2 border-stone-200 rounded-xl shadow-xl max-h-44 overflow-y-auto w-[calc(100%-60px)]">
                  {citySuggestions.map((c, i) => (
                    <button key={i} onMouseDown={() => { setCity(c.city); setShowDropdown(false); }}
                      className="w-full text-left px-4 py-2.5 text-sm font-bold text-stone-700 hover:bg-[#84cc16]/10 border-b border-stone-100 last:border-0">
                      {c.city} <span className="text-stone-400 text-xs">{c.district}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={handleSubmit} disabled={loading||!city}
              className="px-8 py-3.5 bg-[#84cc16] text-[#0c0a09] font-black text-sm rounded-xl hover:bg-[#facc15] shadow-lg disabled:opacity-50 flex items-center gap-2">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              {loading ? 'Analyzing...' : 'Analyze Land'}
            </button>
          </div>
          {error && <p className="text-red-600 text-xs font-bold mt-2"><AlertTriangle size={12} className="inline" /> {error}</p>}
        </div>

        {loading && <div className="flex items-center justify-center py-20"><Loader2 size={32} className="animate-spin text-[#84cc16]" /><span className="ml-4 font-black text-stone-500">Analyzing your land...</span></div>}

        {r && !loading && (
          <div className="space-y-6">
            {/* 1. Location */}
            <div className="bg-gradient-to-r from-[#84cc16]/10 to-transparent rounded-[2rem] p-6 border border-[#84cc16]/20 flex items-center justify-between">
              <div><p className="text-[8px] font-black uppercase text-[#84cc16]">📍 Live Location</p><p className="font-black text-xl text-[#0c0a09]">{r.location?.city || '—'}</p><p className="text-xs text-stone-500">{r.location?.lat?.toFixed(4)}, {r.location?.lon?.toFixed(4)} · Elev: {r.topography?.elevation_m ?? '—'}m</p></div>
              <div className="text-right text-xs text-stone-400"><Sun size={20} className="ml-auto mb-1 text-yellow-500" />{c?.season?.name}</div>
            </div>

            {/* 2. Weather */}
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

            {/* 5. Crops */}
            {cr && (
              <div className="bg-white rounded-[2rem] p-6 border-2 border-stone-200 shadow-lg">
                <h3 className="text-[8px] font-black uppercase tracking-widest text-stone-400 mb-2">🌾 Crop Suitability</h3>
                <p className="text-[9px] text-stone-400 mb-4 italic">{cr.methodology}</p>
                {cr.score_distribution && (
                  <div className="flex gap-1 mb-4">
                    {[{l:'Exc',c:'green',v:cr.score_distribution.excellent},{l:'Good',c:'lime',v:cr.score_distribution.good},{l:'Fair',c:'yellow',v:cr.score_distribution.fair},{l:'Marg',c:'orange',v:cr.score_distribution.marginal},{l:'Poor',c:'red',v:cr.score_distribution.poor}].map(gr => (
                      <div key={gr.l} className="flex-1 text-center p-1.5 rounded-lg bg-stone-50 border border-stone-200">
                        <p className="font-black text-sm">{gr.v}</p>
                        <p className="text-[7px] font-bold uppercase text-stone-400">{gr.l}</p>
                      </div>
                    ))}
                  </div>
                )}
                <div className="space-y-2">
                  {cr.best_crops?.map((crop, i) => (
                    <div key={i}>
                      <button onClick={() => setExpandedCrop(expandedCrop === crop.crop ? null : crop.crop)}
                        className="w-full text-left bg-stone-50 rounded-xl p-4 border border-stone-200 hover:border-[#84cc16]/30 transition-all">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm ${i === 0 ? 'bg-[#84cc16] text-[#0c0a09]' : i < 3 ? 'bg-[#84cc16]/20 text-[#84cc16]' : 'bg-stone-200 text-stone-600'}`}>{i + 1}</span>
                            <div><p className="font-black text-[#0c0a09]">{crop.crop}</p><p className="text-[9px] text-stone-500">{crop.water_requirement} mm · {crop.duration_days} days</p></div>
                          </div>
                          <div className="text-right">
                            <p className={`font-black text-lg ${crop.score >= 80 ? 'text-green-600' : crop.score >= 65 ? 'text-lime-600' : crop.score >= 50 ? 'text-yellow-600' : 'text-orange-600'}`}>{crop.score}/100</p>
                            <p className="text-[8px] font-black uppercase text-stone-400">{crop.grade}</p>
                          </div>
                        </div>
                      </button>
                      {expandedCrop === crop.crop && (
                        <div className="ml-4 mt-1 mb-3 p-4 bg-[#84cc16]/5 rounded-xl border border-[#84cc16]/20 space-y-2">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                            <div className="bg-white rounded-lg p-2 border border-stone-100"><p className="text-stone-400">Market Price</p><p className="font-bold">₹{crop.market_price_msp}/q</p></div>
                            <div className="bg-white rounded-lg p-2 border border-stone-100"><p className="text-stone-400">Input Cost</p><p className="font-bold">₹{crop.input_cost}/acre</p></div>
                            <div className="bg-white rounded-lg p-2 border border-stone-100"><p className="text-stone-400">Risk</p><p className={`font-bold ${crop.risk_level === 'Low' ? 'text-green-600' : crop.risk_level === 'Moderate' ? 'text-yellow-600' : 'text-red-600'}`}>{crop.risk_level}</p></div>
                            <div className="bg-white rounded-lg p-2 border border-stone-100"><p className="text-stone-400">Companion</p><p className="font-bold">{crop.companion_crops?.slice(0,2).join(', ') || '—'}</p></div>
                          </div>
                          {crop.strengths?.length > 0 && <div><p className="text-[8px] font-black uppercase text-green-600 mb-1">✅ Strengths</p>{crop.strengths.map((s, i) => <p key={i} className="text-xs text-stone-700">• {s}</p>)}</div>}
                          {crop.weaknesses?.length > 0 && <div><p className="text-[8px] font-black uppercase text-red-600 mb-1">⚠️ Risks</p>{crop.weaknesses.map((w, i) => <p key={i} className="text-xs text-stone-700">• {w}</p>)}</div>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 6. Recommendations */}
            {recs && (
              <div className="grid md:grid-cols-2 gap-4">
                {recs.soil_amendments?.length > 0 && <div className="bg-white rounded-[2rem] p-6 border-2 border-stone-200 shadow-lg"><h3 className="text-[8px] font-black uppercase text-green-600 mb-3">🧪 Soil Amendments</h3>{recs.soil_amendments.map((r, i) => <p key={i} className="text-xs text-stone-700 mb-1">→ {r}</p>)}</div>}
                {recs.irrigation_advice?.length > 0 && <div className="bg-white rounded-[2rem] p-6 border-2 border-stone-200 shadow-lg"><h3 className="text-[8px] font-black uppercase text-blue-600 mb-3">💧 Irrigation</h3>{recs.irrigation_advice.map((r, i) => <p key={i} className="text-xs text-stone-700 mb-1">→ {r}</p>)}</div>}
                {recs.crop_rotation?.length > 0 && <div className="bg-white rounded-[2rem] p-6 border-2 border-stone-200 shadow-lg"><h3 className="text-[8px] font-black uppercase text-[#84cc16] mb-3">🔄 Crop Rotation</h3>{recs.crop_rotation.map((r, i) => <p key={i} className="text-xs text-stone-700 mb-1">→ {r}</p>)}</div>}
                {recs.conservation?.length > 0 && <div className="bg-white rounded-[2rem] p-6 border-2 border-stone-200 shadow-lg"><h3 className="text-[8px] font-black uppercase text-amber-600 mb-3">🌍 Conservation</h3>{recs.conservation.map((r, i) => <p key={i} className="text-xs text-stone-700 mb-1">→ {r}</p>)}</div>}
              </div>
            )}

            {/* 7. Footer */}
            <div className="text-center text-[9px] text-stone-400 border-t border-stone-200 pt-6">
              <p>Weather: Open-Meteo · Soil: ISRIC SoilGrids + Regional Estimates · Analysis: 12-dimension crop scoring</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
