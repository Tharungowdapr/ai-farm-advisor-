import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sprout, ChevronLeft, Search, Thermometer, Droplets, CloudRain, Wind,
  ShieldAlert, Target, Gauge, Dna, MapPin, CheckCircle,
  XCircle, AlertTriangle, Clock, Calendar, TrendingUp, Zap,
  Leaf, Sun, Droplet, Layers, RefreshCw, Play, ChevronRight,
  Route, Globe, Loader2, Eye, Info, Lightbulb, ArrowUp,
  ArrowDown, Brain, Plus, Sparkles, AlertOctagon, TriangleAlert, Star,
  Filter, Crosshair
} from "lucide-react";
import axios from "axios";
import { CROP_DATABASE } from "../data/cropData";
import LocationDetector from "./LocationDetector";

const GrainOverlay = () => <div className="grain-overlay opacity-20" />;

// Map crop names to image filenames
const CROP_IMAGES = {
  'Paddy': '/api/image/paddy.png', 'Ragi': '/api/image/ragi.png', 'Coffee': '/api/image/coffee.png',
  'Sugarcane': '/api/image/sugarcane.png', 'Tomato': '/api/image/tomato.png', 'Potato': '/api/image/potato.png',
  'Maize': '/api/image/maize.png', 'Capsicum': '/api/image/capsicum.png', 'Soybean': '/api/image/soyabean.png',
  'Grape': '/api/image/grape.png', 'Orange': '/api/image/orange.png', 'Apple': '/api/image/apple.png',
  'Cotton': '/api/image/cotton.jpg', 'Coconut': '/api/image/coconut.jpg', 'Groundnut': '/api/image/groundnut.jpg',
  'Arecanut': '/api/image/arecanut.jpg',
};
const getCropImage = (name) => CROP_IMAGES[name] || name?.image || null;

const FlaskConical = ({ size, className, style }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size} height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={style}
  >
    <path d="M10 2v7.5" />
    <path d="M14 2v7.5" />
    <path d="M8.5 2h7" />
    <path d="M14 11.5L20 20c.5.7.2 1.5-.6 1.5H4.6c-.8 0-1.1-.8-.6-1.5l6-8.5" />
    <path d="M7 16h10" />
  </svg>
);

// --- Premium UI Components ---

const Card = ({ children, className = "", delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.4 }}
    className={`t-card rounded-[2rem] p-4 shadow-lg hover:border-[#84cc16]/30 transition-all ${className}`}
  >
    {children}
  </motion.div>
);

const StatBox = ({ label, value, icon: Icon, color = "#84cc16" }) => (
  <div className="t-bg-input border-2 t-border rounded-2xl p-3">
    <div className="flex items-center gap-2 mb-1.5">
      <div className="p-1 rounded-lg t-bg-card shadow-sm border t-border">
        <Icon size={12} style={{ color }} />
      </div>
      <span className="text-[9px] font-black uppercase tracking-widest t-text-muted">{label}</span>
    </div>
    <p className="text-base font-black t-text">{value}</p>
  </div>
);

