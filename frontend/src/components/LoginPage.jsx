import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sprout, Mail, Lock, Loader2, Eye, EyeOff } from 'lucide-react';
import axios from 'axios';
import { useLanguage } from '../i18n/LanguageContext';

const GrainOverlay = () => <div className="grain-overlay opacity-20" />;

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const navigate = useNavigate();
  const { t } = useLanguage();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await axios.post('/api/auth/login', { email, password });
      if (res.data.success) {
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        if (onLogin) onLogin(res.data.user);
        navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.error || t('auth.loginError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafaf9] flex items-center justify-center p-6">
      <GrainOverlay />
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="bg-[#0c0a09] w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-[#84cc16]/20">
            <Sprout className="text-[#84cc16] w-8 h-8" />
          </div>
          <h1 className="font-serif text-4xl font-black text-[#0c0a09]">
            Krishi<span className="italic text-[#84cc16]">Vigyan</span>
          </h1>
          <p className="text-stone-500 text-sm mt-2 font-medium">{t('auth.login')}</p>
        </div>

        <div className="bg-white border-2 border-stone-200 rounded-[3rem] p-10 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-red-700 text-sm font-bold">{error}</p>
              </div>
            )}

            <div>
              <label className="block font-black text-xs uppercase tracking-widest text-stone-500 mb-2">{t('auth.email')}</label>
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="farmer@example.com" required
                  className="w-full bg-stone-50 border-2 border-stone-200 rounded-2xl py-4 pl-12 pr-4 font-bold text-stone-700 outline-none focus:ring-4 focus:ring-[#84cc16]/10 focus:border-[#84cc16] transition-all" />
              </div>
            </div>

            <div>
              <label className="block font-black text-xs uppercase tracking-widest text-stone-500 mb-2">{t('auth.password')}</label>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
                <input type={showPwd ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" required minLength={6}
                  className="w-full bg-stone-50 border-2 border-stone-200 rounded-2xl py-4 pl-12 pr-12 font-bold text-stone-700 outline-none focus:ring-4 focus:ring-[#84cc16]/10 focus:border-[#84cc16] transition-all" />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-5 bg-[#0c0a09] text-white font-black text-base rounded-2xl hover:bg-stone-800 shadow-lg disabled:opacity-50 transition-all flex items-center justify-center gap-3">
              {loading ? <Loader2 size={18} className="animate-spin" /> : null}
              {loading ? t('auth.loggingIn') : t('auth.loginButton')}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-stone-500 text-sm font-medium">
              {t('auth.noAccount')}{' '}
              <Link to="/signup" className="text-[#84cc16] font-black hover:underline">{t('auth.signup')}</Link>
            </p>
          </div>
        </div>

        <div className="text-center mt-6">
          <Link to="/" className="text-xs text-stone-400 font-medium hover:text-stone-600 underline">
            Continue as guest
          </Link>
        </div>
      </div>
    </div>
  );
}
