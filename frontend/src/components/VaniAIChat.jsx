import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Send, Mic, Volume2, Loader2, Sprout, MapPin, TrendingUp, DollarSign, Shield, BookOpen, Sun, MessageSquare, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import axios from 'axios';

const GrainOverlay = () => <div className="grain-overlay opacity-20" />;

const SUGGESTIONS = [
  "What crop should I plant in sandy soil?",
  "How much water does paddy need?",
  "What's the MSP for ragi?",
  "Tell me about PM-KISAN scheme",
  "Best crops for low rainfall areas",
  "How to control tomato leaf curl?",
];

export default function VaniAIChat({ onOpenLLMSetup }) {
  const loc = useLocation();
  const cropContext = loc.state?.cropContext;
  const cropName = loc.state?.cropName;
  const [hasApiKey, setHasApiKey] = useState(!!localStorage.getItem('vani_api_key'));

  const defaultWelcome = { role: 'model', content: '🤖 **Vani AI** — Agricultural Intelligence Assistant\n\nI can help with crop recommendations, land analysis, market prices, disease diagnosis, government schemes, and more. How can I assist you today?' };

  const [sessions, setSessions] = useState(() => {
    const saved = localStorage.getItem('vani_chat_sessions');
    if (saved) {
      try { return JSON.parse(saved); } catch { }
    }
    const initialSession = { id: Date.now().toString(), title: 'New Chat', messages: [defaultWelcome] };
    if (cropContext) initialSession.messages.push({ role: 'user', content: cropContext });
    return [initialSession];
  });

  const [activeSessionId, setActiveSessionId] = useState(sessions[0]?.id);

  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];
  const messages = activeSession ? activeSession.messages : [];

  const setMessages = (updater) => {
    setSessions(prev => prev.map(s => {
      if (s.id === activeSessionId) {
        const nextMsgs = typeof updater === 'function' ? updater(s.messages) : updater;
        let title = s.title;
        if (title === 'New Chat' && nextMsgs.length > 1 && nextMsgs[1].role === 'user') {
          title = nextMsgs[1].content.slice(0, 25) + '...';
        }
        return { ...s, messages: nextMsgs, title, updatedAt: Date.now() };
      }
      return s;
    }).sort((a, b) => b.updatedAt - a.updatedAt));
  };

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isAgentThinking, setIsAgentThinking] = useState(false);
  const [listening, setListening] = useState(false);
  const [playingIdx, setPlayingIdx] = useState(null);

  useEffect(() => {
    localStorage.setItem('vani_chat_sessions', JSON.stringify(sessions));
  }, [sessions]);

  const createNewChat = () => {
    const newSession = { id: Date.now().toString(), title: 'New Chat', messages: [defaultWelcome], updatedAt: Date.now() };
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
  };

  const deleteSession = (id, e) => {
    e.stopPropagation();
    const updated = sessions.filter(s => s.id !== id);
    if (updated.length === 0) {
      const newSession = { id: Date.now().toString(), title: 'New Chat', messages: [defaultWelcome], updatedAt: Date.now() };
      setSessions([newSession]);
      setActiveSessionId(newSession.id);
    } else {
      setSessions(updated);
      if (activeSessionId === id) setActiveSessionId(updated[0].id);
    }
  };

  const endRef = useRef(null);
  const recRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  useEffect(() => {
    if (cropContext && messages.length === 2) {
      sendMessage(cropContext);
    }
  }, []);

  const sendMessage = async (text) => {
    const msg = text || input;
    if (!msg.trim() || loading) return;

    // Check if API key is set
    if (!localStorage.getItem('vani_api_key')) {
      setMessages(p => [...p, {
        role: 'user',
        content: msg
      }, {
        role: 'model',
        content: '⚠️ **API Key Required**\n\nTo use Vani AI chat, you need to set up your Groq API key first. Click the brain icon 🧠 in the top right to setup, then try again.'
      }]);
      setInput('');
      return;
    }

    setMessages(p => [...p, { role: 'user', content: msg }]);
    setInput('');
    setLoading(true);
    setIsAgentThinking(true);
    try {
      const hist = messages.map(m => ({ role: m.role, parts: [m.content] }));

      // Collect context from localStorage
      const lat = localStorage.getItem('user_lat');
      const lon = localStorage.getItem('user_lon');
      const savedCrop = localStorage.getItem('active_crop') || cropName;
      const city = localStorage.getItem('user_city');

      const res = await axios.post('/api/chat', {
        message: msg,
        history: hist,
        context: {
          lat: lat ? parseFloat(lat) : null,
          lon: lon ? parseFloat(lon) : null,
          crop: savedCrop || 'Paddy',
          city: city || 'Karnataka',
          language: localStorage.getItem('lang') || 'EN'
        }
      }, {
        headers: { 'X-Api-Key': localStorage.getItem('vani_api_key') }
      });
      const reply = res.data.response || res.data.reply;

      setMessages(p => [...p, { role: 'model', content: reply }]);
    } catch {
      setMessages(p => [...p, { role: 'model', content: '⚠️ **Connection issue** — Please check your API key in Settings or try again.' }]);
    } finally {
      setLoading(false);
      setIsAgentThinking(false);
    }
  };

  const handleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Voice input not supported in this browser. Try Chrome.');
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SpeechRecognition();
    rec.lang = 'en-US';
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = (e) => { setInput(e.results[0][0].transcript); setListening(false); };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    rec.start();
    setListening(true);
    recRef.current = rec;
  };

  const speak = (text, idx) => {
    window.speechSynthesis.cancel();
    if (playingIdx === idx) { setPlayingIdx(null); return; }
    const u = new SpeechSynthesisUtterance(text.replace(/[*#]/g, ''));
    u.lang = 'en-US'; u.rate = 1.0;
    u.onend = () => setPlayingIdx(null);
    u.onerror = () => setPlayingIdx(null);
    setPlayingIdx(idx);
    window.speechSynthesis.speak(u);
  };

  const formatMsg = (content) => {
    if (!content) return null;

    // Split by lines
    const lines = content.split('\n');
    const elements = [];

    lines.forEach((line, i) => {
      if (!line.trim()) {
        elements.push(<div key={`br-${i}`} className="h-2" />);
        return;
      }

      // 1. Headers with Emojis or Bold (e.g., 📊 CURRENT STATUS or **Note**)
      if ((line.startsWith('**') && line.endsWith('**')) || /^[^\w\s]{1,3}\s[A-Z]/.test(line)) {
        const cleanLine = line.replace(/\*\*/g, '');
        elements.push(
          <p key={i} className="font-black text-[#84cc16] text-[15px] uppercase tracking-wider mb-3 mt-4 flex items-center gap-2">
            {cleanLine}
          </p>
        );
        return;
      }

      // 2. Lists
      if (line.startsWith('- ') || line.startsWith('• ') || line.startsWith('→ ')) {
        const cleanLine = line.slice(2);
        elements.push(
          <div key={i} className="flex gap-2 ml-2 mb-2 group">
            <span className="text-[#84cc16] font-bold group-hover:scale-125 transition-transform">•</span>
            <p className="text-sm text-stone-700 leading-relaxed flex-1">
              {renderInlineStyles(cleanLine)}
            </p>
          </div>
        );
        return;
      }

      if (line.match(/^\d+\./)) {
        elements.push(
          <div key={i} className="flex gap-2 ml-2 mb-2">
            <span className="text-[#84cc16] font-bold text-xs">{line.split('.')[0]}.</span>
            <p className="text-sm text-stone-700 leading-relaxed flex-1">
              {renderInlineStyles(line.split('.').slice(1).join('.').trim())}
            </p>
          </div>
        );
        return;
      }

      // 3. Regular Paragraphs
      elements.push(
        <p key={i} className="text-[14px] text-stone-700 leading-relaxed mb-3">
          {renderInlineStyles(line)}
        </p>
      );
    });

    return elements;
  };

  const renderInlineStyles = (text) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-black text-[#84cc16]">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  return (
    <div className="pt-16 h-screen bg-[#fafaf9] overflow-hidden flex flex-row">

      {/* Sidebar for Chat History */}
      <div className="w-64 bg-white border-r border-stone-200 flex flex-col h-full z-10 shadow-sm flex-shrink-0">
        <div className="p-4 border-b border-stone-100">
          <button onClick={createNewChat} className="w-full flex items-center justify-center gap-2 py-3 bg-[#84cc16] text-[#0c0a09] font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-[#a3e635] transition-all">
            <MessageSquare size={14} /> New Chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-hide p-3 space-y-2">
          <p className="text-[9px] font-black uppercase tracking-widest text-stone-400 pl-2 mb-2">Previous Chats</p>
          {sessions.map(s => (
            <div key={s.id}
              onClick={() => setActiveSessionId(s.id)}
              className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${activeSessionId === s.id ? 'bg-[#84cc16]/10 border border-[#84cc16]/30' : 'hover:bg-stone-50 border border-transparent'}`}>
              <div className="flex items-center gap-2 overflow-hidden">
                <MessageSquare size={14} className={activeSessionId === s.id ? 'text-[#84cc16]' : 'text-stone-400'} />
                <p className={`text-xs truncate ${activeSessionId === s.id ? 'font-bold text-[#0c0a09]' : 'text-stone-600 font-medium'}`}>{s.title}</p>
              </div>
              <button onClick={(e) => deleteSession(s.id, e)} className={`p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50 text-stone-400 hover:text-red-500`}>
                <AlertCircle size={12} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative overflow-hidden bg-[#fafaf9]">
        <GrainOverlay />

        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-200 bg-white/50 backdrop-blur-md relative z-10">
          <div className="max-w-3xl mx-auto flex items-center gap-3">
            <div className="w-8 h-8 bg-[#84cc16] rounded-lg flex items-center justify-center"><Sprout size={18} className="text-[#0c0a09]" /></div>
            <div>
              <p className="font-black text-sm text-[#0c0a09]">Vani AI <span className="text-[#84cc16]">RAG</span></p>
              <p className="text-[8px] text-stone-500 font-bold uppercase tracking-wider">Multi-Agent Agricultural Intelligence</p>
            </div>
            {isAgentThinking && (
              <div className="ml-auto flex items-center gap-2 px-3 py-1.5 bg-[#84cc16]/10 rounded-full border border-[#84cc16]/20">
                <div className="w-1.5 h-1.5 bg-[#84cc16] rounded-full animate-pulse"></div>
                <span className="text-[8px] font-black text-[#84cc16] uppercase tracking-wider">Agents Working</span>
              </div>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-6 scrollbar-hide">
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.length === 1 && !loading && (
              <div className="mb-8">
                <p className="text-[8px] font-black uppercase text-stone-500 tracking-widest mb-3">Suggested Questions</p>
                <div className="grid grid-cols-2 gap-2">
                  {SUGGESTIONS.map((s, i) => (
                    <button key={i} onClick={() => sendMessage(s)}
                      className="text-left bg-white border-2 border-stone-100 rounded-xl p-3 hover:border-[#84cc16]/30 transition-all text-xs text-stone-500 hover:text-[#0c0a09] font-medium shadow-sm">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-5 rounded-2xl ${m.role === 'user' ? 'bg-[#84cc16]/10 border border-[#84cc16]/20' : 'bg-white border-2 border-stone-100 shadow-xl shadow-stone-200/20'}`}>
                  {m.role === 'model' && (
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-5 h-5 bg-[#84cc16] rounded flex items-center justify-center"><Sprout size={10} className="text-[#0c0a09]" /></div>
                      <span className="text-[8px] font-black text-[#84cc16] uppercase tracking-wider">Vani AI</span>
                    </div>
                  )}
                  <div className="space-y-1">{formatMsg(m.content)}</div>
                  {m.role === 'model' && (
                    <div className="mt-4 pt-3 border-t border-stone-800 flex items-center gap-3">
                      <button onClick={() => speak(m.content, i)}
                        className={`p-1.5 rounded-lg transition-all ${playingIdx === i ? 'bg-[#84cc16] text-[#0c0a09]' : 'bg-stone-800 hover:bg-[#84cc16]/20 text-stone-400 hover:text-[#84cc16]'}`}>
                        <Volume2 size={12} />
                      </button>
                      <span className="text-[7px] text-stone-600 font-bold uppercase">{playingIdx === i ? 'Playing...' : 'Listen'}</span>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border-2 border-stone-100 p-5 rounded-2xl shadow-xl shadow-stone-200/20">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex gap-1">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="w-1.5 h-1.5 bg-[#84cc16] rounded-full animate-bounce" style={{ animationDelay: `${i * 150}ms` }}></div>)}</div>
                    <span className="text-[8px] font-black text-[#84cc16] uppercase tracking-widest">Running 6 agents...</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {['Supervisor', 'Soil', 'Weather', 'Market', 'Pest', 'Scheme', 'Synthesis', 'RAG'].map((a, i) => (
                      <span key={i} className="px-2 py-0.5 bg-stone-50 rounded text-[7px] font-bold text-stone-500 border border-stone-100"><span className="text-[#84cc16]">◆</span> {a}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>
        </div>

        <div className="px-6 pb-6 pt-2 relative z-10">
          <div className="max-w-3xl mx-auto bg-white border-2 border-stone-200 rounded-2xl p-3 flex items-center gap-3 shadow-xl">
            <button onClick={handleVoiceInput}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${listening ? 'bg-red-500 text-white animate-pulse' : 'bg-stone-50 text-stone-400 hover:text-[#84cc16]'}`}>
              <Mic size={16} />
            </button>
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder={listening ? '🎤 Listening...' : 'Ask about crops, markets, schemes, diseases...'}
              className="flex-1 bg-transparent border-none outline-none text-[#0c0a09] text-sm placeholder:text-stone-400 font-medium" />
            <button onClick={() => sendMessage()} disabled={loading || !input.trim()}
              className="p-2.5 bg-[#84cc16] rounded-xl text-[#0c0a09] hover:bg-[#a3e635] transition-all disabled:opacity-30">
              <Send size={16} />
            </button>
          </div>
          <p className="text-center text-[7px] text-stone-500 mt-2 font-bold uppercase tracking-wider">
            Powered by Groq · RAG over 256 knowledge chunks · 6 specialist agents
          </p>
        </div>
      </div>
    </div>
  );
}
