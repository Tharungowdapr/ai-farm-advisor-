import React, { useState, useRef, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { Sprout, ScanLine, TrendingUp, Activity, Upload, Volume2, BrainCircuit, Settings, Globe, Home, BookOpen, MessageSquare, Zap, Dna, Hexagon, AlertTriangle, RefreshCw, Play, ChevronRight, ArrowUpRight, ArrowRight, CloudRain, Search, ChevronLeft, Droplets, Timer, Target, Mic, Send, BarChart3, ExternalLink, Loader2, DollarSign, Package, Radio, MapPin, Thermometer, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import axios from 'axios';

import PredictionTerminal from './components/PredictionTerminal';
import LoginPage from './components/LoginPage';
import SignupPage from './components/SignupPage';
import ProfilePage from './components/ProfilePage';
import LandAnalyser from './components/LandAnalyser';
import CropIntelligenceHub from './components/CropIntelligenceHub';
import MarketHub from './components/MarketHub';
import VaniAIChat from './components/VaniAIChat';
import SmartEnvironmentScanner from './components/SmartEnvironmentScanner';
import AiNegotiator from './components/AiNegotiator';
import AdminDashboard from './components/AdminDashboard';

// --- Global UI ---
// ... (rest of App.jsx unchanged until KnowledgeCore)

// --- Knowledge Core: Dynamic Botanical Intelligence ---
const GrainOverlay = () => <div className="grain-overlay opacity-30" />;
const SectionLabel = ({ text, icon: Icon }) => (
  <div className="flex items-center gap-2 mb-6 opacity-60">
    {Icon && <Icon size={12} className="text-[#84cc16]" />}
    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[#0c0a09]">{text}</span>
  </div>
);

// --- Mock price data for chart ---
const PRICE_DATA = [
  { month: 'Jan', price: 1850 },
  { month: 'Feb', price: 1920 },
  { month: 'Mar', price: 2100 },
  { month: 'Apr', price: 2050 },
  { month: 'May', price: 2200 },
  { month: 'Jun', price: 2350 },
];

// --- Crop Data ---
const CROPS = [
  { id: 1, name: 'Paddy', scientific: 'Oryza sativa', variety: 'Hybrid-4', region: 'Cauvery Basin', msp: '₹2,183', cycle: '120 Days', water: 'High', yield: '25q/acre', image: '/api/image/paddy.png' },
  { id: 2, name: 'Ragi', scientific: 'Eleusine coracana', variety: 'GPU-28', region: 'Dry Zone', msp: '₹3,846', cycle: '110 Days', water: 'Low', yield: '15q/acre', image: '/api/image/ragi.png' },
  { id: 3, name: 'Coffee', scientific: 'Coffea arabica', variety: 'Sln.795', region: 'Malnad Highlands', msp: 'Market', cycle: 'Perennial', water: 'Moderate', yield: '800kg/acre', image: '/api/image/coffee.png' },
  { id: 4, name: 'Sugarcane', scientific: 'Saccharum officinarum', variety: 'Co-86032', region: 'Mandya Belt', msp: 'FRP', cycle: '12 Months', water: 'Very High', yield: '40t/acre', image: '/api/image/sugarcane.png' },
  { id: 5, name: 'Arecanut', scientific: 'Areca catechu', variety: 'Mangala', region: 'Shivamogga', msp: 'Market', cycle: 'Perennial', water: 'Moderate', yield: '12q/acre', image: '/api/image/arecanut.jpg' },
  { id: 6, name: 'Coconut', scientific: 'Cocos nucifera', variety: 'Tall/Dwarf', region: 'Coastal Belt', msp: 'Market', cycle: 'Perennial', water: 'Moderate', yield: '100 nuts/palm', image: '/api/image/coconut.jpg' },
  { id: 7, name: 'Maize', scientific: 'Zea mays', variety: 'Ganga Kaveri', region: 'Davangere Belt', msp: '₹2,225', cycle: '110 Days', water: 'Moderate', yield: '30q/acre', image: '/api/image/maize.png' },
  { id: 8, name: 'Groundnut', scientific: 'Arachis hypogaea', variety: 'TMV-2', region: 'Chitradurga', msp: '₹6,700', cycle: '115 Days', water: 'Low', yield: '11q/acre', image: '/api/image/groundnut.jpg' },
  { id: 9, name: 'Tomato', scientific: 'Solanum lycopersicum', variety: 'Arka Rakshak', region: 'Kolar Belt', msp: 'Market', cycle: '135 Days', water: 'Moderate', yield: '28t/acre', image: '/api/image/tomato.png' },
  { id: 10, name: 'Cotton', scientific: 'Gossypium hirsutum', variety: 'Bunny', region: 'Raichur Belt', msp: '₹7,720', cycle: '165 Days', water: 'Moderate', yield: '10q/acre', image: '/api/image/cotton.jpg' }
];

// --- Navigation ---
const Navbar = ({ user, onLogout }) => {
  const [lang, setLang] = useState(localStorage.getItem('lang') || 'EN');
  const location = useLocation();
  const navigate = useNavigate();

  const navLinks = [
    { path: '/', label: 'Home' },
    { path: '/land-analyser', label: 'Land Analyser' },
    { path: '/crops', label: 'Crop Intelligence' },
    { path: '/market', label: 'Market' },
    { path: '/negotiator', label: 'AI Negotiator' },
    { path: '/vaniai', label: 'Vani AI' },
  ];

  return (
    <nav className="fixed top-0 w-full z-[100] h-16 px-6 flex justify-between items-center bg-white/90 backdrop-blur-[30px] border-b border-stone-100">
      <Link to="/" className="flex items-center gap-3">
        <div className="bg-[#0c0a09] p-2 rounded-lg shadow-2xl shadow-[#84cc16]/20 hover:scale-110 transition-transform">
          <Sprout className="text-[#84cc16] w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <span className="font-serif font-black text-lg tracking-tight text-[#0c0a09] leading-none">
            Krishi<span className="italic text-[#84cc16]">Vigyan</span>
          </span>
          <span className="text-[7px] font-black tracking-[0.2em] uppercase opacity-40">Intelligence</span>
        </div>
      </Link>

      <div className="hidden lg:flex items-center gap-6">
        {navLinks.map((link) => (
          <Link
            key={link.path}
            to={link.path}
            className="group relative"
          >
            <div className={`text-[9px] font-black tracking-[0.15em] uppercase ${location.pathname === link.path ? 'text-[#84cc16]' : 'text-stone-400 group-hover:text-[#0c0a09]'}`}>
              {link.label}
            </div>
            {location.pathname === link.path && (
              <motion.div layoutId="navline" className="absolute -bottom-1 w-0.5 h-0.5 bg-[#84cc16] rounded-full" />
            )}
          </Link>
        ))}
        {user?.is_admin && (
          <Link to="/admin" className="group relative">
            <div className={`text-[9px] font-black tracking-[0.15em] uppercase ${location.pathname === '/admin' ? 'text-[#84cc16]' : 'text-stone-400 group-hover:text-[#0c0a09]'}`}>
              Admin
            </div>
            {location.pathname === '/admin' && (
              <motion.div layoutId="navline" className="absolute -bottom-1 w-0.5 h-0.5 bg-[#84cc16] rounded-full" />
            )}
          </Link>
        )}
      </div>

      <div className="flex items-center gap-3">
        {user ? (
          <Link to="/profile" className="flex items-center gap-2 px-3 py-1.5 bg-[#84cc16]/10 rounded-xl border border-[#84cc16]/20 hover:bg-[#84cc16]/20 transition-all">
            <div className="w-6 h-6 bg-[#84cc16] rounded-full flex items-center justify-center">
              <span className="text-[9px] font-black text-[#0c0a09]">{user.name?.[0]?.toUpperCase() || 'F'}</span>
            </div>
            <span className="text-[9px] font-black text-[#0c0a09] uppercase max-w-[80px] truncate">{user.name?.split(' ')[0]}</span>
          </Link>
        ) : (
          <Link to="/login" className="px-4 py-1.5 bg-[#0c0a09] text-white rounded-xl font-black text-[9px] uppercase tracking-wider hover:bg-stone-800 transition-all">
            Sign In
          </Link>
        )}
        <Link to="/settings" className="p-2 hover:bg-stone-100 rounded-lg transition-colors opacity-40 hover:opacity-100"><Settings size={16} /></Link>
        <button
          onClick={() => setLang(lang === 'EN' ? 'KN' : 'EN')}
          className="bg-[#0c0a09] text-white px-4 py-2 rounded-lg font-black text-[9px] tracking-wider uppercase flex items-center gap-2 hover:bg-[#84cc16] hover:text-[#0c0a09] transition-all shadow-md"
        >
          <Globe className="w-3 h-3" />
          {lang}
        </button>
      </div>
    </nav>
  );
};

// --- Home Dashboard ---
const HomeTerminal = () => {
  const [weather, setWeather] = useState(null);
  const [user, setUser] = useState(() => { try { return JSON.parse(localStorage.getItem('user')); } catch { return null; } });
  const [showQuickTools, setShowQuickTools] = useState(false);
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
      {/* Hero */}
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

      {/* Stats Bar */}
      <section className="max-w-6xl mx-auto px-6 -mt-6 relative z-20">
        <div className="bg-white rounded-2xl p-6 shadow-xl border border-stone-100 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center"><p className="text-[#84cc16] font-black text-2xl">286</p><p className="text-stone-500 text-xs font-bold">Cities Covered</p></div>
          <div className="text-center"><p className="text-[#84cc16] font-black text-2xl">12</p><p className="text-stone-500 text-xs font-bold">Crops Analyzed</p></div>
          <div className="text-center"><p className="text-[#84cc16] font-black text-2xl">33</p><p className="text-stone-500 text-xs font-bold">Districts</p></div>
          <div className="text-center"><p className="text-[#84cc16] font-black text-2xl">224</p><p className="text-stone-500 text-xs font-bold">RAG Knowledge</p></div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="max-w-6xl mx-auto px-6 py-12">
        <p className="text-[8px] font-black uppercase tracking-[0.2em] text-stone-400 mb-4">Quick Actions</p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { to: '/land-analyser', icon: <MapPin size={18} />, label: 'Land Analyser', desc: 'GPS + soil + weather analysis', color: '#84cc16' },
            { to: '/crops', icon: <Sprout size={18} />, label: 'Crop Intelligence', desc: 'Lifecycle + disease forecast + tracking', color: '#facc15' },
            { to: '/market', icon: <TrendingUp size={18} />, label: 'Market', desc: 'MSP + 90-day forecast', color: '#10b981' },
            { to: '/negotiator', icon: <DollarSign size={18} />, label: 'Negotiator', desc: 'AI smart pricing', color: '#f59e0b' },
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

      {/* All Tools Grid */}
      <section className="max-w-6xl mx-auto px-6 pb-16">
        <p className="text-[8px] font-black uppercase tracking-[0.2em] text-stone-400 mb-4">All Tools</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { to: '/settings', icon: <Settings size={16} />, label: 'Settings' },
            { to: '/vaniai', icon: <MessageSquare size={16} />, label: 'Vani AI Chat' },
            { to: '/crops', icon: <BookOpen size={16} />, label: 'Crop Intelligence Hub' },
            { to: user ? '/profile' : '/signup', icon: <User size={16} />, label: user ? 'Profile' : 'Sign Up' },
          ].map((item, i) => (
            <Link key={i} to={item.to}
              className="bg-stone-50 rounded-xl p-4 border border-stone-200 hover:bg-white hover:shadow-md transition-all flex items-center gap-3">
              <span className="text-stone-500">{item.icon}</span>
              <span className="font-bold text-xs text-stone-700">{item.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Platform Guide */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <p className="text-[8px] font-black uppercase tracking-[0.2em] text-stone-400 mb-6">Platform Guide</p>
        <div className="grid md:grid-cols-4 gap-6">
          {[
            { step: "01", title: "Analyze Land", desc: "Run GPS diagnostics to understand your soil and local climate.", link: "/land-analyser", icon: <MapPin size={18} /> },
            { step: "02", title: "Select Crop", desc: "Browse the Intelligence Hub to find the most suitable crop for your land.", link: "/crops", icon: <Sprout size={18} /> },
            { step: "03", title: "Chat with Vani", desc: "Ask Vani AI for a 7-day action plan or specific cultivation advice.", link: "/vaniai", icon: <MessageSquare size={18} /> },
            { step: "04", title: "Market Check", desc: "Monitor MSP and price forecasts to plan your harvest and sales.", link: "/market", icon: <TrendingUp size={18} /> },
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

      {/* Quote */}
      <section className="max-w-6xl mx-auto px-6 pb-16">
        <div className="bg-gradient-to-r from-stone-900 to-stone-800 rounded-3xl p-8 border border-stone-700">
          <p className="text-stone-300 italic text-sm leading-relaxed">"KrishiVigyan brings precision agriculture to Indian farmers — combining real-time weather, soil intelligence, and AI-powered crop advisory in one platform."</p>
          <p className="text-[#84cc16] font-black text-xs mt-4 uppercase tracking-wider">— Powered by Groq · Open-Meteo · ISRIC SoilGrids</p>
        </div>
      </section>
    </div>
  );
};

// --- Market Intelligence Hub ---
// --- Vani AI ---
const VaniAI = () => {
  const location = useLocation();
  const cropContext = location.state?.cropContext;
  const cropName = location.state?.cropName;

  const [messages, setMessages] = useState(() => {
    const defaultMsg = { role: 'model', content: 'Welcome. I am Vani AI, your agricultural advisor from UAS Dharwad. How can I help you today?' };
    if (cropContext) {
      return [
        defaultMsg,
        { role: 'user', content: cropContext }
      ];
    }
    return [defaultMsg];
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [playingAudioIndex, setPlayingAudioIndex] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Auto-fetch AI response if context was provided
    if (cropContext && messages.length === 2) {
      handleContextResponse();
    }
  }, []);

  const handleContextResponse = async () => {
    setLoading(true);
    try {
      const res = await axios.post('/api/chat', {
        message: cropContext,
        history: [{ role: 'model', content: 'Welcome. I am Vani AI, your agricultural advisor from UAS Dharwad. How can I help you today?' }]
      });
      setMessages(prev => [...prev, { role: 'model', content: res.data.response }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'model', content: "I'm currently experiencing technical difficulties. However, I can still assist you based on my training. Please proceed with your questions." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (overrideInput = null) => {
    const textToSend = overrideInput || input;
    if (!textToSend.trim() || loading) return;

    setMessages(prev => [...prev, { role: 'user', content: textToSend }]);
    if (!overrideInput) setInput('');
    setLoading(true);

    try {
      const res = await axios.post('/api/chat', {
        message: textToSend,
        history: messages
      });
      setMessages(prev => [...prev, { role: 'model', content: res.data.response }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'model', content: "Neural link interrupted." }]);
    } finally {
      setLoading(false);
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const starters = [
    { label: "Weather forecast?", icon: "🌤️", query: "What is the weather forecast for my location?" },
    { label: "Market price?", icon: "📈", query: `What is the current market trend for ${cropName || 'Paddy'}?` },
    { label: "Fertilizer advice?", icon: "🧪", query: `What is the best fertilizer for ${cropName || 'Paddy'}?` },
    { label: "Pest alert?", icon: "🛡️", query: `Any pest warnings for ${cropName || 'Paddy'} right now?` }
  ];

  const handleTextToSpeech = (text, messageIndex) => {
    try {
      // Check if Web Speech API is available
      const SpeechSynthesisUtterance = window.SpeechSynthesisUtterance || window.webkitSpeechSynthesisUtterance;
      if (!SpeechSynthesisUtterance) {
        alert('Speech synthesis not supported in this browser');
        setPlayingAudioIndex(null);
        return;
      }

      // Stop any currently playing audio
      window.speechSynthesis.cancel();

      // Small delay to ensure cancel completes
      setTimeout(() => {
        // Create speech utterance
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        // Set playing state
        setPlayingAudioIndex(messageIndex);

        console.log('Speaking:', text.substring(0, 50) + '...');

        // Handle end of speech
        utterance.onstart = () => {
          console.log('Speech started');
        };

        utterance.onend = () => {
          console.log('Speech ended');
          setPlayingAudioIndex(null);
        };

        utterance.onerror = (event) => {
          console.error('Speech synthesis error:', event.error);
          setPlayingAudioIndex(null);
          alert('Audio playback error: ' + event.error);
        };

        // Speak the text
        window.speechSynthesis.speak(utterance);
      }, 100);

    } catch (err) {
      console.error('TTS error:', err);
      setPlayingAudioIndex(null);
      alert('Error: ' + err.message);
    }
  };

  return (
    <div className="pt-20 h-screen bg-[#0c0a09] overflow-hidden flex flex-col">
      <GrainOverlay />

      <div className="flex-1 overflow-y-auto px-6 pt-16 pb-32 scrollbar-hide">
        <div className="max-w-3xl mx-auto space-y-8">
          {messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[75%] p-6 rounded-2xl ${m.role === 'user' ? 'bg-stone-900 text-white' : 'bg-white/10 backdrop-blur-xl border border-white/10 text-stone-200'}`}>
                <p className="text-sm leading-relaxed font-medium">{m.content}</p>
                {m.role === 'model' && (
                  <div className="mt-4 pt-4 border-t border-white/5 flex items-center gap-3">
                    <button
                      onClick={() => handleTextToSpeech(m.content, i)}
                      className={`p-2 rounded-lg transition-all ${playingAudioIndex === i ? 'bg-[#84cc16] text-[#0c0a09]' : 'bg-white/5 hover:bg-[#84cc16] hover:text-[#0c0a09]'}`}
                      title="Click to listen"
                    >
                      <Volume2 size={14} />
                    </button>
                    <span className="text-[8px] font-black uppercase tracking-widest text-[#84cc16]">{playingAudioIndex === i ? 'Playing...' : 'Audio'}</span>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white/10 backdrop-blur-xl p-6 rounded-2xl border border-white/10 flex items-center gap-3">
                <div className="flex gap-1">{[0, 150, 300].map((delay) => (<div key={delay} className="w-1.5 h-1.5 bg-[#84cc16] rounded-full animate-bounce" style={{ animationDelay: `${delay}ms` }}></div>))}</div>
                <span className="text-[8px] font-black uppercase text-[#84cc16] tracking-widest">Thinking</span>
              </div>
            </div>
          )}
          {/* Quick Starters */}
          {messages.length <= 1 && !loading && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="flex flex-wrap gap-2 justify-center py-4">
              {starters.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(s.query)}
                  className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-stone-400 hover:bg-[#84cc16]/20 hover:text-[#84cc16] hover:border-[#84cc16]/30 transition-all flex items-center gap-2"
                >
                  <span className="text-sm">{s.icon}</span> {s.label}
                </button>
              ))}
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-full max-w-3xl px-6">
        <div className="bg-white/10 backdrop-blur-xl p-4 rounded-2xl border border-white/20 shadow-[0_30px_60px_rgba(0,0,0,0.6)] flex items-center gap-3">
          <button className="w-10 h-10 rounded-full flex items-center justify-center bg-[#84cc16] hover:scale-105 transition-all shadow-lg"><Mic className="text-[#0c0a09] w-5 h-5" /></button>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask Vani AI..."
            className="flex-1 bg-transparent border-none outline-none text-white text-sm placeholder:text-stone-500 font-medium"
          />
          <button onClick={handleSend} className="p-2.5 bg-white/5 hover:bg-white/10 rounded-lg text-white transition-all hover:scale-105 group"><Send size={16} className="group-hover:text-[#84cc16]" /></button>
        </div>
      </div>
    </div>
  );
};

// --- Settings & Neural Configuration Terminal ---
const SettingsTerminal = () => {
  const [localLang, setLocalLang] = useState('EN');
  const [cropCluster, setCropCluster] = useState('All Karnataka');
  const [notifications, setNotifications] = useState(true);
  const [priceAlerts, setPriceAlerts] = useState(true);
  const [apiKey, setApiKey] = useState('');
  const [apiKeySaved, setApiKeySaved] = useState(false);
  const [apiKeySaving, setApiKeySaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cacheSize, setCacheSize] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load settings from backend
  React.useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const response = await axios.get('/api/settings', { headers });
        if (response.data.success) {
          const settings = response.data.settings;
          setLocalLang(settings.language || 'EN');
          setCropCluster(settings.crop_cluster || 'All Karnataka');
          setNotifications(settings.notifications !== false);
          setPriceAlerts(settings.price_alerts !== false);
          setApiKey(settings.has_api_key ? '••••••••' : '');
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
        setError('Failed to load settings from server');
        // Fall back to localStorage
        setLocalLang(localStorage.getItem('lang') || 'EN');
        setCropCluster(localStorage.getItem('cropCluster') || 'All Karnataka');
        setNotifications(localStorage.getItem('notifications') === 'true' || true);
        setPriceAlerts(localStorage.getItem('priceAlerts') === 'true' || true);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();

    // Calculate cache size
    let total = 0;
    for (let key in localStorage) {
      if (key.startsWith('analysis_') || key.startsWith('crop_')) {
        total += (localStorage[key].length + key.length) * 2; // rough bytes
      }
    }
    setCacheSize(Math.round(total / 1024)); // KB
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await axios.post('/api/settings', {
        language: localLang,
        crop_cluster: cropCluster,
        notifications: notifications,
        price_alerts: priceAlerts
      }, { headers });

      if (response.data.success) {
        // Also update localStorage as fallback
        localStorage.setItem('lang', localLang);
        localStorage.setItem('cropCluster', cropCluster);
        localStorage.setItem('notifications', notifications);
        localStorage.setItem('priceAlerts', priceAlerts);

        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        setTimeout(() => window.location.reload(), 500); // Reload to apply changes
      } else {
        setError(response.data.error || 'Failed to save settings');
      }
    } catch (err) {
      console.error('Error saving settings:', err);
      setError('Failed to save settings to server');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveApiKey = async () => {
    try {
      setApiKeySaving(true);
      setError(null);
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await axios.post('/api/settings/api-key', { api_key: apiKey }, { headers });
      if (response.data.success) {
        setApiKeySaved(true);
        setApiKey('••••••••');
        setTimeout(() => setApiKeySaved(false), 2000);
      } else {
        setError(response.data.error || 'Failed to save API key');
      }
    } catch (err) {
      console.error('Error saving API key:', err);
      setError('Failed to save API key');
    } finally {
      setApiKeySaving(false);
    }
  };

  const handlePurgeCache = () => {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('analysis_') || k.startsWith('crop_'));
    keys.forEach(k => localStorage.removeItem(k));
    setCacheSize(0);
    alert('Neural cache purged successfully');
  };

  const handleResetSettings = async () => {
    if (window.confirm('Are you sure you want to reset all settings to default values?')) {
      try {
        setSaving(true);
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const response = await axios.post('/api/settings/reset', {}, { headers });

        if (response.data.success) {
          const settings = response.data.settings;
          setLocalLang(settings.language || 'EN');
          setCropCluster(settings.crop_cluster || 'All Karnataka');
          setNotifications(settings.notifications !== false);
          setPriceAlerts(settings.price_alerts !== false);

          // Update localStorage
          localStorage.setItem('lang', settings.language);
          localStorage.setItem('cropCluster', settings.crop_cluster);
          localStorage.setItem('notifications', settings.notifications);
          localStorage.setItem('priceAlerts', settings.price_alerts);

          alert('Settings reset to defaults');
          setTimeout(() => window.location.reload(), 500);
        }
      } catch (err) {
        console.error('Error resetting settings:', err);
        alert('Failed to reset settings');
      } finally {
        setSaving(false);
      }
    }
  };

  const Toggle = ({ checked, onChange, label }) => (
    <div className="flex items-center justify-between p-6 bg-stone-50 rounded-2xl border border-stone-200 hover:border-[#84cc16]/30 transition-all">
      <span className="font-bold text-stone-700">{label}</span>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-16 h-8 rounded-full transition-all shadow-inner ${checked ? 'bg-[#84cc16]' : 'bg-stone-300'}`}
      >
        <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-lg transition-all ${checked ? 'right-1' : 'left-1'}`}>
          {checked && <div className="absolute inset-0 m-auto w-2 h-2 bg-[#84cc16] rounded-full animate-pulse"></div>}
        </div>
      </button>
    </div>
  );

  if (loading) {
    return (
      <div className="pt-24 min-h-screen bg-[#fafaf9] px-6 pb-20 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#84cc16] mx-auto mb-4" />
          <p className="text-stone-600 font-bold">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 min-h-screen bg-[#fafaf9] px-6 pb-20">
      <GrainOverlay />
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <header className="mb-12">
          <SectionLabel text="Settings" icon={Settings} />
          <h1 className="font-serif text-5xl font-black text-[#0c0a09] mb-4">Control <span className="italic text-[#84cc16]">Panel.</span></h1>
          <p className="text-stone-500 text-base font-medium max-w-2xl">Configure your preferences, language, and system settings.</p>
        </header>

        {error && (
          <div className="mb-6 bg-red-50 border-2 border-red-200 rounded-2xl p-4 flex gap-3">
            <AlertTriangle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-700 font-bold text-sm">{error}</p>
          </div>
        )}

        <div className="grid lg:grid-cols-[1fr_400px] gap-10">
          {/* Main Settings Panel */}
          <div className="space-y-6">
            {/* Regional Configuration */}
            <div className="bg-white border-2 border-stone-200 rounded-[3rem] p-10 shadow-xl">
              <div className="mb-8">
                <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-stone-400 mb-2">Regional Configuration</h3>
                <h2 className="font-serif text-4xl font-black text-[#0c0a09]">Localization Protocol</h2>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block font-black text-xs uppercase tracking-widest text-stone-500 mb-3">Primary Language</label>
                  <select
                    value={localLang}
                    onChange={(e) => setLocalLang(e.target.value)}
                    className="w-full bg-stone-50 border-2 border-stone-200 rounded-2xl p-5 font-bold text-stone-700 outline-none focus:ring-4 focus:ring-[#84cc16]/10 focus:border-[#84cc16] transition-all"
                  >
                    <option value="EN">English (Default)</option>
                    <option value="KN">ಕನ್ನಡ (Kannada)</option>
                    <option value="TE">తెలుగు (Telugu)</option>
                    <option value="TA">தமிழ் (Tamil)</option>
                    <option value="HI">हिन्दी (Hindi)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-black text-xs uppercase tracking-widest text-stone-500 mb-3">Crop Cluster Region</label>
                  <select
                    value={cropCluster}
                    onChange={(e) => setCropCluster(e.target.value)}
                    className="w-full bg-stone-50 border-2 border-stone-200 rounded-2xl p-5 font-bold text-stone-700 outline-none focus:ring-4 focus:ring-[#84cc16]/10 focus:border-[#84cc16] transition-all"
                  >
                    <option value="All Karnataka">All Karnataka (Statewide)</option>
                    <option value="North Karnataka">North Karnataka (Hubli, Belagavi)</option>
                    <option value="South Karnataka">South Karnataka (Bangalore, Mandya)</option>
                    <option value="Coastal Karnataka">Coastal Karnataka (Mangalore, Udupi)</option>
                    <option value="Malnad">Malnad Highlands (Coffee Belt)</option>
                  </select>
                  <p className="text-xs text-stone-400 mt-2 font-medium">This affects APMC mandi prioritization in Market Intelligence</p>
                </div>
              </div>
            </div>

            {/* API Key Configuration */}
            <div className="bg-white border-2 border-stone-200 rounded-[3rem] p-10 shadow-xl">
              <div className="mb-8">
                <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-stone-400 mb-2">AI Provider</h3>
                <h2 className="font-serif text-4xl font-black text-[#0c0a09]">OpenRouter API Key</h2>
                <p className="text-stone-500 text-sm mt-2 font-medium">Enter your OpenRouter API key to enable AI features. Get a free key at <span className="text-[#84cc16]">openrouter.ai/keys</span></p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block font-black text-xs uppercase tracking-widest text-stone-500 mb-3">API Key</label>
                  <div className="flex gap-3">
                    <input
                      type="password"
                      value={apiKey === '••••••••' ? '' : apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder={apiKey === '••••••••' ? 'API key is set (enter new one to change)' : 'sk-or-...'}
                      className="flex-1 bg-stone-50 border-2 border-stone-200 rounded-2xl p-5 font-bold text-stone-700 outline-none focus:ring-4 focus:ring-[#84cc16]/10 focus:border-[#84cc16] transition-all"
                    />
                    <button
                      onClick={handleSaveApiKey}
                      disabled={apiKeySaving || !apiKey}
                      className={`px-8 rounded-2xl font-black text-sm uppercase tracking-wider transition-all ${apiKeySaved
                          ? 'bg-[#10b981] text-white'
                          : apiKeySaving
                            ? 'bg-[#84cc16]/50 text-[#0c0a09]'
                            : 'bg-[#84cc16] text-[#0c0a09] hover:bg-[#facc15]'
                        } disabled:opacity-50`}
                    >
                      {apiKeySaved ? 'Saved' : apiKeySaving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Notification Preferences */}
            <div className="bg-white border-2 border-stone-200 rounded-[3rem] p-10 shadow-xl">
              <div className="mb-8">
                <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-stone-400 mb-2">Alert System</h3>
                <h2 className="font-serif text-4xl font-black text-[#0c0a09]">Notification Matrix</h2>
              </div>

              <div className="space-y-4">
                <Toggle checked={notifications} onChange={setNotifications} label="Pathogen Detection Alerts" />
                <Toggle checked={priceAlerts} onChange={setPriceAlerts} label="Market Price Notifications" />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={handleSave}
                disabled={saved || saving}
                className={`w-full py-6 rounded-3xl font-black text-lg uppercase tracking-wider shadow-2xl transition-all flex items-center justify-center gap-2 ${saved
                  ? 'bg-[#10b981] text-white'
                  : saving
                    ? 'bg-[#84cc16]/50 text-[#0c0a09] cursor-wait'
                    : 'bg-[#84cc16] text-[#0c0a09] hover:bg-[#facc15] hover:scale-[1.02]'
                  }`}
              >
                {saving && <Loader2 size={18} className="animate-spin" />}
                {saved ? '✓ Configuration Saved' : 'Save Configuration'}
              </button>

              <button
                onClick={handleResetSettings}
                disabled={saving}
                className="w-full py-4 rounded-2xl font-bold text-sm uppercase tracking-wider bg-stone-100 text-stone-700 hover:bg-stone-200 transition-all border-2 border-stone-300"
              >
                Reset to Defaults
              </button>
            </div>
          </div>

          {/* Sidebar - Neural Cache & Privacy */}
          <div className="space-y-6">
            {/* Storage Overview */}
            <div className="bg-stone-900 border-2 border-stone-800 rounded-[3rem] p-10 shadow-2xl sticky top-32">
              <div className="mb-8">
                <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-[#facc15] mb-2">Data Sovereignty</h3>
                <h2 className="font-serif text-3xl font-black text-white mb-4">Neural Cache</h2>
                <p className="text-stone-400 text-sm font-medium">Local diagnostic history and metadata storage.</p>
              </div>

              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-black uppercase tracking-widest text-stone-500">Cache Usage</span>
                    <span className="text-white font-black">{cacheSize} KB</span>
                  </div>
                  <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#84cc16] to-[#facc15] transition-all duration-1000"
                      style={{ width: `${Math.min((cacheSize / 100) * 100, 100)}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-stone-500 mt-2 font-medium">Limit: ~5MB browser storage</p>
                </div>

                <button
                  onClick={handlePurgeCache}
                  className="w-full bg-red-600 text-white py-5 rounded-2xl font-black text-sm uppercase tracking-wider hover:bg-red-700 transition-all shadow-xl flex items-center justify-center gap-3"
                >
                  <AlertTriangle size={18} />
                  Purge Diagnostic Cache
                </button>

                <div className="pt-6 border-t border-white/10">
                  <h4 className="text-white font-black text-sm mb-3">Privacy Statement</h4>
                  <p className="text-stone-400 text-xs leading-relaxed">All diagnostic data is stored locally on your device. No analysis results are transmitted to external servers. You maintain complete sovereignty over your agricultural intelligence footprint.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Diagnostics ---
const DiagnosticsTerminal = () => {
  const [locCity, setLocCity] = useState('');
  const [locLat, setLocLat] = useState(null);
  const [locLon, setLocLon] = useState(null);
  const [locN, setLocN] = useState('');
  const [locP, setLocP] = useState('');
  const [locK, setLocK] = useState('');
  const [locPh, setLocPh] = useState('');
  const [locResult, setLocResult] = useState(null);
  const [locLoading, setLocLoading] = useState(false);
  const [locError, setLocError] = useState(null);
  const [selectedCrop, setSelectedCrop] = useState(null);
  const [gpsDetecting, setGpsDetecting] = useState(false);

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setLocError('GPS not available on this device');
      return;
    }
    setGpsDetecting(true);
    setLocError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        setLocLat(lat);
        setLocLon(lon);
        setLocCity(`${lat.toFixed(4)}, ${lon.toFixed(4)}`);
        setGpsDetecting(false);
        // Auto-submit with GPS coordinates
        setLocLoading(true);
        try {
          const res = await axios.post('/api/diagnostics/location', {
            lat, lon,
            N: locN || null,
            P: locP || null,
            K: locK || null,
            ph: locPh || null
          });
          setLocResult(res.data);
          if (res.data.location?.city && res.data.location.city !== `${lat.toFixed(4)}, ${lon.toFixed(4)}`) {
            setLocCity(res.data.location.city);
          }
        } catch (err) {
          setLocError(err.response?.data?.error || err.message);
        } finally {
          setLocLoading(false);
        }
      },
      (err) => {
        setGpsDetecting(false);
        setLocError(`GPS error: ${err.message}. Enter city manually.`);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleLocationAnalysis = async (e) => {
    if (e) e.preventDefault();
    setLocLoading(true);
    setLocError(null);
    setLocResult(null);
    setSelectedCrop(null);
    try {
      const payload = {
        city: locCity || undefined,
        N: locN || null,
        P: locP || null,
        K: locK || null,
        ph: locPh || null,
      };
      if (locLat && locLon) {
        payload.lat = locLat;
        payload.lon = locLon;
      }
      const res = await axios.post('/api/diagnostics/location', payload);
      setLocResult(res.data);
      if (res.data.location?.city && res.data.location.city !== (locCity || '')) {
        setLocCity(res.data.location.city);
      }
    } catch (err) {
      setLocError(err.response?.data?.error || err.message);
    } finally {
      setLocLoading(false);
    }
  };

  const getSimilarCrops = (cropName) => {
    if (!locResult) return [];
    const allCrops = locResult.recommended_crops.best_crops;
    const selected = allCrops.find(c => c.name === cropName);
    if (!selected) return [];
    return allCrops.filter(c =>
      c.name !== cropName &&
      (c.water === selected.water ||
        Math.abs(allCrops.indexOf(c) - allCrops.indexOf(selected)) <= 2)
    ).slice(0, 3);
  };

  return (
    <div className="pt-24 px-6 pb-20 min-h-screen bg-[#fafaf9]">
      <GrainOverlay />
      <div className="max-w-6xl mx-auto">
        <header className="mb-12 text-center max-w-2xl mx-auto">
          <SectionLabel text="GPS Diagnostics" icon={MapPin} />
          <h1 className="font-serif text-5xl font-black text-[#0c0a09] mb-4">Land <span className="italic text-[#84cc16]">Analysis.</span></h1>
          <p className="text-stone-500 text-base font-medium">GPS + Weather + Soil analysis for precision agriculture insights</p>
        </header>

        <div className="grid lg:grid-cols-[1fr_420px] gap-8">
          {/* Input Form */}
          <div className="bg-white border-2 border-stone-200 rounded-[3rem] p-10 shadow-xl">
            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-stone-400 mb-2">Location Data</h3>
            <h2 className="font-serif text-4xl font-black text-[#0c0a09] mb-6">Diagnostic <span className="italic text-[#84cc16]">Input.</span></h2>
            <form onSubmit={handleLocationAnalysis} className="space-y-5">
              <div>
                <label className="block font-black text-xs uppercase tracking-widest text-stone-500 mb-2">Location</label>
                <div className="flex gap-2">
                  <input type="text" value={locCity} onChange={e => setLocCity(e.target.value)}
                    placeholder={gpsDetecting ? 'Detecting GPS...' : 'e.g. Mysore, Hubli'}
                    className="flex-1 bg-stone-50 border-2 border-stone-200 rounded-2xl p-4 font-bold text-stone-700 outline-none focus:ring-4 focus:ring-[#84cc16]/10 focus:border-[#84cc16] transition-all" />
                  <button type="button" onClick={detectLocation} disabled={gpsDetecting}
                    className="px-4 bg-[#0c0a09] text-white rounded-2xl font-black text-xs uppercase tracking-wider hover:bg-stone-800 transition-all disabled:opacity-50 flex items-center gap-2">
                    {gpsDetecting ? <Loader2 size={14} className="animate-spin" /> : <MapPin size={14} />}
                    GPS
                  </button>
                </div>
                {locLat && locLon && (
                  <p className="text-[9px] text-[#84cc16] mt-1 font-medium">📍 GPS locked: {locLat.toFixed(4)}, {locLon.toFixed(4)}</p>
                )}
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Soil Test Results (Optional)</p>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { l: "Nitrogen (N)", k: "N", u: "kg/ha", v: locN, s: setLocN },
                  { l: "Phosphorus (P)", k: "P", u: "kg/ha", v: locP, s: setLocP },
                  { l: "Potassium (K)", k: "K", u: "kg/ha", v: locK, s: setLocK },
                  { l: "pH Level", k: "ph", u: "", v: locPh, s: setLocPh },
                ].map(f => (
                  <div key={f.k}>
                    <label className="block font-black text-xs text-stone-500 mb-1">{f.l}</label>
                    <input type="number" step="0.1" value={f.v} onChange={e => f.s(e.target.value)}
                      placeholder={f.u ? `e.g. 80` : "e.g. 6.5"}
                      className="w-full bg-stone-50 border-2 border-stone-200 rounded-xl p-4 font-bold text-stone-700 outline-none focus:ring-4 focus:ring-[#84cc16]/10 focus:border-[#84cc16] transition-all" />
                  </div>
                ))}
              </div>
              <button type="submit" disabled={locLoading || !locCity}
                className="w-full py-5 bg-[#84cc16] text-[#0c0a09] font-black text-base rounded-2xl hover:bg-[#facc15] shadow-lg disabled:opacity-50 transition-all flex items-center justify-center gap-3">
                {locLoading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                {locLoading ? 'Analyzing...' : 'Run Full Diagnostics'}
              </button>
              {locError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="text-red-700 font-bold text-sm flex items-center gap-2"><AlertTriangle size={16} />{locError}</p>
                </div>
              )}
            </form>
          </div>

          {/* Results Panel */}
          <div className="space-y-4">
            {!locResult ? (
              <div className="bg-white rounded-[3rem] p-10 border-2 border-stone-200 shadow-xl text-center">
                <div className="w-16 h-16 bg-[#84cc16]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <MapPin className="w-8 h-8 text-[#84cc16]" />
                </div>
                <p className="text-stone-500 font-bold text-sm">Enter a location to begin analysis</p>
                <p className="text-stone-400 text-xs mt-2">Weather data via Open-Meteo (free)</p>
              </div>
            ) : (
              <div className="space-y-4 overflow-y-auto max-h-[800px] pr-2">
                {/* Season + Weather Combined */}
                <div className="bg-gradient-to-br from-[#84cc16]/10 to-[#facc15]/10 rounded-[2rem] p-6 border-2 border-[#84cc16]/20 shadow-lg">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[8px] font-black uppercase tracking-widest text-stone-500">Season</p>
                    <span className="px-2 py-1 bg-[#84cc16]/20 rounded-full text-[9px] font-black text-[#84cc16]">{locResult.season.name}</span>
                  </div>
                  <p className="text-sm text-stone-600 mb-4">{locResult.season.description}</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white/60 rounded-xl p-3 text-center">
                      <Thermometer className="w-5 h-5 text-stone-500 mx-auto mb-1" />
                      <p className="font-black text-lg text-[#0c0a09]">{Math.round(locResult.weather.temperature_celsius || 0)}°C</p>
                      <p className="text-[8px] font-bold text-stone-400 uppercase">Temp</p>
                    </div>
                    <div className="bg-white/60 rounded-xl p-3 text-center">
                      <Droplets className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                      <p className="font-black text-lg text-[#0c0a09]">{Math.round(locResult.weather.humidity_percent || 0)}%</p>
                      <p className="text-[8px] font-bold text-stone-400 uppercase">Humidity</p>
                    </div>
                    <div className="bg-white/60 rounded-xl p-3 text-center">
                      <CloudRain className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                      <p className="font-black text-lg text-[#0c0a09]">{(locResult.weather.rainfall_mm || 0).toFixed(1)}mm</p>
                      <p className="text-[8px] font-bold text-stone-400 uppercase">Rain</p>
                    </div>
                  </div>
                  {locResult.weather.source && (
                    <p className="text-[9px] text-stone-400 mt-3 font-medium italic">{locResult.weather.source}</p>
                  )}
                </div>

                {/* Soil Analysis */}
                <div className="bg-white rounded-[2rem] p-6 border-2 border-stone-200 shadow-lg">
                  <h3 className="text-[8px] font-black uppercase tracking-widest text-stone-500 mb-2">Soil Analysis</h3>
                  {locResult.soil.soil_type && locResult.soil.soil_type !== 'Unknown' ? (
                    <>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-2 h-2 rounded-full bg-[#84cc16]"></div>
                        <p className="font-black text-sm text-[#0c0a09]">{locResult.soil.soil_type}</p>
                      </div>
                      <p className="text-xs text-stone-600 mb-3">{locResult.soil.overall}</p>
                      {locResult.soil.deficiencies.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-[8px] font-black uppercase tracking-widest text-red-500">Deficiencies</p>
                          {locResult.soil.deficiencies.map((d, i) => (
                            <div key={i} className="bg-red-50 rounded-xl p-3 border border-red-100">
                              <p className="font-bold text-xs text-red-700">{d.element}: <span className="text-red-500">{d.status}</span></p>
                              <p className="text-[10px] text-stone-600 mt-1">→ {d.advice}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-stone-500 text-sm">{locResult.soil.status}</p>
                  )}
                </div>

                {/* Water Availability */}
                <div className="bg-white rounded-[2rem] p-6 border-2 border-stone-200 shadow-lg">
                  <h3 className="text-[8px] font-black uppercase tracking-widest text-stone-500 mb-2">Water Availability</h3>
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-3 h-3 rounded-full ${locResult.water.status === 'High' ? 'bg-blue-500' :
                        locResult.water.status === 'Moderate' ? 'bg-yellow-500' : 'bg-red-500'
                      }`}></div>
                    <p className="font-black text-lg text-[#0c0a09]">{locResult.water.status}</p>
                  </div>
                  <p className="text-sm text-stone-600">{locResult.water.source}</p>
                </div>

                {/* Land Assessment */}
                <div className="bg-white rounded-[2rem] p-6 border-2 border-stone-200 shadow-lg">
                  <h3 className="text-[8px] font-black uppercase tracking-widest text-stone-500 mb-3">Land Assessment</h3>
                  <div className={`inline-block px-3 py-1 rounded-full font-black text-xs mb-3 ${locResult.land_assessment.overall_assessment === 'Good' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                    {locResult.land_assessment.overall_assessment}
                  </div>
                  {locResult.land_assessment.advantages.length > 0 && (
                    <div className="mb-3">
                      <p className="text-[8px] font-black uppercase tracking-widest text-green-600 mb-2">Advantages</p>
                      {locResult.land_assessment.advantages.map((a, i) => (
                        <p key={i} className="text-xs text-stone-700 mb-1">+ {a}</p>
                      ))}
                    </div>
                  )}
                  {locResult.land_assessment.disadvantages.length > 0 && (
                    <div className="mb-3">
                      <p className="text-[8px] font-black uppercase tracking-widest text-red-500 mb-2">Disadvantages</p>
                      {locResult.land_assessment.disadvantages.map((d, i) => (
                        <p key={i} className="text-xs text-stone-700 mb-1">- {d}</p>
                      ))}
                    </div>
                  )}
                  {locResult.land_assessment.recommendations.length > 0 && (
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-widest text-blue-600 mb-2">Recommendations</p>
                      {locResult.land_assessment.recommendations.map((r, i) => (
                        <p key={i} className="text-xs text-stone-700 mb-1">→ {r}</p>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recommended Crops + Similar Crops */}
                <div className="bg-white rounded-[2rem] p-6 border-2 border-stone-200 shadow-lg">
                  <h3 className="text-[8px] font-black uppercase tracking-widest text-stone-500 mb-3">Recommended Crops</h3>
                  <p className="text-xs text-stone-500 mb-4">{locResult.recommended_crops.reasoning}</p>
                  {locResult.recommended_crops.best_crops.map((c, i) => (
                    <div key={i}>
                      <div
                        onClick={() => setSelectedCrop(selectedCrop === c.name ? null : c.name)}
                        className={`flex items-center justify-between bg-stone-50 rounded-xl p-3 mb-2 border cursor-pointer transition-all hover:border-[#84cc16]/30 ${selectedCrop === c.name ? 'border-[#84cc16] ring-2 ring-[#84cc16]/20' : 'border-stone-100'
                          }`}
                      >
                        <div>
                          <p className="font-black text-sm text-[#0c0a09]">{c.name}</p>
                          <p className="text-[10px] text-stone-500 italic">{c.scientific}</p>
                          <p className="text-[9px] text-stone-400 mt-1">{c.reasons?.slice(0, 2).join(', ')}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-[#84cc16]">{c.water}</p>
                          <p className="text-[9px] text-stone-400">{c.cycle}</p>
                        </div>
                      </div>
                      {/* Similar Crops section */}
                      {selectedCrop === c.name && (
                        <div className="ml-4 mb-3 p-4 bg-[#84cc16]/5 rounded-xl border border-[#84cc16]/20">
                          <p className="text-[8px] font-black uppercase tracking-widest text-[#84cc16] mb-2">Similar Alternatives</p>
                          {getSimilarCrops(c.name).length > 0 ? (
                            getSimilarCrops(c.name).map((sc, si) => (
                              <div key={si} className="flex items-center justify-between py-2 border-b border-[#84cc16]/10 last:border-0">
                                <div>
                                  <p className="font-bold text-xs text-[#0c0a09]">{sc.name}</p>
                                  <p className="text-[9px] text-stone-500">{sc.reasons?.slice(0, 1)}</p>
                                </div>
                                <p className="text-[10px] font-bold text-[#84cc16]">{sc.water}</p>
                              </div>
                            ))
                          ) : (
                            <p className="text-[10px] text-stone-400">Similar crops not available</p>
                          )}
                          <p className="text-[9px] text-stone-400 mt-2 italic">Tap to compare growing requirements</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Challenging Crops */}
                {locResult.recommended_crops.challenging_crops?.length > 0 && (
                  <div className="bg-red-50 rounded-[2rem] p-6 border-2 border-red-100">
                    <h3 className="text-[8px] font-black uppercase tracking-widest text-red-500 mb-3">Challenging for This Land</h3>
                    {locResult.recommended_crops.challenging_crops.map((c, i) => (
                      <div key={i} className="flex items-center gap-2 mb-2">
                        <AlertTriangle size={12} className="text-red-400" />
                        <p className="text-xs text-stone-700"><span className="font-bold">{c.name}</span> — {c.water} water, {c.cycle}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const App = () => {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
  });

  const handleLogin = (u) => {
    setUser(u);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <Router>
      <div className="min-h-screen font-sans">
        <GrainOverlay />
        <Navbar user={user} onLogout={handleLogout} />
        <Routes>
          <Route path="/" element={<HomeTerminal />} />
          <Route path="/land-analyser" element={<LandAnalyser />} />
          <Route path="/scan" element={<SmartEnvironmentScanner />} />
          <Route path="/crops" element={<CropIntelligenceHub user={user} />} />

          <Route path="/market" element={<MarketHub />} />
          <Route path="/negotiator" element={<AiNegotiator />} />
          <Route path="/vaniai" element={<VaniAIChat />} />
          <Route path="/admin" element={<AdminDashboard user={user} />} />
          <Route path="/settings" element={<SettingsTerminal />} />
          <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
          <Route path="/signup" element={<SignupPage onLogin={handleLogin} />} />
          <Route path="/profile" element={<ProfilePage user={user} onLogout={handleLogout} />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;