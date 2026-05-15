import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MessageSquare, ShieldCheck, DollarSign, TrendingUp, Send, Loader2, Image as ImageIcon, MapPin, CheckCircle, Navigation } from 'lucide-react';
import axios from 'axios';

const AiNegotiator = ({ embedded = false }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [data, setData] = useState(null);
  
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  
  const chatEndRef = useRef(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setAnalyzing(true);
    try {
      const res = await axios.post('/api/negotiator/analyze', { query: searchQuery });
      setData(res.data);
      
      setChatMessages([
        { role: 'model', content: `I have analyzed the market data for ${res.data.crop_name}. What is the buyer's current offer?` }
      ]);
    } catch (err) {
      console.error(err);
      alert('Error fetching negotiation data');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleChat = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !data) return;
    
    const userMsg = chatInput;
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setChatInput('');
    setChatLoading(true);
    
    try {
      const res = await axios.post('/api/negotiator/chat', {
        offer: userMsg,
        crop_info: data,
        history: chatMessages
      });
      
      setChatMessages(prev => [
        ...prev, 
        { 
          role: 'model', 
          content: res.data.response || `${res.data.suggestion}\n\nReason: ${res.data.reason}` 
        }
      ]);
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'model', content: 'Neural link interrupted.' }]);
    } finally {
      setChatLoading(false);
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className={embedded ? "w-full" : "pt-24 min-h-screen bg-[#fafaf9] px-6 pb-20"}>
      <div className={embedded ? "w-full" : "max-w-7xl mx-auto"}>
        {!embedded && (
          <header className="mb-10">
            <div className="flex items-center gap-2 mb-4 opacity-60">
              <ShieldCheck size={16} className="text-[#84cc16]" />
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[#0c0a09]">AI NEGOTIATOR SYSTEM</span>
            </div>
            <h1 className="font-serif text-5xl font-black text-[#0c0a09] mb-4">Smart <span className="italic text-[#84cc16]">Pricing.</span></h1>
            <p className="text-stone-500 text-base font-medium max-w-2xl">Intelligent price analysis, real-time market search, and AI-assisted negotiation.</p>
          </header>
        )}

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="mb-10 relative">
          <div className="flex items-center bg-white border border-stone-200 rounded-full p-2 shadow-lg">
            <div className="p-3 bg-stone-100 rounded-full text-stone-500">
              <Search size={20} />
            </div>
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for a specific crop variety (e.g., 'Hybrid Tomato', 'Organic Potato')"
              className="flex-1 bg-transparent border-none outline-none px-4 font-medium text-stone-700 w-full"
            />
            <button 
              type="submit" 
              disabled={analyzing}
              className="bg-[#84cc16] text-[#0c0a09] px-8 py-3 rounded-full font-black text-sm uppercase tracking-wider hover:bg-[#facc15] transition-all flex items-center gap-2"
            >
              {analyzing ? <Loader2 size={18} className="animate-spin" /> : 'Analyze'}
            </button>
          </div>
        </form>

        <AnimatePresence>
          {data && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid lg:grid-cols-[1fr_400px] gap-8"
            >
              <div className="space-y-8">
                {/* Crop Identity & Farm Marker */}
                <div className="bg-white rounded-3xl p-6 shadow-xl border border-stone-100 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#84cc16]/10 rounded-bl-full -z-0"></div>
                  <div className="relative z-10 flex gap-6">
                    <div className="w-48 h-48 rounded-2xl overflow-hidden bg-stone-100 flex items-center justify-center border-4 border-white shadow-lg">
                      {data.image_url ? (
                        <img src={data.image_url} alt={data.crop_name} className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon size={32} className="text-stone-300" />
                      )}
                    </div>
                    <div className="flex-1 py-2">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest mb-3 border border-blue-100">
                        <MapPin size={12} /> Farm Marker Detected
                      </div>
                      <h2 className="text-3xl font-black text-stone-900 mb-2">{data.crop_name}</h2>
                      <p className="text-stone-500 font-medium mb-6">Market Condition: <span className="text-[#84cc16] font-bold">{data.market_condition}</span></p>
                      
                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-stone-50 p-4 rounded-xl border border-stone-100 text-center">
                          <p className="text-[10px] uppercase font-bold text-stone-400 tracking-wider mb-1">Demand</p>
                          <p className="text-xl font-black text-stone-800">{data.demand_index}/10</p>
                        </div>
                        <div className="bg-stone-50 p-4 rounded-xl border border-stone-100 text-center">
                          <p className="text-[10px] uppercase font-bold text-stone-400 tracking-wider mb-1">Quality</p>
                          <p className="text-xl font-black text-stone-800">{data.quality_score}/10</p>
                        </div>
                        <div className="bg-stone-50 p-4 rounded-xl border border-stone-100 text-center">
                          <p className="text-[10px] uppercase font-bold text-stone-400 tracking-wider mb-1">Neg. Score</p>
                          <p className="text-xl font-black text-[#84cc16]">{data.negotiation_score}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pricing Tiers */}
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Computed AI Prices */}
                  <div className="bg-stone-900 rounded-3xl p-8 shadow-xl relative overflow-hidden">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#84cc16] mb-6">AI Computed Pricing</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center border-b border-stone-800 pb-4">
                        <span className="text-stone-400 text-sm font-medium">Minimum Safe Price</span>
                        <span className="text-white font-black text-xl">₹{data.minimum_price}/kg</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-stone-800 pb-4">
                        <span className="text-stone-400 text-sm font-medium">Ideal Selling Price</span>
                        <span className="text-[#84cc16] font-black text-2xl">₹{data.ideal_price}/kg</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-stone-400 text-sm font-medium">Maximum Target</span>
                        <span className="text-white font-black text-xl">₹{data.high_target_price}/kg</span>
                      </div>
                    </div>
                  </div>

                  {/* Business Levels */}
                  <div className="bg-white border-2 border-stone-200 rounded-3xl p-8 shadow-xl">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 mb-6">Business Levels</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center bg-stone-50 p-3 rounded-xl border border-stone-100">
                        <span className="text-stone-600 font-bold text-sm">Wholesale</span>
                        <span className="text-stone-900 font-black">₹{data.wholesale_price}/kg</span>
                      </div>
                      <div className="flex justify-between items-center bg-stone-50 p-3 rounded-xl border border-stone-100">
                        <span className="text-stone-600 font-bold text-sm">Retail Market</span>
                        <span className="text-stone-900 font-black">₹{data.retail_price}/kg</span>
                      </div>
                      <div className="flex justify-between items-center bg-stone-50 p-3 rounded-xl border border-stone-100">
                        <span className="text-stone-600 font-bold text-sm">Vendor Direct</span>
                        <span className="text-stone-900 font-black">₹{data.vendor_price}/kg</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Key Negotiation Points */}
                <div className="bg-[#facc15]/10 rounded-3xl p-8 border border-[#facc15]/30">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#b45309] mb-4">Negotiation Key Points</h3>
                  <ul className="space-y-3">
                    {data.negotiation_points?.map((pt, i) => (
                      <li key={i} className="flex gap-3 text-stone-700 font-medium">
                        <CheckCircle size={18} className="text-[#b45309] flex-shrink-0 mt-0.5" />
                        {pt}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Chatbot Window */}
              <div className="bg-stone-900 rounded-[2.5rem] p-2 shadow-2xl flex flex-col h-[700px] sticky top-24 border-4 border-stone-800">
                <div className="p-5 border-b border-stone-800 flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#84cc16] rounded-xl flex items-center justify-center">
                    <MessageSquare className="text-stone-900" size={20} />
                  </div>
                  <div>
                    <h3 className="text-white font-black text-lg">AI Negotiator</h3>
                    <p className="text-[#84cc16] text-[10px] font-black uppercase tracking-widest">Active Link</p>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-hide">
                  {chatMessages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] p-4 rounded-2xl ${msg.role === 'user' ? 'bg-stone-700 text-white rounded-br-sm' : 'bg-white/10 text-stone-200 rounded-bl-sm border border-white/5'}`}>
                        <p className="text-sm font-medium whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="flex justify-start">
                      <div className="bg-white/5 p-4 rounded-2xl rounded-bl-sm border border-white/5 flex gap-2 items-center">
                        <div className="w-2 h-2 bg-[#84cc16] rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-[#84cc16] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        <div className="w-2 h-2 bg-[#84cc16] rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                <form onSubmit={handleChat} className="p-4 pt-2">
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Chat with AI Negotiator..."
                      className="flex-1 bg-stone-800 border border-stone-700 rounded-xl px-4 text-sm text-white outline-none focus:border-[#84cc16] transition-colors"
                    />
                    <button type="submit" disabled={chatLoading} className="w-12 h-12 bg-[#84cc16] rounded-xl flex items-center justify-center text-stone-900 hover:bg-[#facc15] transition-colors">
                      <Send size={18} />
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AiNegotiator;
