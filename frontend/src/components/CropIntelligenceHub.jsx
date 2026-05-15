import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sprout, ChevronLeft, Search, Thermometer, Droplets, CloudRain, Wind,
  ShieldAlert, Target, Gauge, Dna, MapPin, Crosshair, CheckCircle,
  XCircle, AlertTriangle, Clock, Calendar, TrendingUp, Zap,
  Leaf, Sun, Droplet, Layers, Activity, RefreshCw, Play, ChevronRight,
  Ruler, Tractor, Syringe, Bug, Route, Globe, Loader2, Eye,
  SkipForward, SkipBack, AlertOctagon, Bell, BellRing, Cloud,
  Sunrise, Sunset, TriangleAlert, Info, Lightbulb, ArrowUp,
  ArrowDown, Megaphone, HeartPulse, Siren, ScanLine, Expand
} from "lucide-react";
import axios from "axios";
import { CROP_DATABASE } from "../data/cropData";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from "recharts";

// ─── Reusable Components ────────────────────────────────

const GrainOverlay = () => <div className="grain-overlay opacity-20" />;
const GradBg = () => <div className="fixed inset-0 pointer-events-none bg-gradient-to-b from-[#84cc16]/8 via-transparent to-[#0c0a09]" />;

const AnimatedCard = ({ children, className, delay = 0, glow = false }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.4 }}
    className={`backdrop-blur-sm bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5 transition-all duration-300 ${glow ? 'shadow-[0_0_25px_rgba(132,204,22,0.1)] border-[#84cc16]/20' : 'hover:border-white/20'} ${className || ''}`}
  >
    {children}
  </motion.div>
);

// ─── Progress Ring with Label ───────────────────────────
const ProgressRing = ({ progress, size = 80, strokeWidth = 6, color = "#84cc16", label }) => {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (progress / 100) * circ;
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <defs>
          <linearGradient id={`pgrad-${progress}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#84cc16" />
            <stop offset="100%" stopColor="#22c55e" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth} strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" className="drop-shadow-[0_0_6px_rgba(132,204,22,0.4)]" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-black text-white">{Math.round(progress)}<span className="text-[13px] text-[#84cc16]">%</span></div>
          {label && <div className="text-[6px] uppercase tracking-wider text-stone-500 -mt-0.5">{label}</div>}
        </div>
      </div>
    </div>
  );
};

const ConfidenceBar = ({ val, size = "md", label }) => {
  const band = val >= 70 ? "bg-gradient-to-r from-[#84cc16] to-green-400" : val >= 50 ? "bg-gradient-to-r from-yellow-400 to-orange-400" : val >= 30 ? "bg-gradient-to-r from-orange-500 to-red-400" : "bg-gradient-to-r from-red-500 to-red-600";
  const h = size === "lg" ? "h-3" : size === "sm" ? "h-1.5" : "h-2";
  return (
    <div className="w-full">
      {label && <div className="flex justify-between text-[13px] text-stone-500 mb-1"><span>{label}</span><span className="font-bold text-white">{val}%</span></div>}
      <div className={`w-full bg-white/5 rounded-full ${h} overflow-hidden shadow-inner`}>
        <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, val)}%` }} transition={{ duration: 1, ease: "easeOut" }} className={`${h} rounded-full ${band} shadow-[0_0_8px_rgba(132,204,22,0.3)]`} />
      </div>
    </div>
  );
};

