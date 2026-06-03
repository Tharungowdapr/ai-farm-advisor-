import React, { useState, useEffect, useRef, useMemo } from 'react';
import { TrendingUp, DollarSign, Search, Loader2, AlertTriangle, ArrowUp, ArrowDown, Calendar, CloudRain, Truck, BarChart3, Target, ChevronDown, ChevronUp, ExternalLink, MapPin, Clock, ShieldCheck, Brain, Navigation, ChevronRight, Zap, Lightbulb } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { CROP_DATABASE } from '../data/cropData';

const GrainOverlay = () => <div className="grain-overlay opacity-20" />;
const CROPS = CROP_DATABASE.map(c => c.name);

export default function MarketHub() {
  const [crop, setCrop] = useState('Paddy');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Smart Selling State
  const [sellCrop, setSellCrop] = useState('Paddy');
  const [locationStr, setLocationStr] = useState('');
  const [quantity, setQuantity] = useState(100);
  const [vendorsData, setVendorsData] = useState(null);
  const [fetchingVendors, setFetchingVendors] = useState(false);
  const [locating, setLocating] = useState(false);
  const [aiInsights, setAiInsights] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [userLat, setUserLat] = useState(null);
  const [userLon, setUserLon] = useState(null);
  const [citySuggestions, setCitySuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [sellingStrategy, setSellingStrategy] = useState(null);
  const [strategyLoading, setStrategyLoading] = useState(false);
  const searchRef = useRef(null);


  const fetchData = async () => {
    setLoading(true); setError(null);
    try {
      const [mRes, fRes] = await Promise.all([
        axios.post('/api/market-data', { crop, region: 'Karnataka' }),
        axios.get(`/api/market/forecast?crop=${crop}&days=90`)
      ]);
      setData(mRes.data);
      setForecast(fRes.data);
      
      // Auto-fetch vendors if location exists
      if (locationStr) {
        fetchVendorsData();
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally { setLoading(false); }
  };

  const fetchVendorsData = async () => {
    if (!locationStr) {
      alert("Please enter or detect your location first.");
      return;
    }
    setFetchingVendors(true);
    try {
      const res = await axios.post('/api/vendors/find', {
        crop: sellCrop,
        location: locationStr,
        quantity: quantity
      });
      setVendorsData(res.data);
    } catch (err) {
      console.error(err);
      alert("Failed to find vendors.");
    } finally {
      setFetchingVendors(false);
    }
  };

  const detectLocation = () => {
    if (navigator.geolocation) {
      setLocating(true);
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          setUserLat(lat); setUserLon(lon);
          try {
            const res = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
            const address = res.data.address;
            const city = address.city || address.town || address.village || address.county || '';
            const state = address.state || '';
            const loc = city && state ? `${city}, ${state}` : `Lat: ${lat.toFixed(4)}, Lon: ${lon.toFixed(4)}`;
            setLocationStr(loc);
            // Auto-fetch AI market insights with GPS
            fetchAiInsights(crop, loc, lat, lon);
          } catch (e) {
            setLocationStr(`Lat: ${lat.toFixed(4)}, Lon: ${lon.toFixed(4)}`);
          } finally { setLocating(false); }
        },
        () => { setLocating(false); alert("Location access denied."); }
      );
    }
  };

  const fetchAiInsights = async (cropName, loc, lat, lon) => {
    setAiLoading(true); setAiInsights(null);
    try {
      const res = await axios.post('/api/market/ai-insights', {
        crop: cropName || crop, location: loc || locationStr, lat, lon
      });
      setAiInsights(res.data);
    } catch (err) { console.error('AI market insights error:', err); }
    finally { setAiLoading(false); }
  };

  useEffect(() => {
    if (locationStr.length < 3) { setCitySuggestions([]); return; }
    const t = setTimeout(async () => {
      try {
        const res = await axios.get(`/api/cities?q=${encodeURIComponent(locationStr)}`);
        setCitySuggestions(res.data.cities || []);
        setShowSuggestions(res.data.cities?.length > 0);
      } catch (err) { console.error('City search error:', err); }
    }, 400);
    return () => clearTimeout(t);
  }, [locationStr]);

  useEffect(() => {
    const h = (e) => { if (searchRef.current && !searchRef.current.contains(e.target)) setShowSuggestions(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => { fetchData(); }, []);


  const k = data?.kpis || {};
  const priceHistory = data?.price_history || [];
  const fc = forecast;
  const fp = fc?.price_points || [];
  const f30 = fc?.forecast_30d;
  const f60 = fc?.forecast_60d;
  const f90 = fc?.forecast_90d;
  const signal = fc?.signal;
  const trend25 = fc?.trend === 'up';

  const tabs = [
    { id:'overview', label:'Overview', icon: TrendingUp },
    { id:'forecast', label:'Forecast', icon: BarChart3 },
    { id:'nearby', label:'Nearby Markets', icon: Navigation },
    { id:'smart_selling', label:'Smart Selling', icon: Truck },
  ];

  return (
    <div className="pt-28 min-h-screen t-bg">
      <GrainOverlay />
      <div className="max-w-7xl mx-auto px-6 pb-20">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
          <div>
            <p className="text-[8px] font-black uppercase tracking-[0.3em] text-[#f59e0b] mb-2">MarketHub AI Intelligence</p>
            <h1 className="font-serif text-5xl font-black t-text">Market <span className="text-[#f59e0b]">Intelligence.</span></h1>
            <p className="t-text-secondary text-sm mt-1">Real-time pricing, forecasting, and market analysis for Karnataka</p>
          </div>
          <div className="flex items-center gap-3">
            <select value={crop} onChange={e => setCrop(e.target.value)}
              className="bg-stone-800 border-2 border-stone-700 rounded-xl px-4 py-3 font-bold text-white outline-none focus:border-[#facc15] text-sm">
              {CROPS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={fetchData} disabled={loading}
              className="px-6 py-3 bg-[#facc15] t-text font-black text-sm rounded-xl hover:bg-yellow-400 shadow-lg disabled:opacity-50 transition-all flex items-center gap-2">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              {loading ? 'Loading...' : 'Analyze'}
            </button>
          </div>
        </div>

        {error && <div className="bg-red-900/50 border border-red-700 rounded-2xl p-4 mb-6 text-red-300 text-sm font-bold flex items-center gap-2"><AlertTriangle size={16} />{error}</div>}

        {/* Tab Nav */}
        <div className="flex gap-2 mb-8">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                activeTab === t.id ? 'bg-[#facc15] t-text shadow-lg' : 'bg-stone-100 t-text-secondary hover:bg-stone-200'
              }`}>
              <t.icon size={14} />{t.label}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW TAB ── */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* KPI Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <div className="t-bg-card border-2 t-border shadow-xl shadow-stone-200/40 p-5">
                <p className="text-[8px] font-black uppercase t-text-secondary mb-1">MSP Floor</p>
                <p className="t-text text-2xl font-black">{k.msp || '—'}/q</p>
                <p className={`text-xs font-bold mt-1 ${trend25 ? 'text-green-400' : 'text-red-400'}`}>{k.trend_percent || '0%'}</p>
              </div>
              <div className="t-bg-card border-2 t-border shadow-xl shadow-stone-200/40 p-5">
                <p className="text-[8px] font-black uppercase t-text-secondary mb-1">Trend</p>
                <p className="t-text text-2xl font-black">{k.trend || '—'} %</p>
                <p className="text-xs t-text-secondary mt-1">{k.forecast_percent || '—'} forecast</p>
              </div>
              <div className="t-bg-card border-2 t-border shadow-xl shadow-stone-200/40 p-5">
                <p className="text-[8px] font-black uppercase t-text-secondary mb-1">Supply Index</p>
                <p className="t-text text-2xl font-black">{k.supply_index ?? '—'} %</p>
                <div className="mt-2 h-1.5 bg-stone-700 rounded-full overflow-hidden">
                  <div className="h-full bg-[#facc15] rounded-full" style={{width: `${k.supply_index || 50}%`}}></div>
                </div>
              </div>
              <div className="t-bg-card border-2 t-border shadow-xl shadow-stone-200/40 p-5">
                <p className="text-[8px] font-black uppercase t-text-secondary mb-1">90-Day Forecast</p>
                <p className="t-text text-2xl font-black">₹{f90?.price ? Math.round(f90.price) : '—'}</p>
                <p className={`text-xs font-bold mt-1 ${trend25 ? 'text-green-400' : 'text-red-400'}`}>
                  {fc?.change_pct ? `${trend25 ? '↑' : '↓'} ${Math.abs(fc.change_pct)}%` : '—'}
                </p>
              </div>
              <div className="t-bg-card border-2 t-border shadow-xl shadow-stone-200/40 p-5">
                <p className="text-[8px] font-black uppercase t-text-secondary mb-1">Signal</p>
                {signal ? (
                  <div className={`inline-block px-3 py-1 rounded-lg font-black text-sm ${
                    signal === 'BUY' ? 'bg-green-500/20 text-green-400' :
                    signal === 'SELL' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'
                  }`}>{signal}</div>
                ) : <p className="t-text text-2xl font-black">—</p>}
                <p className="text-[8px] t-text-secondary mt-1">Market signal</p>
              </div>
              <div className="t-bg-card border-2 t-border shadow-xl shadow-stone-200/40 p-5">
                <p className="text-[8px] font-black uppercase t-text-secondary mb-1">Confidence</p>
                <p className="t-text text-2xl font-black">{f90?.confidence ?? '—'} %</p>
                <p className="text-xs t-text-secondary mt-1">90-day forecast</p>
              </div>
            </div>

            {/* Price Chart */}
            <div className="t-bg-card border-2 t-border rounded-[2rem] shadow-xl shadow-stone-200/40 p-8">
              <h3 className="t-text font-black text-lg mb-6">6-Month Price Trajectory — {crop}</h3>
              {priceHistory.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={priceHistory}>
                    <defs><linearGradient id="colorP" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#facc15" stopOpacity={0.3}/><stop offset="95%" stopColor="#facc15" stopOpacity={0}/></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="month" stroke="#666" fontSize={12} />
                    <YAxis stroke="#666" fontSize={12} />
                    <Tooltip contentStyle={{background:'#1c1917',border:'1px solid #444',borderRadius:12,color:'#fff'}} />
                    <Area type="monotone" dataKey="price" stroke="#facc15" fill="url(#colorP)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center t-text-secondary">No historical data available</div>
              )}
            </div>

            {/* Forecast Points */}
            {fp.length > 0 && (
              <div className="t-bg-card border-2 t-border rounded-[2rem] shadow-xl shadow-stone-200/40 p-8">
                <h3 className="t-text font-black text-lg mb-4">90-Day Price Forecast Points</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {fp.filter((_,i) => i % Math.max(1, Math.floor(fp.length/5)) === 0 || i === fp.length-1).slice(0, 6).map((p, i) => (
                    <div key={i} className="t-bg-input rounded-xl p-4 border t-border">
                      <p className="text-[8px] font-bold t-text-muted uppercase">Day {p.day}</p>
                      <p className="font-black text-lg t-text">₹{Math.round(p.price)}</p>
                      <p className="text-[8px] t-text-secondary">{p.date?.slice(0, 6)}</p>
                      <div className="mt-1 h-1 bg-stone-200 rounded-full overflow-hidden">
                        <div className="h-full bg-[#84cc16] rounded-full" style={{width: `${p.confidence}%`}}></div>
                      </div>
                      <p className="text-[8px] t-text-secondary mt-0.5">{p.confidence}% conf</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Analysis */}
            {data?.analysis && (
              <div className="t-bg-card border-2 border-[#84cc16]/20 rounded-[2rem] p-8 shadow-xl shadow-[#84cc16]/5">
                <h3 className="text-[#84cc16] font-black text-[10px] uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                  <Brain size={14} /> AI Market Analysis
                </h3>
                <p className="text-stone-700 text-sm leading-relaxed font-serif italic">{data.analysis}</p>
              </div>
            )}
          </div>
        )}

        {/* ── FORECAST TAB ── */}
        {activeTab === 'forecast' && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-3 gap-4">
              {[
                {l:'Current', p: fc?.current_price, d: 'Now', c: 100},
                {l:'30-Day', p: f30?.price, d: f30?.date, c: f30?.confidence},
                {l:'60-Day', p: f60?.price, d: f60?.date, c: f60?.confidence},
                {l:'90-Day', p: f90?.price, d: f90?.date, c: f90?.confidence},
              ].map((item, i) => (
                <div key={i} className="t-bg-card border-2 t-border shadow-xl shadow-stone-200/40 p-6">
                  <p className="text-[8px] font-black uppercase t-text-secondary">{item.l} Forecast</p>
                  <p className="font-black text-3xl t-text mt-1">₹{item.p ? Math.round(item.p) : '—'}</p>
                  <p className="text-xs t-text-secondary mt-1">{item.d || '—'} · <span className="text-[#84cc16]">{item.c || '—'}% confidence</span></p>
                  <div className="mt-2 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{
                      width: `${item.c || 0}%`,
                      background: item.c >= 80 ? '#84cc16' : item.c >= 60 ? '#facc15' : '#ef4444'
                    }}></div>
                  </div>
                </div>
              ))}
            </div>

            {fp.length > 0 && (
              <div className="t-bg-card border-2 t-border rounded-[2rem] shadow-xl shadow-stone-200/40 p-8">
                <h3 className="t-text font-black text-lg mb-6">Forecast Trajectory</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={fp}>
                    <defs>
                      <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#84cc16" stopOpacity={0.3}/><stop offset="95%" stopColor="#84cc16" stopOpacity={0}/></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="day" stroke="#666" fontSize={12} />
                    <YAxis stroke="#666" fontSize={12} />
                    <Tooltip contentStyle={{background:'#1c1917',border:'1px solid #444',borderRadius:12,color:'#fff'}} />
                    <Area type="monotone" dataKey="price" stroke="#84cc16" fill="url(#forecastGrad)" strokeWidth={2} />
                    <Area type="monotone" dataKey="confidence_lower" stroke="#666" fill="none" strokeDasharray="4 4" />
                    <Area type="monotone" dataKey="confidence_upper" stroke="#666" fill="none" strokeDasharray="4 4" />
                  </AreaChart>
                </ResponsiveContainer>
                <div className="flex items-center justify-between text-xs t-text-secondary mt-4">
                  <span>Current: ₹{Math.round(fc?.current_price || 0)}</span>
                  <span className="text-[#facc15]">→</span>
                  <span>90-Day: ₹{Math.round(f90?.price || 0)}</span>
                  <span className="text-[#facc15]">→</span>
                  <span>Change: {fc?.change_pct ? `${trend25 ? '+' : '-'}${Math.abs(fc.change_pct)}%` : '—'}</span>
                </div>
              </div>
            )}

            {/* Market timing */}
            <div className="t-bg-card border-2 t-border rounded-[2rem] shadow-xl shadow-stone-200/40 p-8">
              <h3 className="t-text font-black text-lg mb-3">⏰ Market Timing</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-stone-800 rounded-xl p-5 border border-stone-700">
                  <p className="text-[8px] font-black uppercase t-text-secondary">Best Selling Window</p>
                  <p className="font-black text-lg text-[#facc15] mt-1">{trend25 ? 'Hold — prices rising' : 'Sell soon — prices declining'}</p>
                  <p className="text-xs t-text-muted mt-1">Based on 90-day forecast trend</p>
                </div>
                <div className="bg-stone-800 rounded-xl p-5 border border-stone-700">
                  <p className="text-[8px] font-black uppercase t-text-secondary">Recommendation</p>
                  <div className={`inline-block mt-1 px-4 py-2 rounded-xl font-black text-sm ${
                    signal === 'BUY' ? 'bg-green-500/20 text-green-400' :
                    signal === 'SELL' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'
                  }`}>{signal === 'BUY' ? '📈 BUY — Growing demand expected' : signal === 'SELL' ? '📉 SELL — Prices expected to drop' : '➡️ HOLD — Market stable'}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── INSIGHTS TAB ── */}
        {activeTab === 'insights' && (
          <div className="space-y-6">
            {/* AI Analysis */}
            {data?.analysis && (
              <div className="bg-gradient-to-br from-stone-900 to-stone-800 border border-stone-700 rounded-[2rem] p-8">
                <h3 className="text-[#facc15] font-black text-sm uppercase tracking-wider mb-4">🧠 AI Market Analysis — {crop}</h3>
                <p className="text-stone-300 text-sm leading-relaxed">{data.analysis}</p>
              </div>
            )}

            {/* Volatility + Risk */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="t-bg-card border-2 t-border shadow-xl shadow-stone-200/40 p-6">
                <p className="text-[8px] font-black uppercase t-text-secondary mb-2">📊 Volatility Meter</p>
                {fc?.change_pct ? (
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-3 h-3 rounded-full ${Math.abs(fc.change_pct) > 10 ? 'bg-red-500' : Math.abs(fc.change_pct) > 5 ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
                      <span className={`font-black text-lg ${Math.abs(fc.change_pct) > 10 ? 'text-red-400' : Math.abs(fc.change_pct) > 5 ? 'text-yellow-400' : 'text-green-400'}`}>
                        {Math.abs(fc.change_pct) > 10 ? 'High Volatility' : Math.abs(fc.change_pct) > 5 ? 'Moderate Volatility' : 'Low Volatility'}
                      </span>
                    </div>
                    <p className="text-xs t-text-secondary">Price change: {fc.change_pct}% over 90 days</p>
                  </div>
                ) : <p className="t-text-secondary text-sm">Insufficient data</p>}
              </div>
              <div className="t-bg-card border-2 t-border shadow-xl shadow-stone-200/40 p-6">
                <p className="text-[8px] font-black uppercase t-text-secondary mb-2">🌤 Weather Impact</p>
                <div className="flex items-center gap-2 mb-2">
                  <CloudRain size={18} className="text-blue-400" />
                  <span className="t-text font-bold text-sm">Monsoon analysis for {crop}</span>
                </div>
                <p className="text-xs t-text-muted">Weather patterns affect supply. Monitor rainfall in growing regions for price signals.</p>
              </div>
            </div>

            {/* Supply Chain */}
            <div className="t-bg-card border-2 t-border rounded-[2rem] shadow-xl shadow-stone-200/40 p-6">
              <h3 className="text-[8px] font-black uppercase t-text-secondary mb-4">🚚 Supply Chain Intelligence</h3>
              <div className="grid md:grid-cols-3 gap-4 text-xs">
                <div className="bg-stone-800 rounded-xl p-4 border border-stone-700">
                  <p className="font-bold t-text">Transport Cost Impact</p>
                  <p className="t-text-muted mt-1">Fuel prices affect mandi rates. Sell to nearest mandi for best net margin.</p>
                </div>
                <div className="bg-stone-800 rounded-xl p-4 border border-stone-700">
                  <p className="font-bold t-text">Storage Recommendation</p>
                  <p className="t-text-muted mt-1">{trend25 ? 'Store for 2-4 weeks — prices trending up' : 'Sell immediately — declining trend detected'}</p>
                </div>
                <div className="bg-stone-800 rounded-xl p-4 border border-stone-700">
                  <p className="font-bold t-text">Export Opportunity</p>
                  <p className="t-text-muted mt-1">Check e-NAM portal for inter-state mandi prices for better rates.</p>
                </div>
              </div>
            </div>

            {/* Schemes */}
            <div className="bg-gradient-to-r from-blue-900/30 to-stone-900 border border-blue-800/30 rounded-[2rem] p-6">
              <h3 className="text-[8px] font-black uppercase text-blue-400 mb-4">🏛 Government Schemes — {crop}</h3>
              <div className="grid md:grid-cols-3 gap-3 text-xs">
                <div className="bg-stone-800/50 rounded-xl p-4 border border-blue-800/30">
                  <p className="font-bold t-text">PM-KISAN</p>
                  <p className="t-text-muted mt-1">₹6,000/yr direct income support</p>
                </div>
                <div className="bg-stone-800/50 rounded-xl p-4 border border-blue-800/30">
                  <p className="font-bold t-text">PMFBY Insurance</p>
                  <p className="t-text-muted mt-1">Crop coverage at 2% premium</p>
                </div>
                <div className="bg-stone-800/50 rounded-xl p-4 border border-blue-800/30">
                  <p className="font-bold t-text">MSP Support</p>
                  <p className="t-text-muted mt-1">Govt. minimum price: {k.msp || '—'}/quintal</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── NEARBY MARKETS TAB ── */}
        {activeTab === 'nearby' && (
          <div className="space-y-6">
            {/* Location Input */}
            <div className="t-bg-card border-2 t-border rounded-[2rem] shadow-xl shadow-stone-200/40 p-6">
              <div className="flex flex-wrap gap-3 items-end">
                <div className="flex-1 min-w-[200px]">
                  <label className="text-[10px] font-black uppercase tracking-widest t-text-secondary block mb-2">Your Location</label>
                  <div className="flex bg-stone-800 border border-stone-700 rounded-xl overflow-hidden">
                    <button onClick={detectLocation} disabled={locating} className="p-3 t-text-muted hover:text-[#facc15]">
                      {locating ? <Loader2 size={16} className="animate-spin text-[#facc15]" /> : <MapPin size={16} />}
                    </button>
                    <input value={locationStr} onChange={e => setLocationStr(e.target.value)}
                      placeholder="Detect GPS or type city..."
                      className="flex-1 bg-transparent t-text text-sm px-2 py-3 outline-none" />
                  </div>
                </div>
                <button onClick={() => fetchAiInsights(crop, locationStr, userLat, userLon)}
                  disabled={aiLoading || (!locationStr && !userLat)}
                  className="px-6 py-3 bg-[#facc15] t-text font-black text-sm rounded-xl hover:bg-yellow-400 disabled:opacity-50 flex items-center gap-2">
                  {aiLoading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                  {aiLoading ? 'Analyzing...' : 'Find Markets'}
                </button>
              </div>
            </div>

            {aiLoading && (
              <div className="t-bg-card border-2 t-border rounded-[2rem] shadow-xl shadow-stone-200/40 p-8 flex items-center gap-4">
                <Loader2 size={24} className="animate-spin text-[#facc15]" />
                <div><p className="font-black t-text">Computing nearby markets...</p><p className="text-xs t-text-secondary">Calculating real distances & transport costs</p></div>
              </div>
            )}

            {aiInsights && !aiLoading && (
              <>
                {/* Markets Table */}
                {aiInsights.nearby_markets?.length > 0 && (
                  <div className="t-bg-card border-2 t-border rounded-[2rem] shadow-xl shadow-stone-200/40 p-6">
                    <h3 className="t-text font-black text-lg mb-4">📍 Nearest APMC Markets — {crop}</h3>
                    <p className="t-text-muted text-xs mb-4">Distances computed from GPS. Prices based on current MSP ({aiInsights.msp}/q). Transport costs estimated at ₹2-3/km/quintal.</p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-[9px] font-black uppercase tracking-widest t-text-secondary border-b border-stone-700">
                            <th className="text-left py-3 px-2">Market</th>
                            <th className="text-right py-3 px-2">Distance</th>
                            <th className="text-right py-3 px-2">Price/q</th>
                            <th className="text-right py-3 px-2">Transport</th>
                            <th className="text-right py-3 px-2">Commission</th>
                            <th className="text-center py-3 px-2">Mode</th>
                            <th className="text-right py-3 px-2">Net/q</th>
                          </tr>
                        </thead>
                        <tbody>
                          {aiInsights.nearby_markets.map((m, i) => {
                            const isBest = m.name === aiInsights.best_market;
                            return (
                              <tr key={i} className={`border-b border-stone-800 ${isBest ? 'bg-[#facc15]/5' : 'hover:bg-stone-800/50'}`}>
                                <td className="py-3 px-2">
                                  <p className={`font-bold ${isBest ? 'text-[#facc15]' : 't-text'}`}>{m.name}</p>
                                  <p className="text-[10px] t-text-secondary">{m.district} · {m.market_type}</p>
                                  {isBest && <span className="text-[8px] bg-[#facc15] t-text font-black px-2 py-0.5 rounded-full">BEST NET PRICE</span>}
                                </td>
                                <td className="text-right py-3 px-2 text-stone-300 font-bold">{m.distance_km} km</td>
                                <td className="text-right py-3 px-2 t-text font-bold">₹{m.current_price_per_quintal}</td>
                                <td className="text-right py-3 px-2 text-red-400 font-bold">-₹{m.transportation_cost_per_quintal}</td>
                                <td className="text-right py-3 px-2 text-orange-400">{m.commission_percent}% (-₹{m.commission_amount})</td>
                                <td className="text-center py-3 px-2"><span className="text-[10px] bg-stone-800 text-stone-300 px-2 py-1 rounded-full">{m.transportation_mode}</span></td>
                                <td className={`text-right py-3 px-2 font-black text-lg ${isBest ? 'text-[#facc15]' : 'text-green-400'}`}>₹{m.net_price_after_costs}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* AI Advisory */}
                {aiInsights.ai_analysis && (
                  <div className="bg-gradient-to-r from-stone-900 to-stone-800 border border-stone-700 rounded-[2rem] p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Brain size={18} className="text-[#facc15]" />
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-[#facc15]">AI Market Advisory</h3>
                      <span className="ml-auto text-[8px] t-text-secondary bg-stone-800 px-2 py-1 rounded-full">Groq AI</span>
                    </div>
                    {aiInsights.ai_analysis.market_recommendation && (
                      <div className="bg-stone-800/50 rounded-xl p-4 border border-stone-700 mb-3">
                        <p className="text-[8px] font-black uppercase text-[#facc15] mb-1">📊 Recommendation</p>
                        <p className="text-sm text-stone-300">{aiInsights.ai_analysis.market_recommendation}</p>
                      </div>
                    )}
                    <div className="grid md:grid-cols-2 gap-3">
                      {aiInsights.ai_analysis.timing_advice && (
                        <div className="bg-stone-800/50 rounded-xl p-4 border border-stone-700">
                          <p className="text-[8px] font-black uppercase text-blue-400 mb-1">⏰ Timing</p>
                          <p className="text-xs t-text-muted">{aiInsights.ai_analysis.timing_advice}</p>
                        </div>
                      )}
                      {aiInsights.ai_analysis.storage_recommendation && (
                        <div className="bg-stone-800/50 rounded-xl p-4 border border-stone-700">
                          <p className="text-[8px] font-black uppercase text-green-400 mb-1">🏪 Storage</p>
                          <p className="text-xs t-text-muted">{aiInsights.ai_analysis.storage_recommendation}</p>
                        </div>
                      )}
                    </div>
                    {aiInsights.ai_analysis.price_factors?.length > 0 && (
                      <div className="mt-3 bg-stone-800/50 rounded-xl p-4 border border-stone-700">
                        <p className="text-[8px] font-black uppercase text-orange-400 mb-2">📈 Price Factors</p>
                        {aiInsights.ai_analysis.price_factors.map((f, i) => <p key={i} className="text-xs t-text-muted mb-1">• {f}</p>)}
                      </div>
                    )}
                  </div>
                )}

                <div className="text-center text-[9px] text-stone-600">
                  <p>{aiInsights.data_sources || 'GPS distances + MSP data + Groq AI analysis'}</p>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── SMART SELLING TAB ── */}
        {activeTab === 'smart_selling' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-stone-900 to-stone-800 border border-stone-700 rounded-[2rem] p-8">
              <div className="flex flex-col md:flex-row gap-6 mb-8">
                <div className="flex-1">
                  <h3 className="t-text font-black text-2xl mb-2">Smart Vendor Finder</h3>
                  <p className="t-text-muted text-sm">Find nearby buyers and optimize your profit by analyzing local prices against transportation costs.</p>
                </div>
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest t-text-secondary block mb-2">Crop</label>
                    <div className="flex items-center">
                      <select 
                        value={sellCrop}
                        onChange={e => setSellCrop(e.target.value)}
                        className="w-full bg-stone-800 border border-stone-700 rounded-xl px-4 py-3 t-text text-sm outline-none focus:border-[#facc15] transition-colors appearance-none"
                      >
                        {CROPS.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="relative" ref={searchRef}>
                    <label className="text-[10px] font-black uppercase tracking-widest t-text-secondary block mb-2">Your Location</label>
                    <div className="flex bg-stone-800 border border-stone-700 rounded-xl overflow-hidden focus-within:border-[#facc15] transition-colors">
                      <button onClick={detectLocation} disabled={locating} className="p-3 t-text-muted hover:text-[#facc15] transition-colors disabled:opacity-50" title="Use GPS">
                        {locating ? <Loader2 size={18} className="animate-spin text-[#facc15]" /> : <MapPin size={18} />}
                      </button>
                      <input 
                        type="text" 
                        value={locationStr}
                        onChange={e => { setLocationStr(e.target.value); setShowSuggestions(true); }}
                        placeholder="City, Region, or GPS"
                        className="flex-1 bg-transparent border-none outline-none t-text text-sm px-2 py-3"
                      />
                    </div>
                    {showSuggestions && citySuggestions.length > 0 && (
                      <div className="absolute top-full left-0 w-full bg-stone-900 border-2 border-stone-800 rounded-xl mt-2 shadow-2xl z-50 overflow-hidden">
                        {citySuggestions.map((s, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              setLocationStr(s.name);
                              setShowSuggestions(false);
                              setUserLat(s.lat);
                              setUserLon(s.lon);
                              fetchAiInsights(sellCrop, s.name, s.lat, s.lon);
                            }}
                            className="w-full px-4 py-3 text-left hover:bg-stone-800 border-b border-stone-800 last:border-0 flex items-center justify-between group transition-all"
                          >
                            <div className="flex items-center gap-3">
                              <MapPin size={14} className="t-text-secondary group-hover:text-[#facc15]" />
                              <div>
                                <p className="font-bold text-stone-300 text-xs">{s.display}</p>
                                <p className="text-[9px] t-text-secondary uppercase font-black tracking-wider">{s.state || 'India'}</p>
                              </div>
                            </div>
                            <ChevronRight size={12} className="text-stone-700 group-hover:translate-x-1 transition-transform" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest t-text-secondary block mb-2">Quantity (kg)</label>
                    <div className="flex items-center">
                      <input 
                        type="number" 
                        value={quantity}
                        onChange={e => setQuantity(Number(e.target.value))}
                        className="w-full bg-stone-800 border border-stone-700 rounded-xl px-4 py-3 t-text text-sm outline-none focus:border-[#facc15] transition-colors"
                        min="1"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <button 
                onClick={fetchVendorsData} 
                disabled={fetchingVendors || !locationStr}
                className="w-full md:w-auto px-8 py-4 bg-[#facc15] t-text font-black text-sm uppercase tracking-wider rounded-xl hover:bg-yellow-400 shadow-lg disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {fetchingVendors ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                {fetchingVendors ? 'Analyzing Routes & Prices...' : 'Find Best Vendors'}
              </button>
            </div>

            {vendorsData?.vendors && vendorsData.vendors.length > 0 && (
              <div className="space-y-4">
                {vendorsData.vendors.map((v, i) => {
                  const isBest = v.vendor_name === vendorsData.best_vendor.vendor_name;
                  return (
                    <div key={i} className={`relative p-6 rounded-3xl border-2 transition-all ${isBest ? 'bg-stone-900 border-[#facc15] shadow-[0_0_30px_rgba(250,204,21,0.15)]' : 'bg-stone-900 border-stone-800 hover:border-stone-700'}`}>
                      {isBest && (
                        <div className="absolute -top-3 left-6 px-4 py-1 bg-[#facc15] t-text text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg">
                          Best Profit Choice
                        </div>
                      )}
                      <div className="flex flex-col md:flex-row justify-between gap-6">
                        <div className="flex-1">
                          <h4 className="text-xl font-black t-text mb-1">{v.vendor_name}</h4>
                          <div className="flex flex-wrap gap-3 text-xs t-text-muted">
                            <span className="flex items-center gap-1"><MapPin size={12}/> {v.distance_km} km away</span>
                            <span>⭐ {v.rating}/5.0 Rating</span>
                            {v.is_msp_linked && <span className="text-[#facc15] font-black">MSP PROTECTED</span>}
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 mt-6">
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-widest t-text-secondary mb-1">Buying Rate</p>
                              <p className="text-lg font-black t-text">₹{v.buying_price_per_kg} <span className="text-xs t-text-secondary font-medium">/kg</span></p>
                            </div>
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-widest t-text-secondary mb-1">Gross Value</p>
                              <p className="text-lg font-black t-text">₹{v.gross_revenue}</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="w-px bg-stone-800 hidden md:block"></div>
                        
                        <div className="md:w-64 flex flex-col justify-center">
                          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-3 flex justify-between items-center">
                            <span className="text-xs font-bold text-red-400">Est. Transport Cost</span>
                            <span className="font-black text-red-400">-₹{v.transport_cost}</span>
                          </div>
                          <div className="bg-[#facc15]/10 border border-[#facc15]/20 rounded-xl p-4 flex justify-between items-center">
                            <span className="text-xs font-black uppercase tracking-widest text-[#facc15]">Net Profit</span>
                            <span className="text-2xl font-black text-[#facc15]">₹{v.net_profit}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Regional Market Intelligence */}
                {vendorsData.most_grown && vendorsData.most_grown.length > 0 && (
                  <div className="bg-stone-900 border border-stone-800 rounded-3xl p-8 mt-12">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-3 bg-[#facc15]/10 rounded-2xl">
                        <TrendingUp size={24} className="text-[#facc15]" />
                      </div>
                      <div>
                        <h4 className="t-text font-black text-xl">Regional Market Intelligence</h4>
                        <p className="t-text-secondary text-xs">Dominant crops grown in {vendorsData.market_context?.location_detected}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {vendorsData.most_grown.map((c, i) => (
                        <div key={i} className="bg-stone-800/40 rounded-2xl p-4 border border-stone-700/50 flex items-center justify-between">
                          <div>
                            <p className="text-[8px] font-black uppercase t-text-secondary mb-1">Local Staple #{i+1}</p>
                            <p className="t-text font-black">{c}</p>
                          </div>
                          <div className="h-2 w-16 bg-stone-700 rounded-full overflow-hidden">
                            <div className="h-full bg-[#facc15]" style={{ width: `${85 - (i * 15)}%` }}></div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-[9px] text-stone-600 mt-4 italic font-medium">Source: {vendorsData.market_context?.price_source} + Regional Sowing Data Analysis</p>
                  </div>
                )}
              </div>
            )}
            {vendorsData?.vendors && vendorsData.vendors.length === 0 && (
              <div className="t-bg-card border-2 t-border p-8 rounded-3xl text-center">
                <p className="t-text-muted">No suitable vendors found nearby. Try increasing search range or changing location.</p>
              </div>
            )}
            
            {/* AI Selling Strategy */}
            <div className="mt-8 t-bg-card border-2 t-border rounded-[2rem] p-8 shadow-xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-[#facc15]/10 rounded-2xl flex items-center justify-center">
                  <Brain size={24} className="text-[#facc15]" />
                </div>
                <div>
                  <h3 className="text-xl font-black t-text">AI Selling Strategy</h3>
                  <p className="t-text-muted text-xs">Get personalized advice on when and how to sell your crop for maximum profit.</p>
                </div>
                <button
                  onClick={async () => {
                    setStrategyLoading(true); setSellingStrategy(null);
                    try {
                      const res = await axios.post('/api/market/ai-insights', {
                        crop: sellCrop, location: locationStr || 'Karnataka', lat: userLat, lon: userLon,
                        quantity: quantity, mode: 'selling_strategy'
                      });
                      setSellingStrategy(res.data);
                    } catch (err) { console.error(err); }
                    finally { setStrategyLoading(false); }
                  }}
                  disabled={strategyLoading}
                  className="ml-auto px-6 py-3 bg-[#facc15] t-text font-black text-xs uppercase tracking-wider rounded-xl hover:bg-yellow-400 shadow-lg disabled:opacity-50 transition-all flex items-center gap-2"
                >
                  {strategyLoading ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
                  {strategyLoading ? 'Analyzing...' : 'Generate Strategy'}
                </button>
              </div>

              {strategyLoading && (
                <div className="flex items-center gap-4 p-6 t-bg-input rounded-2xl border t-border">
                  <Loader2 size={24} className="animate-spin text-[#facc15]" />
                  <div>
                    <p className="font-black t-text">AI is analyzing market conditions...</p>
                    <p className="text-xs t-text-secondary">Evaluating MSP, demand, timing, and regional factors for {sellCrop}</p>
                  </div>
                </div>
              )}

              {sellingStrategy && !strategyLoading && (
                <div className="space-y-4">
                  {sellingStrategy.ai_analysis?.market_recommendation && (
                    <div className="bg-[#facc15]/5 rounded-2xl p-6 border border-[#facc15]/20">
                      <p className="text-[10px] font-black uppercase tracking-widest text-[#b45309] mb-2 flex items-center gap-2"><Lightbulb size={14} /> Market Recommendation</p>
                      <p className="text-stone-700 font-medium leading-relaxed">{sellingStrategy.ai_analysis.market_recommendation}</p>
                    </div>
                  )}
                  <div className="grid md:grid-cols-2 gap-4">
                    {sellingStrategy.ai_analysis?.timing_advice && (
                      <div className="t-bg-input rounded-2xl p-5 border t-border">
                        <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-2 flex items-center gap-2"><Clock size={14} /> Best Timing</p>
                        <p className="text-stone-700 text-sm">{sellingStrategy.ai_analysis.timing_advice}</p>
                      </div>
                    )}
                    {sellingStrategy.ai_analysis?.storage_recommendation && (
                      <div className="t-bg-input rounded-2xl p-5 border t-border">
                        <p className="text-[10px] font-black uppercase tracking-widest text-green-600 mb-2 flex items-center gap-2"><ShieldCheck size={14} /> Storage Strategy</p>
                        <p className="text-stone-700 text-sm">{sellingStrategy.ai_analysis.storage_recommendation}</p>
                      </div>
                    )}
                  </div>
                  {sellingStrategy.ai_analysis?.price_factors?.length > 0 && (
                    <div className="t-bg-input rounded-2xl p-5 border t-border">
                      <p className="text-[10px] font-black uppercase tracking-widest text-orange-600 mb-3 flex items-center gap-2"><TrendingUp size={14} /> Price Factors</p>
                      <div className="space-y-2">
                        {sellingStrategy.ai_analysis.price_factors.map((f, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <span className="text-[#facc15] font-black mt-0.5">•</span>
                            <p className="text-stone-600 text-xs">{f}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {sellingStrategy.nearby_markets?.length > 0 && (
                    <div className="t-bg-input rounded-2xl p-5 border t-border">
                      <p className="text-[10px] font-black uppercase tracking-widest text-purple-600 mb-3 flex items-center gap-2"><MapPin size={14} /> Recommended Markets</p>
                      <div className="space-y-2">
                        {sellingStrategy.nearby_markets.slice(0, 3).map((m, i) => (
                          <div key={i} className="flex items-center justify-between t-bg-card rounded-xl p-3 border t-border">
                            <div>
                              <p className="font-bold text-sm t-text">{m.name}</p>
                              <p className="text-[10px] t-text-muted">{m.district} · {m.distance_km}km away</p>
                            </div>
                            <div className="text-right">
                              <p className="font-black t-text">₹{m.net_price_after_costs}/q</p>
                              <p className="text-[9px] t-text-muted">Net price</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <p className="text-center text-[9px] t-text-muted">{sellingStrategy.data_sources || 'MSP data + Groq AI analysis'}</p>
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
