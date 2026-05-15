import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sprout, Calendar, MapPin, Droplets, Thermometer, AlertTriangle, CheckCircle2, ChevronRight, Loader2, Plus } from 'lucide-react';
import axios from 'axios';
import { motion } from 'framer-motion';

const GrainOverlay = () => <div className="grain-overlay opacity-20" />;

export default function CropTracker() {
  const [farms, setFarms] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    
    fetchFarms(token);
  }, []);

  const fetchFarms = async (token) => {
    try {
      const res = await axios.get('/api/user/farms', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setFarms(res.data.farms || []);
      }
    } catch (err) {
      console.error('Failed to fetch farms', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateDAP = (plantingDate) => {
    if (!plantingDate) return 0;
    const plant = new Date(plantingDate);
    const today = new Date();
    const diffTime = Math.abs(today - plant);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getStage = (dap) => {
    if (dap < 20) return "Seedling / Early Growth";
    if (dap < 50) return "Vegetative Phase";
    if (dap < 90) return "Flowering / Panicle Initiation";
    if (dap < 120) return "Grain Filling / Maturity";
    return "Ready for Harvest";
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#fafaf9]">
      <Loader2 className="w-8 h-8 animate-spin text-[#84cc16]" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#fafaf9] pt-28 pb-20 px-6">
      <GrainOverlay />
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-10">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#84cc16] mb-2">Live Monitoring</p>
            <h1 className="font-serif text-4xl font-black text-[#0c0a09]">Active <span className="italic text-[#84cc16]">Crops</span></h1>
          </div>
          <button onClick={() => navigate('/crops')} className="flex items-center gap-2 px-5 py-3 bg-[#0c0a09] text-white rounded-2xl font-black text-xs uppercase tracking-wider hover:bg-stone-800 transition-all">
            <Plus size={14} /> Add Crop
          </button>
        </div>

        {farms.length === 0 ? (
          <div className="bg-white border-2 border-stone-200 rounded-[2rem] p-12 text-center shadow-xl">
            <Sprout size={48} className="mx-auto mb-4 text-stone-300" />
            <h2 className="font-serif text-2xl font-black text-[#0c0a09] mb-2">No Active Crops</h2>
            <p className="text-stone-500 mb-6">Start tracking your crops to get daily insights and alerts.</p>
            <button onClick={() => navigate('/crops')} className="px-6 py-3 bg-[#84cc16] text-[#0c0a09] font-black text-xs uppercase tracking-widest rounded-xl hover:bg-[#facc15] transition-all">
              Explore Intelligence Hub
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {farms.map((farm) => {
              const dap = calculateDAP(farm.planting_date);
              const stage = getStage(dap);
              
              return (
                <motion.div key={farm.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-white border-2 border-stone-200 rounded-[2rem] p-8 shadow-xl hover:border-[#84cc16]/50 transition-all group">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="font-serif text-3xl font-black text-[#0c0a09] capitalize">{farm.crop_name}</h3>
                      <p className="text-stone-500 text-sm font-medium mt-1">{farm.area_acres} Acres • {farm.variety || 'Standard'}</p>
                    </div>
                    <div className="bg-[#84cc16]/10 px-4 py-2 rounded-xl text-center border border-[#84cc16]/20">
                      <p className="text-[10px] font-black uppercase text-[#84cc16] tracking-widest">Day</p>
                      <p className="font-black text-2xl text-[#0c0a09]">{dap}</p>
                    </div>
                  </div>

                  <div className="mb-6">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-stone-400 mb-2">Current Stage</p>
                    <div className="bg-stone-50 border border-stone-100 rounded-xl p-4 flex items-center justify-between">
                      <span className="font-bold text-[#0c0a09]">{stage}</span>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <div key={i} className={`h-2 w-8 rounded-full ${i <= (dap/25) ? 'bg-[#84cc16]' : 'bg-stone-200'}`} />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="bg-stone-50 rounded-xl p-3 border border-stone-100">
                      <div className="flex items-center gap-1.5 mb-1"><Calendar size={12} className="text-[#84cc16]" /><span className="text-[8px] font-black uppercase text-stone-400">Planted</span></div>
                      <p className="font-bold text-sm text-[#0c0a09]">{farm.planting_date}</p>
                    </div>
                    <div className="bg-stone-50 rounded-xl p-3 border border-stone-100">
                      <div className="flex items-center gap-1.5 mb-1"><MapPin size={12} className="text-[#84cc16]" /><span className="text-[8px] font-black uppercase text-stone-400">Soil</span></div>
                      <p className="font-bold text-sm text-[#0c0a09]">{farm.soil_type || 'Unknown'}</p>
                    </div>
                  </div>

                  <button onClick={() => navigate('/crops', { state: { selectedCropName: farm.crop_name, activeTab: 'tracking' } })} className="w-full py-4 bg-stone-50 text-stone-600 font-black text-xs uppercase tracking-widest rounded-xl hover:bg-[#0c0a09] hover:text-white transition-all flex items-center justify-center gap-2 group-hover:bg-[#0c0a09] group-hover:text-white">
                    View Daily Plan <ChevronRight size={14} />
                  </button>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
