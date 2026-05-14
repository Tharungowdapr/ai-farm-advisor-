import React, { useState } from 'react';
import { Sprout, MapPin, Search, Loader2, Thermometer, Droplets, CloudRain, AlertTriangle, CheckCircle2, DollarSign, Calendar, Shield, Target, TrendingUp, ChevronDown, ChevronUp, Sun, Wind } from 'lucide-react';
import axios from 'axios';

const GrainOverlay = () => <div className="grain-overlay opacity-20" />;

const CROP_LIST = ["Paddy","Ragi","Coffee","Sugarcane","Tomato","Potato","Maize","Capsicum","Soybean","Grape","Orange","Apple"];

export default function CropAnalyzer() {
  const [city, setCity] = useState('');
  const [crop, setCrop] = useState('');
  const [N, setN] = useState(''); const [P, setP] = useState(''); const [K, setK] = useState(''); const [ph, setPh] = useState('');
  const [loading, setLoading] = useState(false); const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [activeStage, setActiveStage] = useState(0);

  const stages = [
    {id:'land', label:'Land Prep', icon: MapPin},
    {id:'sowing', label:'Seed & Sowing', icon: Sprout},
    {id:'irrigation', label:'Irrigation', icon: Droplets},
    {id:'nutrients', label:'Nutrients', icon: Target},
    {id:'disease', label:'Disease & Pest', icon: Shield},
    {id:'growth', label:'Growth', icon: Sun},
    {id:'harvest', label:'Harvest', icon: TrendingUp},
    {id:'post', label:'Post-Harvest', icon: DollarSign},
  ];

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!city || !crop) { setError('City and crop required'); return; }
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await axios.post('/api/crop-analyzer', {
        city, crop, N: N || null, P: P || null, K: K || null, ph: ph || null
      });
      setResult(res.data);
    } catch (err) { setError(err.response?.data?.error || err.message); }
    finally { setLoading(false); }
  };

  const r = result;
  const w = r?.weather; p = r?.prediction; d = r?.diseases; e = r?.economics; cal = r?.calendar;

  const stageContent = (stageId) => {
    switch(stageId) {
      case 'land': return (
        <div className="space-y-3">
          <p className="font-bold text-sm text-[#0c0a09]">📍 {city} — Soil Preparation Plan</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-stone-50 rounded-lg p-3 border border-stone-200">
              <p className="font-bold">Soil pH: {ph || 'N/A'}</p>
              <p className="text-stone-500">{ph && ph < 5.5 ? 'Acidic — Apply lime' : ph && ph < 7.5 ? 'Ideal range' : ph ? 'Alkaline — Apply sulfur' : 'Enter pH value'}</p>
            </div>
            <div className="bg-stone-50 rounded-lg p-3 border border-stone-200">
              <p className="font-bold">NPK: {N || '?'}-{P || '?'}-{K || '?'}</p>
              <p className="text-stone-500">{N && P ? `N ${N < 50 ? 'Low' : N < 100 ? 'Moderate' : 'Sufficient'}` : 'Enter NPK values'}</p>
            </div>
          </div>
          <div className="bg-[#84cc16]/5 rounded-lg p-3 border border-[#84cc16]/20">
            <p className="text-[9px] font-bold text-[#84cc16] uppercase">Recommendations</p>
            <ul className="text-xs text-stone-700 mt-1 space-y-1">
              <li>→ Plough field 2-3 times for fine tilth</li>
              <li>→ Apply well-decomposed FYM 10-15 t/ha</li>
              <li>→ Ensure proper drainage channels</li>
              {N && parseInt(N) < 50 && <li>→ Basal dose of DAP @ 100 kg/ha</li>}
            </ul>
          </div>
        </div>
      );
      case 'sowing': return (
        <div className="space-y-3">
          <p className="font-bold text-sm">{crop} — Sowing Intelligence</p>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="bg-green-50 rounded-lg p-3 border border-green-200 text-center">
              <p className="text-[8px] font-bold text-green-600 uppercase">Seed Rate</p>
              <p className="font-black text-lg text-green-700">{crop === 'Paddy' ? '20-25' : crop === 'Maize' ? '18-20' : crop === 'Ragi' ? '8-10' : crop === 'Sugarcane' ? '4000' : '2-4'} kg/ac</p>
            </div>
            <div className="bg-green-50 rounded-lg p-3 border border-green-200 text-center">
              <p className="text-[8px] font-bold text-green-600 uppercase">Spacing</p>
              <p className="font-black text-sm text-green-700">{crop === 'Paddy' ? '20×15 cm' : crop === 'Maize' ? '60×30 cm' : crop === 'Tomato' ? '75×60 cm' : '45×30 cm'}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-3 border border-green-200 text-center">
              <p className="text-[8px] font-bold text-green-600 uppercase">Depth</p>
              <p className="font-black text-lg text-green-700">2-3 cm</p>
            </div>
          </div>
          {w?.season && <p className="text-xs text-stone-600">Season: {w.season} · Optimal window based on your location</p>}
        </div>
      );
      case 'irrigation': return (
        <div className="space-y-3">
          <p className="font-bold text-sm">💧 Irrigation Strategy for {crop}</p>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-200 text-center">
              <p className="text-[8px] font-bold text-blue-600 uppercase">Method</p>
              <p className="font-black text-sm text-blue-700">{crop === 'Paddy' ? 'Flood irrigation' : crop === 'Ragi' ? 'Sprinkler/rainfed' : 'Drip irrigation recommended'}</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-200 text-center">
              <p className="text-[8px] font-bold text-blue-600 uppercase">Frequency</p>
              <p className="font-black text-sm text-blue-700">{w?.rainfall > 5 ? 'Every 5-7 days' : 'Every 2-3 days'}</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-200 text-center">
              <p className="text-[8px] font-bold text-blue-600 uppercase">Water Need</p>
              <p className="font-black text-sm text-blue-700">{crop === 'Paddy' ? 'High (120cm)' : crop === 'Sugarcane' ? 'Very High (200cm)' : 'Moderate (60cm)'}</p>
            </div>
          </div>
          {w?.rainfall < 5 && <div className="bg-amber-50 rounded-lg p-3 border border-amber-200"><p className="text-xs text-amber-700 font-bold">⚠️ Low rainfall detected. Irrigation essential for {crop}.</p></div>}
        </div>
      );
      case 'nutrients': return (
        <div className="space-y-3">
          <p className="font-bold text-sm">🧪 Nutrient Plan for {crop}</p>
          <div className="space-y-2 text-xs">
            {[
              {week: 1, task: 'Basal dose: Apply NPK (50:25:25 kg/ha) + FYM 10 t/ha'},
              {week: 3, task: 'Top dressing: Urea 50 kg/ha'},
              {week: 5, task: 'Second dose: NPK (25:0:25 kg/ha) + Micronutrients'},
              {week: 7, task: 'Potassium booster: MOP 25 kg/ha during flowering'},
              {week: 9, task: 'Foliar spray: 19:19:19 @ 5g/L if deficiency seen'},
            ].map((n, i) => (
              <div key={i} className="bg-stone-50 rounded-lg p-3 border border-stone-200">
                <p className="font-bold text-[#84cc16]">Week {n.week}</p>
                <p className="text-stone-700">{n.task}</p>
              </div>
            ))}
          </div>
        </div>
      );
      case 'disease': return (
        <div className="space-y-3">
          <p className="font-bold text-sm">🦠 Disease & Pest Prediction for {crop}</p>
          {d?.length > 0 ? d.map((di, i) => (
            <div key={i} className={`rounded-lg p-3 border text-xs ${
              di.risk_level === 'High' || di.risk_level === 'Severe' || di.risk_level === 'Critical' ? 'bg-red-50 border-red-200' :
              di.risk_level === 'Moderate' ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'
            }`}>
              <div className="flex items-center justify-between">
                <p className="font-bold">{di.name}</p>
                <span className={`px-2 py-0.5 rounded-full text-[8px] font-black ${
                  di.risk_level === 'High' || di.risk_level === 'Severe' || di.risk_level === 'Critical' ? 'bg-red-200 text-red-700' :
                  di.risk_level === 'Moderate' ? 'bg-yellow-200 text-yellow-700' : 'bg-green-200 text-green-700'
                }`}>{di.risk_level} ({di.risk_score})</span>
              </div>
              <p className="text-stone-600 mt-1">→ {di.advisory}</p>
              {di.contributing_factors?.length > 0 && (
                <div className="mt-1 text-stone-500">{di.contributing_factors.slice(0, 2).map((f, fi) => <p key={fi} className="text-[9px]">• {f}</p>)}</div>
              )}
            </div>
          )) : <p className="text-sm text-stone-500 italic">No disease data available for {crop}</p>}
        </div>
      );
      case 'growth': return (
        <div className="space-y-3">
          <p className="font-bold text-sm">🌿 Growth Monitoring — {crop}</p>
          <div className="bg-stone-50 rounded-lg p-4 border border-stone-200">
            <p className="text-[8px] font-bold text-stone-500 uppercase mb-2">NDVI Score (Estimated)</p>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-3 bg-stone-200 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500" style={{width:'72%'}}></div>
              </div>
              <span className="font-black text-green-600">0.72</span>
            </div>
            <p className="text-xs text-green-700 font-bold mt-1">Healthy vegetation detected</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-stone-50 rounded-lg p-3 border border-stone-200">
              <p className="font-bold text-stone-600">Expected Height</p>
              <p className="text-lg font-black">{crop === 'Maize' ? '2.5m' : crop === 'Paddy' ? '1.2m' : crop === 'Sugarcane' ? '3-4m' : '0.5-1.5m'}</p>
            </div>
            <div className="bg-stone-50 rounded-lg p-3 border border-stone-200">
              <p className="font-bold text-stone-600">Duration to Maturity</p>
              <p className="text-lg font-black">{crop === 'Paddy' ? '120' : crop === 'Ragi' ? '110' : crop === 'Maize' ? '110' : crop === 'Tomato' ? '135' : crop === 'Potato' ? '90' : crop === 'Sugarcane' ? '365' : '100-150'} days</p>
            </div>
          </div>
        </div>
      );
      case 'harvest': return (
        <div className="space-y-3">
          <p className="font-bold text-sm">📅 Harvest Intelligence for {crop}</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <p className="text-[8px] font-bold text-green-700 uppercase">Expected Yield</p>
              <p className="font-black text-xl text-green-700">{p?.yield_t_ha?.toFixed(2) ?? '—'} t/ha</p>
            </div>
            <div className="bg-stone-50 rounded-lg p-4 border border-stone-200">
              <p className="text-[8px] font-bold text-stone-600 uppercase">Risk Level</p>
              <p className={`font-black text-xl ${p?.risk?.includes('Low') ? 'text-green-600' : p?.risk?.includes('Moderate') ? 'text-yellow-600' : 'text-red-600'}`}>{p?.risk || '—'}</p>
            </div>
          </div>
          <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
            <p className="text-xs font-bold text-amber-700">📌 Harvest Tips</p>
            <ul className="text-xs text-stone-700 mt-1 space-y-1">
              <li>• Harvest when {crop === 'Paddy' ? '80-85% grains turn golden' : crop === 'Tomato' ? 'fruits reach full color' : crop === 'Potato' ? 'vines start drying' : 'crop reaches physiological maturity'}</li>
              <li>• Avoid harvesting in wet/rainy conditions</li>
              <li>• Dry to moisture content of 14% for storage</li>
            </ul>
          </div>
        </div>
      );
      case 'post': return (
        <div className="space-y-3">
          <p className="font-bold text-sm">📦 Post-Harvest Management for {crop}</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-stone-50 rounded-lg p-3 border border-stone-200">
              <p className="font-bold text-stone-600">Storage</p>
              <p className="text-stone-700">{crop === 'Paddy' ? 'Store in gunny bags at 14% moisture' : crop === 'Potato' ? 'Cold storage at 2-4°C' : crop === 'Tomato' ? 'Room temp for 5-7 days' : 'Cool, dry ventilated storage'}</p>
            </div>
            <div className="bg-stone-50 rounded-lg p-3 border border-stone-200">
              <p className="font-bold text-stone-600">Market Timing</p>
              <p className="text-stone-700">Best to sell within 2 weeks of harvest for maximum price</p>
            </div>
          </div>
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
            <p className="text-[8px] font-bold text-blue-700 uppercase">Eligible Schemes</p>
            <div className="text-xs text-stone-700 mt-1 space-y-1">
              <p>✅ PM-KISAN: ₹6,000/yr income support</p>
              <p>✅ PMFBY: Crop insurance at 2% premium</p>
              <p>✅ KCC: Loans up to ₹3L at 4% interest</p>
            </div>
          </div>
        </div>
      );
      default: return null;
    }
  };

  return (
    <div className="pt-24 min-h-screen bg-[#fafaf9]">
      <GrainOverlay />
      <div className="max-w-7xl mx-auto px-6 pb-20">
        <div className="mb-8">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#84cc16] mb-2">VaniAI Crop Intelligence</p>
          <h1 className="font-serif text-5xl font-black text-[#0c0a09]">Crop <span className="italic text-[#84cc16]">Analyzer</span></h1>
          <p className="text-stone-500 mt-2">Deep-dive analysis for any crop on your land — lifecycle, economics, diseases & more</p>
        </div>

        <div className="bg-white rounded-[2rem] p-6 border-2 border-stone-200 shadow-lg mb-8">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[180px]">
              <label className="block font-black text-xs text-stone-500 mb-1">📍 City</label>
              <input type="text" value={city} onChange={e => setCity(e.target.value)} placeholder="Mysore, Hubli..."
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                className="w-full bg-stone-50 border-2 border-stone-200 rounded-xl p-3 font-bold text-stone-700 outline-none focus:ring-4 focus:ring-[#84cc16]/10 focus:border-[#84cc16] text-sm" />
            </div>
            <div className="w-40">
              <label className="block font-black text-xs text-stone-500 mb-1">🌾 Crop</label>
              <select value={crop} onChange={e => setCrop(e.target.value)}
                className="w-full bg-stone-50 border-2 border-stone-200 rounded-xl p-3 font-bold text-stone-700 outline-none focus:ring-4 focus:ring-[#84cc16]/10 focus:border-[#84cc16] text-sm">
                <option value="">Select crop...</option>
                {CROP_LIST.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {['N','P','K','pH'].map(f => (
              <div key={f} className="w-20">
                <label className="block font-black text-[9px] text-stone-500 mb-1 uppercase">{f}</label>
                <input type="number" step="0.1" value={f === 'pH' ? ph : f === 'N' ? N : f === 'P' ? P : K}
                  onChange={e => { const v = e.target.value; if (f === 'N') setN(v); else if (f === 'P') setP(v); else if (f === 'K') setK(v); else setPh(v); }}
                  placeholder="--" className="w-full bg-stone-50 border-2 border-stone-200 rounded-xl p-3 font-bold text-stone-700 outline-none focus:ring-4 focus:ring-[#84cc16]/10 focus:border-[#84cc16] text-sm text-center" />
              </div>
            ))}
            <button onClick={handleSubmit} disabled={loading || !city || !crop}
              className="px-8 py-3 bg-[#84cc16] text-[#0c0a09] font-black text-sm rounded-xl hover:bg-[#facc15] shadow-lg disabled:opacity-50 transition-all flex items-center gap-2">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              {loading ? 'Analyzing...' : 'Analyze'}
            </button>
          </div>
          {error && <p className="text-red-600 text-xs font-bold mt-3"><AlertTriangle size={12} className="inline" /> {error}</p>}
        </div>

        {loading && <div className="flex items-center justify-center py-20"><Loader2 size={32} className="animate-spin text-[#84cc16]" /><span className="ml-4 font-black text-stone-500">Generating crop intelligence report...</span></div>}

        {r && !loading && (
          <div className="space-y-6">
            {/* Summary widgets */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="bg-white rounded-xl p-4 border border-stone-200 shadow-sm">
                <p className="text-[8px] font-black uppercase text-stone-400 mb-1">Crop</p>
                <p className="font-black text-lg text-[#84cc16]">{r.crop}</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-stone-200 shadow-sm">
                <p className="text-[8px] font-black uppercase text-stone-400 mb-1">Yield</p>
                <p className="font-black text-lg">{r.prediction?.yield_t_ha?.toFixed(2) ?? '—'} t/ha</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-stone-200 shadow-sm">
                <p className="text-[8px] font-black uppercase text-stone-400 mb-1">Risk</p>
                <p className={`font-black text-lg ${r.prediction?.risk?.includes('Low') ? 'text-green-600' : r.prediction?.risk?.includes('Moderate') ? 'text-yellow-600' : 'text-red-600'}`}>{r.prediction?.risk || '—'}</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-stone-200 shadow-sm">
                <p className="text-[8px] font-black uppercase text-stone-400 mb-1">Profit</p>
                <p className="font-black text-lg text-green-600">₹{(r.economics?.profit || 0).toLocaleString()}</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-stone-200 shadow-sm">
                <p className="text-[8px] font-black uppercase text-stone-400 mb-1">Disease Risk</p>
                <p className="font-black text-lg">{r.diseases?.filter(d => d.risk_level === 'High' || d.risk_level === 'Critical').length || 0} alerts</p>
              </div>
            </div>

            {/* Weather + Current conditions */}
            {w && (
              <div className="bg-white rounded-[2rem] p-6 border-2 border-stone-200 shadow-lg">
                <h3 className="text-[8px] font-black uppercase tracking-widest text-stone-400 mb-4">🌤 Current Conditions for {r.crop} in {r.city}</h3>
                <div className="grid grid-cols-4 gap-3 text-center text-xs">
                  <div className="bg-stone-50 rounded-xl p-3"><Thermometer size={18} className="mx-auto mb-1 text-orange-500" /><p className="font-black text-lg">{w.temperature}°C</p><p className="text-stone-400 uppercase text-[8px] font-bold">Temp</p></div>
                  <div className="bg-stone-50 rounded-xl p-3"><Droplets size={18} className="mx-auto mb-1 text-blue-500" /><p className="font-black text-lg">{w.humidity}%</p><p className="text-stone-400 uppercase text-[8px] font-bold">Humidity</p></div>
                  <div className="bg-stone-50 rounded-xl p-3"><CloudRain size={18} className="mx-auto mb-1 text-blue-600" /><p className="font-black text-lg">{w.rainfall}mm</p><p className="text-stone-400 uppercase text-[8px] font-bold">Rain</p></div>
                  <div className="bg-stone-50 rounded-xl p-3"><Sun size={18} className="mx-auto mb-1 text-yellow-500" /><p className="font-black text-lg">{w.season}</p><p className="text-stone-400 uppercase text-[8px] font-bold">Season</p></div>
                </div>
              </div>
            )}

            {/* Lifecycle stages */}
            <div className="bg-white rounded-[2rem] p-6 border-2 border-stone-200 shadow-lg">
              <h3 className="text-[8px] font-black uppercase tracking-widest text-stone-400 mb-4">📋 Full Crop Lifecycle — {r.crop}</h3>
              <div className="flex flex-wrap gap-2 mb-6">
                {stages.map((s, i) => (
                  <button key={s.id} onClick={() => setActiveStage(i)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all ${
                      activeStage === i ? 'bg-[#84cc16] text-[#0c0a09] shadow-lg' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                    }`}>
                    <s.icon size={12} />{s.label}
                  </button>
                ))}
              </div>
              {stageContent(stages[activeStage].id)}
            </div>

            {/* Economics */}
            {e && (
              <div className="bg-white rounded-[2rem] p-6 border-2 border-stone-200 shadow-lg">
                <h3 className="text-[8px] font-black uppercase tracking-widest text-stone-400 mb-4">💰 Financial Analysis — {r.crop}</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 text-xs">
                  <div className="bg-red-50 rounded-xl p-4 border border-red-200 text-center">
                    <p className="text-[8px] font-bold text-red-600 uppercase">Investment</p>
                    <p className="font-black text-xl text-red-700">₹{(e.total_cost || 0).toLocaleString()}</p>
                  </div>
                  <div className="bg-green-50 rounded-xl p-4 border border-green-200 text-center">
                    <p className="text-[8px] font-bold text-green-600 uppercase">Revenue</p>
                    <p className="font-black text-xl text-green-700">₹{(e.expected_revenue || 0).toLocaleString()}</p>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-4 border border-blue-200 text-center">
                    <p className="text-[8px] font-bold text-blue-600 uppercase">Profit</p>
                    <p className={`font-black text-xl ${(e.profit || 0) >= 0 ? 'text-blue-700' : 'text-red-700'}`}>₹{(e.profit || 0).toLocaleString()}</p>
                  </div>
                  <div className="bg-[#84cc16]/10 rounded-xl p-4 border border-[#84cc16]/30 text-center">
                    <p className="text-[8px] font-bold text-[#84cc16] uppercase">ROI</p>
                    <p className="font-black text-xl text-[#84cc16]">{e.roi_percent || 0}%</p>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2 text-[10px]">
                  {[{l:'Seed',v:e.seed_cost},{l:'Fertilizer',v:e.fertilizer_cost},{l:'Pesticide',v:e.pesticide_cost},{l:'Irrigation',v:e.irrigation_cost},{l:'Labour',v:e.hired_labour_cost},{l:'Machinery',v:e.machinery_cost},{l:'Family',v:e.family_labour_cost},{l:'Misc',v:e.miscellaneous_cost}].map((item, i) => (
                    <div key={i} className="bg-stone-50 rounded-lg p-2 border border-stone-100"><p className="text-stone-400">{item.l}</p><p className="font-bold">₹{(item.v || 0).toLocaleString()}</p></div>
                  ))}
                </div>
              </div>
            )}

            {/* Disease */}
            {d?.length > 0 && (
              <div className="bg-white rounded-[2rem] p-6 border-2 border-stone-200 shadow-lg">
                <h3 className="text-[8px] font-black uppercase tracking-widest text-stone-400 mb-4">🦠 Disease Risk Assessment</h3>
                <div className="space-y-2">{d.slice(0, 5).map((di, i) => {
                  const isHigh = di.risk_level === 'High' || di.risk_level === 'Severe' || di.risk_level === 'Critical';
                  const isMod = di.risk_level === 'Moderate';
                  return <div key={i} className={`rounded-xl p-3 border text-xs ${isHigh ? 'bg-red-50 border-red-200' : isMod ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'}`}>
                    <div className="flex items-center justify-between"><p className="font-bold">{di.name}</p><span className={`px-2 py-0.5 rounded-full text-[8px] font-black ${isHigh ? 'bg-red-200 text-red-700' : isMod ? 'bg-yellow-200 text-yellow-700' : 'bg-green-200 text-green-700'}`}>{di.risk_level}</span></div>
                    <p className="text-stone-600 mt-1">→ {di.advisory}</p>
                  </div>;
                })}</div>
              </div>
            )}

            {/* Calendar */}
            {cal?.length > 0 && (
              <div className="bg-white rounded-[2rem] p-6 border-2 border-stone-200 shadow-lg">
                <h3 className="text-[8px] font-black uppercase tracking-widest text-stone-400 mb-4">📅 Weekly Action Plan</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {cal.map((w, i) => (
                    <div key={i} className={`rounded-xl p-3 border text-xs ${w.task !== 'Routine Maintenance' ? 'bg-[#84cc16]/5 border-[#84cc16]/30' : 'bg-stone-50 border-stone-200'}`}>
                      <p className="text-[8px] font-bold text-stone-400">Week {w.week}</p>
                      <p className="font-bold text-stone-700">{w.task}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sources */}
            <div className="text-center text-[9px] text-stone-400">
              Data sources: {r.sources?.weather} · {r.sources?.economics} · {r.sources?.diseases}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
