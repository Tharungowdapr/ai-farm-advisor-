import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Mail, Phone, MapPin, Ruler, Sprout, Loader2, Save, LogOut, CheckCircle2, MessageSquare, History, Trash2, Clock, Search, ChevronRight, Eye } from 'lucide-react';
import { motion } from 'framer-motion';
import axios from 'axios';

const GrainOverlay = () => <div className="grain-overlay opacity-20" />;

export default function ProfilePage({ user: propUser, onLogout }) {
  const [tab, setTab] = useState('profile');
  const [profile, setProfile] = useState(null);
  const [farms, setFarms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [citySuggestions, setCitySuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const cityRef = React.useRef(null);
  const navigate = useNavigate();

  // Chat history
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionMessages, setSessionMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);

  // Land analyses
  const [analyses, setAnalyses] = useState([]);
  const [analysesLoading, setAnalysesLoading] = useState(false);
  const [selectedAnalysis, setSelectedAnalysis] = useState(null);

  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!profile || (profile.district || '').length < 2) { setCitySuggestions([]); return; }
    const t = setTimeout(async () => {
      try {
        const r = await axios.get(`/api/cities?q=${encodeURIComponent(profile.district)}`);
        setCitySuggestions(r.data.cities || []);
        setShowDropdown(r.data.cities?.length > 0);
      } catch {}
    }, 300);
    return () => clearTimeout(t);
  }, [profile?.district]);

  useEffect(() => {
    const h = (e) => { if (cityRef.current && !cityRef.current.contains(e.target)) setShowDropdown(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => {
    if (!token) { navigate('/login'); return; }
    axios.get('/api/auth/profile', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        if (res.data.success) {
          setProfile(res.data.user);
          setFarms(res.data.farms || []);
        }
      })
      .catch(() => { localStorage.removeItem('token'); localStorage.removeItem('user'); if (onLogout) onLogout(); navigate('/login'); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (tab === 'chats' && token) {
      setSessionsLoading(true);
      axios.get('/api/chat/sessions', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => setSessions(r.data?.sessions || []))
        .catch(() => {})
        .finally(() => setSessionsLoading(false));
    }
  }, [tab]);

  useEffect(() => {
    if (tab === 'analyses' && token) {
      setAnalysesLoading(true);
      axios.get('/api/land-analyses', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => setAnalyses(r.data?.analyses || []))
        .catch(() => {})
        .finally(() => setAnalysesLoading(false));
    }
  }, [tab]);

  const handleSave = async () => {
    if (!token) return;
    setSaving(true); setError(''); setSaved(false);
    try {
      const res = await axios.put('/api/auth/profile', profile, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    if (onLogout) onLogout();
    navigate('/login');
  };

  const loadSessionMessages = async (sid) => {
    if (!token) return;
    setMessagesLoading(true);
    try {
      const r = await axios.get(`/api/chat/sessions/${sid}`, { headers: { Authorization: `Bearer ${token}` } });
      if (r.data?.success) {
        setSelectedSession(r.data.session);
        setSessionMessages(r.data.messages || []);
      }
    } catch {} finally {
      setMessagesLoading(false);
    }
  };

  const deleteSession = async (sid) => {
    if (!token) return;
    try {
      await axios.delete(`/api/chat/sessions/${sid}`, { headers: { Authorization: `Bearer ${token}` } });
      setSessions(p => p.filter(s => s.id !== sid));
      if (selectedSession?.id === sid) { setSelectedSession(null); setSessionMessages([]); }
    } catch {}
  };

  const deleteAnalysis = async (aid) => {
    if (!token) return;
    try {
      await axios.delete(`/api/land-analyses/${aid}`, { headers: { Authorization: `Bearer ${token}` } });
      setAnalyses(p => p.filter(a => a.id !== aid));
      if (selectedAnalysis?.id === aid) setSelectedAnalysis(null);
    } catch {}
  };

  const calculateVitality = () => {
    if (!profile) return 0;
    const fields = ['name', 'phone', 'state', 'district', 'village', 'land_size_acres', 'soil_type'];
    const filled = fields.filter(f => profile[f] && String(profile[f]).trim() !== '').length;
    return Math.round((filled / fields.length) * 100);
  };

  const inputClass = "w-full bg-stone-50 border-2 border-stone-200 rounded-xl p-3.5 font-bold text-stone-700 outline-none focus:ring-4 focus:ring-[#84cc16]/10 focus:border-[#84cc16] transition-all text-sm";

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#fafaf9]">
      <Loader2 className="w-8 h-8 animate-spin text-[#84cc16]" />
    </div>
  );

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-[#fafaf9] pt-28 pb-20 px-6">
      <GrainOverlay />
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-serif text-4xl font-black text-[#0c0a09]">Farmer <span className="italic text-[#84cc16]">Profile</span></h1>
            <p className="text-stone-500 text-sm font-medium">{profile.email}</p>
          </div>
          <button onClick={handleLogout}
            className="flex items-center gap-2 px-5 py-3 bg-red-50 text-red-600 rounded-2xl font-black text-xs uppercase tracking-wider hover:bg-red-100 transition-all border border-red-200">
            <LogOut size={14} /> Sign Out
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white border-2 border-stone-200 rounded-2xl p-1.5 mb-8 shadow-sm">
          {[
            { id: 'profile', label: 'Profile', icon: User },
            { id: 'chats', label: 'Chat History', icon: MessageSquare },
            { id: 'analyses', label: 'Land Analyses', icon: History },
          ].map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); setSelectedSession(null); setSessionMessages([]); setSelectedAnalysis(null); }}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all ${tab === t.id ? 'bg-[#0c0a09] text-white shadow-lg' : 'text-stone-400 hover:text-stone-600'}`}>
              <t.icon size={14} /> {t.label}
            </button>
          ))}
        </div>

        {tab === 'profile' && (
          <>
            {/* Vitality Bar */}
            <div className="bg-white border-2 border-stone-200 rounded-3xl p-6 mb-8 shadow-sm flex items-center gap-6">
              <div className="relative w-16 h-16 flex-shrink-0">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="32" cy="32" r="28" fill="none" stroke="#f5f5f4" strokeWidth="6" />
                  <motion.circle cx="32" cy="32" r="28" fill="none" stroke="#84cc16" strokeWidth="6"
                    strokeDasharray={176}
                    initial={{ strokeDashoffset: 176 }}
                    animate={{ strokeDashoffset: 176 - (176 * calculateVitality()) / 100 }}
                    strokeLinecap="round"
                    transition={{ duration: 1.5, ease: "easeOut" }} />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center font-black text-xs text-[#0c0a09]">
                  {calculateVitality()}%
                </div>
              </div>
              <div>
                <h3 className="font-serif text-xl font-black text-[#0c0a09]">Profile Vitality</h3>
                <p className="text-stone-500 text-xs mt-0.5">Complete your data to unlock higher accuracy RAG intelligence.</p>
              </div>
            </div>

            <div className="grid lg:grid-cols-[2fr_1fr] gap-8">
              <div className="space-y-6">
                <div className="bg-white border-2 border-stone-200 rounded-[2rem] p-8 shadow-xl">
                  <h2 className="text-[8px] font-black uppercase tracking-widest text-stone-400 mb-6">Personal Info</h2>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-black text-xs text-stone-500 mb-1">Name</label>
                      <input type="text" value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} className={inputClass} />
                    </div>
                    <div>
                      <label className="block font-black text-xs text-stone-500 mb-1">Phone</label>
                      <input type="text" value={profile.phone || ''} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} className={inputClass} />
                    </div>
                  </div>
                </div>

                <div className="bg-white border-2 border-stone-200 rounded-[2rem] p-8 shadow-xl">
                  <h2 className="text-[8px] font-black uppercase tracking-widest text-stone-400 mb-6">Land & Location</h2>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <label className="block font-black text-xs text-stone-500 mb-1">State</label>
                      <input type="text" value={profile.state || ''} onChange={e => setProfile(p => ({ ...p, state: e.target.value }))} className={inputClass} />
                    </div>
                    <div className="relative" ref={cityRef}>
                      <label className="block font-black text-xs text-stone-500 mb-1">District</label>
                      <input type="text" value={profile.district || ''} onChange={e => { setProfile(p => ({ ...p, district: e.target.value })); setShowDropdown(true); }}
                        className={inputClass} onFocus={() => citySuggestions.length > 0 && setShowDropdown(true)} />
                      {showDropdown && citySuggestions.length > 0 && (
                        <div className="absolute z-50 mt-1 bg-white border-2 border-stone-200 rounded-xl shadow-xl max-h-44 overflow-y-auto w-full">
                          {citySuggestions.map((c, i) => (
                            <button key={i} type="button" onMouseDown={() => { setProfile(p => ({ ...p, district: c.city })); setShowDropdown(false); }}
                              className="w-full text-left px-4 py-2.5 text-sm font-bold text-stone-700 hover:bg-[#84cc16]/10 border-b border-stone-100 last:border-0">
                              {c.city} <span className="text-stone-400 text-xs">{c.district}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block font-black text-xs text-stone-500 mb-1">Village</label>
                      <input type="text" value={profile.village || ''} onChange={e => setProfile(p => ({ ...p, village: e.target.value }))} className={inputClass} />
                    </div>
                    <div>
                      <label className="block font-black text-xs text-stone-500 mb-1">Land (acres)</label>
                      <input type="number" step="0.01" value={profile.land_size_acres || ''} onChange={e => setProfile(p => ({ ...p, land_size_acres: e.target.value }))} className={inputClass} />
                    </div>
                    <div>
                      <label className="block font-black text-xs text-stone-500 mb-1">Soil Type</label>
                      <select value={profile.soil_type || ''} onChange={e => setProfile(p => ({ ...p, soil_type: e.target.value }))} className={inputClass}>
                        <option value="">Not set</option>
                        <option>Black Cotton</option><option>Red Loamy</option><option>Alluvial</option>
                        <option>Sandy</option><option>Clay</option><option>Laterite</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-black text-xs text-stone-500 mb-1">Farm Type</label>
                      <select value={profile.farm_type || 'rainfed'} onChange={e => setProfile(p => ({ ...p, farm_type: e.target.value }))} className={inputClass}>
                        <option value="rainfed">Rainfed</option>
                        <option value="irrigated">Irrigated</option>
                        <option value="partially_irrigated">Partially Irrigated</option>
                      </select>
                    </div>
                  </div>
                </div>

                {error && <div className="bg-red-50 border border-red-200 rounded-xl p-4"><p className="text-red-700 text-sm font-bold">{error}</p></div>}

                <button onClick={handleSave} disabled={saving}
                  className="w-full py-4 bg-[#84cc16] text-[#0c0a09] font-black text-sm rounded-2xl hover:bg-[#facc15] shadow-lg disabled:opacity-50 transition-all flex items-center justify-center gap-3">
                  {saving ? <Loader2 size={16} className="animate-spin" /> : saved ? <CheckCircle2 size={16} /> : <Save size={16} />}
                  {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Profile'}
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-white border-2 border-stone-200 rounded-[2rem] p-8 shadow-xl">
                  <h2 className="text-[8px] font-black uppercase tracking-widest text-stone-400 mb-4">My Farms</h2>
                  {farms.length === 0 ? (
                    <p className="text-stone-400 text-sm">No farms registered yet.</p>
                  ) : (
                    farms.map(f => (
                      <div key={f.id} className="bg-stone-50 rounded-xl p-4 mb-3 border border-stone-100">
                        <p className="font-bold text-sm text-[#0c0a09]">{f.crop_name}</p>
                        <p className="text-[10px] text-stone-500">{f.area_acres} acres · {f.soil_type || 'N/A'}</p>
                        <p className="text-[9px] text-stone-400">Planted: {f.planting_date}</p>
                      </div>
                    ))
                  )}
                </div>

                <div className="bg-[#84cc16]/5 border-2 border-[#84cc16]/20 rounded-[2rem] p-8 shadow-xl">
                  <h2 className="text-[8px] font-black uppercase tracking-widest text-[#84cc16] mb-2">Profile Benefits</h2>
                  <ul className="space-y-2 text-xs text-stone-600">
                    <li>→ Auto-fill diagnostics with your land data</li>
                    <li>→ Personalized crop recommendations</li>
                    <li>→ Track multiple farms & crops</li>
                    <li>→ Season-specific advisory based on your location</li>
                  </ul>
                </div>
              </div>
            </div>
          </>
        )}

        {tab === 'chats' && (
          <div className="grid lg:grid-cols-[1fr_2fr] gap-8">
            {/* Sessions List */}
            <div className="bg-white border-2 border-stone-200 rounded-[2rem] p-6 shadow-xl">
              <h2 className="text-[8px] font-black uppercase tracking-widest text-stone-400 mb-4">Chat Sessions</h2>
              {sessionsLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-[#84cc16]" /></div>
              ) : sessions.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare size={24} className="mx-auto text-stone-300 mb-2" />
                  <p className="text-stone-400 text-sm font-medium">No chat history yet</p>
                  <Link to="/vaniai" className="text-[#84cc16] text-xs font-black hover:underline mt-2 inline-block">Start a chat →</Link>
                </div>
              ) : (
                <div className="space-y-1 max-h-[500px] overflow-y-auto">
                  {sessions.map(s => (
                    <div key={s.id}
                      onClick={() => loadSessionMessages(s.id)}
                      className={`flex items-center justify-between px-3 py-3 rounded-xl cursor-pointer transition-all ${selectedSession?.id === s.id ? 'bg-[#84cc16]/10 border border-[#84cc16]/20' : 'hover:bg-stone-50 border border-transparent'}`}>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-bold text-[#0c0a09] truncate">{s.title}</p>
                        <p className="text-[9px] text-stone-400 mt-0.5">
                          <Clock size={10} className="inline mr-1" />
                          {s.updated_at?.slice(0, 10) || s.created_at?.slice(0, 10)}
                        </p>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); deleteSession(s.id); }}
                        className="p-1.5 text-stone-400 hover:text-red-500 transition-all flex-shrink-0">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Messages */}
            <div className="bg-white border-2 border-stone-200 rounded-[2rem] p-6 shadow-xl">
              <h2 className="text-[8px] font-black uppercase tracking-widest text-stone-400 mb-4">
                {selectedSession ? selectedSession.title : 'Select a session'}
              </h2>
              {messagesLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-[#84cc16]" /></div>
              ) : selectedSession && sessionMessages.length > 0 ? (
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {sessionMessages.map((m, i) => (
                    <div key={m.id || i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] p-4 rounded-2xl ${m.role === 'user' ? 'bg-[#84cc16]/10 border border-[#84cc16]/20' : 'bg-stone-50 border border-stone-200'}`}>
                        <p className="text-[9px] font-black uppercase tracking-wider text-stone-400 mb-1">{m.role === 'user' ? 'You' : 'Vani AI'}</p>
                        <p className="text-[13px] text-stone-700 leading-relaxed">{m.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : selectedSession ? (
                <p className="text-stone-400 text-sm text-center py-8">No messages in this session.</p>
              ) : (
                <div className="text-center py-12">
                  <MessageSquare size={32} className="mx-auto text-stone-200 mb-3" />
                  <p className="text-stone-400 text-sm">Select a chat session to view messages</p>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'analyses' && (
          <div className="grid lg:grid-cols-[1fr_2fr] gap-8">
            {/* Analyses List */}
            <div className="bg-white border-2 border-stone-200 rounded-[2rem] p-6 shadow-xl">
              <h2 className="text-[8px] font-black uppercase tracking-widest text-stone-400 mb-4">Saved Analyses</h2>
              {analysesLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-[#84cc16]" /></div>
              ) : analyses.length === 0 ? (
                <div className="text-center py-8">
                  <Search size={24} className="mx-auto text-stone-300 mb-2" />
                  <p className="text-stone-400 text-sm font-medium">No land analyses yet</p>
                  <Link to="/land-analyser" className="text-[#84cc16] text-xs font-black hover:underline mt-2 inline-block">Analyse land →</Link>
                </div>
              ) : (
                <div className="space-y-1 max-h-[500px] overflow-y-auto">
                  {analyses.map(a => (
                    <div key={a.id}
                      onClick={() => setSelectedAnalysis(a)}
                      className={`flex items-center justify-between px-3 py-3 rounded-xl cursor-pointer transition-all ${selectedAnalysis?.id === a.id ? 'bg-[#84cc16]/10 border border-[#84cc16]/20' : 'hover:bg-stone-50 border border-transparent'}`}>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-bold text-[#0c0a09] truncate">{a.city || 'Unknown location'}</p>
                        <p className="text-[9px] text-stone-400 mt-0.5">
                          <Clock size={10} className="inline mr-1" />
                          {a.created_at?.slice(0, 10)}
                        </p>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); deleteAnalysis(a.id); }}
                        className="p-1.5 text-stone-400 hover:text-red-500 transition-all flex-shrink-0">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Analysis Detail */}
            <div className="bg-white border-2 border-stone-200 rounded-[2rem] p-6 shadow-xl">
              <h2 className="text-[8px] font-black uppercase tracking-widest text-stone-400 mb-4">
                {selectedAnalysis ? (selectedAnalysis.city || 'Analysis Details') : 'Select an analysis'}
              </h2>
              {selectedAnalysis ? (
                <div className="max-h-[500px] overflow-y-auto">
                  <div className="flex items-center gap-3 mb-4 pb-4 border-b border-stone-100">
                    <MapPin size={16} className="text-[#84cc16]" />
                    <div>
                      <p className="font-bold text-sm text-[#0c0a09]">{selectedAnalysis.city || 'Unknown'}</p>
                      {selectedAnalysis.lat && (
                        <p className="text-[10px] text-stone-400">{selectedAnalysis.lat.toFixed(4)}, {selectedAnalysis.lon?.toFixed(4)}</p>
                      )}
                    </div>
                  </div>
                  {(() => {
                    let resultData = selectedAnalysis.result_json;
                    if (typeof resultData === 'string') {
                      try { resultData = JSON.parse(resultData); } catch { resultData = null; }
                    }
                    if (!resultData) return <p className="text-stone-400 text-sm">No data available</p>;
                    const r = resultData;
                    return (
                      <div className="space-y-3">
                        {r.climate && (
                          <div className="bg-stone-50 rounded-xl p-4">
                            <p className="text-[9px] font-black uppercase text-stone-400 mb-2">🌤 Climate</p>
                            <div className="grid grid-cols-3 gap-2 text-xs">
                              <div><span className="text-stone-400">Temp:</span> <span className="font-bold">{r.climate.temperature_celsius ?? '—'}°C</span></div>
                              <div><span className="text-stone-400">Rain:</span> <span className="font-bold">{r.climate.rainfall_mm ?? '—'}mm</span></div>
                              <div><span className="text-stone-400">Humidity:</span> <span className="font-bold">{r.climate.humidity_percent ?? '—'}%</span></div>
                            </div>
                          </div>
                        )}
                        {r.soil && (
                          <div className="bg-stone-50 rounded-xl p-4">
                            <p className="text-[9px] font-black uppercase text-stone-400 mb-2">🧪 Soil</p>
                            <div className="grid grid-cols-3 gap-2 text-xs">
                              <div><span className="text-stone-400">pH:</span> <span className="font-bold">{r.soil.ph ?? '—'}</span></div>
                              <div><span className="text-stone-400">N:</span> <span className="font-bold">{r.soil.nitrogen ?? '—'} kg/ha</span></div>
                              <div><span className="text-stone-400">P:</span> <span className="font-bold">{r.soil.phosphorus ?? '—'} kg/ha</span></div>
                            </div>
                          </div>
                        )}
                        {r.crop_suitability?.llm_suggestions && (
                          <div className="bg-stone-50 rounded-xl p-4">
                            <p className="text-[9px] font-black uppercase text-stone-400 mb-2">🌱 Top Crops</p>
                            <div className="space-y-1">
                              {r.crop_suitability.llm_suggestions.slice(0, 3).map((c, i) => (
                                <div key={i} className="flex items-center justify-between text-xs">
                                  <span className="font-bold">{c.crop}</span>
                                  <span className={`px-2 py-0.5 rounded-full text-[8px] font-black ${(c.risk || '').toLowerCase() === 'low' ? 'bg-green-100 text-green-700' : (c.risk || '').toLowerCase() === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                                    {c.risk || 'N/A'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {r.recommendations && (
                          <div className="bg-[#84cc16]/5 rounded-xl p-4 border border-[#84cc16]/10">
                            <p className="text-[9px] font-black uppercase text-[#84cc16] mb-2">💡 Recommendations</p>
                            <ul className="space-y-1">
                              {(r.recommendations.soil_amendments || []).slice(0, 2).map((rec, i) => (
                                <li key={i} className="text-[12px] text-stone-600">→ {rec}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {r.error && (
                          <div className="bg-red-50 rounded-xl p-4">
                            <p className="text-[11px] text-red-600">{r.error}</p>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Search size={32} className="mx-auto text-stone-200 mb-3" />
                  <p className="text-stone-400 text-sm">Select an analysis to view details</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
