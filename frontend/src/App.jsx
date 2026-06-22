import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import Navbar from './components/Navbar';
import LandingPage from './components/LandingPage';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import HomeTerminal from './components/HomeTerminal';
import SettingsTerminal from './components/SettingsTerminal';
import PredictionTerminal from './components/PredictionTerminal';
import LoginPage from './components/LoginPage';
import SignupPage from './components/SignupPage';
import ProfilePage from './components/ProfilePage';
import LandAnalyser from './components/LandAnalyser';
import CropIntelligenceHub from './components/CropIntelligenceHub';
import MarketHub from './components/MarketHub';
import VaniAIChat from './components/VaniAIChat';
import SmartEnvironmentScanner from './components/SmartEnvironmentScanner';
import AdminDashboard from './components/AdminDashboard';
import { GrainOverlay } from './components/GrainOverlay';
import { LanguageProvider } from './i18n/LanguageContext';

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
        <ErrorBoundary>
          <LanguageProvider>
          <GrainOverlay />
          <Navbar user={user} onLogout={handleLogout} />
          <Routes>
            <Route path="/" element={
              user ? <Navigate to="/dashboard" replace /> : <LandingPage />
            } />
            <Route path="/login" element={
              user ? <Navigate to="/dashboard" replace /> : <LoginPage onLogin={handleLogin} />
            } />
            <Route path="/signup" element={
              user ? <Navigate to="/dashboard" replace /> : <SignupPage onLogin={handleLogin} />
            } />
            <Route path="/dashboard" element={<ProtectedRoute user={user}><HomeTerminal user={user} /></ProtectedRoute>} />
            <Route path="/land-analyser" element={<ProtectedRoute user={user}><LandAnalyser user={user} /></ProtectedRoute>} />
            <Route path="/scan" element={<ProtectedRoute user={user}><SmartEnvironmentScanner /></ProtectedRoute>} />
            <Route path="/crops" element={<ProtectedRoute user={user}><CropIntelligenceHub user={user} /></ProtectedRoute>} />
            <Route path="/market" element={<ProtectedRoute user={user}><MarketHub /></ProtectedRoute>} />
            <Route path="/vaniai" element={<ProtectedRoute user={user}><VaniAIChat user={user} /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute user={user}><AdminDashboard user={user} /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute user={user}><SettingsTerminal /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute user={user}><ProfilePage user={user} onLogout={handleLogout} /></ProtectedRoute>} />
          </Routes>
          </LanguageProvider>
        </ErrorBoundary>
      </div>
    </Router>
  );
};

export default App;
