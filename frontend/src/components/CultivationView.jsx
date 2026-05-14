import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Sprout, Activity, AlertTriangle, CheckCircle2, ChevronDown, ChevronRight,
    Droplets, Thermometer, Wind, Calendar, Camera, Upload, X, Shield,
    TrendingUp, Leaf, DollarSign, Microscope, ChevronUp, AlertOctagon,
    ArrowRight, Search, ScanLine, ChevronLeft
} from 'lucide-react';
import axios from 'axios';

// Professional Glassmorphism Styles
const GlassCard = ({ children, className = "" }) => (
    <div className={`bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl ${className}`}>
        {children}
    </div>
);

const SectionHeader = ({ icon: Icon, title, subtitle }) => (
    <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 bg-[#84cc16]/10 rounded-xl border border-[#84cc16]/20">
            <Icon className="text-[#84cc16] w-5 h-5" />
        </div>
        <div>
            <h3 className="text-xl font-black text-white font-serif">{title}</h3>
            {subtitle && <p className="text-stone-400 text-xs font-medium uppercase tracking-wider">{subtitle}</p>}
        </div>
    </div>
);

const CultivationView = ({ crop, onClose }) => {
    // --- States ---
    const [activeTab, setActiveTab] = useState('timeline'); // 'timeline', 'diagnostics'
    const [loading, setLoading] = useState(true);
    const [knowledge, setKnowledge] = useState(null);
    const [userState, setUserState] = useState(null);
    const [selectedPhaseIdx, setSelectedPhaseIdx] = useState(0);

    // Toggles
    const [showDiseases, setShowDiseases] = useState(false);
    const [showCures, setShowCures] = useState(false);

    // Diagnostics
    const [scanResult, setScanResult] = useState(null);
    const [analyzing, setAnalyzing] = useState(false);
    const fileInputRef = useRef(null);

    // --- Initial Data Fetch ---
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [knowRes, dashRes] = await Promise.all([
                    axios.get(`http://localhost:5000/api/knowledge/${crop.name}/lifecycle`),
                    axios.get('http://localhost:5000/api/cultivation/dashboard')
                ]);

                setKnowledge(knowRes.data);

                // Only load ACTIVE state if it matches the current crop we are viewing
                if (dashRes.data.active && dashRes.data.user_state.current_crop === crop.name) {
                    setUserState(dashRes.data.user_state);
                    setSelectedPhaseIdx(dashRes.data.user_state.current_phase_index);
                } else {
                    // Otherwise, treat as fresh/view-only mode
                    setUserState(null);
                }

                setLoading(false);
            } catch (err) {
                console.error("Error loading cultivation data:", err);
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // --- Handlers ---
    const handleStartCultivation = async () => {
        try {
            const res = await axios.post('http://localhost:5000/api/cultivation/start', {
                start_date: new Date().toISOString().split('T')[0],
                crop_name: crop.name // Pass dynamic crop name
            });
            setUserState(res.data.state);
            setSelectedPhaseIdx(0);
        } catch (err) {
            alert("Failed to start cultivation");
        }
    };

    const handleUpdatePhase = async (idx) => {
        try {
            const res = await axios.post('http://localhost:5000/api/cultivation/update', {
                action: idx
            });
            setUserState(res.data.state);
            setSelectedPhaseIdx(idx);
        } catch (err) {
            alert("Failed to update phase");
        }
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setAnalyzing(true);
        setActiveTab('diagnostics');

        const formData = new FormData();
        formData.append('image', file);

        try {
            // Updated Endpoint: Analyzes AND Logs to History
            const res = await axios.post('http://localhost:5000/api/cultivation/detect', formData);

            // Backend now returns { analysis: {...}, protocol_match: {...}, newly_learned: boolean }
            if (res.data.analysis) {
                setScanResult(res.data); // Store the full response wrapper

                // Notify user if this was a new discovery
                if (res.data.newly_learned) {
                    alert("New Disease Discovered! \n\nThe system has auto-generated a treatment protocol for this pathogen and added it to the Knowledge Base.");
                }
            } else {
                alert("Could not analyze image.");
            }

        } catch (err) {
            console.error(err);
            alert("Analysis failed. Please try again.");
        } finally {
            setAnalyzing(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-[#0c0a09] flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-[#84cc16] border-t-transparent rounded-full animate-spin"></div>
                <p className="text-[#84cc16] text-xs font-black uppercase tracking-widest">Initializing Core...</p>
            </div>
        </div>
    );

    if (!knowledge) return <div className="text-white">Failed to load Knowledge Core.</div>;

    const phases = knowledge.lifecycle_phases;
    const currentPhase = phases[selectedPhaseIdx];
    const diseases = knowledge.disease_protocols;

    // --- Render Components ---

    return (
        <div className="min-h-screen bg-[#0c0a09] font-sans text-stone-200 selection:bg-[#84cc16]/30">
            <div className="fixed inset-0 pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 z-0"></div>

            {/* Top Navigation Bar */}
            <nav className="fixed top-0 w-full z-50 bg-[#0c0a09]/95 backdrop-blur-md border-b border-white/10 px-6 h-20 flex items-center justify-between shadow-xl">
                <div className="flex items-center gap-6">
                    <button
                        onClick={onClose}
                        className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-[#84cc16] to-[#65a30d] hover:from-[#65a30d] hover:to-[#84cc16] rounded-xl transition-all shadow-lg hover:shadow-[0_0_20px_rgba(132,204,22,0.5)] group transform hover:scale-105"
                    >
                        <ChevronLeft className="w-6 h-6 text-[#0c0a09] transition-transform group-hover:-translate-x-1 font-bold" strokeWidth={3} />
                        <span className="text-base font-black text-[#0c0a09] uppercase tracking-wider">Back to {crop.name}</span>
                    </button>
                    <div className="h-10 w-px bg-white/20"></div>
                    <div>
                        <h1 className="text-xl font-black text-white font-serif">{crop.name} <span className="text-[#84cc16] italic">Manager</span></h1>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-[#84cc16]/10 border border-[#84cc16]/20 rounded-full">
                        <div className="w-2 h-2 bg-[#84cc16] rounded-full animate-pulse"></div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-[#84cc16]">
                            {userState?.active ? `Day ${Math.floor((new Date() - new Date(userState.start_date)) / (1000 * 60 * 60 * 24))}` : 'View Only'}
                        </span>
                    </div>
                    <button
                        onClick={() => {
                            setActiveTab('diagnostics');
                            fileInputRef.current?.click();
                        }}
                        className="flex items-center gap-2 bg-gradient-to-r from-[#84cc16] to-[#65a30d] text-[#0c0a09] px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider hover:shadow-[0_0_20px_rgba(132,204,22,0.3)] transition-all transform hover:scale-105"
                    >
                        <Camera className="w-4 h-4" /> Scan Plant
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageUpload}
                        className="hidden"
                        accept="image/*"
                    />
                </div>
            </nav>

            <div className="pt-24 px-6 pb-20 max-w-[1600px] mx-auto grid lg:grid-cols-[300px_1fr] gap-8 relative z-10">

                {/* LEFT SIDEBAR: Timeline */}
                <div className="h-[calc(100vh-8rem)] sticky top-24 overflow-y-auto pr-4 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
                    <SectionHeader icon={Calendar} title="Crop Cycle" subtitle={knowledge.crop_info.total_duration_days + " Days Total"} />

                    <div className="relative border-l-2 border-white/10 ml-3.5 space-y-8 pb-10">
                        {phases.map((phase, idx) => {
                            const isActive = idx === selectedPhaseIdx;
                            const isPast = userState?.active && idx < userState.current_phase_index;
                            const isCurrent = userState?.active && idx === userState.current_phase_index;

                            return (
                                <div
                                    key={phase.phase_id}
                                    className={`relative pl-8 group cursor-pointer transition-all duration-300 ${isActive ? 'scale-105' : 'opacity-60 hover:opacity-100'}`}
                                    onClick={() => setSelectedPhaseIdx(idx)}
                                >
                                    {/* Node */}
                                    <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 transition-all duration-500 z-10 ${isActive ? 'bg-[#84cc16] border-[#84cc16] shadow-[0_0_15px_rgba(132,204,22,0.6)]' :
                                        isPast ? 'bg-[#84cc16] border-[#84cc16]' :
                                            'bg-[#0c0a09] border-stone-600'
                                        }`}></div>

                                    {/* Content */}
                                    <div>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-stone-500 mb-1 block">Phase {idx + 1}</span>
                                        <h4 className={`text-lg font-bold leading-tight mb-2 ${isActive ? 'text-white' : 'text-stone-400'}`}>
                                            {phase.phase_name}
                                        </h4>
                                        <div className="flex items-center gap-3">
                                            <span className="px-2 py-0.5 bg-white/5 rounded text-[10px] font-medium text-stone-400 border border-white/5">
                                                {phase.duration_days} Days
                                            </span>
                                            {isCurrent && <span className="px-2 py-0.5 bg-[#84cc16]/20 text-[#84cc16] rounded text-[10px] font-bold border border-[#84cc16]/20">Active</span>}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* User Control Panel */}
                    <div className="mt-8 p-4 bg-white/5 rounded-xl border border-white/10">
                        {!userState?.active ? (
                            <div className="text-center">
                                <p className="text-stone-400 text-xs mb-3">Sync this roadmap with your field.</p>
                                <button
                                    onClick={handleStartCultivation}
                                    className="w-full py-3 bg-[#84cc16] text-[#0c0a09] font-black uppercase tracking-wider text-xs rounded-lg hover:bg-[#a3e635] transition-colors"
                                >
                                    Start Tracking
                                </button>
                            </div>
                        ) : (
                            <div>
                                <p className="text-stone-400 text-xs mb-3 font-medium">Phase Management</p>
                                {userState.current_phase_index !== selectedPhaseIdx ? (
                                    <button
                                        onClick={() => handleUpdatePhase(selectedPhaseIdx)}
                                        className="w-full py-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-2"
                                    >
                                        <CheckCircle2 size={14} /> Set as Current active
                                    </button>
                                ) : (
                                    <div className="flex items-center gap-2 text-[#84cc16] text-xs font-bold justify-center bg-[#84cc16]/10 py-2 rounded-lg border border-[#84cc16]/20">
                                        <TrendingUp size={14} /> Tracking Logic Active
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* NEW: Explicit Diagnostic Access Card */}
                    <div className="mt-4 p-4 bg-gradient-to-br from-red-500/5 to-transparent rounded-xl border border-red-500/10 hover:border-red-500/30 transition-all cursor-pointer group"
                        onClick={() => {
                            setActiveTab('diagnostics');
                            // If we are already in diagnostics, triggering click might be redundant if we just want to view,
                            // but if they click this, they likely want to Scan.
                            // Let's open the file dialog immediately if they are clicking this "Action" card.
                            fileInputRef.current?.click();
                        }}
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-red-500/10 rounded-lg text-red-400 group-hover:bg-red-500 group-hover:text-white transition-colors">
                                <ScanLine size={18} />
                            </div>
                            <div>
                                <h4 className="text-white font-bold text-sm">Plant Doctor</h4>
                                <p className="text-[10px] text-stone-500 uppercase tracking-wider group-hover:text-stone-300">AI Disease Detection</p>
                            </div>
                        </div>
                        <p className="text-stone-400 text-xs leading-relaxed mb-3">
                            Check for diseases or nutrient deficiencies instantly.
                        </p>
                        <button className="w-full py-2 bg-red-500/10 text-red-400 text-xs font-bold uppercase rounded-lg border border-red-500/20 group-hover:bg-red-500 group-hover:text-white transition-all">
                            Scan Now
                        </button>
                    </div>
                </div>

                {/* RIGHT CONTENT: Dashboard or Diagnostics */}
                <div className="min-h-[80vh]">

                    {activeTab === 'diagnostics' && scanResult ? (
                        /* --- DIAGNOSTICS VIEW --- */
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                            <button onClick={() => setActiveTab('timeline')} className="mb-6 text-xs font-bold text-stone-400 hover:text-white flex items-center gap-2 uppercase tracking-wider">
                                <ArrowRight className="rotate-180 w-3 h-3" /> Back to Timeline
                            </button>

                            <GlassCard className="overflow-hidden">
                                <div className="p-8 border-b border-white/10 bg-gradient-to-r from-red-500/10 to-transparent">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="p-2 bg-red-500/20 rounded-lg text-red-500"><AlertOctagon size={24} /></div>
                                        <h2 className="text-3xl font-serif font-black text-white">Pathogen Detected</h2>
                                    </div>
                                    <p className="text-stone-400 text-sm ml-14">Analysis Request ID: #DIA-{Math.floor(Math.random() * 10000)}</p>
                                </div>

                                <div className="grid lg:grid-cols-2 gap-8 p-8">
                                    {/* Left: Result Data */}
                                    <div className="space-y-8">
                                        <div>
                                            <span className="text-[10px] font-black text-stone-500 uppercase tracking-[0.2em] block mb-2">Identification</span>
                                            <h3 className="text-4xl font-black text-white mb-1">{scanResult.analysis?.disease_name || "Unknown"}</h3>
                                            <p className="text-[#84cc16] font-serif italic text-lg">{scanResult.analysis?.scientific_name}</p>
                                            <div className="mt-4 flex gap-3">
                                                <span className="px-3 py-1 bg-white/10 rounded-full text-xs font-bold text-stone-300 border border-white/10">{Math.round((scanResult.analysis?.confidence_score || 0) * 100)}% Match Confidence</span>
                                            </div>
                                        </div>

                                        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-6">
                                            <div className="flex items-center gap-2 mb-3 text-red-400">
                                                <DollarSign size={18} />
                                                <span className="text-xs font-black uppercase tracking-widest">Economic Impact</span>
                                            </div>
                                            <p className="text-xl font-bold text-white mb-1">{scanResult.analysis?.economic_impact_inr || "Data Unavailable"}</p>
                                            <p className="text-stone-500 text-xs">Estimated potential yield loss if untreated.</p>
                                        </div>

                                        <div>
                                            <span className="text-[10px] font-black text-stone-500 uppercase tracking-[0.2em] block mb-4">Recommended Protocol</span>
                                            <span className="text-[10px] font-black text-stone-500 uppercase tracking-[0.2em] block mb-4">Recommended Protocol</span>

                                            {/* Protocol Display using Backend Match */}
                                            {scanResult.protocol_match ? (
                                                <div className="space-y-4">
                                                    <div className="bg-[#84cc16]/5 border border-[#84cc16]/20 p-5 rounded-xl">
                                                        <h4 className="text-[#84cc16] font-bold text-sm mb-2 flex items-center gap-2"><Leaf size={14} /> Organic Remedy</h4>
                                                        <ul className="list-disc list-inside text-sm text-stone-300 space-y-1">
                                                            {scanResult.protocol_match.management_procedures.organic?.map((s, i) => <li key={i}>{s}</li>)}
                                                        </ul>
                                                    </div>
                                                    <div className="bg-blue-500/5 border border-blue-500/20 p-5 rounded-xl">
                                                        <h4 className="text-blue-400 font-bold text-sm mb-2 flex items-center gap-2"><Search size={14} /> Chemical Control</h4>
                                                        <ul className="list-disc list-inside text-sm text-stone-300 space-y-1">
                                                            {scanResult.protocol_match.management_procedures.chemical?.map((s, i) => <li key={i}>{s}</li>)}
                                                        </ul>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="p-4 bg-white/5 rounded-lg text-sm text-stone-400 italic">
                                                    <p className="mb-2">Exact treatment protocol not found in local database.</p>

                                                    {scanResult.analysis?.remedial_chemical && (
                                                        <>
                                                            <strong className="text-white not-italic block mb-1">AI Suggestion:</strong>
                                                            <p>{Array.isArray(scanResult.analysis.remedial_chemical) ? scanResult.analysis.remedial_chemical[0] : scanResult.analysis.remedial_chemical}</p>
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Right: AI Analysis */}
                                    <div>
                                        <span className="text-[10px] font-black text-stone-500 uppercase tracking-[0.2em] block mb-4">Visual Symptoms</span>
                                        <div className="flex flex-wrap gap-2 mb-8">
                                            {scanResult.analysis?.symptoms?.map((s, i) => (
                                                <span key={i} className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-stone-300">{s}</span>
                                            ))}
                                        </div>

                                        <span className="text-[10px] font-black text-stone-500 uppercase tracking-[0.2em] block mb-4">Biological Triggers</span>
                                        <p className="text-stone-300 text-sm leading-relaxed mb-8">{scanResult.analysis?.biological_triggers}</p>

                                        <button
                                            onClick={() => {
                                                // In a real app, save to user history here
                                                alert("Added to your disease history record.");
                                                setActiveTab('timeline');
                                                setScanResult(null);
                                            }}
                                            className="w-full py-4 bg-white text-[#0c0a09] rounded-xl font-black uppercase tracking-wider text-xs hover:bg-stone-200 transition-colors"
                                        >
                                            Acknowledge & Add to Report
                                        </button>
                                    </div>
                                </div>
                            </GlassCard>
                        </motion.div>
                    ) : activeTab === 'diagnostics' && analyzing ? (
                        <div className="h-full flex flex-col items-center justify-center">
                            <div className="relative w-24 h-24 mb-6">
                                <div className="absolute inset-0 border-4 border-[#84cc16]/20 rounded-full"></div>
                                <div className="absolute inset-0 border-4 border-[#84cc16] border-t-transparent rounded-full animate-spin"></div>
                                <Microscope className="absolute inset-0 m-auto text-white w-8 h-8 animate-pulse" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Analyzing Specimen</h3>
                            <p className="text-stone-500 text-xs uppercase tracking-widest">Running neural convolution...</p>
                        </div>
                    ) : (
                        /* --- TIMELINE DETAIL VIEW --- */
                        <motion.div
                            key={selectedPhaseIdx}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            {/* Header Card */}
                            <div className="relative h-48 rounded-3xl overflow-hidden mb-8 border border-white/10 group">
                                <div className="absolute inset-0 bg-gradient-to-r from-[#0c0a09] via-[#0c0a09]/80 to-transparent z-10"></div>
                                {/* Dynamic bg based on phase */}
                                <img
                                    src={`https://images.unsplash.com/photo-${['1500382017468-9049fed747ef', '1625246333134-b1c2fa2ec21b', '1598005877840-064871d34346', '1615467657929-23250b73b5e4'][selectedPhaseIdx % 4] || '1500382017468-9049fed747ef'}?auto=format&fit=crop&q=80&w=1000`}
                                    className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:scale-105 transition-transform duration-1000"
                                    alt="Phase Cover"
                                />

                                <div className="relative z-20 h-full flex flex-col justify-center px-10">
                                    <span className="text-[#84cc16] text-[10px] font-black uppercase tracking-[0.2em] mb-2">Current View</span>
                                    <h2 className="text-4xl font-serif font-black text-white mb-2">{currentPhase.phase_name}</h2>
                                    <p className="text-stone-300 max-w-xl text-sm leading-relaxed">{currentPhase.description}</p>
                                </div>
                            </div>

                            {/* Procedures Checklist */}
                            <div className="mb-10">
                                <SectionHeader icon={Sprout} title="Standard Operating Procedures" subtitle="Critical Tasks" />
                                <div className="space-y-3">
                                    {currentPhase.procedures.map((proc, i) => (
                                        <GlassCard key={i} className="p-4 flex items-center gap-4 group hover:bg-[#84cc16]/10 hover:border-[#84cc16]/40 hover:scale-[1.02] hover:shadow-[0_0_15px_rgba(132,204,22,0.3)] transition-all duration-300 cursor-pointer">
                                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-300 ${userState?.active
                                                ? 'border-[#84cc16] group-hover:bg-[#84cc16] group-hover:shadow-[0_0_12px_rgba(132,204,22,0.5)]'
                                                : 'border-stone-600 group-hover:border-[#84cc16] group-hover:bg-[#84cc16] group-hover:shadow-[0_0_12px_rgba(132,204,22,0.5)]'
                                                }`}>
                                                {userState?.active && <div className="w-3 h-3 bg-[#84cc16] rounded-full opacity-0 group-hover:opacity-0 transition-opacity"></div>}
                                            </div>
                                            <div>
                                                <p className="text-stone-200 text-sm font-medium">
                                                    {typeof proc === 'string' ? proc : proc.operation || proc.step || "Procedure"}
                                                </p>
                                                {typeof proc === 'object' && proc.details && (
                                                    <p className="text-stone-400 text-xs mt-1">{proc.details}</p>
                                                )}
                                            </div>
                                        </GlassCard>
                                    ))}
                                </div>
                            </div>

                            {/* Toggles */}
                            <div className="flex gap-4 mb-8">
                                <button
                                    onClick={() => setShowDiseases(!showDiseases)}
                                    className={`flex-1 py-3 rounded-xl border font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${showDiseases ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-white/5 border-white/10 text-stone-400 hover:text-white'}`}
                                >
                                    <Shield size={16} /> {showDiseases ? 'Hide Disease Risks' : 'Show Disease Risks'}
                                </button>
                                <button
                                    onClick={() => setShowCures(!showCures)}
                                    className={`flex-1 py-3 rounded-xl border font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${showCures ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-white/5 border-white/10 text-stone-400 hover:text-white'}`}
                                >
                                    <Droplets size={16} /> {showCures ? 'Hide Treatment Protocols' : 'Show Treatment Protocols'}
                                </button>
                            </div>

                            {/* Preventive Tips (Always Visible if generic, or specific) */}
                            <div className="mb-10">
                                <div className="p-6 bg-gradient-to-br from-[#84cc16]/10 to-transparent border border-[#84cc16]/20 rounded-2xl">
                                    <h4 className="text-[#84cc16] font-bold text-xs uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <Shield size={14} /> Proactive Defense
                                    </h4>
                                    <div className="grid md:grid-cols-2 gap-4">
                                        {currentPhase.preventive_tips?.map((tip, i) => (
                                            <div key={i} className="flex gap-3 items-start">
                                                <CheckCircle2 size={14} className="text-[#84cc16] mt-0.5 flex-shrink-0" />
                                                <p className="text-sm text-stone-300 leading-snug">{tip}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Disease Matrix (Conditional) */}
                            <AnimatePresence>
                                {showDiseases && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <SectionHeader icon={AlertTriangle} title="Pathogen Watch" subtitle="High Probability Threats" />
                                        <div className="grid gap-6">
                                            {currentPhase.common_diseases?.map((dID) => {
                                                const disease = diseases[dID];
                                                if (!disease) return null;

                                                return (
                                                    <GlassCard key={dID} className="p-6 border-red-500/10">
                                                        <div className="flex justify-between items-start mb-4">
                                                            <div>
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <h4 className="text-lg font-bold text-white">{disease.name}</h4>
                                                                    <span className="px-2 py-0.5 bg-red-500/20 text-red-500 text-[10px] uppercase font-black rounded">High Risk</span>
                                                                </div>
                                                                <p className="text-stone-500 text-xs italic">Favorable: {disease.favorable_conditions}</p>
                                                            </div>
                                                        </div>

                                                        <div className="space-y-4">
                                                            <div>
                                                                <span className="text-[10px] font-black text-stone-500 uppercase tracking-wider block mb-2">Symptoms</span>
                                                                <ul className="text-sm text-stone-300 space-y-1">
                                                                    {Array.isArray(disease.symptoms) ? (
                                                                        disease.symptoms.map((s, i) => <li key={i} className="flex gap-2"><span className="w-1 h-1 bg-red-500 rounded-full mt-2"></span>{s}</li>)
                                                                    ) : (
                                                                        <li className="flex gap-2"><span className="w-1 h-1 bg-red-500 rounded-full mt-2"></span>{disease.symptoms || 'No symptoms data available'}</li>
                                                                    )}
                                                                </ul>
                                                            </div>

                                                            {showCures && (
                                                                <motion.div
                                                                    initial={{ opacity: 0 }}
                                                                    animate={{ opacity: 1 }}
                                                                    className="grid md:grid-cols-2 gap-4 pt-4 border-t border-white/5 mt-4"
                                                                >
                                                                    <div>
                                                                        <span className="text-[10px] font-black text-[#84cc16] uppercase tracking-wider block mb-2">Organic</span>
                                                                        <ul className="text-xs text-stone-400 space-y-1">
                                                                            {disease.management_procedures.organic?.map((m, i) => <li key={i}>{m}</li>)}
                                                                        </ul>
                                                                    </div>
                                                                    <div>
                                                                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-wider block mb-2">Chemical</span>
                                                                        <ul className="text-xs text-stone-400 space-y-1">
                                                                            {disease.management_procedures.chemical?.map((m, i) => <li key={i}>{m}</li>)}
                                                                        </ul>
                                                                    </div>
                                                                </motion.div>
                                                            )}
                                                        </div>
                                                    </GlassCard>
                                                );
                                            })}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                        </motion.div>
                    )}

                </div>
            </div >
        </div >
    );
};

export default CultivationView;