const StatusBadge = ({ st, label, msgs }) => {
  const color = st === "success" ? "text-green-400 border-green-500/30 bg-green-500/10" : st === "loading" ? "text-yellow-400 border-yellow-500/30 bg-yellow-500/10" : st === "error" ? "text-red-400 border-red-500/30 bg-red-500/10" : "text-stone-500 border-white/10 bg-white/[0.03]";
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[13px] font-bold uppercase tracking-wider border ${color} transition-all`}>
      {st === "success" ? <CheckCircle size={12} /> : st === "loading" ? <Loader2 size={12} className="animate-spin" /> : st === "error" ? <XCircle size={12} /> : <div className="w-2 h-2 rounded-full bg-stone-700" />}
      <span>{label}</span>
      {msgs && <span className="opacity-70 normal-case font-normal text-[13px]">— {msgs}</span>}
    </div>
  );
};

// ─── Environmental Tag ──────────────────────────────────
const EnvTag = ({ label, color = "text-[#84cc16]", icon: Icon }) => (
  <div className="px-3 py-1 rounded-full text-[14px] font-black uppercase tracking-wider border bg-[#84cc16]/10 border-[#84cc16]/25 flex items-center gap-1.5">
    {Icon && <Icon size={10} />}{label}
  </div>
);

// ─── Alert Banner ───────────────────────────────────────
const AlertBanner = ({ type, message, onDismiss }) => {
  const colors = type === "critical" ? "bg-red-500/15 border-red-500/30 text-red-300" : type === "warning" ? "bg-yellow-500/15 border-yellow-500/30 text-yellow-300" : "bg-blue-500/15 border-blue-500/30 text-blue-300";
  const icons = { critical: AlertOctagon, warning: TriangleAlert, info: Info };
  const Icon = icons[type] || Info;
  return (
    <motion.div initial={{ opacity: 0, y: -10, x: -20 }} animate={{ opacity: 1, y: 0, x: 0 }} exit={{ opacity: 0, x: 20 }}
      className={`flex items-start gap-3 px-4 py-3 rounded-xl border ${colors} backdrop-blur-sm`}
    >
      <Icon size={16} className="flex-shrink-0 mt-0.5" />
      <span className="text-[13px] font-medium flex-1">{message}</span>
      {onDismiss && <button onClick={onDismiss} className="opacity-50 hover:opacity-100 flex-shrink-0"><XCircle size={14} /></button>}
    </motion.div>
  );
};

// ─── Particle Background ────────────────────────────────
const ParticleBg = ({ count = 12 }) => {
  const particles = useMemo(() => Array.from({ length: count }, (_, i) => ({
    id: i, x: Math.random() * 100, y: Math.random() * 100,
    size: 2 + Math.random() * 4, delay: Math.random() * 5, duration: 4 + Math.random() * 6,
  })), [count]);
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map(p => (
        <motion.div key={p.id} className="absolute rounded-full bg-[#84cc16]/20"
          style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size }}
          animate={{ y: [0, -20, 0], opacity: [0.2, 0.6, 0.2] }}
          transition={{ repeat: Infinity, duration: p.duration, delay: p.delay, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
};

// ─── Helper Functions ─────────────────────────────────

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const getCurrentSeason = () => {
  const m = new Date().getMonth() + 1;
  if (m >= 3 && m <= 5) return "Summer / Pre-Monsoon";
  if (m >= 6 && m <= 9) return "Kharif / Monsoon";
  if (m >= 10 && m <= 12) return "Rabi / Post-Monsoon";
  return "Winter / Zaid";
};

const calcWaterScore = (weather) => {
  if (!weather) return null;
  const score = Math.min(100, (weather.rainfall || 0) * 3 + (weather.humidity || 0) * 0.5);
  const label = score >= 60 ? "High" : score >= 30 ? "Medium" : "Low";
  return { score: Math.round(score), label };
};

const calcDiseaseRisk = (crop, weather, forecastDays) => {
  if (!crop || !weather) return [];
  const risks = [];
  const allWeather = forecastDays && forecastDays.length > 0
    ? forecastDays.map(d => ({
      temperature: d.temp_avg || d.temp || 25,
      humidity: d.humidity_avg || d.humidity || 50,
      rainfall: d.rainfall_total || d.rainfall || 0
    }))
    : Array(7).fill({ temperature: weather.temperature || 25, humidity: weather.humidity || 50, rainfall: weather.rainfall || 0 });

  for (const rule of (crop.diseaseRules || [])) {
    let maxScore = 0;
    let worstDay = 0;
    allWeather.forEach((w, day) => {
      let score = 0;
      if (w.humidity >= rule.humidity) score += 30;
      if (w.temperature >= (rule.tempMin || 0) && w.temperature <= (rule.tempMax || 50)) score += 25;
      if ((w.rainfall || 0) >= rule.rainfallMin) score += 20;
      if (score > maxScore) { maxScore = score; worstDay = day; }
    });
    if (maxScore > 0) {
      const level = maxScore >= 60 ? "High" : maxScore >= 35 ? "Moderate" : maxScore >= 15 ? "Low" : "Minimal";
      risks.push({
        disease: rule.disease, score: maxScore, level, worstDay,
        window: worstDay <= 2 ? "Next 1-2 days" : worstDay <= 4 ? "Next 3-4 days" : "Next 5-7 days",
        prevention: rule.prevention, action: rule.action, severity: rule.severity,
      });
    }
  }
  return risks.sort((a, b) => b.score - a.score);
};

const calcEnvScore = (crop, weather, soil) => {
  let score = 0; const reasons = [];
  if (!crop || !weather) return { score: 50, label: "Insufficient data", reasons: [{ icon: "ℹ️", text: "Need more environmental data", type: "info" }] };
  const t = weather.temperature || 25; const h = weather.humidity || 50; const r = weather.rainfall || 0; const ph = soil?.ph || 6.5;
  const tp = crop.tempRange?.split("-").map(s => parseFloat(s)) || [15, 35];
  if (t >= tp[0] && t <= tp[1]) { score += 25; reasons.push({ icon: "🌡️", text: `Temperature ${t}°C within ideal range ${crop.tempRange}`, type: "positive" }); }
  else { score += 8; reasons.push({ icon: "🌡️", text: `Temperature ${t}°C outside ideal range ${crop.tempRange}`, type: "warning" }); }
  const phMin = parseFloat(crop.idealPh?.split("-")[0] || "5.5"); const phMax = parseFloat(crop.idealPh?.split("-")[1] || "7.5");
  if (ph >= phMin && ph <= phMax) { score += 25; reasons.push({ icon: "🧪", text: `Soil pH ${ph} in ideal range (${crop.idealPh})`, type: "positive" }); }
  else { score += 5; reasons.push({ icon: "🧪", text: `Soil pH ${ph} outside ideal range (${crop.idealPh})`, type: "warning" }); }
  const rp = crop.rainfallReq?.match(/[\d.]+/g)?.map(Number) || [500, 1500];
  if (r >= (rp[0] || 500) && r <= (rp[1] || 1500)) { score += 20; reasons.push({ icon: "☔", text: `Rainfall ${r}mm suits ${crop.name} requirement`, type: "positive" }); }
  else { score += 5; reasons.push({ icon: "☔", text: `Rainfall ${r}mm suboptimal (ideal: ${crop.rainfallReq})`, type: "warning" }); }
  if (h >= 45) { score += 15; reasons.push({ icon: "💧", text: `Humidity ${h}% supports healthy growth`, type: "positive" }); }
  else { score += 5; reasons.push({ icon: "💧", text: `Humidity ${h}% may be low for optimal growth`, type: "warning" }); }
  const total = Math.min(100, score);
  const label = total >= 75 ? "Highly Suitable" : total >= 55 ? "Moderately Suitable" : total >= 35 ? "Marginally Suitable" : "Not Suitable";
  return { score: total, label, reasons };
};

const generateDailyGuidance = (crop, stageIdx, weather, forecastDays) => {
  if (!crop || stageIdx < 0) return [];
  const stage = crop.lifecycle?.[stageIdx];
  if (!stage) return [];
  const tips = [];
  if (stage.nutrient) tips.push({ icon: "🌿", text: stage.nutrient, type: "nutrient" });
  if (stage.irrigation) tips.push({ icon: "💧", text: stage.irrigation, type: "irrigation" });
  if (stage.disease) tips.push({ icon: "🛡️", text: `Disease prevention: ${stage.disease}`, type: "warning" });
  if (stage.actions) tips.push({ icon: "📋", text: stage.actions, type: "action" });

  // Weather-based guidance
  if (weather) {
    const t = weather.temperature || 25; const h = weather.humidity || 50; const r = weather.rainfall || 0;
    if (h > 75) tips.push({ icon: "⚠️", text: "High humidity — increased fungal disease risk this week", type: "warning" });
    if (t > 35) tips.push({ icon: "🌡️", text: "Extreme heat detected — provide shade or mulching to reduce crop stress", type: "warning" });
    if (t < 15) tips.push({ icon: "🌡️", text: "Low temperatures — consider protective covers for sensitive crops", type: "warning" });
    if (h < 35) tips.push({ icon: "💧", text: "Low humidity — increase irrigation frequency to prevent moisture stress", type: "irrigation" });
    if (r > 40) tips.push({ icon: "☔", text: "Heavy rainfall expected — ensure proper field drainage to prevent waterlogging", type: "warning" });
  }

  // Forecast-based alerts
  if (forecastDays && forecastDays.length > 0) {
    const rainDays = forecastDays.filter(d => (d.rainfall_total || 0) > 20).length;
    if (rainDays >= 3) tips.push({ icon: "☔", text: `${rainDays} rainy days forecast — prepare drainage channels and delay fertilizer application`, type: "warning" });
    const hotDays = forecastDays.filter(d => (d.temp_avg || 0) > 35).length;
    if (hotDays >= 2) tips.push({ icon: "🌡️", text: `${hotDays} hot days forecast — increase irrigation and consider shade nets`, type: "warning" });
    const nextRain = forecastDays[0]?.rainfall_total || 0;
    if (nextRain > 10) tips.push({ icon: "⏰", text: `Rain expected tomorrow (${nextRain}mm) — delay irrigation and complete pending field work today`, type: "action" });
  }

  // Common mistakes
  const mistakes = {
    "Nursery Preparation": ["Overwatering seedlings", "Dense sowing leading to damping off", "Insufficient shade management"],
    "Land Preparation": ["Inadequate ploughing depth", "Poor field leveling causing water stress", "Skipping green manure application"],
    "Sowing": ["Excess seed depth", "Poor spacing", "Delayed sowing beyond optimum window"],
    "Vegetative Growth": ["Excess nitrogen causing lush growth", "Poor weed management", "Delayed thinning"],
    "Flowering": ["Water stress during critical phase", "Excess nitrogen reducing flower set", "Insufficient micronutrients"],
    "Grain Filling": ["Premature water cut-off", "Nitrogen deficiency in late stage", "Inefficient pest monitoring"],
    "Ripening": ["Delayed harvest causing shattering", "Over-ripening affecting quality", "Birds and rodent damage"],
    "Harvesting": ["Harvesting at wrong moisture content", "Improper threshing causing grain damage", "Delayed drying leading to mold"],
  };
  const stageMistakes = Object.entries(mistakes).find(([k]) => stage.stage.toLowerCase().includes(k.toLowerCase()));
  if (stageMistakes) {
    stageMistakes[1].slice(0, 2).forEach(m => tips.push({ icon: "❌", text: `Common mistake: ${m}`, type: "mistake" }));
  }

  return tips.slice(0, 8);
};

const getEnvTags = (crop) => {
  const tags = [];
  const w = crop.waterReq || "";
  if (w.toLowerCase().includes("high") ||
    w.toLowerCase().includes("very high")) tags.push({ label: "High Water Crop", color: "text-[#84cc16]", icon: Droplets });
  if (w.toLowerCase().includes("low") ||
    w.toLowerCase().includes("rainfed") || w.toLowerCase().includes("minimal")) tags.push({
      label: "Drought Resistant",
      color: "text-[#84cc16]", icon: Sun
    });
  if (crop.classification?.toLowerCase() === "perennial")
    tags.push({ label: "Plantation Crop", color: "text-[#84cc16]", icon: Sprout });
  if (crop.classification?.toLowerCase().includes("kharif") ||
    crop.classification?.toLowerCase().includes("rabi")) tags.push({
      label: "Seasonal Crop", color: "text-[#84cc16]", icon:
        Calendar
    });
  if (crop.multiCycle) tags.push({
    label: "Multi-Cycle", color:
      "text-[#84cc16]", icon: RefreshCw
  });
  return tags;
};

const getCropTags = (crop) => {
  const tags = [];
  if (crop.waterReq?.toLowerCase().includes("high")) tags.push({
    label: "High Water", color: "text-[#84cc16]"
  });
  if (crop.waterReq?.toLowerCase().includes("low")) tags.push({
    label: "Drought Resistant", color: "text-[#84cc16]"
  });
  if (crop.classification?.toLowerCase() === "perennial")
    tags.push({ label: "Perennial", color: "text-[#84cc16]" });
  if (crop.classification?.toLowerCase().includes("kharif"))
    tags.push({ label: "Kharif", color: "text-[#84cc16]" });
  if (crop.classification?.toLowerCase().includes("rabi"))
    tags.push({ label: "Rabi", color: "text-[#84cc16]" });
  if (crop.multiCycle) tags.push({
    label: "Multi-Cycle", color:
      "text-[#84cc16]"
  });
  return tags.slice(0, 3);
};

const generateAlerts = (crop, tracking, weather, forecastDays, diseaseRisks) => {
  const alerts = [];
  if (!crop) return alerts;

  // Weather-based alerts
  if (weather) {
    const r = weather.rainfall || 0; const t = weather.temperature || 25; const h = weather.humidity || 50;
    if (r > 30) alerts.push({ type: "warning", message: `Heavy rainfall (${r}mm) — ensure proper field drainage` });
    if (t > 37) alerts.push({ type: "critical", message: `Extreme heat (${t}°C) — increase irrigation and provide shade` });
    if (h > 80) alerts.push({ type: "warning", message: `High humidity (${h}%) — fungal disease risk elevated` });
  }

  // Forecast alerts
  if (forecastDays && forecastDays.length > 0) {
    const rainTomorrow = forecastDays[0]?.rainfall_total || 0;
    if (rainTomorrow > 15) alerts.push({ type: "warning", message: "Heavy rainfall expected tomorrow — delay irrigation and complete field work today" });
    const totalRain = forecastDays.reduce((s, d) => s + (d.rainfall_total || 0), 0);
    if (totalRain > 100) alerts.push({ type: "info", message: `${totalRain}mm rain forecast over next 7 days — plan fertilizer application accordingly` });
    const avgTemp = forecastDays.reduce((s, d) => s + (d.temp_avg || 0), 0) / forecastDays.length;
    if (avgTemp > 35) alerts.push({ type: "critical", message: `Sustained heat wave (${Math.round(avgTemp)}°C avg) — implement heat mitigation measures` });
  }

  // Disease-based alerts
  if (diseaseRisks && diseaseRisks.length > 0) {
    const high = diseaseRisks.filter(d => d.level === "High");
    if (high.length > 0) {
      high.forEach(d => alerts.push({ type: "critical", message: `${d.disease} risk ${d.level.toLowerCase()} (${d.score}%) — ${d.window}. ${d.prevention}` }));
    }
    const mod = diseaseRisks.filter(d => d.level === "Moderate");
    if (mod.length > 0) alerts.push({ type: "warning", message: `${mod.length} moderate disease risk(s) detected — take preventive action` });
  }

  // Stage-based alerts
  if (tracking && trackingProgress(tracking, crop)) {
    const tp = trackingProgress(tracking, crop);
    if (tp) {
      if (tp.daysLeft <= 7) alerts.push({ type: "info", message: `Harvest window approaching — prepare equipment and labor arrangements` });
      if (tp.daysLeft <= 15 && tp.daysLeft > 7) alerts.push({ type: "info", message: `${tp.daysLeft} days until estimated harvest — stop fertilizer application` });
      if (tp.pct >= 80) alerts.push({ type: "info", message: `Crop at ${tp.pct}% maturity — monitor grain moisture for optimal harvest timing` });
    }
  }

  return alerts.slice(0, 5);
};

// ─── Tracking Progress Helper ───────────────────────────
const trackingProgress = (tracking, crop) => {
  if (!tracking || !crop) return null;
  const start = new Date(tracking.startDate);
  const now = new Date();
  const daysElapsed = Math.max(0, Math.floor((now - start) / (1000 * 60 * 60 * 24)));
  const totalDays = parseInt(crop.duration?.split("-")[1] || crop.duration?.split(" ")[0] || 120);
  const life = crop.lifecycle || [];
  let accumulated = 0; let activeStage = life[0]; let activeIdx = 0;
  const cumDays = [];
  for (let i = 0; i < life.length; i++) {
    const stageDays = parseInt(life[i].duration) || 15;
    cumDays.push({ ...life[i], days: stageDays, cumStart: accumulated, cumEnd: accumulated + stageDays });
    if (daysElapsed >= accumulated && daysElapsed < accumulated + stageDays) { activeStage = life[i]; activeIdx = i; }
    accumulated += stageDays;
  }
  const pct = Math.min(100, Math.round((daysElapsed / totalDays) * 100));
  const daysLeft = Math.max(0, totalDays - daysElapsed);
  const nextStage = life[activeIdx + 1] || null;
  const daysInStage = daysElapsed - (cumDays[activeIdx]?.cumStart || 0);
  const stageTotal = cumDays[activeIdx]?.days || 1;
  const stagePct = Math.min(100, Math.round((daysInStage / stageTotal) * 100));
  return { daysElapsed, totalDays, pct, activeStage, activeIdx, nextStage, daysLeft, cumDays, daysInStage, stageTotal, stagePct, harvestDate: new Date(start.getTime() + totalDays * 86400000) };
};

// ════════════════════════════════════════════════════════
// MAIN CROP INTELLIGENCE HUB
// ════════════════════════════════════════════════════════

const CropIntelligenceHub = ({ user }) => {
  const navigate = useNavigate();
  const [selectedCrop, setSelectedCrop] = useState(null);
  const [view, setView] = useState("hub");
  const [searchTerm, setSearchTerm] = useState("");

  // ── Environment ──
  const [coords, setCoords] = useState(null);
  const [locationName, setLocationName] = useState("");
  const [weatherData, setWeatherData] = useState(null);
  const [soilData, setSoilData] = useState(null);
  const [forecastData, setForecastData] = useState(null);
  const [envStatuses, setEnvStatuses] = useState({ location: "idle", weather: "idle", soil: "idle" });
  const [envMsgs, setEnvMsgs] = useState({});
  const [envError, setEnvError] = useState(null);
  const [manualCity, setManualCity] = useState("");
  const [mode, setMode] = useState("idle");

  // ── Tracking ──
  const [tracking, setTracking] = useState(null);
  const [showTrackingForm, setShowTrackingForm] = useState(false);
  const [trackForm, setTrackForm] = useState({ startDate: new Date().toISOString().split('T')[0], farmLocation: "" });

  // ── Lightbox ──
  const [lightboxImage, setLightboxImage] = useState(null);

  // Load tracking from backend or localStorage
  useEffect(() => {
    const loadTracking = async () => {
      if (user) {
        try {
          const res = await axios.get(`/api/user/farms?user_id=${user.id || user.email}`);
          if (res.data.success && res.data.farms && res.data.farms.length > 0) {
            // Find tracking for the currently selected crop (if any) or just the latest
            const farm = res.data.farms[0]; // Simplified: just taking the first for now
            setTracking({
              startDate: farm.planting_date,
              farmLocation: farm.soil_type, // Misusing soil_type field for location name in this demo
              variety: farm.variety
            });
          }
        } catch (err) {
          console.error("Failed to load tracking from backend:", err);
        }
      } else {
        // Fallback to localStorage if no user
        const local = localStorage.getItem(`tracking_global`);
        if (local) setTracking(JSON.parse(local));
      }
    };
    loadTracking();
  }, [user]);

  const filteredCrops = useMemo(() => {
    if (!searchTerm.trim()) return CROP_DATABASE;
    const q = searchTerm.toLowerCase();
    return CROP_DATABASE.filter(c => c.name.toLowerCase().includes(q) || c.scientific.toLowerCase().includes(q) || c.variety.toLowerCase().includes(q) || c.regions.toLowerCase().includes(q));
  }, [searchTerm]);

  const setEnvSt = (key, state, msg) => {
    setEnvStatuses(p => ({ ...p, [key]: state }));
    if (msg) setEnvMsgs(p => ({ ...p, [key]: msg }));
  };

  const detectEnvironment = async (lat, lon) => {
    setCoords({ lat, lon });
    setEnvStatuses({ location: "loading", weather: "loading", soil: "loading" });
    setEnvError(null);
    try {
      const geo = await axios.get(`/api/env/geocode?lat=${lat}&lon=${lon}`);
      const city = geo.data.city;
      setLocationName(geo.data.display);
      setEnvSt("location", "success", city);

      const [wRes, sRes, fRes] = await Promise.allSettled([
        axios.get(`/api/env/weather?lat=${lat}&lon=${lon}`),
        axios.get(`/api/env/soilgrids?lat=${lat}&lon=${lon}`, { timeout: 15000 }),
        axios.get(`/api/env/forecast?lat=${lat}&lon=${lon}`, { timeout: 15000 }),
      ]);

      if (wRes.status === "fulfilled") { setWeatherData(wRes.value.data); setEnvSt("weather", "success", `${wRes.value.data.temperature}°C, ${wRes.value.data.humidity}%`); }
      else { setEnvSt("weather", "error", "Unavailable"); }

      if (sRes.status === "fulfilled") { setSoilData(sRes.value.data); setEnvSt("soil", "success", `pH ${sRes.value.data.ph}`); }
      else { setEnvSt("soil", "error", "Estimated"); setSoilData({ ph: 6.5, nitrogen: 30, phosphorus: 12, potassium: 18 }); setEnvSt("soil", "success", "pH 6.5 (default)"); }

      if (fRes.status === "fulfilled") setForecastData(fRes.value.data.forecast);
    } catch { setEnvError("Environment detection failed"); setEnvStatuses({ location: "error", weather: "error", soil: "error" }); }
  };

  const autoDetectLocation = () => {
    if (!navigator.geolocation) { setEnvError("Geolocation unsupported. Enter location manually."); return; }
    setMode("detecting");
    navigator.geolocation.getCurrentPosition(
      p => { detectEnvironment(p.coords.latitude, p.coords.longitude); setMode("done"); },
      () => { setEnvError("Permission denied. Enter city manually."); setMode("idle"); },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const manualDetectLocation = async () => {
    if (!manualCity.trim()) return;
    setMode("detecting"); setEnvError(null);
    try {
      const ow = await axios.get(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(manualCity.trim())},IN&limit=1`, { timeout: 8, headers: { "User-Agent": "VaniAI/1.0" } });
      if (ow.data?.length > 0) {
        setManualCity("");
        await detectEnvironment(parseFloat(ow.data[0].lat), parseFloat(ow.data[0].lon));
        setMode("done");
      } else { setEnvError(`Location "${manualCity}" not found. Try a nearby major city.`); setMode("idle"); }
    } catch { setEnvError("Geocoding failed. Check internet connection."); setMode("idle"); }
  };

  const handleCropSelect = (crop) => { setSelectedCrop(crop); setView("detail"); setShowTrackingForm(false); };
  const handleBack = () => { setView("hub"); setSelectedCrop(null); setShowTrackingForm(false); };

  if (view === "detail" && selectedCrop) {
    return <CropDetailPage crop={selectedCrop} user={user} onBack={handleBack}
      tracking={tracking} setTracking={setTracking} showTrackingForm={showTrackingForm} setShowTrackingForm={setShowTrackingForm}
      trackForm={trackForm} setTrackForm={setTrackForm}
      weatherData={weatherData} soilData={soilData} forecastData={forecastData}
      coords={coords} locationName={locationName}
      envStatuses={envStatuses} envMsgs={envMsgs} envError={envError}
      autoDetectLocation={autoDetectLocation} manualDetectLocation={manualDetectLocation}
      manualCity={manualCity} setManualCity={setManualCity} mode={mode}
      lightboxImage={lightboxImage} setLightboxImage={setLightboxImage}
    />;
  }

  // ═══════════════════════ HUB VIEW ═══════════════════════
  return (
    <div className="pt-20 min-h-screen bg-[#0c0a09] px-4 pb-20 text-white relative">
      <GrainOverlay />
      <GradBg />

      {/* Environment Bar */}
      <div className="max-w-6xl mx-auto relative z-10 mb-6">
        <div className="flex flex-wrap items-center gap-2 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 backdrop-blur-sm">
          <Globe size={14} className="text-[#84cc16]" />
          {mode === "idle" ? (
            <>
              <button onClick={autoDetectLocation} className="text-[13px] text-stone-400 hover:text-[#84cc16] font-bold flex items-center gap-1.5 transition-colors">
                <Crosshair size={12} /> Auto-Detect
              </button>
              <span className="text-stone-700 text-[13px]">|</span>
              <span className="text-[13px] text-stone-600">or</span>
              <div className="flex items-center gap-1.5 ml-1">
                <input value={manualCity} onChange={e => setManualCity(e.target.value)}
                  placeholder="Enter city name (e.g. Bengaluru)..."
                  className="w-40 bg-black/60 border border-white/10 rounded-lg px-3 py-1.5 text-[13px] text-white outline-none focus:border-[#84cc16] placeholder:text-stone-600"
                  onKeyDown={e => e.key === "Enter" && manualDetectLocation()}
                />
                <button onClick={manualDetectLocation} className="px-3 py-1.5 bg-[#84cc16]/20 text-[#84cc16] border border-[#84cc16]/30 rounded-lg text-[13px] font-bold hover:bg-[#84cc16]/30 transition-all flex items-center gap-1">
                  <Search size={11} /> Search
                </button>
              </div>
            </>
          ) : mode === "detecting" ? (
            <span className="text-[13px] text-yellow-400 flex items-center gap-1.5"><Loader2 size={12} className="animate-spin" /> Detecting location...</span>
          ) : null}
          {locationName && <span className="text-[13px] text-green-400 font-bold ml-1">✓ {locationName.split(",")[0]}</span>}
          {coords && <span className="text-[13px] text-stone-600">{coords.lat.toFixed(2)}, {coords.lon.toFixed(2)}</span>}
          {envError && <span className="text-[13px] text-red-400 ml-1">⚠ {envError}</span>}
          {mode === "done" && (
            <button onClick={autoDetectLocation} className="ml-auto text-[13px] text-stone-500 hover:text-[#84cc16] transition-colors flex items-center gap-1">
              <RefreshCw size={10} /> Refresh
            </button>
          )}
        </div>
      </div>

      {/* Header */}
      <header className="text-center pt-2 pb-6 max-w-2xl mx-auto relative z-10">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Sprout size={16} className="text-[#84cc16]" />
          <span className="text-[15px] font-black uppercase tracking-[0.4em] text-[#84cc16]">Crop Intelligence Hub</span>
        </div>
        <h1 className="font-serif text-4xl md:text-5xl font-black text-white mb-3 drop-shadow-[0_2px_12px_rgba(132,204,22,0.15)]">
          Crop <span className="italic text-[#84cc16]">Intelligence Hub</span>
        </h1>
        <p className="text-stone-400 text-sm max-w-xl mx-auto leading-relaxed">
          Intelligent lifecycle management, predictive disease forecasting, and AI-powered crop advisory for Karnataka crops.
        </p>
        {locationName && (
          <div className="mt-3 inline-flex items-center gap-2 px-4 py-1.5 bg-[#84cc16]/10 border border-[#84cc16]/25 rounded-full text-[13px] text-[#84cc16]">
            <MapPin size={11} /> Live data for <span className="font-bold">{locationName}</span>
            {weatherData && <><span className="text-stone-600">•</span> {weatherData.temperature}°C <span className="text-stone-600">•</span> {weatherData.humidity}% RH</>}
          </div>
        )}
      </header>

      {/* Search */}
      <div className="max-w-lg mx-auto relative z-10 mb-8">
        <div className="relative">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500" />
          <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search crops by name, variety, scientific name, or region..."
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-11 pr-4 py-3.5 text-sm text-white outline-none focus:border-[#84cc16]/50 focus:shadow-[0_0_20px_rgba(132,204,22,0.06)] placeholder:text-stone-600 transition-all"
          />
        </div>
      </div>

      {/* Crop Grid */}
      <div className="max-w-6xl mx-auto relative z-10">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCrops.map((crop, i) => (
            <CropCard key={crop.id} crop={crop} index={i} onClick={() => handleCropSelect(crop)} />
          ))}
        </div>
        {filteredCrops.length === 0 && (
          <div className="text-center py-20 text-stone-500">
            <Search size={48} className="mx-auto mb-4 opacity-20" />
            <p className="text-base mb-1">No crops match "{searchTerm}"</p>
            <p className="text-xs text-stone-600">Try searching by name, variety, or region</p>
          </div>
        )}
      </div>

      {/* Lightbox */}
      <AnimatePresence>{lightboxImage && <Lightbox src={lightboxImage} onClose={() => setLightboxImage(null)} />}</AnimatePresence>
    </div>
  );
};

