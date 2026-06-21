import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Sprout, TrendingUp, Settings, MessageSquare, User, DollarSign, BookOpen, MapPin, Thermometer, Droplets, CloudRain, ChevronRight } from 'lucide-react';
import axios from 'axios';
import { GrainOverlay } from './GrainOverlay';

const HomeTerminal = ({ user: propUser }) => {
  const [weather, setWeather] = useState(null);
  const user = propUser || (() => { try { return JSON.parse(localStorage.getItem('user')); } catch { return null; } })();

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        try {
          const res = await axios.post('/api/diagnostics/location', { lat: pos.coords.latitude, lon: pos.coords.longitude });
          if (res.data.climate?.current) setWeather(res.data.climate.current);
        } catch { }
      }, () => { }, { timeout: 5000 });
    }
  }, []);

  return (
    <div className="pt-20 min-h-screen bg-[#fafaf9]">
      <GrainOverlay />
      <section className="relative h-[70vh] mx-3 my-2 rounded-3xl overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.1)]">
        <div className="absolute inset-0 bg-cover bg-center transition-transform duration-[30s] ease-linear group-hover:scale-110" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=2000')" }}></div>
        <div className="absolute inset-0 bg-gradient-to-tr from-[#0c0a09]/95 via-[#0c0a09]/40 to-transparent"></div>
        <div className="relative h-full flex flex-col justify-center px-10 lg:px-16 py-16">
          <div className="max-w-4xl">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 w-fit px-4 py-2 rounded-full mb-6">
              <span className="w-2 h-2 bg-[#84cc16] rounded-full animate-pulse"></span>
              <span className="text-white text-[9px] font-black tracking-[0.2em] uppercase">KrishiVigyan v2.0</span>
            </div>
            <h1 className="font-serif text-white text-6xl lg:text-7xl leading-[0.85] font-black mb-6 tracking-tight">
              {user ? `Welcome, ${user.name?.split(' ')[0]}` : 'Smart'} <br /><span className="text-[#84cc16] italic">Agriculture.</span>
            </h1>
            <p className="text-white/70 text-lg max-w-xl mb-8 border-l-4 border-[#84cc16] pl-6">
              AI-powered agricultural intelligence — land analysis, crop advisory, market forecasts, and expert guidance.
            </p>

            {weather && (
              <div className="flex flex-wrap gap-3 mb-8">
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 px-4 py-2.5 rounded-2xl">
                  <Thermometer size={16} className="text-orange-400" /><span className="text-white font-black">{weather.temperature_celsius ?? '--'}°C</span>
                </div>
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 px-4 py-2.5 rounded-2xl">
                  <Droplets size={16} className="text-blue-400" /><span className="text-white font-black">{weather.humidity_percent ?? '--'}%</span>
                </div>
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 px-4 py-2.5 rounded-2xl">
                  <CloudRain size={16} className="text-blue-300" /><span className="text-white font-black">{weather.rainfall_mm ?? '0'}mm</span>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <Link to="/land-analyser" className="bg-[#84cc16] text-[#0c0a09] px-8 py-4 rounded-2xl font-black text-sm shadow-2xl hover:bg-[#facc15] transition-all hover:scale-105 flex items-center gap-2">
                <MapPin size={16} /> Analyse Land
              </Link>
              <Link to="/crops" className="bg-white/10 backdrop-blur-md border border-white/30 text-white px-8 py-4 rounded-2xl font-black text-sm hover:bg-white/20 transition-all flex items-center gap-2">
                <Sprout size={16} /> Crop Advisor
              </Link>
              <Link to="/market" className="bg-white/10 backdrop-blur-md border border-white/30 text-white px-8 py-4 rounded-2xl font-black text-sm hover:bg-white/20 transition-all flex items-center gap-2">
                <TrendingUp size={16} /> Market
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 -mt-6 relative z-20">
        <div className="bg-white rounded-2xl p-6 shadow-xl border border-stone-100 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center"><p className="text-[#84cc16] font-black text-2xl">286</p><p className="text-stone-500 text-xs font-bold">Cities Covered</p></div>
          <div className="text-center"><p className="text-[#84cc16] font-black text-2xl">12</p><p className="text-stone-500 text-xs font-bold">Crops Analyzed</p></div>
          <div className="text-center"><p className="text-[#84cc16] font-black text-2xl">33</p><p className="text-stone-500 text-xs font-bold">Districts</p></div>
          <div className="text-center"><p className="text-[#84cc16] font-black text-2xl">224</p><p className="text-stone-500 text-xs font-bold">RAG Knowledge</p></div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-12">
        <p className="text-[8px] font-black uppercase tracking-[0.2em] text-stone-400 mb-4">Quick Actions</p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { to: '/land-analyser', icon: <MapPin size={18} />, label: 'Land Analyser', desc: 'GPS + soil + weather analysis', color: '#84cc16' },
            { to: '/crops', icon: <Sprout size={18} />, label: 'Crop Intelligence', desc: 'Lifecycle + disease forecast + tracking', color: '#facc15' },
            { to: '/market', icon: <TrendingUp size={18} />, label: 'Market', desc: 'MSP + 90-day forecast', color: '#10b981' },
            { to: '/scan', icon: <DollarSign size={18} />, label: 'Smart Scan', desc: 'AI environment scanner', color: '#f59e0b' },
            { to: '/vaniai', icon: <MessageSquare size={18} />, label: 'Vani AI', desc: 'Multi-agent RAG assistant', color: '#8b5cf6' },
            { to: user ? '/profile' : '/login', icon: <User size={18} />, label: user ? 'Profile' : 'Sign In', desc: user ? 'Your farm' : 'Register farm', color: '#0c0a09' },
          ].map((item, i) => (
            <Link key={i} to={item.to}
              className="bg-white rounded-xl p-5 border border-stone-200 hover:shadow-lg hover:border-stone-300 transition-all group">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-transform group-hover:scale-110" style={{ backgroundColor: `${item.color}15` }}>
                <span style={{ color: item.color }}>{item.icon}</span>
              </div>
              <p className="font-black text-sm text-[#0c0a09]">{item.label}</p>
              <p className="text-[9px] text-stone-400 mt-0.5">{item.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-20">
        <p className="text-[8px] font-black uppercase tracking-[0.2em] text-stone-400 mb-6">Platform Guide</p>
        <div className="grid md:grid-cols-4 gap-6">
          {[
            { step: "01", title: "Analyze Land", desc: "Run GPS diagnostics to understand your soil and local climate.", link: "/land-analyser", icon: <MapPin size={18} /> },
            { step: "02", title: "Select Crop", desc: "Browse the Intelligence Hub to find the most suitable crop for your land.", link: "/crops", icon: <Sprout size={18} /> },
            { step: "03", title: "Chat with Vani", desc: "Ask Vani AI for a 7-day action plan or specific cultivation advice.", link: "/vaniai", icon: <MessageSquare size={18} /> },
            { step: "04", title: "Scan Environment", desc: "Use AI-powered environmental scanning for pest and disease detection.", link: "/scan", icon: <DollarSign size={18} /> },
          ].map((g, i) => (
            <div key={i} className="relative p-8 bg-white rounded-3xl border border-stone-100 shadow-sm hover:shadow-lg transition-all group">
              <div className="text-[40px] font-black text-stone-50 absolute -top-4 -right-2 transition-colors group-hover:text-[#84cc16]/10">{g.step}</div>
              <div className="w-10 h-10 bg-[#84cc16]/10 rounded-xl flex items-center justify-center mb-4 text-[#84cc16]">
                {g.icon}
              </div>
              <h3 className="font-serif text-xl font-black text-[#0c0a09] mb-2">{g.title}</h3>
              <p className="text-stone-500 text-[13px] leading-relaxed mb-6">{g.desc}</p>
              <Link to={g.link} className="inline-flex items-center gap-1.5 text-[#84cc16] text-[10px] font-black uppercase tracking-widest hover:gap-3 transition-all">
                Explore Now <ChevronRight size={12} />
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-16">
        <div className="bg-gradient-to-r from-stone-900 to-stone-800 rounded-3xl p-8 border border-stone-700">
          <p className="text-stone-300 italic text-sm leading-relaxed">"KrishiVigyan brings precision agriculture to Indian farmers — combining real-time weather, soil intelligence, and AI-powered crop advisory in one platform."</p>
          <p className="text-[#84cc16] font-black text-xs mt-4 uppercase tracking-wider">— Powered by Groq · Open-Meteo · ISRIC SoilGrids</p>
        </div>
      </section>
    </div>
  );
};

export default HomeTerminal;
