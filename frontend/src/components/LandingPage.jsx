import { Link } from 'react-router-dom';
import { Sprout, CloudSun, Landmark, ShoppingBag, Brain, BarChart3, ShieldCheck, ArrowRight, Star, Leaf, Droplets } from 'lucide-react';
import { GrainOverlay } from './GrainOverlay';

const FeatureCard = ({ icon: Icon, title, desc }) => (
  <div className="group bg-white/80 backdrop-blur-sm border-2 border-stone-200 rounded-[2rem] p-8 hover:border-[#84cc16]/30 hover:shadow-2xl hover:shadow-[#84cc16]/5 transition-all duration-300">
    <div className="w-14 h-14 bg-[#84cc16]/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-[#84cc16]/20 transition-colors">
      <Icon className="w-7 h-7 text-[#84cc16]" />
    </div>
    <h3 className="font-serif text-2xl font-black text-[#0c0a09] mb-3">{title}</h3>
    <p className="text-stone-500 font-medium leading-relaxed">{desc}</p>
  </div>
);

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-[#fafaf9]">
      <GrainOverlay />

      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 h-16 px-6 flex items-center justify-between bg-white/80 backdrop-blur-xl border-b border-stone-100">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="bg-[#0c0a09] p-2 rounded-lg">
            <Sprout className="text-[#84cc16] w-5 h-5" />
          </div>
          <span className="font-serif font-black text-lg tracking-tight text-[#0c0a09]">
            Krishi<span className="italic text-[#84cc16]">Vigyan</span>
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <Link to="/login" className="px-5 py-2 text-sm font-black text-stone-600 hover:text-[#0c0a09] transition-colors">
            Sign In
          </Link>
          <Link to="/signup" className="px-5 py-2 bg-[#0c0a09] text-white rounded-xl font-black text-sm hover:bg-stone-800 transition-all">
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-36 pb-24 px-6 max-w-6xl mx-auto text-center relative">
        <div className="inline-flex items-center gap-2 bg-[#84cc16]/10 border border-[#84cc16]/20 rounded-full px-5 py-2 mb-8">
          <Leaf className="w-4 h-4 text-[#84cc16]" />
          <span className="text-xs font-black uppercase tracking-widest text-[#84cc16]">AI-Powered Agriculture Intelligence</span>
        </div>

        <h1 className="font-serif text-6xl md:text-8xl font-black text-[#0c0a09] leading-[0.9] mb-6">
          Farm Smarter<br />
          <span className="italic text-[#84cc16]">Grow Better</span>
        </h1>
        <p className="text-stone-500 text-lg max-w-2xl mx-auto mb-10 font-medium leading-relaxed">
          KrishiVigyan combines AI, real-time weather data, soil analysis, and market intelligence
          to help Indian farmers make data-driven decisions.
        </p>

        <div className="flex items-center justify-center gap-4">
          <Link to="/signup" className="inline-flex items-center gap-2 bg-[#0c0a09] text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-wider hover:bg-stone-800 transition-all shadow-2xl shadow-black/10">
            Start Free <ArrowRight className="w-4 h-4" />
          </Link>
          <Link to="/login" className="inline-flex items-center gap-2 bg-white border-2 border-stone-200 px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-wider text-stone-700 hover:border-[#84cc16]/30 transition-all">
            Sign In
          </Link>
        </div>

        {/* Stats */}
        <div className="mt-16 grid grid-cols-3 gap-8 max-w-lg mx-auto">
          {[
            { value: '10K+', label: 'Farmers Served' },
            { value: '50+', label: 'Crops Supported' },
            { value: '99%', label: 'Uptime' },
          ].map((s, i) => (
            <div key={i}>
              <div className="text-3xl font-black text-[#0c0a09]">{s.value}</div>
              <div className="text-xs font-bold text-stone-400 uppercase tracking-wider">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-6 max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="font-serif text-4xl md:text-5xl font-black text-[#0c0a09] mb-4">
            Everything You Need to <span className="italic text-[#84cc16]">Thrive</span>
          </h2>
          <p className="text-stone-500 max-w-xl mx-auto font-medium">
            Intelligent tools designed for the modern Indian farmer.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <FeatureCard icon={CloudSun} title="Weather Intelligence" desc="Hyper-local 7-day forecasts and disease risk predictions based on your exact location." />
          <FeatureCard icon={Landmark} title="Soil Analysis" desc="NPK levels, pH, and nutrient recommendations with actionable soil improvement plans." />
          <FeatureCard icon={ShoppingBag} title="Market Rates" desc="Real-time mandi prices, MSP data, and price forecasts to maximize your profits." />
          <FeatureCard icon={Brain} title="Vani AI Assistant" desc="Your personal AI agriculture expert. Ask anything in English, Kannada, Telugu, Tamil, or Hindi." />
          <FeatureCard icon={BarChart3} title="Crop Intelligence" desc="Comprehensive crop database with cultivation guides, pest management, and best practices." />
          <FeatureCard icon={ShieldCheck} title="Smart Alerts" desc="Get notified about disease outbreaks, price changes, and weather warnings before they affect you." />
        </div>
      </section>

      {/* Pricing / CTA */}
      <section className="py-24 px-6 bg-[#0c0a09]">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-[#84cc16]/10 border border-[#84cc16]/20 rounded-full px-5 py-2 mb-8">
            <Star className="w-4 h-4 text-[#84cc16]" />
            <span className="text-xs font-black uppercase tracking-widest text-[#84cc16]">Free to get started</span>
          </div>
          <h2 className="font-serif text-4xl md:text-6xl font-black text-white mb-6">
            Ready to Transform Your <span className="italic text-[#84cc16]">Farm?</span>
          </h2>
          <p className="text-stone-400 max-w-xl mx-auto mb-10 font-medium">
            Join thousands of farmers using AI to increase yields, reduce costs, and make data-driven decisions.
          </p>
          <Link to="/signup" className="inline-flex items-center gap-2 bg-[#84cc16] text-[#0c0a09] px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-wider hover:bg-[#facc15] transition-all shadow-2xl shadow-[#84cc16]/20">
            Create Free Account <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-stone-200">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Sprout className="text-[#84cc16] w-4 h-4" />
            <span className="font-serif font-black text-sm text-stone-600">
              Krishi<span className="italic text-[#84cc16]">Vigyan</span>
            </span>
          </div>
          <div className="flex items-center gap-6 text-xs font-bold text-stone-400 uppercase tracking-wider">
            <span>© 2026 KrishiVigyan</span>
            <span>Made with <Droplets className="w-3 h-3 inline text-[#84cc16]" /> for Indian Farmers</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