// ═══════════════════════ CROP CARD ═══════════════════════
const CropCard = ({ crop, index, onClick }) => {
  const cardRef = useRef(null);
  const tags = getCropTags(crop);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = useCallback((e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setMousePos({ x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height });
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}
      ref={cardRef} onClick={onClick}
      onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)} onMouseMove={handleMouseMove}
      className="group cursor-pointer bg-white/[0.03] border border-white/[0.08] rounded-2xl overflow-hidden hover:border-[#84cc16]/30 hover:bg-white/[0.06] transition-all duration-500 relative"
    >
      {/* Image area with parallax */}
      <div className="h-48 overflow-hidden relative bg-gradient-to-br from-stone-900 via-stone-950 to-black">
        <motion.div className="absolute inset-0"
          animate={isHovered ? { scale: 1.1, rotate: mousePos.x * 3 - 1.5 } : { scale: 1, rotate: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <img src={crop.image} alt={crop.name}
            className="w-full h-full object-cover"
            onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
          />
          <div className="absolute inset-0 hidden items-center justify-center bg-gradient-to-br from-stone-900 via-stone-950 to-black">
            <Sprout size={64} className="text-[#84cc16]/30" />
          </div>
        </motion.div>

        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-transparent" />

        {/* Glow on hover */}
        <motion.div className="absolute inset-0"
          animate={isHovered ? { background: `radial-gradient(circle at ${mousePos.x * 100}% ${mousePos.y * 100}%, rgba(132,204,22,0.15) 0%, transparent 70%)` } : {}}
        />

        {/* Tags */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          {tags.map(t => (
            <span key={t.label} className={`px-2 py-0.5 
rounded-full text-[14px] font-black uppercase tracking-wider bg-black/60 backdrop-blur-sm border ${t.color}`}>
              {t.label}
            </span>
          ))}
        </div>

        {/* Bottom gradient overlay */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-stone-950/90 to-transparent" />
      </div>

      {/* Info */}
      <div className="p-5">
        <div className="flex items-start justify-between mb-1">
          <div className="flex-1 min-w-0">
            <h3 className="font-serif text-xl font-black text-white truncate">{crop.name}</h3>
            <p className="text-stone-500 text-[14px] italic truncate">{crop.scientific}</p>
          </div>
          <div className="text-right flex-shrink-0 ml-3">
            <div className="text-[13px] text-stone-500 uppercase tracking-wider">Duration</div>
            <div className="text-sm font-bold text-[#84cc16]">{crop.duration?.split(" ")[0]}</div>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 mt-3">
          <span className="px-2 py-0.5 bg-white/5 rounded text-[13px] text-stone-400 uppercase tracking-wider border border-white/5">{crop.waterReq?.split(" ")[0]}</span>
          <span className="px-2 py-0.5 bg-white/5 rounded text-[13px] text-stone-400 uppercase tracking-wider border border-white/5">{crop.idealSoil?.split("/")[0]?.trim()}</span>
          <span className="px-2 py-0.5 bg-white/5 rounded text-[13px] text-stone-400 uppercase tracking-wider border border-white/5">{crop.avgYield}</span>
        </div>

        <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center justify-between">
          <span className="text-[13px] text-stone-500 font-medium">{crop.msp}</span>
          <span className="text-[#84cc16] text-[13px] font-bold flex items-center gap-1 group-hover:gap-2 transition-all">
            Access Intelligence <ChevronRight size={10} />
          </span>
        </div>
      </div>
    </motion.div>
  );
};

// ═══════════════════════ LIGHTBOX ═══════════════════════
const Lightbox = ({ src, onClose }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
    className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6 cursor-pointer"
  >
    <button onClick={onClose} className="absolute top-6 right-6 text-white/60 hover:text-white transition-colors">
      <XCircle size={28} />
    </button>
    <motion.img initial={{ scale: 0.8 }} animate={{ scale: 1 }} src={src} className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl" alt="Enlarged crop" />
  </motion.div>
);

// ═══════════════════════ CROP DETAIL PAGE ═══════════════════════
const CropDetailPage = ({
  crop, user, onBack, tracking, setTracking, showTrackingForm, setShowTrackingForm,
  trackForm, setTrackForm, weatherData, soilData, forecastData,
  coords, locationName, envStatuses, envMsgs, envError,
  autoDetectLocation, manualDetectLocation, manualCity, setManualCity, mode,
  lightboxImage, setLightboxImage
}) => {
  const [activeTab, setActiveTab] = useState("overview");
  const [manualCityLocal, setManualCityLocal] = useState("");
  const [showAlerts, setShowAlerts] = useState(true);

  const tp = useMemo(() => trackingProgress(tracking, crop), [tracking, crop]);
  const waterScore = useMemo(() => calcWaterScore(weatherData), [weatherData]);
  const diseaseRisks = useMemo(() => calcDiseaseRisk(crop, weatherData, forecastData), [crop, weatherData, forecastData]);
  const envScore = useMemo(() => calcEnvScore(crop, weatherData, soilData), [crop, weatherData, soilData]);
  const guidanceTips = useMemo(() => generateDailyGuidance(crop, tp?.activeIdx ?? -1, weatherData, forecastData), [crop, tp?.activeIdx, weatherData, forecastData]);
  const envTags = useMemo(() => getEnvTags(crop), [crop]);
  const alerts = useMemo(() => generateAlerts(crop, tracking, weatherData, forecastData, diseaseRisks), [crop, tracking, weatherData, forecastData, diseaseRisks]);

  const tabs = [
    { id: "overview", label: "Overview", icon: Target },
    { id: "lifecycle", label: "Lifecycle", icon: Layers },
    { id: "tracking", label: "Tracking", icon: Activity },
    { id: "disease", label: "Disease Forecast", icon: ShieldAlert },
    { id: "environment", label: "Environment", icon: Globe },
  ];

  const handleStartTracking = async (e) => {
    e.preventDefault();
    if (!trackForm.startDate) return;

    const t = {
      cropId: crop.id,
      cropName: crop.name,
      variety: crop.variety || "Standard",
      startDate: trackForm.startDate,
      farmLocation: trackForm.farmLocation || ""
    };

    setTracking(t);
    setShowTrackingForm(false);
    setActiveTab("tracking");

    if (user) {
      try {
        await axios.post('/api/farms/create', {
          user_id: user.id || user.email,
          crop_name: t.cropName,
          variety: t.variety,
          planting_date: t.startDate,
          soil_type: t.farmLocation,
          area_acres: 1.0
        });
      } catch (err) {
        console.error("Failed to sync tracking to backend:", err);
      }
    } else {
      localStorage.setItem(`tracking_global`, JSON.stringify(t));
    }
  };

  const manualDetect = async () => {
    if (!manualCityLocal.trim()) return;
    manualDetectLocation();
  };

  return (
    <div className="pt-20 min-h-screen bg-[#0c0a09] text-white relative">
      <GrainOverlay />
      <GradBg />

      {/* ── Alert Bar ── */}
      <AnimatePresence>
        {showAlerts && alerts.length > 0 && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="max-w-6xl mx-auto px-4 mb-4 relative z-10 space-y-2"
          >
            <div className="flex items-center gap-2 mb-2">
              <BellRing size={14} className="text-[#84cc16]" />
              <span className="text-[13px] font-black uppercase tracking-wider text-[#84cc16]">Smart Alerts</span>
              <button onClick={() => setShowAlerts(false)} className="ml-auto text-[13px] text-stone-500 hover:text-white transition-colors">Dismiss All</button>
            </div>
            <div className="space-y-1.5">
              {alerts.slice(0, 3).map((a, i) => <AlertBanner key={i} {...a} />)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-6xl mx-auto px-4 pb-20 relative z-10">
        {/* Back */}
        <button onClick={onBack} className="flex items-center gap-2 text-stone-400 hover:text-[#84cc16] font-bold mb-5 transition-colors text-xs group">
          <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back to Crop Hub
        </button>

        {/* ─── HERO ─── */}
        <div className="relative rounded-[2rem] overflow-hidden mb-8 bg-gradient-to-br from-stone-900 via-stone-950 to-black border border-white/[0.08] group">
          {/* Background image */}
          <div className="absolute inset-0">
            <img src={crop.image} alt={crop.name}
              className="w-full h-full object-cover opacity-20 group-hover:opacity-30 transition-opacity duration-700"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0c0a09] via-[#0c0a09]/80 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0c0a09] via-transparent to-transparent" />
          </div>
          <ParticleBg count={8} />
          <div className="absolute top-4 right-4 z-10 flex gap-2">
            {envTags.map(t => <EnvTag key={t.label} {...t} />)}
          </div>
          <div className="relative p-8 md:p-10">
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="px-3 py-1 bg-[#84cc16]/20 text-[#84cc16] text-[13px] font-black rounded-lg uppercase tracking-wider border border-[#84cc16]/30">{crop.classification}</span>
              <span className="px-3 py-1 bg-white/10 text-stone-300 text-[13px] font-black rounded-lg uppercase tracking-wider border border-white/10">{crop.season}</span>
              <span className="px-3 py-1 bg-blue-500/10 text-blue-400 text-[13px] font-black rounded-lg uppercase tracking-wider border border-blue-500/20">{crop.regions.split(",")[0].trim()}</span>
            </div>
            <h1 className="font-serif text-5xl md:text-7xl 
font-black text-white mb-2 drop-shadow-[0_2px_12px_rgba(132,204,22,0.12)]">{crop.name}</h1>
            <p className="text-stone-400 italic text-base md:text-lg mb-6">{crop.scientific} — <span className="text-[#84cc16] not-italic">{crop.variety}</span></p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Duration", value: crop.duration, icon: Clock, color: "text-[#84cc16]" },
                { label: "MSP", value: crop.msp, icon: TrendingUp, color: "text-yellow-400" },
                { label: "Avg Yield", value: crop.avgYield, icon: Target, color: "text-green-400" },
                { label: "Water Need", value: crop.waterReq.split(" ")[0], icon: Droplets, color: "text-blue-400" },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-4 text-center hover:border-white/20 transition-all">
                  <Icon size={16} className={`mx-auto mb-1.5 ${color}`} />
                  <div className="text-[13px] text-stone-500 uppercase tracking-wider font-medium">{label}</div>
                  <div className="text-sm font-black text-white mt-0.5">{value}</div>
                </div>
              ))}
            </div>

            {/* Score ring */}
            <div className="absolute top-6 right-6 md:right-10 flex flex-col items-center">
              <ProgressRing progress={envScore.score} size={72} strokeWidth={5} label="Suitability" />
            </div>
          </div>
        </div>

        {/* ─── TABS ─── */}
        <div className="flex overflow-x-auto gap-1 mb-6 pb-2 scrollbar-hide">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl text-[13px] font-bold uppercase tracking-wider transition-all whitespace-nowrap flex-shrink-0 border ${activeTab === id
                  ? 'bg-[#84cc16]/15 text-[#84cc16] border-[#84cc16]/30 shadow-[0_0_15px_rgba(132,204,22,0.08)]'
                  : 'bg-white/[0.03] text-stone-400 border-white/[0.06] hover:border-white/20 hover:text-stone-300'
                }`}
            >
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>

        {/* ═══════════════ TAB CONTENT ═══════════════ */}
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>

            {/* ─── OVERVIEW ─── */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { label: "Water Requirement", value: crop.waterReq, icon: Droplets, color: "text-blue-400" },
                    { label: "Irrigation Type", value: crop.irrigationType, icon: Droplet, color: "text-cyan-400" },
                    { label: "Ideal Soil", value: crop.idealSoil, icon: Layers, color: "text-amber-400" },
                    { label: "pH Range", value: crop.idealPh, icon: Dna, color: "text-green-400" },
                    { label: "Temperature Range", value: crop.tempRange, icon: Thermometer, color: "text-orange-400" },
                    { label: "Humidity Suitability", value: crop.humiditySuit, icon: Droplets, color: "text-blue-400" },
                    { label: "Rainfall Requirement", value: crop.rainfallReq, icon: CloudRain, color: "text-cyan-400" },
                    { label: "Karnataka Regions", value: crop.regions, icon: MapPin, color: "text-[#84cc16]" },
                    { label: "Multi-Cropping", value: crop.multipleCropping, icon: RefreshCw, color: "text-yellow-400" },
                  ].map((it, i) => (
                    <AnimatedCard key={it.label} delay={i * 0.04} glow>
                      <div className="flex items-start gap-3">
                        <div className={`p-2.5 rounded-xl bg-white/5 ${it.color}`}><it.icon size={18} /></div>
                        <div>
                          <div className="text-[13px] text-stone-500 uppercase tracking-wider font-medium">{it.label}</div>
                          <div className="text-sm font-bold text-white mt-0.5 leading-relaxed">{it.value}</div>
                        </div>
                      </div>
                    </AnimatedCard>
                  ))}
                </div>

                {/* Environmental Suitability */}
                <AnimatedCard glow>
                  <h3 className="text-xs font-bold text-stone-300 uppercase tracking-wider mb-4 flex items-center gap-2"><Gauge size={14} className="text-[#84cc16]" /> Environmental Suitability</h3>
                  <div className="flex flex-col md:flex-row items-start gap-6">
                    <div className="flex-shrink-0 text-center mx-auto md:mx-0">
                      <ProgressRing progress={envScore.score} size={100} strokeWidth={8} />
                      <div className="text-lg font-black text-white mt-2">{envScore.label}</div>
                    </div>
                    <div className="flex-1 space-y-2 w-full">
                      {envScore.reasons.map((r, i) => (
                        <div key={i} className={`p-3 rounded-xl text-[13px] flex items-start gap-2 leading-relaxed ${r.type === "positive" ? "bg-green-500/10 text-green-300 border border-green-500/20" :
                            r.type === "warning" ? "bg-yellow-500/10 text-yellow-300 border border-yellow-500/20" :
                              "bg-stone-800 text-stone-400 border border-white/10"
                          }`}>
                          <span className="text-base flex-shrink-0">{r.icon}</span>
                          <span>{r.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </AnimatedCard>

                {/* Disease Quick Ref */}
                <AnimatedCard>
                  <h3 className="text-xs font-bold text-stone-300 uppercase tracking-wider mb-4 flex items-center gap-2"><ShieldAlert size={14} className="text-[#84cc16]" /> Key Disease Prevention</h3>
                  <div className="grid md:grid-cols-2 gap-3">
                    {(crop.diseaseRules || []).slice(0, 4).map((d, i) => (
                      <div key={i} className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-4 hover:border-white/20 transition-all">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-bold text-white">{d.disease}</span>
                          <span className={`text-[13px] px-2 py-0.5 rounded font-black uppercase border ${d.severity === "Severe" ? "bg-red-500/20 text-red-400 border-red-500/30" :
                              d.severity === "High" ? "bg-orange-500/20 text-orange-400 border-orange-500/30" :
                                "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                            }`}>{d.severity}</span>
                        </div>
                        <p className="text-[13px] text-stone-400 mb-1 leading-relaxed">{d.prevention}</p>
                        <p className="text-[13px] text-[#84cc16] leading-relaxed">{d.action}</p>
                      </div>
                    ))}
                  </div>
                </AnimatedCard>
              </div>
            )}

            {/* ─── LIFECYCLE ─── */}
            {activeTab === "lifecycle" && (
              <div className="space-y-6">
                <AnimatedCard>
                  <h3 className="text-xs font-bold text-stone-300 uppercase tracking-wider mb-6 flex items-center gap-2"><Layers size={14} className="text-[#84cc16]" /> Crop Lifecycle Timeline</h3>
                  <div className="relative">
                    <div className="absolute left-[18px] top-0 bottom-0 w-[3px] bg-gradient-to-b from-[#84cc16] via-[#84cc16]/40 to-white/5 rounded-full" />
                    <div className="space-y-6">
                      {(crop.lifecycle || []).map((stage, i) => {
                        const isActive = tp && tp.activeIdx === i;
                        const isPast = tp && tp.activeIdx > i;
                        return (
                          <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                            className={`relative pl-14 ${isActive ? "scale-[1.01]" : ""}`}
                          >
                            {/* Timeline node */}
                            <div className={`absolute left-[10px] w-[18px] h-[18px] rounded-full border-[3px] flex items-center justify-center transition-all duration-500 ${isActive
                                ? "bg-[#84cc16] border-[#84cc16] shadow-[0_0_20px_rgba(132,204,22,0.6)] animate-pulse"
                                : isPast
                                  ? "bg-green-500 border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]"
                                  : "bg-stone-800 border-stone-600"
                              }`}>
                              {isActive && <div className="absolute inset-0 rounded-full animate-ping bg-[#84cc16]/40" />}
                              {isPast && <CheckCircle size={8} className="text-white" />}
                            </div>

                            {/* Content */}
                            <div className={`p-5 rounded-xl transition-all duration-500 ${isActive
                                ? "bg-[#84cc16]/10 border border-[#84cc16]/30 shadow-[0_0_30px_rgba(132,204,22,0.1)]"
                                : isPast
                                  ? "bg-white/[0.03] border border-white/10"
                                  : "bg-white/[0.02] border border-white/[0.06]"
                              }`}>
                              <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                                <div>
                                  <h4 className="text-base font-bold text-white flex items-center gap-2">
                                    {stage.stage}
                                    {isActive && (
                                      <span className="flex items-center gap-1.5 px-2.5 py-0.5 bg-[#84cc16] text-[#0c0a09] text-[13px] font-black rounded-full uppercase tracking-wider shadow-[0_0_10px_rgba(132,204,22,0.4)]">
                                        <Activity size={10} /> Currently Active
                                      </span>
                                    )}
                                    {isPast && <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-[13px] font-black rounded-full uppercase tracking-wider border border-green-500/30">Complete ✓</span>}
                                  </h4>
                                  <div className="flex items-center gap-3 mt-1">
                                    <span className="text-[13px] text-stone-500 font-medium">Duration: {stage.duration}</span>
                                    {isActive && tp && (
                                      <>
                                        <span className="text-[13px] text-[#84cc16] font-bold">•</span>
                                        <span className="text-[13px] text-[#84cc16] font-bold">Day {tp.daysInStage + 1} of {tp.stageTotal}</span>
                                        <span className="text-[13px] text-[#84cc16] font-bold">•</span>
                                        <span className="text-[13px] text-yellow-400">{tp.stagePct}% complete</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                                <span className="text-[13px] text-stone-600 bg-white/5 px-2.5 py-1 rounded-lg">Stage {i + 1}/{crop.lifecycle.length}</span>
                              </div>

                              {/* Stage detail grid */}
                              <div className="grid md:grid-cols-2 gap-2.5 mt-3">
                                <div className="bg-white/[0.03] rounded-lg p-3 border border-white/[0.04]">
                                  <div className="text-[13px] text-blue-400 uppercase tracking-wider mb-1.5 font-bold flex items-center gap-1.5"><Droplets size={10} /> Irrigation</div>
                                  <p className="text-[13px] text-stone-300 leading-relaxed">{stage.irrigation}</p>
                                </div>
                                <div className="bg-white/[0.03] rounded-lg p-3 border border-white/[0.04]">
                                  <div className="text-[13px] text-[#84cc16] uppercase tracking-wider mb-1.5 font-bold flex items-center gap-1.5"><Leaf size={10} /> Nutrition</div>
                                  <p className="text-[13px] text-stone-300 leading-relaxed">{stage.nutrient}</p>
                                </div>
                                <div className="bg-white/[0.03] rounded-lg p-3 border border-white/[0.04]">
                                  <div className="text-[13px] text-red-400 uppercase tracking-wider mb-1.5 font-bold flex items-center gap-1.5"><ShieldAlert size={10} /> Disease Prevention</div>
                                  <p className="text-[13px] text-stone-300 leading-relaxed">{stage.disease}</p>
                                </div>
                                <div className="bg-white/[0.03] rounded-lg p-3 border border-white/[0.04]">
                                  <div className="text-[13px] text-yellow-400 uppercase tracking-wider mb-1.5 font-bold flex items-center gap-1.5"><Tractor size={10} /> Farmer Actions</div>
                                  <p className="text-[13px] text-stone-300 leading-relaxed">{stage.actions}</p>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                </AnimatedCard>
              </div>
            )}

            {/* ─── TRACKING ─── */}
            {activeTab === "tracking" && (
              <div className="space-y-6">
                {!tracking ? (
                  showTrackingForm ? (
                    <AnimatedCard>
                      <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><Activity size={14} className="text-[#84cc16]" /> Start New Tracking Session</h3>
                      <form onSubmit={handleStartTracking} className="space-y-4">
                        <div>
                          <label className="text-[13px] font-bold text-stone-400 uppercase tracking-wider block mb-1.5">Cultivation Start Date</label>
                          <input type="date" required value={trackForm.startDate} onChange={e => setTrackForm(p => ({ ...p, startDate: e.target.value }))}
                            className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3.5 text-white text-sm outline-none focus:border-[#84cc16] focus:shadow-[0_0_15px_rgba(132,204,22,0.06)] transition-all" />
                        </div>
                        <div>
                          <label className="text-[13px] font-bold text-stone-400 uppercase tracking-wider block mb-1.5">Farm Location / Village (optional)</label>
                          <input type="text" placeholder="e.g., Mandya, Karnataka" value={trackForm.farmLocation} onChange={e => setTrackForm(p => ({ ...p, farmLocation: e.target.value }))}
                            className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3.5 text-white text-sm outline-none focus:border-[#84cc16] transition-all" />
                        </div>
                        <div className="flex gap-3">
                          <button type="submit" className="flex-1 py-4 bg-[#84cc16] text-[#0c0a09] font-black text-sm uppercase tracking-widest rounded-xl hover:bg-[#facc15] transition-all shadow-lg flex items-center justify-center gap-2">
                            <Play size={16} /> Start Tracking
                          </button>
                          <button type="button" onClick={() => setShowTrackingForm(false)} className="px-6 py-4 bg-white/5 text-stone-400 font-bold text-sm rounded-xl border border-white/10 hover:bg-white/10 transition-all">Cancel</button>
                        </div>
                      </form>
                    </AnimatedCard>
                  ) : (
                    <AnimatedCard className="text-center py-16">
                      <Activity size={48} className="mx-auto mb-4 text-[#84cc16] opacity-40" />
                      <h3 className="text-xl font-bold text-white mb-2">Start Crop Tracking</h3>
                      <p className="text-stone-400 text-sm mb-8 max-w-md mx-auto leading-relaxed">
                        Track your <span className="text-[#84cc16] font-bold">{crop.name}</span> cultivation day-by-day. Get AI-powered daily guidance, disease warnings, and harvest alerts.
                      </p>
                      <button onClick={() => setShowTrackingForm(true)}
                        className="px-10 py-5 bg-[#84cc16] text-[#0c0a09] font-black text-sm uppercase tracking-widest rounded-xl hover:bg-[#facc15] transition-all shadow-lg flex items-center gap-2 mx-auto">
                        <Play size={18} /> Start Tracking {crop.name}
                      </button>
                    </AnimatedCard>
                  )
                ) : tp ? (
                  <>
                    {/* Dashboard KPIs */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      {[
                        { label: "Day", value: `${tp.daysElapsed}/${tp.totalDays}`, icon: Clock, color: "text-[#84cc16]" },
                        { label: "Active Stage", value: tp.activeStage.stage, icon: Layers, color: "text-blue-400" },
                        { label: "Stage Progress", value: `${tp.stagePct}%`, icon: Activity, color: "text-green-400" },
                        { label: "Days to Harvest", value: `${tp.daysLeft} days`, icon: Calendar, color: "text-yellow-400" },
                        { label: "Harvest By", value: tp.harvestDate.toLocaleDateString(), icon: Target, color: "text-orange-400" },
                      ].map(({ label, value, icon: Icon, color }) => (
                        <div key={label} className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-4 text-center hover:border-white/20 transition-all">
                          <Icon size={15} className={`mx-auto mb-1.5 ${color}`} />
                          <div className="text-[13px] text-stone-500 uppercase tracking-wider font-medium">{label}</div>
                          <div className="text-sm font-black text-white mt-0.5">{value}</div>
                        </div>
                      ))}
                    </div>

                    {/* Stage Timeline Bar */}
                    <AnimatedCard>
                      <h3 className="text-xs font-bold text-stone-300 uppercase tracking-wider mb-4">Growth Progress</h3>
                      <div className="flex flex-wrap items-center gap-4 mb-4">
                        <div className="text-center flex-shrink-0 mx-auto md:mx-0">
                          <ProgressRing progress={tp.pct} size={85} strokeWidth={6} />
                          <div className="text-xs text-stone-400 mt-1">{tp.pct}% of total cycle</div>
                        </div>
                        <div className="flex-1 w-full md:w-auto space-y-4">
                          <div>
                            <div className="flex justify-between text-[13px] text-stone-500 mb-1.5">
                              <span className="font-bold text-[#84cc16]">Active: {tp.activeStage.stage}</span>
                              <span>Next: {tp.nextStage ? tp.nextStage.stage : "Harvest"}</span>
                            </div>
                            <div className="w-full bg-white/5 rounded-full h-3 overflow-hidden shadow-inner">
                              <motion.div initial={{ width: 0 }} animate={{ width: `${tp.pct}%` }}
                                className="h-full rounded-full bg-gradient-to-r from-[#84cc16] to-green-400 shadow-[0_0_10px_rgba(132,204,22,0.3)] transition-all duration-700" />
                            </div>
                          </div>
                          <div className="flex gap-1.5 mt-3">
                            {(crop.lifecycle || []).map((s, i) => {
                              const isAct = i === tp.activeIdx;
                              const isPast = i < tp.activeIdx;
                              return (
                                <div key={i} className="flex-1 text-center">
                                  <div className={`h-2 rounded-full mb-1.5 transition-all duration-500 ${isAct ? "bg-[#84cc16] shadow-[0_0_10px_rgba(132,204,22,0.6)]" :
                                      isPast ? "bg-green-500/60" : "bg-white/10"
                                    }`} />
                                  <div className={`text-[6px] uppercase tracking-wider leading-tight ${isAct ? "text-[#84cc16] font-bold" : "text-stone-600"}`}>
                                    {s.stage.split(" ")[0]}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </AnimatedCard>

                    {/* ════════════════════════════════════════════
                        TODAY'S GUIDANCE — Farmer-Friendly Active Stage
                    ════════════════════════════════════════════ */}
                    <AnimatedCard glow>
                      <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                        <Zap size={16} className="text-[#84cc16]" />
                        Today's Crop Guidance
                        <span className="text-[13px] text-stone-500 font-medium normal-case ml-auto">
                          {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" })}
                        </span>
                      </h3>

                      {/* Current Stage Highlight */}
                      <div className="p-5 rounded-xl bg-gradient-to-r from-[#84cc16]/15 to-[#84cc16]/5 border border-[#84cc16]/30 mb-4 shadow-[0_0_20px_rgba(132,204,22,0.05)]">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-3 h-3 bg-[#84cc16] rounded-full animate-ping absolute opacity-50" />
                          <div className="w-3 h-3 bg-[#84cc16] rounded-full relative" />
                          <div>
                            <div className="text-[13px] text-[#84cc16] uppercase tracking-wider font-bold">Current Stage</div>
                            <h4 className="text-xl font-black text-white">{tp.activeStage.stage} <span className="text-sm font-bold text-[#84cc16]">• Day {tp.daysInStage + 1}/{tp.stageTotal}</span></h4>
                          </div>
                        </div>

                        {/* Stage progress bar */}
                        <div className="mb-4">
                          <div className="flex justify-between text-[13px] text-stone-500 mb-1">
                            <span>Stage {tp.activeIdx + 1} of {crop.lifecycle.length}</span>
                            <span>{tp.stagePct}%</span>
                          </div>
                          <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden shadow-inner">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${tp.stagePct}%` }}
                              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-[#84cc16] shadow-[0_0_10px_rgba(132,204,22,0.3)]" />
                          </div>
                        </div>

                        {/* What to do TODAY */}
                        <div className="grid md:grid-cols-2 gap-3 mb-3">
                          <div className="bg-white/[0.05] rounded-xl p-4 border border-white/[0.06]">
                            <div className="text-[13px] text-blue-400 uppercase tracking-wider font-bold mb-2 flex items-center gap-1.5"><Droplets size={12} /> Irrigation Today</div>
                            <p className="text-[14px] text-stone-200 leading-relaxed">{tp.activeStage.irrigation}</p>
                          </div>
                          <div className="bg-white/[0.05] rounded-xl p-4 border border-white/[0.06]">
                            <div className="text-[13px] text-[#84cc16] uppercase tracking-wider font-bold mb-2 flex items-center gap-1.5"><Leaf size={12} /> Nutrient Today</div>
                            <p className="text-[14px] text-stone-200 leading-relaxed">{tp.activeStage.nutrient}</p>
                          </div>
                        </div>
                        <div className="grid md:grid-cols-2 gap-3">
                          <div className="bg-white/[0.05] rounded-xl p-4 border border-white/[0.06]">
                            <div className="text-[13px] text-red-400 uppercase tracking-wider font-bold mb-2 flex items-center gap-1.5"><ShieldAlert size={12} /> Disease Watch</div>
                            <p className="text-[14px] text-stone-200 leading-relaxed">{tp.activeStage.disease}</p>
                          </div>
                          <div className="bg-white/[0.05] rounded-xl p-4 border border-white/[0.06]">
                            <div className="text-[13px] text-yellow-400 uppercase tracking-wider font-bold mb-2 flex items-center gap-1.5"><Tractor size={12} /> Recommended Actions</div>
                            <p className="text-[14px] text-stone-200 leading-relaxed">{tp.activeStage.actions}</p>
                          </div>
                        </div>
                      </div>

                      {/* Next Stage Preview */}
                      {tp.nextStage && (
                        <div className="mb-4 p-4 rounded-xl bg-white/[0.03] border border-white/[0.08]">
                          <div className="text-[13px] text-stone-500 uppercase tracking-wider font-bold mb-1.5 flex items-center gap-1.5"><SkipForward size={11} /> Upcoming: {tp.nextStage.stage}</div>
                          <p className="text-[13px] text-stone-400 leading-relaxed">{tp.nextStage.actions}</p>
                        </div>
                      )}

                      {/* AI Guidance Tips */}
                      {guidanceTips.length > 0 && (
                        <div>
                          <div className="text-[13px] text-[#84cc16] uppercase tracking-wider font-bold mb-3 flex items-center gap-1.5"><Lightbulb size={12} /> Intelligent Recommendations</div>
                          <div className="grid md:grid-cols-2 gap-2">
                            {guidanceTips.map((tip, i) => {
                              const borderColor = tip.type === "warning" ? "border-red-500/25 bg-red-500/8" :
                                tip.type === "nutrient" ? "border-[#84cc16]/25 bg-[#84cc16]/8" :
                                  tip.type === "irrigation" ? "border-blue-500/25 bg-blue-500/8" :
                                    tip.type === "mistake" ? "border-orange-500/25 bg-orange-500/8" :
                                      "border-white/10 bg-white/[0.03]";
                              const textColor = tip.type === "warning" ? "text-red-300" :
                                tip.type === "nutrient" ? "text-[#84cc16]" :
                                  tip.type === "irrigation" ? "text-blue-300" :
                                    tip.type === "mistake" ? "text-orange-300" :
                                      "text-stone-300";
                              return (
                                <div key={i} className={`flex items-start gap-2.5 p-3 rounded-xl border ${borderColor} ${textColor}`}>
                                  <span className="text-base flex-shrink-0">{tip.icon}</span>
                                  <span className="text-[13px] leading-relaxed">{tip.text}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Weather Impact */}
                      {weatherData && (
                        <div className="mt-4 p-4 rounded-xl bg-blue-500/5 border border-blue-500/20">
                          <div className="text-[13px] text-blue-400 uppercase tracking-wider font-bold mb-2 flex items-center gap-1.5"><Cloud size={12} /> Weather Impact on {tp.activeStage.stage}</div>
                          <div className="text-[13px] text-blue-200 leading-relaxed">
                            Current conditions: {weatherData.temperature}°C, {weatherData.humidity}% humidity, {weatherData.rainfall}mm rainfall.
                            {weatherData.humidity > 70 ? " High humidity increases disease risk during this stage." : ""}
                            {weatherData.temperature > 35 ? " High temperatures may cause heat stress." : ""}
                            {weatherData.rainfall > 20 ? " Recent rains provide moisture but watch for waterlogging." : ""}
                          </div>
                        </div>
                      )}
                    </AnimatedCard>

                    {/* Reset */}
                    <button onClick={() => { setTracking(null); setShowTrackingForm(false); }}
                      className="text-[13px] text-stone-600 hover:text-red-400 transition-colors flex items-center gap-1.5 mx-auto mt-2">
                      <RefreshCw size={12} /> Reset Crop Tracking
                    </button>
                  </>
                ) : null}
              </div>
            )}

            {/* ─── DISEASE FORECAST CENTER ─── */}
            {activeTab === "disease" && (
              <div className="space-y-6">

                {/* Current Conditions Summary */}
                <AnimatedCard>
                  <h3 className="text-xs font-bold text-stone-300 uppercase tracking-wider mb-4 flex items-center gap-2"><ShieldAlert size={14} className="text-[#84cc16]" /> Disease Forecast Center</h3>
                  {locationName && weatherData ? (
                    <div className="text-[13px] text-stone-400 mb-4 leading-relaxed">
                      Analyzing <span className="text-white font-bold">{crop.name}</span> disease risk for <span className="text-[#84cc16]">{locationName}</span> using current conditions and 7-day forecast. Current: {weatherData.temperature}°C, {weatherData.humidity}% humidity.
                    </div>
                  ) : null}

                  {!weatherData ? (
                    <div className="text-center py-12 text-stone-500">
                      <Globe size={40} className="mx-auto mb-3 opacity-30" />
                      <p className="text-sm mb-1">No weather data available</p>
                      <p className="text-[13px] text-stone-600">Use the Environment tab or location bar above to detect weather data.</p>
                    </div>
                  ) : (
                    <>
                      {/* Risk Cards */}
                      <div className="space-y-4">
                        {diseaseRisks.length > 0 ? diseaseRisks.map((d, i) => {
                          const riskColor = d.level === "High" ? "border-red-500/40 bg-red-500/8" : d.level === "Moderate" ? "border-yellow-500/40 bg-yellow-500/8" : "border-blue-500/40 bg-blue-500/8";
                          const riskTextColor = d.level === "High" ? "text-red-400" : d.level === "Moderate" ? "text-yellow-400" : "text-blue-400";
                          const barColor = d.level === "High" ? "from-red-500 to-orange-400" : d.level === "Moderate" ? "from-yellow-400 to-orange-400" : "from-blue-400 to-cyan-400";
                          return (
                            <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                              className={`p-5 rounded-xl border ${riskColor} transition-all hover:shadow-lg`}
                            >
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h4 className="text-base font-bold text-white">{d.disease}</h4>
                                    <span className={`px-2.5 py-0.5 text-[13px] font-black rounded-full uppercase tracking-wider border ${riskTextColor} bg-black/40`}>{d.level}</span>
                                  </div>
                                  <div className="flex flex-wrap gap-3 text-[13px] text-stone-500 mt-1">
                                    <span className="flex items-center gap-1"><Clock size={10} /> Risk window: <span className="text-white font-bold">{d.window}</span></span>
                                    <span className="flex items-center gap-1"><ShieldAlert size={10} /> Severity: <span className={d.severity === "Severe" ? "text-red-400 font-bold" : "text-orange-400 font-bold"}>{d.severity}</span></span>
                                  </div>
                                </div>
                                <div className="flex-shrink-0 text-center ml-4">
                                  <div className="text-2xl font-black text-white">{d.score}<span className="text-xs text-stone-500">%</span></div>
                                  <div className="text-[13px] text-stone-500 uppercase tracking-wider">Probability</div>
                                </div>
                              </div>

                              <div className="mb-3">
                                <div className="w-full bg-white/5 rounded-full h-2.5 overflow-hidden shadow-inner">
                                  <motion.div initial={{ width: 0 }} animate={{ width: `${d.score}%` }}
                                    className={`h-full rounded-full bg-gradient-to-r ${barColor} shadow-[0_0_8px_rgba(255,100,50,0.2)]`}
                                    transition={{ duration: 1, delay: i * 0.1 }}
                                  />
                                </div>
                              </div>

                              <div className="grid md:grid-cols-2 gap-2.5">
                                <div className="bg-green-500/10 rounded-xl p-3 border border-green-500/20">
                                  <div className="text-[13px] text-green-400 uppercase tracking-wider font-bold mb-1.5">Prevention</div>
                                  <p className="text-[13px] text-green-200 leading-relaxed">{d.prevention}</p>
                                </div>
                                <div className="bg-blue-500/10 rounded-xl p-3 border border-blue-500/20">
                                  <div className="text-[13px] text-blue-400 uppercase tracking-wider font-bold mb-1.5">Recommended Action</div>
                                  <p className="text-[13px] text-blue-200 leading-relaxed">{d.action}</p>
                                </div>
                              </div>
                            </motion.div>
                          );
                        }) : (
                          <div className="text-center py-8 text-stone-500 border border-white/10 rounded-xl bg-white/[0.02]">
                            <ShieldAlert size={36} className="mx-auto mb-3 opacity-30" />
                            <p className="text-sm text-stone-400 mb-1">No significant disease risks predicted</p>
                            <p className="text-[13px] text-stone-600">Current environmental conditions do not favor major disease outbreaks for {crop.name}.</p>
                          </div>
                        )}
                      </div>

                      {/* 7-Day Risk Timeline Chart */}
                      {diseaseRisks.length > 0 && (
                        <AnimatedCard>
                          <h3 className="text-[13px] font-bold text-stone-400 uppercase tracking-wider mb-4 flex items-center gap-2"><TrendingUp size={13} className="text-[#84cc16]" /> 7-Day Risk Outlook</h3>
                          {forecastData && forecastData.length > 0 ? (
                            <div className="h-48">
                              <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={forecastData.map((d, i) => ({
                                  day: new Date(d.date).toLocaleDateString("en-IN", { weekday: "short" }),
                                  humidity: d.humidity_avg || 0,
                                  temperature: d.temp_avg || 0,
                                  rainfall: d.rainfall_total || 0,
                                  // Calculate composite risk from all diseases
                                  risk: Math.min(100, diseaseRisks.reduce((s, r) => s + (r.score * Math.max(0, 3 - Math.abs(i - r.worstDay))) / 3, 0))
                                }))}>
                                  <defs>
                                    <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="0%" stopColor="#ef4444" stopOpacity={0.6} />
                                      <stop offset="100%" stopColor="#ef4444" stopOpacity={0.05} />
                                    </linearGradient>
                                    <linearGradient id="humidGrad" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.05} />
                                    </linearGradient>
                                  </defs>
                                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                  <XAxis dataKey="day" stroke="#666" tick={{ fontSize: 10 }} />
                                  <YAxis stroke="#555" tick={{ fontSize: 9 }} domain={[0, 100]} />
                                  <Tooltip contentStyle={{ backgroundColor: "rgba(12,10,9,0.9)", border: "1px solid rgba(132,204,22,0.3)", borderRadius: "8px", fontSize: "11px" }} />
                                  <Area type="monotone" dataKey="risk" name="Disease Risk" stroke="#ef4444" strokeWidth={2} fill="url(#riskGrad)" fillOpacity={1} />
                                  <Area type="monotone" dataKey="humidity" name="Humidity %" stroke="#3b82f6" strokeWidth={1.5} fill="url(#humidGrad)" fillOpacity={0.5} strokeDasharray="4 2" />
                                </AreaChart>
                              </ResponsiveContainer>
                            </div>
                          ) : (
                            <p className="text-[13px] text-stone-500 text-center py-4">Forecast data not available for timeline chart.</p>
                          )}
                          <div className="flex flex-wrap gap-4 mt-3 text-[13px] text-stone-600">
                            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-red-500 rounded" /> Disease Risk</span>
                            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-blue-500 rounded" /> Humidity</span>
                          </div>
                        </AnimatedCard>
                      )}

                      {/* Disease Knowledge Base */}
                      <AnimatedCard>
                        <h3 className="text-[13px] font-bold text-stone-300 uppercase tracking-wider mb-4 flex items-center gap-2"><Info size={13} className="text-[#84cc16]" /> Disease Knowledge Base — {crop.name}</h3>
                        <div className="space-y-2 max-h-72 overflow-y-auto pr-1 scrollbar-hide">
                          {(crop.diseaseRules || []).map((d, i) => (
                            <div key={i} className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4 hover:border-white/20 transition-all">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-bold text-white">{d.disease}</span>
                                <span className={`text-[13px] px-2 py-0.5 rounded font-black uppercase border ${d.severity === "Severe" ? "bg-red-500/20 text-red-400 border-red-500/30" :
                                    d.severity === "High" ? "bg-orange-500/20 text-orange-400 border-orange-500/30" :
                                      "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                                  }`}>{d.severity}</span>
                              </div>
                              <div className="grid grid-cols-3 gap-3 text-[13px] text-stone-500 mb-2">
                                <span className="flex items-center gap-1"><Thermometer size={10} className="text-orange-400" /> {d.tempMin}°C–{d.tempMax}°C</span>
                                <span className="flex items-center gap-1"><Droplets size={10} className="text-blue-400" /> {d.humidity}%+ RH</span>
                                <span className="flex items-center gap-1"><CloudRain size={10} className="text-cyan-400" /> {d.rainfallMin}mm+</span>
                              </div>
                              <p className="text-[13px] text-stone-400 leading-relaxed">{d.prevention}</p>
                            </div>
                          ))}
                        </div>
                      </AnimatedCard>
                    </>
                  )}
                </AnimatedCard>
              </div>
            )}

            {/* ─── ENVIRONMENT ─── */}
            {activeTab === "environment" && (
              <div className="space-y-6">

                <AnimatedCard>
                  <h3 className="text-xs font-bold text-stone-300 uppercase tracking-wider mb-4 flex items-center gap-2"><Globe size={14} className="text-[#84cc16]" /> Environmental Intelligence</h3>

                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    <button onClick={autoDetectLocation} disabled={mode === "detecting"}
                      className="px-5 py-2.5 bg-[#84cc16]/20 text-[#84cc16] border border-[#84cc16]/30 rounded-xl text-[13px] font-bold flex items-center gap-2 hover:bg-[#84cc16]/30 transition-all disabled:opacity-50">
                      {mode === "detecting" ? <Loader2 size={13} className="animate-spin" /> : <Crosshair size={13} />}
                      {mode === "detecting" ? "Detecting..." : "Auto-Detect"}
                    </button>
                    <div className="flex items-center gap-1.5 flex-1 min-w-[200px]">
                      <input value={manualCityLocal || manualCity} onChange={e => setManualCityLocal(e.target.value)}
                        placeholder="Enter city name (e.g. Bengaluru)..."
                        className="flex-1 bg-black/60 border border-white/10 rounded-xl px-3.5 py-2.5 text-[13px] text-white outline-none focus:border-[#84cc16] placeholder:text-stone-600"
                        onKeyDown={e => e.key === "Enter" && manualDetect()}
                      />
                      <button onClick={manualDetect} disabled={!manualCityLocal.trim()}
                        className="px-4 py-2.5 bg-white/5 text-stone-400 rounded-xl border border-white/10 text-[13px] font-bold hover:bg-white/10 hover:text-white transition-all disabled:opacity-30 flex items-center gap-1.5">
                        <Search size={12} /> Go
                      </button>
                    </div>
                  </div>

                  {envError && <div className="p-3 bg-red-500/10 border border-red-500/25 rounded-xl text-red-400 text-[13px] flex items-center gap-2 mb-4"><AlertTriangle size={14} />{envError}</div>}

                  <div className="flex flex-wrap gap-2 mb-4">
                    <StatusBadge st={envStatuses.location} label="📍 Location" msgs={envMsgs.location} />
                    <StatusBadge st={envStatuses.weather} label="🌤 Weather" msgs={envMsgs.weather} />
                    <StatusBadge st={envStatuses.soil} label="🌱 Soil" msgs={envMsgs.soil} />
                  </div>
                </AnimatedCard>

                {/* Weather Cards */}
                {weatherData && (
                  <AnimatedCard>
                    <h3 className="text-xs font-bold text-stone-300 uppercase tracking-wider mb-3 flex items-center gap-2"><Thermometer size={14} className="text-[#84cc16]" /> Current Weather</h3>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                      {[
                        { icon: Thermometer, label: "Temperature", value: `${weatherData.temperature}°C`, color: "text-orange-400" },
                        { icon: Droplets, label: "Humidity", value: `${weatherData.humidity}%`, color: "text-blue-400" },
                        { icon: CloudRain, label: "Rainfall", value: `${weatherData.rainfall}mm`, color: "text-cyan-400" },
                        { icon: Wind, label: "Wind", value: `${weatherData.wind_speed || 0} km/h`, color: "text-stone-400" },
                        { icon: Sun, label: "Condition", value: weatherData.condition || "Clear", color: "text-[#84cc16]" },
                      ].map(({ icon: Icon, label, value, color }) => (
                        <div key={label} className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-3.5 text-center hover:border-white/20 transition-all">
                          <Icon size={16} className={`mx-auto mb-1.5 ${color}`} />
                          <div className="text-[13px] text-stone-500 uppercase tracking-wider font-medium">{label}</div>
                          <div className="text-sm font-black text-white mt-0.5">{value}</div>
                        </div>
                      ))}
                    </div>

                    {/* 7-Day Forecast */}
                    {forecastData && forecastData.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-white/[0.06]">
                        <h4 className="text-[13px] text-stone-500 uppercase tracking-wider font-bold mb-3 flex items-center gap-1.5"><Calendar size={11} /> 7-Day Forecast</h4>
                        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                          {forecastData.map((d, i) => (
                            <div key={i} className="flex-shrink-0 w-20 bg-white/[0.03] border border-white/[0.06] rounded-xl p-2.5 text-center">
                              <div className="text-[13px] text-stone-500 font-bold">{new Date(d.date).toLocaleDateString("en-IN", { weekday: "short" })}</div>
                              <div className="text-xs font-black text-white mt-1">{Math.round(d.temp_avg || d.temp || 0)}°</div>
                              <div className="text-[13px] text-stone-600 uppercase">{d.condition?.substring(0, 8)}</div>
                              <div className="flex items-center justify-center gap-1 mt-1">
                                <Droplets size={7} className="text-blue-400" />
                                <span className="text-[13px] text-stone-500">{d.humidity_avg || 0}%</span>
                              </div>
                              {(d.rainfall_total || 0) > 0 && (
                                <div className="flex items-center justify-center gap-1 mt-0.5">
                                  <CloudRain size={7} className="text-cyan-400" />
                                  <span className="text-[13px] text-stone-500">{d.rainfall_total}mm</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </AnimatedCard>
                )}

                {/* Soil Intelligence */}
                {soilData && (
                  <AnimatedCard>
                    <h3 className="text-xs font-bold text-stone-300 uppercase tracking-wider mb-3 flex items-center gap-2"><Dna size={14} className="text-[#84cc16]" /> Soil Intelligence</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {[
                        { label: "Soil pH", value: soilData.ph != null ? soilData.ph : "N/A", unit: "", color: (soilData.ph >= 5.5 && soilData.ph <= 7) ? "text-green-400" : "text-yellow-400" },
                        { label: "Nitrogen (N)", value: soilData.nitrogen != null ? Math.round(soilData.nitrogen) : "N/A", unit: "mg/kg", color: "text-[#84cc16]" },
                        { label: "Phosphorus (P)", value: soilData.phosphorus != null ? Math.round(soilData.phosphorus) : "N/A", unit: "mg/kg", color: "text-blue-400" },
                        { label: "Potassium (K)", value: soilData.potassium != null ? Math.round(soilData.potassium) : "N/A", unit: "mg/kg", color: "text-orange-400" },
                      ].map(({ label, value, unit, color }) => (
                        <div key={label} className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-3.5 text-center hover:border-white/20 transition-all">
                          <div className="text-[13px] text-stone-500 uppercase tracking-wider font-medium">{label}</div>
                          <div className={`text-sm font-black mt-0.5 ${color}`}>{value}<span className="text-[13px] text-stone-600 ml-0.5">{unit}</span></div>
                        </div>
                      ))}
                    </div>
                    {soilData.source && <p className="text-[13px] text-stone-600 mt-2 italic">{soilData.source}</p>}
                  </AnimatedCard>
                )}

                {/* Water Availability */}
                {waterScore && (
                  <AnimatedCard>
                    <h3 className="text-xs font-bold text-stone-300 uppercase tracking-wider mb-3 flex items-center gap-2"><Droplets size={14} className="text-[#84cc16]" /> Water Availability Index</h3>
                    <div className="p-5 rounded-xl bg-white/[0.04] border border-white/[0.08]">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className={`text-2xl font-black ${waterScore.score >= 60 ? "text-green-400" : waterScore.score >= 30 ? "text-yellow-400" : "text-red-400"}`}>{waterScore.label}</span>
                        </div>
                        <span className="text-3xl font-black text-white">{waterScore.score}<span className="text-base text-stone-500">/100</span></span>
                      </div>
                      <ConfidenceBar val={waterScore.score} size="lg" />
                      <p className="text-[13px] text-stone-500 mt-2 leading-relaxed">
                        Based on rainfall ({weatherData?.rainfall}mm), humidity ({weatherData?.humidity}%), and temperature ({weatherData?.temperature}°C).
                      </p>
                    </div>
                  </AnimatedCard>
                )}

                {/* AI Analysis */}
                {envScore.reasons.length > 0 && (
                  <AnimatedCard>
                    <h3 className="text-xs font-bold text-stone-300 uppercase tracking-wider mb-3 flex items-center gap-2"><Target size={14} className="text-[#84cc16]" /> Environmental Analysis for {crop.name}</h3>
                    <div className="grid md:grid-cols-2 gap-2">
                      {envScore.reasons.map((r, i) => (
                        <div key={i} className={`p-3 rounded-xl text-[13px] flex items-start gap-2 leading-relaxed ${r.type === "positive" ? "bg-green-500/10 text-green-300 border border-green-500/20" : "bg-yellow-500/10 text-yellow-300 border border-yellow-500/20"
                          }`}>
                          <span>{r.icon}</span>
                          <span>{r.text}</span>
                        </div>
                      ))}
                    </div>
                  </AnimatedCard>
                )}
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default CropIntelligenceHub;
