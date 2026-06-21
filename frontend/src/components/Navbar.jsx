import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Sprout, Settings, Globe, User, Menu, X, LayoutDashboard, MessageSquare, TrendingUp, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Navbar = ({ user, onLogout }) => {
  const [lang, setLang] = useState(localStorage.getItem('lang') || 'EN');
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  // Hide main nav on landing page (it has its own nav)
  if (location.pathname === '/' && !user) return null;

  const navLinks = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/land-analyser', label: 'Land Analyser' },
    { path: '/crops', label: 'Crop Intelligence' },
    { path: '/market', label: 'Market' },
    { path: '/vaniai', label: 'Vani AI' },
    { path: '/settings', label: 'Settings' },
  ];

  const closeMobile = () => setMobileOpen(false);

  return (
    <>
      <nav className="fixed top-0 w-full z-[100] h-16 px-4 md:px-6 flex justify-between items-center bg-white/90 backdrop-blur-[30px] border-b border-stone-100">
        <Link to="/dashboard" className="flex items-center gap-2 md:gap-3">
          <div className="bg-[#0c0a09] p-2 rounded-lg shadow-2xl shadow-[#84cc16]/20 hover:scale-110 transition-transform">
            <Sprout className="text-[#84cc16] w-4 h-4 md:w-5 md:h-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-serif font-black text-base md:text-lg tracking-tight text-[#0c0a09] leading-none">
              Krishi<span className="italic text-[#84cc16]">Vigyan</span>
            </span>
            <span className="text-[6px] md:text-[7px] font-black tracking-[0.2em] uppercase opacity-40">Intelligence</span>
          </div>
        </Link>

        <div className="hidden lg:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link key={link.path} to={link.path} className="group relative">
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

        <div className="flex items-center gap-1 md:gap-3">
          {user ? (
            <Link to="/profile" className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-[#84cc16]/10 rounded-xl border border-[#84cc16]/20 hover:bg-[#84cc16]/20 transition-all">
              <div className="w-6 h-6 bg-[#84cc16] rounded-full flex items-center justify-center">
                <span className="text-[9px] font-black text-[#0c0a09]">{user.name?.[0]?.toUpperCase() || 'F'}</span>
              </div>
              <span className="text-[9px] font-black text-[#0c0a09] uppercase max-w-[80px] truncate">{user.name?.split(' ')[0]}</span>
            </Link>
          ) : (
            <Link to="/login" className="hidden md:inline-flex px-4 py-1.5 bg-[#0c0a09] text-white rounded-xl font-black text-[9px] uppercase tracking-wider hover:bg-stone-800 transition-all">
              Sign In
            </Link>
          )}
          <Link to="/settings" className="p-1.5 md:p-2 hover:bg-stone-100 rounded-lg transition-colors opacity-40 hover:opacity-100"><Settings size={15} /></Link>
          <button
            onClick={() => setLang(lang === 'EN' ? 'KN' : 'EN')}
            className="hidden md:inline-flex bg-[#0c0a09] text-white px-3 md:px-4 py-1.5 md:py-2 rounded-lg font-black text-[9px] tracking-wider uppercase items-center gap-2 hover:bg-[#84cc16] hover:text-[#0c0a09] transition-all shadow-md"
          >
            <Globe className="w-3 h-3" />
            {lang}
          </button>
          {/* Hamburger */}
          <button onClick={() => setMobileOpen(true)} className="lg:hidden p-1.5 hover:bg-stone-100 rounded-lg transition-colors">
            <Menu size={20} />
          </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm lg:hidden" onClick={closeMobile}
            />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="fixed top-0 right-0 z-[210] h-full w-72 bg-white shadow-2xl lg:hidden flex flex-col"
            >
              <div className="flex items-center justify-between p-4 border-b border-stone-100">
                <div className="flex items-center gap-2">
                  <Sprout className="text-[#84cc16] w-5 h-5" />
                  <span className="font-serif font-black text-base">Krishi<span className="italic text-[#84cc16]">Vigyan</span></span>
                </div>
                <button onClick={closeMobile} className="p-1 hover:bg-stone-100 rounded-lg transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-1">
                {navLinks.map((link) => {
                  const active = location.pathname === link.path;
                  return (
                    <Link key={link.path} to={link.path} onClick={closeMobile}
                      className={`block px-4 py-3 rounded-xl text-[13px] font-bold tracking-wider transition-all ${active ? 'bg-[#84cc16]/10 text-[#84cc16] border border-[#84cc16]/20' : 'text-stone-600 hover:bg-stone-50 border border-transparent'}`}
                    >
                      {link.label}
                    </Link>
                  );
                })}
                {user?.is_admin && (
                  <Link to="/admin" onClick={closeMobile}
                    className={`block px-4 py-3 rounded-xl text-[13px] font-bold tracking-wider transition-all ${location.pathname === '/admin' ? 'bg-[#84cc16]/10 text-[#84cc16] border border-[#84cc16]/20' : 'text-stone-600 hover:bg-stone-50 border border-transparent'}`}
                  >
                    Admin
                  </Link>
                )}
              </div>
              <div className="p-4 border-t border-stone-100 space-y-2">
                <button
                  onClick={() => setLang(lang === 'EN' ? 'KN' : 'EN')}
                  className="w-full flex items-center justify-center gap-2 bg-[#0c0a09] text-white px-4 py-2.5 rounded-xl font-black text-[11px] tracking-wider uppercase hover:bg-[#84cc16] hover:text-[#0c0a09] transition-all"
                >
                  <Globe className="w-3.5 h-3.5" /> Switch to {lang === 'EN' ? 'ಕನ್ನಡ' : 'English'}
                </button>
                {user ? (
                  <Link to="/profile" onClick={closeMobile}
                    className="w-full flex items-center justify-center gap-2 bg-[#84cc16]/10 text-[#0c0a09] border border-[#84cc16]/20 px-4 py-2.5 rounded-xl font-black text-[11px] tracking-wider uppercase hover:bg-[#84cc16]/20 transition-all"
                  >
                    <User size={14} /> {user.name?.split(' ')[0] || 'Profile'}
                  </Link>
                ) : (
                  <Link to="/login" onClick={closeMobile}
                    className="w-full flex items-center justify-center gap-2 bg-[#0c0a09] text-white px-4 py-2.5 rounded-xl font-black text-[11px] tracking-wider uppercase hover:bg-stone-800 transition-all"
                  >
                    Sign In
                  </Link>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-[150] lg:hidden bg-white/95 backdrop-blur-[30px] border-t border-stone-200 safe-area-bottom">
        <div className="flex items-center justify-around py-1.5 px-1">
          {[
            { path: '/dashboard', icon: LayoutDashboard, label: 'Home' },
            { path: '/land-analyser', icon: MapPin, label: 'Analyse' },
            { path: '/vaniai', icon: MessageSquare, label: 'Vani AI' },
            { path: '/market', icon: TrendingUp, label: 'Market' },
            { path: '/profile', icon: User, label: 'Profile' },
          ].map(({ path, icon: Icon, label }) => {
            const active = location.pathname === path;
            return (
              <Link key={path} to={path}
                className={`flex flex-col items-center gap-0.5 py-1 px-2 min-w-[56px] rounded-xl transition-all ${
                  active ? 'text-[#84cc16]' : 'text-stone-400 hover:text-stone-600'
                }`}
              >
                <div className={`p-1 rounded-lg transition-all ${active ? 'bg-[#84cc16]/10' : ''}`}>
                  <Icon size={18} strokeWidth={active ? 2.5 : 1.5} />
                </div>
                <span className={`text-[8px] font-bold tracking-wider uppercase ${active ? 'font-black' : ''}`}>
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
};

export default Navbar;
