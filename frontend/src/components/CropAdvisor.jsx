import React, { useState, useEffect, useRef } from 'react';
import { Sprout, MapPin, Loader2, AlertTriangle, DollarSign, Shield, Calendar, ChevronDown, ChevronUp, Droplets, Sun, Thermometer, CloudRain } from 'lucide-react';
import axios from 'axios';

const GrainOverlay = () => <div className="grain-overlay opacity-20" />;
const ALL_CROPS = ['Paddy','Ragi','Coffee','Sugarcane','Tomato','Potato','Maize','Capsicum','Soybean','Grape','Orange','Apple','Cotton','Sunflower','Groundnut','Mustard','Wheat','Barley','Jowar','Bajra'];

export default function CropAdvisor() {
  const [crop, setCrop] = useState('');
  const [city, setCity] = useState('');
  const [lat, setLat] = useState(null); const [lon, setLon] = useState(null);
  const [loading, setLoading] = useState(false);
  const [knowledge, setKnowledge] = useState(null);
  const [economics, setEconomics] = useState(null);
  const [diseases, setDiseases] = useState(null);
  const [error, setError] = useState(null);
  const [gpsDetecting, setGpsDetecting] = useState(false);
  const [expandedStage, setExpandedStage] = useState(null);
  const [weather, setWeather] = useState(null);
  const cityRef = useRef(null);
  const [citySuggestions, setCitySuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (city.length < 2) { setCitySuggestions([]); return; }
    const t = setTimeout(async () => {
      try { 
        const r = await axios.get(`/api/cities?q=${encodeURIComponent(city)}`); 
        setCitySuggestions(r.data.cities || []); 
        setShowDropdown(r.data.cities?.length > 0); 
      } catch {}
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
         try { 
           const r = await axios.post('/api/diagnostics/location', { lat: pos.coords.latitude, lon: pos.coords.longitude }); 
           setResult(r.data); 
           if (r.data.location?.city) setCity(r.data.location.city);
         }
         catch (err) { setError(err.response?.data?.error || err.message); }
         finally { setLoading(false); }
       },
       () => { setGpsDetecting(false); setError('GPS failed'); },
       { enableHighAccuracy: true, timeout: 10000 }
     );
   };

  const analyze = async () => {
    if (!crop) { setError('Select a crop'); return; }
    setLoading(true); setError(null); setKnowledge(null); setEconomics(null); setDiseases(null); setWeather(null);
    try {
      const [knowRes, anaRes] = await Promise.all([
        axios.get(`/api/knowledge/${crop}/lifecycle`),
        axios.post('/api/crop-analyzer', { crop, city: city || 'Mysore', N: null, P: null, K: null, ph: null })
      ]);
      setKnowledge(knowRes.data);
      setEconomics(anaRes.data?.economics || null);
      setDiseases(anaRes.data?.diseases || null);
      setWeather(anaRes.data?.weather || null);
    } catch (err) { setError(err.response?.data?.error || err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (crop && city) analyze(); }, [lat, lon]);

  const getDiseaseForPhase = (phaseName) => {
    if (!diseases) return [];
    return diseases.filter(d => d.name?.toLowerCase().includes(phaseName.toLowerCase().slice(0, 5)) || Math.random() > 0.5).slice(0, 2);
  };

  const stageCost = (idx) => {
    const total = economics?.total_a2fl_cost || 28500;
    const weights = [0.15, 0.15, 0.2, 0.2, 0.15, 0.15];
    return Math.round(total * (weights[idx] || 0.15));
  };

  return (
    <div className="pt-24 min-h-screen bg-[#fafaf9]">
      <GrainOverlay />
      <div className="max-w-4xl mx-auto px-6 pb-20">
        <div className="mb-8">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#84cc16] mb-2">Crop Lifecycle Analysis</p>
          <h1 className="font-serif text-5xl font-black text-[#0c0a09]">Crop <span className="italic text-[#84cc16]">Advisor</span></h1>
          <p className="text-stone-500 mt-2">Select a crop, detect your location, and get a full lifecycle plan</p>
        </div>

        {/* Input */}
        <div className="bg-white rounded-[2rem] p-6 border-2 border-stone-200 shadow-lg mb-8">
          <div className="flex flex-wrap items-end gap-4">
            <div className="w-56">
              <label className="block font-black text-xs text-stone-500 mb-1">🌾 Select Crop</label>
              <select value={crop} onChange={e => setCrop(e.target.value)}
                className="w-full bg-stone-50 border-2 border-stone-200 rounded-xl p-3 font-bold text-stone-700 outline-none focus:ring-4 focus:ring-[#84cc16]/10 focus:border-[#84cc16] text-sm">
                <option value="">Choose...</option>
                {ALL_CROPS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex-1 min-w-[180px]">
              <label className="block font-black text-xs text-stone-500 mb-1">📍 Location</label>
              <div className="flex gap-2">
                <input type="text" value={city} onChange={e => setCity(e.target.value)} placeholder={gpsDetecting?'Detecting...':'City or GPS'}
                  className="flex-1 bg-stone-50 border-2 border-stone-200 rounded-xl p-3 font-bold text-stone-700 outline-none focus:ring-4 focus:ring-[#84cc16]/10 focus:border-[#84cc16] text-sm" />
                <button onClick={detectLocation} disabled={gpsDetecting}
                  className="px-4 bg-[#0c0a09] text-white rounded-xl font-black text-xs hover:bg-stone-800 disabled:opacity-50 flex items-center gap-2">
                  {gpsDetecting ? <Loader2 size={14} className="animate-spin" /> : <MapPin size={14} />}GPS
                </button>
              </div>
            </div>
            <button onClick={analyze} disabled={loading||!crop}
              className="px-8 py-3 bg-[#84cc16] text-[#0c0a09] font-black text-sm rounded-xl hover:bg-[#facc15] shadow-lg disabled:opacity-50 transition-all flex items-center gap-2">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Sprout size={16} />}
              {loading ? 'Loading...' : 'Analyze Crop'}
            </button>
          </div>
          {error && <p className="text-red-600 text-xs font-bold mt-3"><AlertTriangle size={12} className="inline" /> {error}</p>}
        </div>

        {loading && <div className="flex items-center justify-center py-20"><Loader2 size={32} className="animate-spin text-[#84cc16]" /><span className="ml-4 font-black text-stone-500">Loading crop data...</span></div>}

        {knowledge && !loading && (
          <div className="space-y-6">
            {/* Crop Header */}
            <div className="bg-gradient-to-r from-[#84cc16]/10 to-transparent rounded-[2rem] p-6 border border-[#84cc16]/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[8px] font-black uppercase text-[#84cc16] tracking-widest">{knowledge.crop_info?.scientific_name || crop}</p>
                  <h2 className="font-serif text-4xl font-black text-[#0c0a09]">{knowledge.crop_info?.name || crop}</h2>
                  <p className="text-sm text-stone-500 mt-1">{knowledge.crop_info?.total_duration_days} days · {city || 'GPS location'}</p>
                </div>
                {weather && (
                  <div className="text-right text-xs">
                    <p className="text-stone-500">{weather.temperature}°C / {weather.humidity}%</p>
                    <p className="text-stone-400">{weather.rainfall}mm · {weather.season}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Lifecycle Stages */}
            <div className="space-y-3">
              <p className="text-[8px] font-black uppercase tracking-widest text-stone-400">📋 Lifecycle Stages ({knowledge.lifecycle_phases?.length || 0} phases)</p>
              {knowledge.lifecycle_phases?.map((phase, idx) => (
                <div key={phase.phase_id || idx} className="bg-white rounded-2xl border-2 border-stone-200 shadow-sm overflow-hidden">
                  <button onClick={() => setExpandedStage(expandedStage === idx ? null : idx)}
                    className="w-full flex items-center justify-between p-5 text-left hover:bg-stone-50 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-[#84cc16]/10 flex items-center justify-center">
                        <span className="font-black text-[#84cc16]">{idx + 1}</span>
                      </div>
                      <div>
                        <p className="font-black text-sm text-[#0c0a09]">{phase.phase_name}</p>
                        <p className="text-[10px] text-stone-500">{phase.duration_days} days</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-bold text-stone-400">₹{stageCost(idx).toLocaleString()}</span>
                      <ChevronDown size={16} className={`text-stone-400 transition-transform ${expandedStage === idx ? 'rotate-180' : ''}`} />
                    </div>
                  </button>
                  {expandedStage === idx && (
                    <div className="px-5 pb-5 space-y-4 border-t border-stone-100 pt-4">
                      {/* Procedures */}
                      {phase.procedures?.length > 0 && (
                        <div>
                          <p className="text-[8px] font-black uppercase text-green-600 mb-2">✅ Procedures</p>
                          <ul className="space-y-1">
                            {phase.procedures.map((p, i) => <li key={i} className="text-xs text-stone-700 flex items-start gap-2"><span className="text-[#84cc16] mt-0.5">→</span>{p}</li>)}
                          </ul>
                        </div>
                      )}
                      {/* Preventive Tips */}
                      {phase.preventive_tips?.length > 0 && (
                        <div>
                          <p className="text-[8px] font-black uppercase text-blue-600 mb-2">🛡️ Prevention</p>
                          <ul className="space-y-1">
                            {phase.preventive_tips.map((t, i) => <li key={i} className="text-xs text-stone-600 flex items-start gap-2"><span className="text-blue-500 mt-0.5">•</span>{t}</li>)}
                          </ul>
                        </div>
                      )}
                      {/* Diseases for this stage */}
                      {phase.common_diseases?.length > 0 && knowledge.disease_protocols && (
                        <div>
                          <p className="text-[8px] font-black uppercase text-red-600 mb-2">🦠 Diseases in this Stage</p>
                          {phase.common_diseases.map(did => {
                            const proto = knowledge.disease_protocols[did];
                            if (!proto) return null;
                            return (
                              <div key={did} className="bg-red-50 rounded-xl p-3 border border-red-200 mb-2">
                                <div className="flex items-center justify-between">
                                  <p className="font-bold text-xs text-red-800">{proto.name}</p>
                                  <span className={`px-2 py-0.5 rounded-full text-[8px] font-black ${proto.risk === 'High' ? 'bg-red-200 text-red-700' : proto.risk === 'Moderate' ? 'bg-yellow-200 text-yellow-700' : 'bg-green-200 text-green-700'}`}>{proto.risk || 'N/A'}</span>
                                </div>
                                <p className="text-[10px] text-stone-600 mt-1">{proto.scientific && <span className="italic">{proto.scientific}</span>}</p>
                                {proto.symptoms?.length > 0 && <p className="text-[9px] text-stone-500 mt-1">Symptoms: {proto.symptoms.slice(0, 2).join(', ')}</p>}
                                {proto.management_procedures && (
                                  <div className="mt-2 text-[9px]">
                                    {proto.management_procedures.organic?.length > 0 && <p className="text-green-700">🌿 Organic: {proto.management_procedures.organic.slice(0, 2).join(', ')}</p>}
                                    {proto.management_procedures.chemical?.length > 0 && <p className="text-orange-700">🧪 Chemical: {proto.management_procedures.chemical.slice(0, 2).join(', ')}</p>}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {/* Investment for this stage */}
                      <div className="bg-stone-50 rounded-xl p-3 border border-stone-200">
                        <p className="text-[8px] font-black uppercase text-stone-500 mb-1">💰 Estimated Investment</p>
                        <p className="font-black text-lg text-stone-700">₹{stageCost(idx).toLocaleString()}</p>
                        <p className="text-[9px] text-stone-400">{((stageCost(idx) / (economics?.total_a2fl_cost || 28500)) * 100).toFixed(0)}% of total cultivation cost</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Total Investment */}
            {economics && (
              <div className="bg-gradient-to-r from-stone-900 to-stone-800 rounded-[2rem] p-6 border border-stone-700 text-white">
                <p className="text-[8px] font-black uppercase text-stone-400 mb-3">💰 Total Investment & Returns</p>
                <div className="grid grid-cols-4 gap-3 text-xs">
                  <div className="text-center"><p className="text-stone-400">Total Cost</p><p className="font-black text-lg">₹{(economics.total_a2fl_cost || 0).toLocaleString()}</p></div>
                  <div className="text-center"><p className="text-stone-400">Revenue</p><p className="font-black text-lg text-green-400">₹{(economics.expected_revenue || 0).toLocaleString()}</p></div>
                  <div className="text-center"><p className="text-stone-400">Profit</p><p className={`font-black text-lg ${(economics.profit || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>₹{(economics.profit || 0).toLocaleString()}</p></div>
                  <div className="text-center"><p className="text-stone-400">ROI</p><p className="font-black text-lg text-[#84cc16]">{economics.roi_percent || 0}%</p></div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
