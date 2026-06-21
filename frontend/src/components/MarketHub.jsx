import React, { useState, useEffect } from 'react';
import { TrendingUp, DollarSign, Search, Loader2, AlertTriangle, ArrowUp, ArrowDown, Calendar, CloudRain, Truck, BarChart3, Target, ChevronDown, ChevronUp, ExternalLink, MapPin, Clock, ShieldCheck } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import axios from 'axios';
import { CROP_DATABASE } from '../data/cropData';


const GrainOverlay = () => <div className="grain-overlay opacity-20" />;
const CROPS = [...new Set([...CROP_DATABASE.map(c => c.name), 'Potato','Capsicum','Soybean','Grape','Orange','Apple','Sunflower','Mustard','Wheat','Barley','Jowar','Bajra'])];

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
          try {
            // Reverse geocode using OpenStreetMap Nominatim
            const res = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
            const address = res.data.address;
            const city = address.city || address.town || address.village || address.county || '';
            const state = address.state || '';
            setLocationStr(city && state ? `${city}, ${state}` : `Lat: ${lat.toFixed(4)}, Lon: ${lon.toFixed(4)}`);
          } catch (e) {
            setLocationStr(`Lat: ${lat.toFixed(4)}, Lon: ${lon.toFixed(4)}`);
          } finally {
            setLocating(false);
          }
        },
        () => {
          setLocating(false);
          alert("Location access denied or unavailable.");
        }
      );
    } else {
      alert("Geolocation is not supported by this browser.");
    }
  };

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
    { id:'smart_selling', label:'Smart Selling', icon: Truck },
    { id:'insights', label:'AI Insights', icon: Target },
  ];

  return (
    <div className="pt-28 min-h-screen bg-[#0c0a09]">
      <GrainOverlay />
      <div className="max-w-7xl mx-auto px-6 pb-20">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
          <div>
            <p className="text-[8px] font-black uppercase tracking-[0.3em] text-[#facc15] mb-2">MarketHub AI Intelligence</p>
            <h1 className="font-serif text-5xl font-black text-white">Market <span className="text-[#facc15]">Intelligence.</span></h1>
            <p className="text-stone-400 text-sm mt-1">Real-time pricing, forecasting, and market analysis for Karnataka</p>
          </div>
          <div className="flex items-center gap-3">
            <select value={crop} onChange={e => setCrop(e.target.value)}
              className="bg-stone-800 border-2 border-stone-700 rounded-xl px-4 py-3 font-bold text-white outline-none focus:border-[#facc15] text-sm">
              {CROPS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={fetchData} disabled={loading}
              className="px-6 py-3 bg-[#facc15] text-[#0c0a09] font-black text-sm rounded-xl hover:bg-yellow-400 shadow-lg disabled:opacity-50 transition-all flex items-center gap-2">
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
                activeTab === t.id ? 'bg-[#facc15] text-[#0c0a09] shadow-lg' : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
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
              <div className="bg-stone-900 border border-stone-700 rounded-2xl p-5">
                <p className="text-[8px] font-black uppercase text-stone-500 mb-1">MSP Floor</p>
                <p className="text-white text-2xl font-black">{k.msp || '—'}/q</p>
                <p className={`text-xs font-bold mt-1 ${trend25 ? 'text-green-400' : 'text-red-400'}`}>{k.trend_percent || '0%'}</p>
              </div>
              <div className="bg-stone-900 border border-stone-700 rounded-2xl p-5">
                <p className="text-[8px] font-black uppercase text-stone-500 mb-1">Trend</p>
                <p className="text-white text-2xl font-black">{k.trend || '—'} %</p>
                <p className="text-xs text-stone-500 mt-1">{k.forecast_percent || '—'} forecast</p>
              </div>
              <div className="bg-stone-900 border border-stone-700 rounded-2xl p-5">
                <p className="text-[8px] font-black uppercase text-stone-500 mb-1">Supply Index</p>
                <p className="text-white text-2xl font-black">{k.supply_index ?? '—'} %</p>
                <div className="mt-2 h-1.5 bg-stone-700 rounded-full overflow-hidden">
                  <div className="h-full bg-[#facc15] rounded-full" style={{width: `${k.supply_index || 50}%`}}></div>
                </div>
              </div>
              <div className="bg-stone-900 border border-stone-700 rounded-2xl p-5">
                <p className="text-[8px] font-black uppercase text-stone-500 mb-1">90-Day Forecast</p>
                <p className="text-white text-2xl font-black">₹{f90?.price ? Math.round(f90.price) : '—'}</p>
                <p className={`text-xs font-bold mt-1 ${trend25 ? 'text-green-400' : 'text-red-400'}`}>
                  {fc?.change_pct ? `${trend25 ? '↑' : '↓'} ${Math.abs(fc.change_pct)}%` : '—'}
                </p>
              </div>
              <div className="bg-stone-900 border border-stone-700 rounded-2xl p-5">
                <p className="text-[8px] font-black uppercase text-stone-500 mb-1">Signal</p>
                {signal ? (
                  <div className={`inline-block px-3 py-1 rounded-lg font-black text-sm ${
                    signal === 'BUY' ? 'bg-green-500/20 text-green-400' :
                    signal === 'SELL' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'
                  }`}>{signal}</div>
                ) : <p className="text-white text-2xl font-black">—</p>}
                <p className="text-[8px] text-stone-500 mt-1">Market signal</p>
              </div>
              <div className="bg-stone-900 border border-stone-700 rounded-2xl p-5">
                <p className="text-[8px] font-black uppercase text-stone-500 mb-1">Confidence</p>
                <p className="text-white text-2xl font-black">{f90?.confidence ?? '—'} %</p>
                <p className="text-xs text-stone-500 mt-1">90-day forecast</p>
              </div>
            </div>

            {/* Price Chart */}
            <div className="bg-stone-900 border border-stone-700 rounded-[2rem] p-8">
              <h3 className="text-white font-black text-lg mb-6">6-Month Price Trajectory — {crop}</h3>
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
                <div className="h-[300px] flex items-center justify-center text-stone-500">No historical data available</div>
              )}
            </div>

            {/* Forecast Points */}
            {fp.length > 0 && (
              <div className="bg-stone-900 border border-stone-700 rounded-[2rem] p-8">
                <h3 className="text-white font-black text-lg mb-4">90-Day Price Forecast Points</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {fp.filter((_,i) => i % Math.max(1, Math.floor(fp.length/5)) === 0 || i === fp.length-1).slice(0, 6).map((p, i) => (
                    <div key={i} className="bg-stone-800 rounded-xl p-4 border border-stone-700">
                      <p className="text-[8px] font-bold text-stone-500 uppercase">Day {p.day}</p>
                      <p className="font-black text-lg text-[#facc15]">₹{Math.round(p.price)}</p>
                      <p className="text-[8px] text-stone-500">{p.date?.slice(0, 6)}</p>
                      <div className="mt-1 h-1 bg-stone-700 rounded-full overflow-hidden">
                        <div className="h-full bg-[#facc15] rounded-full" style={{width: `${p.confidence}%`}}></div>
                      </div>
                      <p className="text-[8px] text-stone-500 mt-0.5">{p.confidence}% conf</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Analysis */}
            {data?.analysis && (
              <div className="bg-gradient-to-r from-stone-900 to-stone-800 border border-stone-700 rounded-[2rem] p-8">
                <h3 className="text-[#facc15] font-black text-sm uppercase tracking-wider mb-3">🧠 AI Market Analysis</h3>
                <p className="text-stone-300 text-sm leading-relaxed">{data.analysis}</p>
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
                <div key={i} className="bg-stone-900 border border-stone-700 rounded-2xl p-6">
                  <p className="text-[8px] font-black uppercase text-stone-500">{item.l} Forecast</p>
                  <p className="font-black text-3xl text-white mt-1">₹{item.p ? Math.round(item.p) : '—'}</p>
                  <p className="text-xs text-stone-500 mt-1">{item.d || '—'} · <span className="text-[#facc15]">{item.c || '—'}% confidence</span></p>
                  <div className="mt-2 h-1.5 bg-stone-700 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{
                      width: `${item.c || 0}%`,
                      background: item.c >= 80 ? '#84cc16' : item.c >= 60 ? '#facc15' : '#ef4444'
                    }}></div>
                  </div>
                </div>
              ))}
            </div>

            {fp.length > 0 && (
              <div className="bg-stone-900 border border-stone-700 rounded-[2rem] p-8">
                <h3 className="text-white font-black text-lg mb-6">Forecast Trajectory</h3>
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
                <div className="flex items-center justify-between text-xs text-stone-500 mt-4">
                  <span>Current: ₹{Math.round(fc?.current_price || 0)}</span>
                  <span className="text-[#facc15]">→</span>
                  <span>90-Day: ₹{Math.round(f90?.price || 0)}</span>
                  <span className="text-[#facc15]">→</span>
                  <span>Change: {fc?.change_pct ? `${trend25 ? '+' : '-'}${Math.abs(fc.change_pct)}%` : '—'}</span>
                </div>
              </div>
            )}

            {/* Market timing */}
            <div className="bg-stone-900 border border-stone-700 rounded-[2rem] p-8">
              <h3 className="text-white font-black text-lg mb-3">⏰ Market Timing</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-stone-800 rounded-xl p-5 border border-stone-700">
                  <p className="text-[8px] font-black uppercase text-stone-500">Best Selling Window</p>
                  <p className="font-black text-lg text-[#facc15] mt-1">{trend25 ? 'Hold — prices rising' : 'Sell soon — prices declining'}</p>
                  <p className="text-xs text-stone-400 mt-1">Based on 90-day forecast trend</p>
                </div>
                <div className="bg-stone-800 rounded-xl p-5 border border-stone-700">
                  <p className="text-[8px] font-black uppercase text-stone-500">Recommendation</p>
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
              <div className="bg-stone-900 border border-stone-700 rounded-2xl p-6">
                <p className="text-[8px] font-black uppercase text-stone-500 mb-2">📊 Volatility Meter</p>
                {fc?.change_pct ? (
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-3 h-3 rounded-full ${Math.abs(fc.change_pct) > 10 ? 'bg-red-500' : Math.abs(fc.change_pct) > 5 ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
                      <span className={`font-black text-lg ${Math.abs(fc.change_pct) > 10 ? 'text-red-400' : Math.abs(fc.change_pct) > 5 ? 'text-yellow-400' : 'text-green-400'}`}>
                        {Math.abs(fc.change_pct) > 10 ? 'High Volatility' : Math.abs(fc.change_pct) > 5 ? 'Moderate Volatility' : 'Low Volatility'}
                      </span>
                    </div>
                    <p className="text-xs text-stone-500">Price change: {fc.change_pct}% over 90 days</p>
                  </div>
                ) : <p className="text-stone-500 text-sm">Insufficient data</p>}
              </div>
              <div className="bg-stone-900 border border-stone-700 rounded-2xl p-6">
                <p className="text-[8px] font-black uppercase text-stone-500 mb-2">🌤 Weather Impact</p>
                <div className="flex items-center gap-2 mb-2">
                  <CloudRain size={18} className="text-blue-400" />
                  <span className="text-white font-bold text-sm">Monsoon analysis for {crop}</span>
                </div>
                <p className="text-xs text-stone-400">Weather patterns affect supply. Monitor rainfall in growing regions for price signals.</p>
              </div>
            </div>

            {/* Supply Chain */}
            <div className="bg-stone-900 border border-stone-700 rounded-[2rem] p-6">
              <h3 className="text-[8px] font-black uppercase text-stone-500 mb-4">🚚 Supply Chain Intelligence</h3>
              <div className="grid md:grid-cols-3 gap-4 text-xs">
                <div className="bg-stone-800 rounded-xl p-4 border border-stone-700">
                  <p className="font-bold text-white">Transport Cost Impact</p>
                  <p className="text-stone-400 mt-1">Fuel prices affect mandi rates. Sell to nearest mandi for best net margin.</p>
                </div>
                <div className="bg-stone-800 rounded-xl p-4 border border-stone-700">
                  <p className="font-bold text-white">Storage Recommendation</p>
                  <p className="text-stone-400 mt-1">{trend25 ? 'Store for 2-4 weeks — prices trending up' : 'Sell immediately — declining trend detected'}</p>
                </div>
                <div className="bg-stone-800 rounded-xl p-4 border border-stone-700">
                  <p className="font-bold text-white">Export Opportunity</p>
                  <p className="text-stone-400 mt-1">Check e-NAM portal for inter-state mandi prices for better rates.</p>
                </div>
              </div>
            </div>

            {/* Schemes */}
            <div className="bg-gradient-to-r from-blue-900/30 to-stone-900 border border-blue-800/30 rounded-[2rem] p-6">
              <h3 className="text-[8px] font-black uppercase text-blue-400 mb-4">🏛 Government Schemes — {crop}</h3>
              <div className="grid md:grid-cols-3 gap-3 text-xs">
                <div className="bg-stone-800/50 rounded-xl p-4 border border-blue-800/30">
                  <p className="font-bold text-white">PM-KISAN</p>
                  <p className="text-stone-400 mt-1">₹6,000/yr direct income support</p>
                </div>
                <div className="bg-stone-800/50 rounded-xl p-4 border border-blue-800/30">
                  <p className="font-bold text-white">PMFBY Insurance</p>
                  <p className="text-stone-400 mt-1">Crop coverage at 2% premium</p>
                </div>
                <div className="bg-stone-800/50 rounded-xl p-4 border border-blue-800/30">
                  <p className="font-bold text-white">MSP Support</p>
                  <p className="text-stone-400 mt-1">Govt. minimum price: {k.msp || '—'}/quintal</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── SMART SELLING TAB ── */}
        {activeTab === 'smart_selling' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-stone-900 to-stone-800 border border-stone-700 rounded-[2rem] p-8">
              <div className="flex flex-col md:flex-row gap-6 mb-8">
                <div className="flex-1">
                  <h3 className="text-white font-black text-2xl mb-2">Smart Vendor Finder</h3>
                  <p className="text-stone-400 text-sm">Find nearby buyers and optimize your profit by analyzing local prices against transportation costs.</p>
                </div>
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-stone-500 block mb-2">Crop</label>
                    <div className="flex items-center">
                      <select 
                        value={sellCrop}
                        onChange={e => setSellCrop(e.target.value)}
                        className="w-full bg-stone-800 border border-stone-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#facc15] transition-colors appearance-none"
                      >
                        {CROPS.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-stone-500 block mb-2">Your Location</label>
                    <div className="flex bg-stone-800 border border-stone-700 rounded-xl overflow-hidden focus-within:border-[#facc15] transition-colors">
                      <button onClick={detectLocation} disabled={locating} className="p-3 text-stone-400 hover:text-[#facc15] transition-colors disabled:opacity-50" title="Use GPS">
                        {locating ? <Loader2 size={18} className="animate-spin text-[#facc15]" /> : <MapPin size={18} />}
                      </button>
                      <input 
                        type="text" 
                        value={locationStr}
                        onChange={e => setLocationStr(e.target.value)}
                        placeholder="City, Region, or GPS"
                        className="flex-1 bg-transparent border-none outline-none text-white text-sm px-2 py-3"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-stone-500 block mb-2">Quantity (kg)</label>
                    <div className="flex items-center">
                      <input 
                        type="number" 
                        value={quantity}
                        onChange={e => setQuantity(Number(e.target.value))}
                        className="w-full bg-stone-800 border border-stone-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#facc15] transition-colors"
                        min="1"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <button 
                onClick={fetchVendorsData} 
                disabled={fetchingVendors || !locationStr}
                className="w-full md:w-auto px-8 py-4 bg-[#facc15] text-[#0c0a09] font-black text-sm uppercase tracking-wider rounded-xl hover:bg-yellow-400 shadow-lg disabled:opacity-50 transition-all flex items-center justify-center gap-2"
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
                        <div className="absolute -top-3 left-6 px-4 py-1 bg-[#facc15] text-[#0c0a09] text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg">
                          Best Profit Choice
                        </div>
                      )}
                      <div className="flex flex-col md:flex-row justify-between gap-6">
                        <div className="flex-1">
                          <h4 className="text-xl font-black text-white mb-1">{v.vendor_name}</h4>
                          <div className="flex flex-wrap gap-3 text-xs text-stone-400">
                            <span className="flex items-center gap-1"><MapPin size={12}/> {v.distance_km} km away</span>
                            <span>⭐ {v.rating}/5.0 Rating</span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 mt-6">
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-widest text-stone-500 mb-1">Buying Rate</p>
                              <p className="text-lg font-black text-white">₹{v.buying_price_per_kg} <span className="text-xs text-stone-500 font-medium">/kg</span></p>
                            </div>
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-widest text-stone-500 mb-1">Gross Value</p>
                              <p className="text-lg font-black text-white">₹{v.gross_revenue}</p>
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
              </div>
            )}
            {vendorsData?.vendors && vendorsData.vendors.length === 0 && (
              <div className="bg-stone-900 border border-stone-800 p-8 rounded-3xl text-center">
                <p className="text-stone-400">No suitable vendors found nearby. Try increasing search range or changing location.</p>
              </div>
            )}
            


          </div>
        )}
      </div>
    </div>
  );
}
