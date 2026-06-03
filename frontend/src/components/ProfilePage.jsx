import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Phone, MapPin, Ruler, Sprout, Loader2, Save, LogOut, CheckCircle2 } from 'lucide-react';
import axios from 'axios';
import { motion } from 'framer-motion';

const GrainOverlay = () => <div className="grain-overlay opacity-20" />;

export default function ProfilePage({ user: propUser, onLogout }) {
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
    const token = localStorage.getItem('token');
    if (!token) { navigate('/login'); return; }
    axios.get('/api/auth/profile', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        if (res.data.success) {
          setProfile(res.data.user);
          setFarms(res.data.farms || []);
        }
      })
      .catch(() => { localStorage.removeItem('token'); navigate('/login'); })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    const token = localStorage.getItem('token');
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
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="font-serif text-4xl font-black text-[#0c0a09]">Farmer <span className="italic text-[#84cc16]">Profile</span></h1>
            <p className="text-stone-500 text-sm font-medium">{profile.email}</p>
          </div>
          <button onClick={handleLogout}
            className="flex items-center gap-2 px-5 py-3 bg-red-50 text-red-600 rounded-2xl font-black text-xs uppercase tracking-wider hover:bg-red-100 transition-all border border-red-200">
            <LogOut size={14} /> Sign Out
          </button>
        </div>

        {/* Vitality Bar */}
        <div className="bg-white border-2 border-stone-200 rounded-3xl p-6 mb-8 shadow-sm flex items-center gap-6">
          <div className="relative w-16 h-16 flex-shrink-0">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="32" cy="32" r="28" fill="none" stroke="#f5f5f4" strokeWidth="6" />
              <motion.circle cx="32" cy="32" r="28" fill="none" stroke="#84cc16" strokeWidth="6"
                strokeDasharray={176} initial={{ strokeDashoffset: 176 }} animate={{ strokeDashoffset: 176 - (176 * calculateVitality()) / 100 }}
                strokeLinecap="round" transition={{ duration: 1.5, ease: "easeOut" }} />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center font-black text-xs text-[#0c0a09]">
              {calculateVitality()}%
            </div>
          </div>
          <div>
            <h3 className="font-serif text-xl font-black text-[#0c0a09]">Profile Vitality</h3>
            <p className="text-stone-500 text-xs mt-0.5">Complete your data to unlock higher accuracy RAG intelligence.</p>
          </div>
          {calculateVitality() < 100 && (
            <div className="ml-auto hidden md:block">
              <div className="bg-[#84cc16]/10 text-[#84cc16] px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border border-[#84cc16]/20">
                Data Reward: +15% Accuracy
              </div>
            </div>
          )}
        </div>

        <div className="grid lg:grid-cols-[2fr_1fr] gap-8">
          <div className="space-y-6">
            {/* Personal Info */}
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

            {/* Location & Farm */}
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

          {/* Farms sidebar */}
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
      </div>
    </div>
  );
}
