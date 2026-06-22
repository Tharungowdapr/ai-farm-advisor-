import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sprout, Mail, Lock, User, Phone, MapPin, Ruler, Loader2, Eye, EyeOff } from 'lucide-react';
import axios from 'axios';
import { useLanguage } from '../i18n/LanguageContext';

const GrainOverlay = () => <div className="grain-overlay opacity-20" />;

export default function SignupPage({ onLogin }) {
  const [form, setForm] = useState({
    name: '', email: '', password: '', phone: '',
    state: '', district: '', village: '',
    land_size_acres: '', soil_type: '', farm_type: 'rainfed'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [citySuggestions, setCitySuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const cityRef = React.useRef(null);
  const navigate = useNavigate();
  const { t } = useLanguage();

  React.useEffect(() => {
    if (form.district.length < 2) { setCitySuggestions([]); return; }
    const t = setTimeout(async () => {
      try {
        const r = await axios.get(`/api/cities?q=${encodeURIComponent(form.district)}`);
        setCitySuggestions(r.data.cities || []);
        setShowDropdown(r.data.cities?.length > 0);
      } catch {}
    }, 300);
    return () => clearTimeout(t);
  }, [form.district]);

  React.useEffect(() => {
    const h = (e) => { if (cityRef.current && !cityRef.current.contains(e.target)) setShowDropdown(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await axios.post('/api/auth/signup', form);
      if (res.data.success) {
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        if (onLogin) onLogin(res.data.user);
        navigate('/profile');
      }
    } catch (err) {
      setError(err.response?.data?.error || t('auth.signupError'));
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full bg-stone-50 border-2 border-stone-200 rounded-2xl p-4 font-bold text-stone-700 outline-none focus:ring-4 focus:ring-[#84cc16]/10 focus:border-[#84cc16] transition-all";

  return (
    <div className="min-h-screen bg-[#fafaf9] py-24 px-6">
      <GrainOverlay />
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <div className="bg-[#0c0a09] w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-[#84cc16]/20">
            <Sprout className="text-[#84cc16] w-8 h-8" />
          </div>
          <h1 className="font-serif text-4xl font-black text-[#0c0a09]">
            {t('auth.signup')}
          </h1>
          <p className="text-stone-500 text-sm mt-2 font-medium">Register your farm for personalized insights</p>
        </div>

        <div className="bg-white border-2 border-stone-200 rounded-[3rem] p-10 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-red-700 text-sm font-bold">{error}</p>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block font-black text-xs uppercase tracking-widest text-stone-500 mb-2">{t('auth.name')} *</label>
                <div className="relative">
                  <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input type="text" value={form.name} onChange={e => update('name', e.target.value)} required
                    placeholder="Your name" className={inputClass + ' pl-12'} />
                </div>
              </div>
              <div>
                <label className="block font-black text-xs uppercase tracking-widest text-stone-500 mb-2">Phone</label>
                <div className="relative">
                  <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input type="tel" value={form.phone} onChange={e => update('phone', e.target.value)}
                    placeholder="+91 XXXXXXXXXX" className={inputClass + ' pl-12'} />
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block font-black text-xs uppercase tracking-widest text-stone-500 mb-2">{t('auth.email')} *</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input type="email" value={form.email} onChange={e => update('email', e.target.value)} required
                    placeholder="farmer@example.com" className={inputClass + ' pl-12'} />
                </div>
              </div>
              <div>
                <label className="block font-black text-xs uppercase tracking-widest text-stone-500 mb-2">{t('auth.password')} *</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input type={showPwd ? 'text' : 'password'} value={form.password} onChange={e => update('password', e.target.value)}
                    required minLength={6} placeholder="Min 6 chars" className={inputClass + ' pl-12 pr-12'} />
                  <button type="button" onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400">
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>

            <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 pt-2">Location & Farm</p>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block font-black text-xs text-stone-500 mb-1">State</label>
                <select value={form.state} onChange={e => update('state', e.target.value)} className={inputClass}>
                  <option value="">Select</option>
                  <option>Karnataka</option><option>Andhra Pradesh</option><option>Telangana</option>
                  <option>Tamil Nadu</option><option>Kerala</option><option>Maharashtra</option>
                </select>
              </div>
              <div className="relative" ref={cityRef}>
                <label className="block font-black text-xs text-stone-500 mb-1">District</label>
                <input type="text" value={form.district} onChange={e => { update('district', e.target.value); setShowDropdown(true); }}
                  placeholder="e.g. Mysore" className={inputClass}
                  onFocus={() => citySuggestions.length > 0 && setShowDropdown(true)} />
                {showDropdown && citySuggestions.length > 0 && (
                  <div className="absolute z-50 mt-1 bg-white border-2 border-stone-200 rounded-xl shadow-xl max-h-44 overflow-y-auto w-full">
                    {citySuggestions.map((c, i) => (
                      <button key={i} type="button" onMouseDown={() => { update('district', c.city); setShowDropdown(false); }}
                        className="w-full text-left px-4 py-2.5 text-sm font-bold text-stone-700 hover:bg-[#84cc16]/10 border-b border-stone-100 last:border-0">
                        {c.city} <span className="text-stone-400 text-xs">{c.district}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="block font-black text-xs text-stone-500 mb-1">Village</label>
                <input type="text" value={form.village} onChange={e => update('village', e.target.value)}
                  placeholder="Village name" className={inputClass} />
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block font-black text-xs text-stone-500 mb-1">Land Size (acres)</label>
                <div className="relative">
                  <Ruler size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input type="number" step="0.01" value={form.land_size_acres} onChange={e => update('land_size_acres', e.target.value)}
                    placeholder="e.g. 2.5" className={inputClass + ' pl-12'} />
                </div>
              </div>
              <div>
                <label className="block font-black text-xs text-stone-500 mb-1">Soil Type</label>
                <select value={form.soil_type} onChange={e => update('soil_type', e.target.value)} className={inputClass}>
                  <option value="">Not sure</option>
                  <option>Black Cotton</option><option>Red Loamy</option><option>Alluvial</option>
                  <option>Sandy</option><option>Clay</option><option>Laterite</option>
                </select>
              </div>
              <div>
                <label className="block font-black text-xs text-stone-500 mb-1">Farm Type</label>
                <select value={form.farm_type} onChange={e => update('farm_type', e.target.value)} className={inputClass}>
                  <option value="rainfed">Rainfed</option>
                  <option value="irrigated">Irrigated</option>
                  <option value="partially_irrigated">Partially Irrigated</option>
                </select>
              </div>
            </div>

            <button type="submit" disabled={loading || !form.name || !form.email || !form.password}
              className="w-full py-5 bg-[#84cc16] text-[#0c0a09] font-black text-base rounded-2xl hover:bg-[#facc15] shadow-lg disabled:opacity-50 transition-all flex items-center justify-center gap-3 mt-2">
              {loading ? <Loader2 size={18} className="animate-spin" /> : null}
              {loading ? t('auth.signingUp') : t('auth.signupButton')}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-stone-500 text-sm font-medium">
              {t('auth.haveAccount')}{' '}
              <Link to="/login" className="text-[#84cc16] font-black hover:underline">{t('auth.login')}</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