const CropIntelligenceHub = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCropId, setSelectedCropId] = useState(1);
  const [customCrops, setCustomCrops] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newCropName, setNewCropName] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [weatherData, setWeatherData] = useState(null);
  const [soilData, setSoilData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [userCity, setUserCity] = useState(localStorage.getItem('user_city') || null);
  const [locationIntel, setLocationIntel] = useState(null);
  const [intelLoading, setIntelLoading] = useState(false);
  const [locationFilter, setLocationFilter] = useState(false);
  const [locationCrops, setLocationCrops] = useState([]);
  const [locationLoading, setLocationLoading] = useState(false);
  const [addError, setAddError] = useState("");

  // Combine static and custom crops
  const allCrops = useMemo(() => {
    // Merge custom crops, ensuring unique IDs to avoid selection conflicts
    const processedCustom = customCrops.map((c, i) => ({ ...c, id: `custom-${i}` }));
    return [...CROP_DATABASE, ...processedCustom];
  }, [customCrops]);

  const crop = useMemo(() => allCrops.find(c => c.id === selectedCropId) || allCrops[0], [allCrops, selectedCropId]);

  const filteredCrops = useMemo(() => {
    let crops = allCrops;
    if (searchQuery) {
      crops = crops.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.scientific || '').toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (locationFilter && locationCrops.length > 0) {
      crops = crops.filter(c => locationCrops.includes(c.name));
    }
    return crops;
  }, [allCrops, searchQuery, locationFilter, locationCrops]);

  // Fetch location-based crop suggestions
  const fetchLocationCrops = async () => {
    const lat = localStorage.getItem('user_lat');
    const lon = localStorage.getItem('user_lon');
    if (!lat || !lon) return;
    setLocationLoading(true);
    try {
      const res = await axios.post('/api/location-suggestions', {
        location: userCity || `${lat}, ${lon}`,
        weather: weatherData || {},
        soil: soilData || {}
      });
      if (res.data.suggestions) {
        setLocationCrops(res.data.suggestions.map(s => s.name || s));
      } else {
        // Handle both response formats
        const all = [...(res.data.most_planted_crops || []), ...(res.data.alternative_crops || [])];
        setLocationCrops(all.map(s => s.name || s));
      }
    } catch (err) { console.error('Location crops error:', err); }
    finally { setLocationLoading(false); }
  };

  // Initial data load
  useEffect(() => {
    fetchCustomCrops();
    fetchContextData();
  }, []);

  const fetchCustomCrops = async () => {
    try {
      const res = await axios.get("/api/crops/custom");
      if (res.data.crops) setCustomCrops(res.data.crops);
    } catch (err) { console.error("Error fetching custom crops:", err); }
  };

  const fetchContextData = async () => {
    setLoading(true);
    try {
      const lat = localStorage.getItem("user_lat");
      const lon = localStorage.getItem("user_lon");
      const city = localStorage.getItem("user_city");
      if (city) setUserCity(city);
      if (lat && lon) {
        const res = await axios.post("/api/diagnostics/location", { lat: parseFloat(lat), lon: parseFloat(lon) });
        setWeatherData(res.data.climate?.current);
        setSoilData(res.data.soil);
        fetchLocationCrops();
      }
    } catch (err) { console.error("Error fetching context:", err); }
    finally { setLoading(false); }
  };

  // Fetch personalized AI intelligence for the selected crop + location
  const fetchCropIntel = async () => {
    if (!crop || !weatherData) return;
    setIntelLoading(true); setLocationIntel(null);
    try {
      const locationObj = {
        city: userCity || 'Karnataka',
        lat: localStorage.getItem('user_lat'),
        lon: localStorage.getItem('user_lon')
      };
      const res = await axios.post('/api/land/ai-insights', {
        location: locationObj,
        soil: { ph: soilData?.ph, texture: soilData?.texture, n: soilData?.n, p: soilData?.p, k: soilData?.k },
        weather: { temperature: weatherData?.temperature_celsius, humidity: weatherData?.humidity_percent, rainfall: weatherData?.rainfall_mm, status: `${weatherData?.temperature_celsius}°C, ${weatherData?.humidity_percent}% humidity` },
        crops: [crop.name],
      }, {
        headers: { 'X-Api-Key': localStorage.getItem('vani_api_key') }
      });
      setLocationIntel(res.data);
    } catch (err) { console.error('Crop intel error:', err); }
    finally { setIntelLoading(false); }
  };

  const handleAddCrop = async () => {
    if (!newCropName.trim()) return;
    setAddLoading(true);
    setAddError("");
    try {
      const res = await axios.post("/api/crops/add-custom", { name: newCropName.trim() });
      if (res.data.success) {
        setCustomCrops(prev => {
          const newCrops = [...prev, res.data.crop];
          setSelectedCropId(`custom-${newCrops.length - 1}`);
          return newCrops;
        });
        setIsAdding(false);
        setNewCropName("");
      } else {
        setAddError(res.data.error || "Failed to add crop. Try a different name.");
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || "Failed to add crop. Make sure it's a real agricultural crop.";
      setAddError(msg);
    } finally {
      setAddLoading(false);
    }
  };

  // Handle location detection
  const handleLocationDetected = (locationData) => {
    setUserCity(locationData.city);
    fetchContextData();
  };

  // --- Dynamic Analytics Logic ---
  const envScore = useMemo(() => {
    if (!crop || !weatherData) return { score: 50, label: "Analyzing...", reasons: [] };
    let score = 0; const reasons = [];
    const t = weatherData.temperature || 25; const ph = soilData?.ph || 6.5;

    const tempRangeStr = String(crop.tempRange || '15-35');
    const tp = tempRangeStr.split("-").map(s => parseFloat(s)) || [15, 35];
    if (t >= tp[0] && t <= tp[1]) { score += 40; reasons.push("Temperature optimal"); }
    else { score += 15; reasons.push("Temperature suboptimal"); }

    const phStr = String(crop.idealPh || '5.5-7.5');
    const phMin = parseFloat(phStr.split("-")[0] || "5.5");
    const phMax = parseFloat(phStr.split("-")[1] || "7.5");
    if (ph >= phMin && ph <= phMax) { score += 40; reasons.push("Soil pH ideal"); }
    else { score += 10; reasons.push("Soil pH off-target"); }

    const total = Math.min(100, score + 20);
    const label = total >= 80 ? "Excellent" : total >= 60 ? "Good" : total >= 40 ? "Fair" : "Challenging";
    return { score: total, label, reasons };
  }, [crop, weatherData, soilData]);

  const risks = useMemo(() => {
    if (!crop || !weatherData) return [];
    return (crop.diseaseRules || []).filter(r =>
      (weatherData.humidity || 50) >= r.humidity &&
      (weatherData.temperature || 25) >= r.tempMin
    );
  }, [crop, weatherData]);

  return (
    <div className="pt-24 min-h-screen t-bg">
      <GrainOverlay />

      <div className="max-w-7xl mx-auto px-6 pb-20">
        {/* Location Detector */}
        <LocationDetector
          onLocationDetected={handleLocationDetected}
          savedLocation={userCity ? { city: userCity, lat: parseFloat(localStorage.getItem('user_lat')), lon: parseFloat(localStorage.getItem('user_lon')) } : null}
        />

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <button onClick={() => navigate(-1)} className="p-2 bg-white rounded-lg border border-stone-200 hover:border-[#84cc16] transition-colors">
                <ChevronLeft size={16} className="text-stone-600" />
              </button>
              <p className="text-[9px] font-black uppercase tracking-[0.3em] text-[#84cc16]">VaniAI Knowledge Hub</p>
            </div>
            <h1 className="font-serif text-4xl font-black text-[#0c0a09]">Crop <span className="italic text-[#84cc16]">Intelligence.</span></h1>
            <p className="text-stone-500 mt-1.5 text-sm">Scientific cultivation guides, disease modeling & AI-driven insights.</p>
          </div>

          {/* Search & Add Bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Location Filter Toggle */}
            {userCity && (
              <button
                onClick={() => { setLocationFilter(!locationFilter); if (!locationFilter && locationCrops.length === 0) fetchLocationCrops(); }}
                className={`px-4 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 ${locationFilter
                  ? "bg-[#84cc16] text-[#0c0a09] shadow-xl shadow-[#84cc16]/20"
                  : "bg-white border-2 border-stone-200 text-stone-600 hover:border-[#84cc16]/30"
                  }`}
              >
                <Filter size={14} />
                {locationLoading ? <Loader2 size={14} className="animate-spin" /> : null}
                {locationFilter ? 'Showing Local Crops' : 'Filter by Location'}
              </button>
            )}
            <div className="relative group min-w-[300px]">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 t-text-muted group-focus-within:text-[#84cc16] transition-colors">
                <Search size={18} />
              </div>
              <input
                type="text"
                placeholder="Search any crop..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full t-bg-card border-2 t-border rounded-2xl py-4 pl-12 pr-6 font-bold t-text shadow-xl outline-none focus:border-[#84cc16] transition-all"
              />
            </div>
            <button
              onClick={() => setIsAdding(true)}
              className="px-6 py-4 bg-[#0c0a09] text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-stone-800 transition-all shadow-xl shadow-stone-900/10 flex items-center gap-2"
            >
              <Plus size={16} /> Add with AI
            </button>
          </div>
        </div>

        {/* Add Crop Modal Overlay */}
        <AnimatePresence>
          {isAdding && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-stone-900/40 backdrop-blur-md"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl border-2 border-stone-100 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-6 opacity-5">
                  <Brain size={120} />
                </div>
                <div className="relative z-10 text-center">
                  <div className="w-12 h-12 bg-[#84cc16]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Sparkles size={24} className="text-[#84cc16]" />
                  </div>
                  <h2 className="text-2xl font-black text-[#0c0a09] mb-1.5 font-serif italic">AI Discovery</h2>
                  <p className="text-stone-500 text-xs mb-6">Type the name of a crop. Vani AI will research scientific lifecycle data, disease models, and regional suitability for you.</p>

                  <input
                    type="text"
                    value={newCropName}
                    onChange={e => { setNewCropName(e.target.value); setAddError(""); }}
                    onKeyDown={e => e.key === 'Enter' && handleAddCrop()}
                    placeholder="e.g. Vanilla, Cardamom, Avocado..."
                    className="w-full bg-stone-50 border-2 border-stone-100 rounded-2xl py-3 px-4 font-bold text-center text-base text-[#0c0a09] outline-none focus:border-[#84cc16] transition-all mb-5 placeholder:text-stone-300 text-sm"
                    autoFocus
                  />

                  {/* Error Message */}
                  {addError && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mb-5 p-3 bg-red-50 border-2 border-red-200 rounded-2xl flex items-start gap-2"
                    >
                      <AlertTriangle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                      <p className="text-xs font-bold text-red-700 text-left">{addError}</p>
                    </motion.div>
                  )}

                  {/* Quick suggestions */}
                  <div className="mb-5">
                    <p className="text-[9px] font-black uppercase tracking-widest text-stone-400 mb-2">Quick suggestions</p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {['Vanilla', 'Cardamom', 'Avocado', 'Cashew', 'Pepper'].map(s => (
                        <button
                          key={s}
                          onClick={() => setNewCropName(s)}
                          className="px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-[10px] font-bold text-stone-600 hover:bg-[#84cc16]/10 hover:border-[#84cc16]/30 hover:text-[#84cc16] transition-all"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button
                      onClick={() => { setIsAdding(false); setAddError(""); }}
                      className="flex-1 py-4 bg-stone-100 text-stone-500 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-stone-200 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddCrop}
                      disabled={addLoading || !newCropName.trim()}
                      className="flex-1 py-4 bg-[#84cc16] text-[#0c0a09] rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-[#a3e635] shadow-xl shadow-[#84cc16]/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {addLoading ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
                      {addLoading ? 'Researching...' : 'Discover'}
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Sidebar - Crop Selection */}
          <div className="lg:col-span-3 space-y-1.5 max-h-[70vh] overflow-y-auto pr-2 scrollbar-hide">
            {filteredCrops.map((c) => {
              const img = getCropImage(c.name) || c.image;
              return (
                <button
                  key={c.id}
                  onClick={() => { setSelectedCropId(c.id); setLocationIntel(null); }}
                  className={`w-full text-left p-3 rounded-2xl transition-all border-2 flex items-center gap-3 group ${selectedCropId === c.id
                    ? "t-bg-card border-[#84cc16] shadow-xl shadow-[#84cc16]/10 glow-lime"
                    : "t-bg-card border-transparent hover:border-[#84cc16]/20 shadow-sm"
                    }`}
                >
                  <div className={`w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center transition-colors ${selectedCropId === c.id ? "ring-2 ring-[#84cc16]" : ""
                    }`}>
                    {img ? <img src={img} alt={c.name} className="w-full h-full object-cover" /> : <Leaf size={24} className="text-[#84cc16]" />}
                  </div>
                  <div className="min-w-0">
                    <p className="font-black t-text text-sm truncate">{c.name}</p>
                    <p className="text-[10px] t-text-muted uppercase font-bold tracking-wider">{c.classification || (typeof c.id === 'string' && c.id.startsWith('custom') ? 'AI Generated' : 'Crop')}</p>
                  </div>
                  {selectedCropId === c.id && <ChevronRight size={16} className="ml-auto text-[#84cc16] flex-shrink-0" />}
                </button>
              )
            })}
            {filteredCrops.length === 0 && (
              <div className="text-center py-10">
                <Search size={32} className="mx-auto t-text-muted mb-3" />
                <p className="t-text-muted font-bold text-xs uppercase tracking-widest">No results found</p>
                <button onClick={() => setIsAdding(true)} className="mt-4 text-[#84cc16] text-[10px] font-black uppercase tracking-widest underline decoration-2 underline-offset-4">Discover with AI</button>
              </div>
            )}
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-9 space-y-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedCropId}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                {/* 1. Top Section - Overview */}
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <Card className="h-full relative overflow-hidden">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <div className="px-3 py-1 bg-[#84cc16]/10 text-[#84cc16] rounded-full text-[9px] font-black uppercase tracking-widest">Scientific Profile</div>
                            {crop.multiCycle && <div className="px-3 py-1 bg-blue-500/10 text-blue-500 rounded-full text-[9px] font-black uppercase tracking-widest">Multi-Cycle</div>}
                            {userCity && <div className="px-3 py-1 bg-[#84cc16]/5 text-[#84cc16] rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1"><MapPin size={10} />{userCity}</div>}
                          </div>
                          <h2 className="text-3xl font-black t-text mb-1.5 font-serif italic">{crop.name}</h2>
                          <p className="t-text-muted font-bold italic text-xs mb-2">{crop.scientific || 'AI-generated crop profile'}</p>
                        </div>

                        {getCropImage(crop.name) && (
                          <div className="w-32 h-32 md:w-40 md:h-40 shrink-0 rounded-[2rem] overflow-hidden border-4 t-border shadow-xl">
                            <img src={getCropImage(crop.name)} alt={crop.name} className="w-full h-full object-cover hover:scale-110 transition-transform duration-700" />
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatBox label="MSP / Value" value={crop.msp || 'Market-driven'} icon={Star} color="#facc15" />
                        <StatBox label="Avg Yield" value={crop.avgYield || 'Varies'} icon={TrendingUp} color="#22c55e" />
                        <StatBox label="Duration" value={crop.duration || 'Varies'} icon={Clock} color="#3b82f6" />
                        <StatBox label="Soil Type" value={crop.idealSoil || 'Loamy'} icon={Layers} color="#78716c" />
                      </div>
                    </Card>
                  </div>

                  <div className="space-y-4">
                    <Card className="bg-[#84cc16] border-none text-[#0c0a09] relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 opacity-20">
                        <Target size={60} />
                      </div>
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">{userCity ? `For ${userCity}` : 'Cultivation Index'}</p>
                      <h3 className="text-3xl font-black mb-1">{envScore.label}</h3>
                      <p className="text-xs font-bold opacity-80">{envScore.reasons[0] || 'Analyzing local conditions...'} for {crop.name}.</p>
                      <div className="mt-6 flex items-center gap-2">
                        <div className="flex-1 bg-black/10 h-1.5 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${envScore.score}%` }}
                            className="bg-[#0c0a09] h-full"
                          />
                        </div>
                        <span className="font-black text-sm">{envScore.score}%</span>
                      </div>
                    </Card>


                    <Card>
                      <p className="text-[10px] font-black uppercase tracking-widest t-text-muted mb-4">Environment</p>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-500">
                              <Thermometer size={16} />
                            </div>
                            <span className="text-sm font-bold t-text-secondary">Temp Range</span>
                          </div>
                          <span className="font-black t-text">{crop.tempRange || 'N/A'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500">
                              <Droplets size={16} />
                            </div>
                            <span className="text-sm font-bold t-text-secondary">Humidity</span>
                          </div>
                          <span className="font-black t-text">{crop.humiditySuit || 'N/A'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-[#84cc16]/10 flex items-center justify-center text-[#84cc16]">
                              <FlaskConical size={16} />
                            </div>
                            <span className="text-sm font-bold t-text-secondary">Ideal pH</span>
                          </div>
                          <span className="font-black t-text">{crop.idealPh || 'N/A'}</span>
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>

                {/* 2. Lifecycle Timeline */}
                <Card>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-[9px] font-black uppercase tracking-widest text-stone-400 mb-1">Growth Timeline</h3>
                      <p className="text-xl font-black text-[#0c0a09]">Scientific Lifecycle Management</p>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-stone-50 rounded-2xl border border-stone-100 text-[9px] font-bold text-stone-500">
                      <Calendar size={12} /> Seasonal Cycle
                    </div>
                  </div>

                  <div className="relative">
                    <div className="absolute left-6 top-0 bottom-0 w-1 bg-stone-100 rounded-full" />
                    <div className="space-y-8">
                      {(crop.lifecycle || []).length > 0 ? (crop.lifecycle || []).map((stage, idx) => (
                        <div key={idx} className="relative pl-16 group">
                          <div className="absolute left-3.5 top-0 w-6 h-6 bg-white border-4 border-stone-100 rounded-full group-hover:border-[#84cc16] transition-colors z-10" />
                          <div className="bg-stone-50 rounded-3xl p-6 border border-transparent group-hover:border-[#84cc16]/20 group-hover:bg-white transition-all group-hover:shadow-xl group-hover:shadow-[#84cc16]/5">
                            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                              <h4 className="text-xl font-black text-[#0c0a09]">{stage.stage}</h4>
                              <div className="px-4 py-1 bg-white rounded-full border border-stone-100 text-[10px] font-black uppercase text-stone-400 tracking-widest">
                                Duration: {stage.duration}
                              </div>
                            </div>
                            <div className="grid md:grid-cols-3 gap-6">
                              <div className="space-y-1">
                                <p className="text-[8px] font-black uppercase tracking-widest text-stone-400">Nutrient Management</p>
                                <p className="text-xs text-stone-600 font-medium leading-relaxed">{stage.nutrient}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[8px] font-black uppercase tracking-widest text-stone-400">Irrigation Protocol</p>
                                <p className="text-xs text-stone-600 font-medium leading-relaxed">{stage.irrigation}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[8px] font-black uppercase tracking-widest text-[#84cc16]">Expert Actions</p>
                                <p className="text-xs text-stone-600 font-medium leading-relaxed font-bold">{stage.actions}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )) : (
                        <div className="p-8 text-center text-stone-400 font-bold uppercase tracking-widest text-[10px]">
                          Lifecycle data is being generated by AI...
                        </div>
                      )}
                    </div>
                  </div>
                </Card>

                {/* 3. Disease Models */}
                <div className="grid md:grid-cols-2 gap-8">
                  <Card className="bg-white border-[#ef4444]/20">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-6 flex items-center gap-2">
                      <ShieldAlert size={16} /> Scientific Disease Rules
                    </h3>
                    <div className="space-y-4">
                      {(crop.diseaseRules || []).length > 0 ? crop.diseaseRules.map((rule, idx) => (
                        <div key={idx} className="p-4 bg-red-50/50 rounded-2xl border border-red-100/50">
                          <div className="flex items-center justify-between mb-3">
                            <p className="font-black text-stone-800">{rule.disease}</p>
                            <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${rule.severity === 'High' || rule.severity === 'Severe' ? 'bg-red-500 text-white' : 'bg-orange-400 text-white'
                              }`}>
                              {rule.severity} Risk
                            </span>
                          </div>
                          <div className="flex gap-4 mb-3">
                            <div className="text-center flex-1 py-2 bg-white rounded-xl border border-red-100">
                              <p className="text-[8px] font-black uppercase text-stone-400">Critical Temp</p>
                              <p className="text-xs font-black text-red-600">{rule.tempMin}-{rule.tempMax}°C</p>
                            </div>
                            <div className="text-center flex-1 py-2 bg-white rounded-xl border border-red-100">
                              <p className="text-[8px] font-black uppercase text-stone-400">Min Humidity</p>
                              <p className="text-xs font-black text-red-600">{rule.humidity}%</p>
                            </div>
                          </div>
                          <p className="text-[9px] text-stone-500 leading-relaxed"><span className="font-bold text-red-500">ACTION:</span> {rule.action}</p>
                        </div>
                      )) : (
                        <div className="p-6 text-center text-stone-400 text-xs">
                          <ShieldAlert size={32} className="mx-auto text-stone-200 mb-3" />
                          <p className="font-bold">Disease data is being generated by AI...</p>
                        </div>
                      )}
                    </div>
                  </Card>

                  <div className="space-y-4">
                    <Card className="h-full">
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-[#84cc16] mb-6 flex items-center gap-2">
                        <Lightbulb size={16} /> Vani AI Suggestions
                      </h3>
                      <div className="space-y-6">
                        <div className="flex gap-4 items-start">
                          <div className="w-10 h-10 rounded-2xl bg-[#84cc16]/10 flex items-center justify-center text-[#84cc16] flex-shrink-0">
                            <RefreshCw size={20} />
                          </div>
                          <div>
                            <p className="font-black t-text text-sm mb-1">Rotation Strategy</p>
                            <p className="text-xs t-text-secondary leading-relaxed">{crop.multipleCropping || 'Consult local experts for intercropping advice.'}</p>
                          </div>
                        </div>
                        <div className="flex gap-4 items-start">
                          <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 flex-shrink-0">
                            <Globe size={20} />
                          </div>
                          <div>
                            <p className="font-black t-text text-sm mb-1">Primary Regions</p>
                            <p className="text-xs t-text-secondary leading-relaxed">{crop.regions || 'Suitable for multiple agro-climatic zones'}</p>
                          </div>
                        </div>
                        <div className="flex gap-4 items-start">
                          <div className="w-10 h-10 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-500 flex-shrink-0">
                            <Play size={20} />
                          </div>
                          <div>
                            <p className="font-black t-text text-sm mb-1">Harvest Window</p>
                            <p className="text-xs t-text-secondary leading-relaxed">Typical harvest in {crop.harvestMonths || 'season-dependent'}. Plan storage accordingly.</p>
                          </div>
                        </div>
                      </div>

                      {/* Personalized AI Intelligence Button */}
                      <div className="mt-8">
                        <button
                          onClick={fetchCropIntel}
                          disabled={intelLoading || !weatherData}
                          className="w-full py-4 bg-[#84cc16] text-[#0c0a09] rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-[#a3e635] shadow-xl shadow-[#84cc16]/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2 glow-lime"
                        >
                          {intelLoading ? <Loader2 size={16} className="animate-spin" /> : <Brain size={16} />}
                          {intelLoading ? 'Analyzing...' : !weatherData ? 'Run Land Analyser First' : `Get AI Intelligence${userCity ? ` for ${userCity}` : ''}`}
                        </button>
                      </div>
                    </Card>
                  </div>
                </div>

                {/* Personalized AI Intelligence Results */}
                {(intelLoading || locationIntel) && (
                  <Card>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 bg-[#84cc16] rounded-xl flex items-center justify-center glow-lime">
                        <Brain size={22} className="text-[#0c0a09]" />
                      </div>
                      <div>
                        <h3 className="text-lg font-black t-text">Personalized Intelligence{userCity ? ` — ${userCity}` : ''}</h3>
                        <p className="text-[10px] t-text-muted font-black uppercase tracking-widest">AI-powered analysis for {crop.name} at your location</p>
                      </div>
                    </div>

                    {intelLoading && (
                      <div className="flex items-center gap-4 p-6 t-bg-input rounded-2xl t-border border-2">
                        <Loader2 size={24} className="animate-spin text-[#84cc16]" />
                        <div>
                          <p className="font-black t-text">Analyzing {crop.name} for your location...</p>
                          <p className="text-xs t-text-muted">Evaluating soil, weather, disease risk, and market conditions</p>
                        </div>
                      </div>
                    )}

                    {locationIntel && !intelLoading && (
                      <div className="space-y-4">
                        {locationIntel.summary && (
                          <div className="bg-[#84cc16]/5 border border-[#84cc16]/20 rounded-2xl p-5">
                            <p className="text-[10px] font-black uppercase tracking-widest text-[#84cc16] mb-2 flex items-center gap-2"><Target size={14} /> Expert Summary</p>
                            <p className="t-text-secondary text-sm leading-relaxed">{locationIntel.summary}</p>
                          </div>
                        )}
                        <div className="grid md:grid-cols-2 gap-4">
                          {locationIntel.advice && (
                            <div className="t-bg-input rounded-2xl p-5 border-2 t-border">
                              <p className="text-[10px] font-black uppercase tracking-widest text-[#84cc16] mb-2">Scientific Advice</p>
                              <p className="t-text-secondary text-xs leading-relaxed">{locationIntel.advice}</p>
                            </div>
                          )}
                          {locationIntel.risks && (
                            <div className="t-bg-input rounded-2xl p-5 border-2 border-red-500/20">
                              <p className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-2 flex items-center gap-2"><AlertTriangle size={14} /> Risk Assessment</p>
                              <p className="t-text-secondary text-xs leading-relaxed">{locationIntel.risks}</p>
                            </div>
                          )}
                        </div>
                        {locationIntel.market_strategy && (
                          <div className="t-bg-input rounded-2xl p-5 border-2 t-border">
                            <p className="text-[10px] font-black uppercase tracking-widest text-[#facc15] mb-2 flex items-center gap-2"><TrendingUp size={14} /> Market Strategy</p>
                            <p className="t-text-secondary text-xs leading-relaxed">{locationIntel.market_strategy}</p>
                          </div>
                        )}
                        {locationIntel.profit_tip && (
                          <div className="bg-[#84cc16]/10 rounded-2xl p-4 border border-[#84cc16]/20">
                            <p className="text-[10px] font-black uppercase text-[#84cc16] mb-1 flex items-center gap-2"><Lightbulb size={12} /> Profit Tip</p>
                            <p className="t-text-secondary text-xs">{locationIntel.profit_tip}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                )}

                {/* Raw Dataset View */}
                <Card className="mt-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-stone-800 rounded-xl flex items-center justify-center">
                      <Layers size={20} className="text-[#84cc16]" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black t-text">Dataset View</h3>
                      <p className="text-[10px] t-text-muted font-black uppercase tracking-widest">Raw Metadata & Parameters for {crop.name}</p>
                    </div>
                  </div>
                  <div className="overflow-x-auto rounded-xl border t-border">
                    <table className="w-full text-left text-sm t-text">
                      <thead className="t-bg-input uppercase text-[10px] tracking-widest font-black t-text-secondary border-b t-border">
                        <tr>
                          <th className="px-6 py-4">Parameter</th>
                          <th className="px-6 py-4">Value / Range</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y t-border">
                        {[
                          { label: 'Scientific Name', value: crop.scientific || 'N/A' },
                          { label: 'Crop Type', value: crop.multiCycle ? 'Multi-cycle' : 'Single-cycle' },
                          { label: 'Temperature Range', value: crop.tempRange ? `${crop.tempRange} °C` : 'N/A' },
                          { label: 'Ideal pH', value: crop.idealPh || 'N/A' },
                          { label: 'Humidity Suitability', value: crop.humiditySuit || 'N/A' },
                          { label: 'Average Yield', value: crop.avgYield || 'N/A' },
                          { label: 'Duration', value: crop.duration || 'N/A' },
                          { label: 'Ideal Soil Type', value: crop.idealSoil || 'N/A' },
                          { label: 'Base MSP / Value', value: crop.msp || 'Market-driven' },
                        ].map((row, idx) => (
                          <tr key={idx} className="hover:t-bg-input transition-colors">
                            <td className="px-6 py-4 font-bold t-text-secondary">{row.label}</td>
                            <td className="px-6 py-4 font-black t-text">{row.value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CropIntelligenceHub;
