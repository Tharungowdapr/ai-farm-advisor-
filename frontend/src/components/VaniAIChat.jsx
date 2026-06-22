import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Send, Mic, Volume2, Loader2, Sprout, MessageSquare, Plus, Trash2, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
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

const WELCOME_MSG = { role: 'model', content: '🤖 **Vani AI** — Agricultural Intelligence Assistant\n\nI can help with crop recommendations, land analysis, market prices, disease diagnosis, government schemes, and more. How can I assist you today?' };

export default function VaniAIChat({ user }) {
  const loc = useLocation();
  const cropContext = loc.state?.cropContext;
  const cropName = loc.state?.cropName;

  const [messages, setMessages] = useState([WELCOME_MSG]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [playingIdx, setPlayingIdx] = useState(null);
  const [isAgentThinking, setIsAgentThinking] = useState(false);
  const [llmConfigured, setLlmConfigured] = useState(null);
  const [llmWorking, setLlmWorking] = useState(null);
  const [llmError, setLlmError] = useState(null);
  const [llmChecking, setLlmChecking] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [loadingSession, setLoadingSession] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const endRef = useRef(null);
  const recRef = useRef(null);

  const token = localStorage.getItem('token');

  const refreshSessions = async () => {
    if (!token || !user) return;
    try {
      const r = await axios.get('/api/chat/sessions', { headers: { Authorization: `Bearer ${token}` } });
      setSessions(r.data?.sessions || []);
    } catch {}
  };

  useEffect(() => {
    if (token && user) refreshSessions();
  }, []);

  useEffect(() => {
    axios.get('/api/settings/llm-status').then(r => {
      setLlmConfigured(!!r.data?.configured);
      setLlmWorking(!!r.data?.working);
      setLlmError(r.data?.error || null);
    }).catch(() => { setLlmConfigured(false); setLlmWorking(false); }).finally(() => setLlmChecking(false));
  }, []);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  useEffect(() => {
    if (cropContext && messages.length === 1 && !sessionId) {
      sendMessage(cropContext);
    }
  }, [cropContext, sessionId]);

  const loadSession = async (sid) => {
    if (!token || !sid) return;
    setLoadingSession(true);
    try {
      const r = await axios.get(`/api/chat/sessions/${sid}`, { headers: { Authorization: `Bearer ${token}` } });
      if (r.data?.success) {
        const msgs = (r.data.messages || []).map(m => ({ role: m.role, content: m.content }));
        setMessages([WELCOME_MSG, ...msgs]);
        setSessionId(sid);
      }
    } catch {} finally {
      setLoadingSession(false);
    }
  };

  const newSession = () => {
    setSessionId(null);
    setMessages([WELCOME_MSG]);
  };

  const deleteSession = async (sid, e) => {
    e.stopPropagation();
    if (!token) return;
    try {
      await axios.delete(`/api/chat/sessions/${sid}`, { headers: { Authorization: `Bearer ${token}` } });
      await refreshSessions();
      if (sid === sessionId) {
        setSessionId(null);
        setMessages([WELCOME_MSG]);
      }
    } catch {}
  };

  const sendMessage = async (text) => {
    const msg = text || input;
    if (!msg.trim() || loading) return;

    let sid = sessionId;
    if (!sid && user && token) {
      try {
        const r = await axios.post('/api/chat/sessions', { title: msg.slice(0, 60) }, { headers: { Authorization: `Bearer ${token}` } });
        if (r.data?.success) sid = r.data.session_id;
        setSessionId(sid);
      } catch {}
    }

    setMessages(p => [...p, { role: 'user', content: msg }]);
    setInput('');
    setLoading(true);
    setIsAgentThinking(true);
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.post('/api/chat', { message: msg, session_id: sid }, { headers });
      const reply = res.data.response || res.data.reply;
      const newSid = res.data.session_id;
      setMessages(p => [...p, { role: 'model', content: reply }]);
      if (newSid && newSid !== sid) {
        setSessionId(newSid);
        sid = newSid;
      }
      if (token) refreshSessions();
    } catch (err) {
      const errMsg = err?.response?.data?.reply || err?.response?.data?.error || '';
      const isKeyIssue = errMsg.includes('API key') || errMsg.includes('api_key') || errMsg.includes('Invalid') || errMsg.includes('401');
      setMessages(p => [...p, { role: 'model', content: isKeyIssue
        ? '⚠️ **LLM Error** — ' + (errMsg || 'API key is invalid or not configured.') + '\n\nGo to **Settings** to update your API key.'
        : '⚠️ **Connection issue** — Please try again or check Settings.' }]);
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
    const lines = content.split('\n');
    const elements = [];
    lines.forEach((line, i) => {
      if (!line.trim()) { elements.push(<div key={`br-${i}`} className="h-2" />); return; }
      if ((line.startsWith('**') && line.endsWith('**')) || /^[^\w\s]{1,3}\s[A-Z]/.test(line)) {
        const cleanLine = line.replace(/\*\*/g, '');
        elements.push(<p key={i} className="font-black text-[#84cc16] text-[15px] uppercase tracking-wider mb-3 mt-4 flex items-center gap-2">{cleanLine}</p>);
        return;
      }
      if (line.startsWith('- ') || line.startsWith('• ') || line.startsWith('→ ')) {
        const cleanLine = line.slice(2);
        elements.push(<div key={i} className="flex gap-2 ml-2 mb-2 group"><span className="text-[#84cc16] font-bold group-hover:scale-125 transition-transform">•</span><p className="text-sm text-stone-300 leading-relaxed flex-1">{renderInlineStyles(cleanLine)}</p></div>);
        return;
      }
      if (line.match(/^\d+\./)) {
        elements.push(<div key={i} className="flex gap-2 ml-2 mb-2"><span className="text-[#84cc16] font-bold text-xs">{line.split('.')[0]}.</span><p className="text-sm text-stone-300 leading-relaxed flex-1">{renderInlineStyles(line.split('.').slice(1).join('.').trim())}</p></div>);
        return;
      }
      elements.push(<p key={i} className="text-[14px] text-stone-300 leading-relaxed mb-3">{renderInlineStyles(line)}</p>);
    });
    return elements;
  };

  const renderInlineStyles = (text) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) return <strong key={i} className="font-black text-white">{part.slice(2, -2)}</strong>;
      return part;
    });
  };

  const needsOnboarding = !user || !token;
  const showNewChat = !sessionId || messages.length <= 1;

  return (
    <div className="pt-20 h-screen bg-[#0c0a09] overflow-hidden flex">
      <GrainOverlay />

      {/* Sidebar */}
      {user && token && (
        <>
          {sidebarOpen && (
            <div className="w-[280px] flex-shrink-0 bg-stone-950 border-r border-white/5 flex flex-col h-full overflow-hidden">
              <div className="p-4">
                <button onClick={newSession}
                  className="w-full flex items-center gap-2 px-4 py-3 bg-[#84cc16]/10 border border-[#84cc16]/20 rounded-xl text-[#84cc16] hover:bg-[#84cc16]/20 transition-all font-bold text-sm">
                  <Plus size={16} />
                  New Chat
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-1 scrollbar-hide">
                {sessions.length === 0 ? (
                  <p className="text-[11px] text-stone-600 text-center py-8 font-medium">No conversations yet</p>
                ) : (
                  sessions.map(s => (
                    <div key={s.id}
                      onClick={() => loadSession(s.id)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all group ${
                        s.id === sessionId ? 'bg-[#84cc16]/10 border border-[#84cc16]/20' : 'hover:bg-stone-900 border border-transparent'
                      }`}>
                      <MessageSquare size={12} className="text-stone-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-bold text-white truncate">{s.title}</p>
                        <p className="text-[8px] text-stone-600">{s.created_at?.slice(0, 10)}</p>
                      </div>
                      <button onClick={(e) => deleteSession(s.id, e)}
                        className="p-1 text-stone-700 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100 flex-shrink-0">
                        <Trash2 size={11} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="absolute left-0 top-24 z-10 p-1.5 bg-stone-900 border border-stone-700 rounded-r-lg text-stone-400 hover:text-white transition-all cursor-pointer"
            style={{ left: sidebarOpen ? '280px' : '0' }}>
            {sidebarOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
          </button>
        </>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-3 border-b border-white/5">
          <div className="max-w-3xl mx-auto flex items-center gap-3">
            <div className="w-8 h-8 bg-[#84cc16] rounded-lg flex items-center justify-center"><Sprout size={18} className="text-[#0c0a09]" /></div>
            <div className="flex-1">
              <p className="font-black text-sm text-white">Vani AI <span className="text-[#84cc16]">RAG</span></p>
              <p className="text-[8px] text-stone-500 font-bold uppercase tracking-wider">Multi-Agent Agricultural Intelligence</p>
            </div>
            <div className="flex items-center gap-2">
              {!user && (
                <Link to="/login"
                  className="px-4 py-1.5 bg-[#84cc16] rounded-xl text-[#0c0a09] text-xs font-black hover:bg-[#facc15] transition-all">
                  Sign in
                </Link>
              )}
              {needsOnboarding && (
                <span className="px-3 py-1 bg-stone-800 rounded-lg text-[8px] font-black text-stone-500 uppercase tracking-wider">
                  Guest Mode
                </span>
              )}
              {isAgentThinking && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-[#84cc16]/10 rounded-full border border-[#84cc16]/20">
                  <div className="w-1.5 h-1.5 bg-[#84cc16] rounded-full animate-pulse"></div>
                  <span className="text-[8px] font-black text-[#84cc16] uppercase tracking-wider">Agents Working</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* LLM Warning Banner */}
        {!llmChecking && llmConfigured === false && (
          <div className="px-6 py-2 bg-amber-900/40 border-b border-amber-700/30">
            <div className="max-w-3xl mx-auto flex items-center gap-3">
              <ExternalLink size={14} className="text-amber-400 flex-shrink-0" />
              <p className="text-[11px] text-amber-200/90 font-medium flex-1">
                No API key configured. AI agents are disabled. Set your key in <Link to="/settings" className="text-amber-400 font-black underline hover:text-amber-300">Settings</Link>.
              </p>
            </div>
          </div>
        )}
        {!llmChecking && llmConfigured === true && llmWorking === false && (
          <div className="px-6 py-2 bg-red-900/40 border-b border-red-700/30">
            <div className="max-w-3xl mx-auto flex items-center gap-3">
              <ExternalLink size={14} className="text-red-400 flex-shrink-0" />
              <p className="text-[11px] text-red-200/90 font-medium flex-1">
                API key is invalid: {llmError || 'LLM call failed'}. Update in <Link to="/settings" className="text-red-400 font-black underline hover:text-red-300">Settings</Link>.
              </p>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-6 scrollbar-hide">
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.length === 1 && !loading && (
              <div className="mb-8">
                <p className="text-[8px] font-black uppercase text-stone-500 tracking-widest mb-3">Suggested Questions</p>
                <div className="grid grid-cols-2 gap-2">
                  {SUGGESTIONS.map((s, i) => (
                    <button key={i} onClick={() => sendMessage(s)}
                      className="text-left bg-stone-900 border border-stone-700 rounded-xl p-3 hover:border-[#84cc16]/30 transition-all text-xs text-stone-400 hover:text-white font-medium">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-5 rounded-2xl ${m.role === 'user' ? 'bg-[#84cc16]/10 border border-[#84cc16]/20' : 'bg-stone-900 border border-stone-800'}`}>
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

            {loadingSession && (
              <div className="flex justify-start">
                <div className="bg-stone-900 border border-stone-800 p-5 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <Loader2 size={14} className="animate-spin text-[#84cc16]" />
                    <span className="text-[8px] font-black text-[#84cc16] uppercase tracking-widest">Loading conversation...</span>
                  </div>
                </div>
              </div>
            )}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-stone-900 border border-stone-800 p-5 rounded-2xl">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex gap-1">{Array.from({length:3}).map((_, i) => <div key={i} className="w-1.5 h-1.5 bg-[#84cc16] rounded-full animate-bounce" style={{animationDelay:`${i*150}ms`}}></div>)}</div>
                    <span className="text-[8px] font-black text-[#84cc16] uppercase tracking-widest">Running 6 agents...</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {['Supervisor','Soil','Weather','Market','Pest','Scheme','Synthesis','RAG'].map((a,i) => (
                      <span key={i} className="px-2 py-0.5 bg-stone-800 rounded text-[7px] font-bold text-stone-500"><span className="text-[#84cc16]">◆</span> {a}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>
        </div>

        {/* Input */}
        <div className="px-6 pb-6 pt-2">
          <div className="max-w-3xl mx-auto bg-stone-900 border border-stone-700 rounded-2xl p-3 flex items-center gap-3 shadow-2xl">
            <button onClick={handleVoiceInput}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${listening ? 'bg-red-500 text-white animate-pulse' : 'bg-stone-800 text-stone-400 hover:text-[#84cc16]'}`}>
              <Mic size={16} />
            </button>
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder={listening ? '🎤 Listening...' : 'Ask about crops, markets, schemes, diseases...'}
              className="flex-1 bg-transparent border-none outline-none text-white text-sm placeholder:text-stone-600 font-medium" />
            <button onClick={() => sendMessage()} disabled={loading || !input.trim()}
              className="p-2.5 bg-[#84cc16] rounded-xl text-[#0c0a09] hover:bg-[#facc15] transition-all disabled:opacity-30">
              <Send size={16} />
            </button>
          </div>
          <p className="text-center text-[7px] text-stone-600 mt-2 font-bold uppercase tracking-wider">
            Powered by Groq · RAG over 256 knowledge chunks · 6 specialist agents
          </p>
        </div>
      </div>
    </div>
  );
}
