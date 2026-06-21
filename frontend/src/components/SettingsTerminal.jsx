import { useState, useEffect } from 'react';
import { Settings, AlertTriangle, Loader2, CheckCircle, XCircle, Eye, EyeOff, Zap } from 'lucide-react';
import axios from 'axios';
import { GrainOverlay, SectionLabel } from './GrainOverlay';

const Toggle = ({ checked, onChange, label }) => (
  <div className="flex items-center justify-between p-6 bg-stone-50 rounded-2xl border border-stone-200 hover:border-[#84cc16]/30 transition-all">
    <span className="font-bold text-stone-700">{label}</span>
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-16 h-8 rounded-full transition-all shadow-inner ${checked ? 'bg-[#84cc16]' : 'bg-stone-300'}`}
    >
      <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-lg transition-all ${checked ? 'right-1' : 'left-1'}`}>
        {checked && <div className="absolute inset-0 m-auto w-2 h-2 bg-[#84cc16] rounded-full animate-pulse"></div>}
      </div>
    </button>
  </div>
);

const PROVIDERS = [
  { id: 'openrouter', name: 'OpenRouter', models: ['openai/gpt-4o-mini', 'openai/gpt-4o', 'anthropic/claude-3-haiku', 'google/gemini-2.0-flash'], keyPrefix: 'sk-or-' },
  { id: 'groq', name: 'GROQ', models: ['llama-3.1-8b-instant', 'llama-3.3-70b-versatile', 'mixtral-8x7b-32768', 'gemma2-9b-it'], keyPrefix: 'gsk_' },
];

const SettingsTerminal = () => {
  const [localLang, setLocalLang] = useState('EN');
  const [cropCluster, setCropCluster] = useState('All Karnataka');
  const [notifications, setNotifications] = useState(true);
  const [priceAlerts, setPriceAlerts] = useState(true);
  const [apiKey, setApiKey] = useState('');
  const [apiKeyMasked, setApiKeyMasked] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [provider, setProvider] = useState('openrouter');
  const [llmModel, setLlmModel] = useState('openai/gpt-4o-mini');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [cacheSize, setCacheSize] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const response = await axios.get('/api/settings', { headers });
        if (response.data.success) {
          const s = response.data.settings;
          setLocalLang(s.language || 'EN');
          setCropCluster(s.crop_cluster || 'All Karnataka');
          setNotifications(s.notifications !== false);
          setPriceAlerts(s.price_alerts !== false);
          setProvider(s.provider || 'openrouter');
          setLlmModel(s.llm_model || 'openai/gpt-4o-mini');
          setApiKey(s.has_api_key ? '••••••••' : '');
          setApiKeyMasked(s.has_api_key ? '••••••••' : '');
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
        setError('Failed to load settings from server');
        setLocalLang(localStorage.getItem('lang') || 'EN');
        setCropCluster(localStorage.getItem('cropCluster') || 'All Karnataka');
        setNotifications(localStorage.getItem('notifications') === 'true' || true);
        setPriceAlerts(localStorage.getItem('priceAlerts') === 'true' || true);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
    let total = 0;
    for (let key in localStorage) {
      if (key.startsWith('analysis_') || key.startsWith('crop_')) {
        total += (localStorage[key].length + key.length) * 2;
      }
    }
    setCacheSize(Math.round(total / 1024));
  }, []);

  const currentProvider = PROVIDERS.find(p => p.id === provider) || PROVIDERS[0];

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await axios.post('/api/settings', {
        language: localLang,
        crop_cluster: cropCluster,
        notifications,
        price_alerts: priceAlerts,
        provider,
        llm_model: llmModel,
      }, { headers });

      if (response.data.success) {
        localStorage.setItem('lang', localLang);
        localStorage.setItem('cropCluster', cropCluster);
        localStorage.setItem('notifications', notifications);
        localStorage.setItem('priceAlerts', priceAlerts);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        setTimeout(() => window.location.reload(), 500);
      } else {
        setError(response.data.error || 'Failed to save settings');
      }
    } catch (err) {
      console.error('Error saving settings:', err);
      setError('Failed to save settings to server');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveApiKey = async () => {
    if (!apiKey || apiKey === '••••••••') return;
    try {
      setError(null);
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await axios.post('/api/settings', {
        api_key: apiKey,
        provider,
        llm_model: llmModel,
      }, { headers });
      if (response.data.success) {
        setApiKey('••••••••');
        setApiKeyMasked('••••••••');
        setTestResult({ success: true, message: 'API key saved successfully' });
        setTimeout(() => setTestResult(null), 3000);
      } else {
        setError(response.data.error || 'Failed to save API key');
      }
    } catch (err) {
      console.error('Error saving API key:', err);
      setError('Failed to save API key');
    }
  };

  const handleTestConnection = async () => {
    try {
      setTesting(true);
      setTestResult(null);
      setError(null);
      const testKey = apiKey && apiKey !== '••••••••' ? apiKey : null;
      if (!testKey) {
        setError('Enter an API key first before testing.');
        setTesting(false);
        return;
      }
      const response = await axios.post('/api/settings/test-llm', {
        api_key: testKey,
        provider,
        model: llmModel,
      });
      if (response.data.success) {
        setTestResult({ success: true, message: 'Connection successful! LLM responded correctly.' });
      } else {
        setTestResult({ success: false, message: response.data.error || 'Test failed' });
      }
    } catch (err) {
      setTestResult({ success: false, message: err.response?.data?.error || 'Connection failed' });
    } finally {
      setTesting(false);
    }
  };

  const handlePurgeCache = () => {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('analysis_') || k.startsWith('crop_'));
    keys.forEach(k => localStorage.removeItem(k));
    setCacheSize(0);
    alert('Cache purged successfully');
  };

  const handleResetSettings = async () => {
    if (window.confirm('Are you sure you want to reset all settings to default values?')) {
      try {
        setSaving(true);
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const response = await axios.post('/api/settings/reset', {}, { headers });
        if (response.data.success) {
          const s = response.data.settings;
          setLocalLang(s.language || 'EN');
          setCropCluster(s.crop_cluster || 'All Karnataka');
          setNotifications(s.notifications !== false);
          setPriceAlerts(s.price_alerts !== false);
          setProvider('openrouter');
          setLlmModel('openai/gpt-4o-mini');
          localStorage.setItem('lang', s.language);
          localStorage.setItem('cropCluster', s.crop_cluster);
          localStorage.setItem('notifications', s.notifications);
          localStorage.setItem('priceAlerts', s.price_alerts);
          alert('Settings reset to defaults');
          setTimeout(() => window.location.reload(), 500);
        }
      } catch (err) {
        console.error('Error resetting settings:', err);
        alert('Failed to reset settings');
      } finally {
        setSaving(false);
      }
    }
  };

  if (loading) {
    return (
      <div className="pt-24 min-h-screen bg-[#fafaf9] px-6 pb-20 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#84cc16] mx-auto mb-4" />
          <p className="text-stone-600 font-bold">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 min-h-screen bg-[#fafaf9] px-6 pb-20">
      <GrainOverlay />
      <div className="max-w-5xl mx-auto">
        <header className="mb-12">
          <SectionLabel text="Settings" icon={Settings} />
          <h1 className="font-serif text-5xl font-black text-[#0c0a09] mb-4">Control <span className="italic text-[#84cc16]">Panel.</span></h1>
          <p className="text-stone-500 text-base font-medium max-w-2xl">Configure your AI provider, language, and system preferences.</p>
        </header>

        {error && (
          <div className="mb-6 bg-red-50 border-2 border-red-200 rounded-2xl p-4 flex gap-3">
            <AlertTriangle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-700 font-bold text-sm">{error}</p>
          </div>
        )}

        <div className="grid lg:grid-cols-[1fr_400px] gap-10">
          <div className="space-y-6">
            {/* LLM Provider */}
            <div className="bg-white border-2 border-stone-200 rounded-[3rem] p-10 shadow-xl">
              <div className="mb-8">
                <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-stone-400 mb-2">AI Provider</h3>
                <h2 className="font-serif text-4xl font-black text-[#0c0a09]">Language Model</h2>
                <p className="text-stone-500 text-sm mt-2 font-medium">Choose your LLM provider and enter your API key.</p>
              </div>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-3">
                  {PROVIDERS.map(p => (
                    <button key={p.id} onClick={() => { setProvider(p.id); setLlmModel(p.models[0]); }}
                      className={`p-4 rounded-2xl border-2 font-black text-sm uppercase tracking-wider transition-all ${provider === p.id ? 'bg-[#84cc16]/10 border-[#84cc16] text-[#0c0a09]' : 'bg-stone-50 border-stone-200 text-stone-500 hover:border-stone-300'}`}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
                <div>
                  <label className="block font-black text-xs uppercase tracking-widest text-stone-500 mb-3">Model</label>
                  <select value={llmModel} onChange={(e) => setLlmModel(e.target.value)}
                    className="w-full bg-stone-50 border-2 border-stone-200 rounded-2xl p-5 font-bold text-stone-700 outline-none focus:ring-4 focus:ring-[#84cc16]/10 focus:border-[#84cc16] transition-all"
                  >
                    {currentProvider.models.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-black text-xs uppercase tracking-widest text-stone-500 mb-3">API Key</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input type={showKey ? 'text' : 'password'}
                        value={apiKey === '••••••••' ? '' : apiKey}
                        onChange={(e) => { setApiKey(e.target.value); setTestResult(null); }}
                        placeholder={apiKey === '••••••••' ? 'Key is set (enter new to change)' : `${currentProvider.keyPrefix}...`}
                        className="w-full bg-stone-50 border-2 border-stone-200 rounded-2xl p-5 pr-12 font-bold text-stone-700 outline-none focus:ring-4 focus:ring-[#84cc16]/10 focus:border-[#84cc16] transition-all"
                      />
                      <button onClick={() => setShowKey(!showKey)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors"
                      >
                        {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    <button onClick={handleSaveApiKey} disabled={!apiKey || apiKey === '••••••••'}
                      className="px-6 rounded-2xl font-black text-sm uppercase tracking-wider bg-[#84cc16] text-[#0c0a09] hover:bg-[#facc15] transition-all disabled:opacity-50"
                    >
                      Save
                    </button>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={handleTestConnection} disabled={testing || !apiKey || apiKey === '••••••••'}
                    className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-sm uppercase tracking-wider bg-stone-900 text-white hover:bg-stone-800 transition-all disabled:opacity-50"
                  >
                    {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                    {testing ? 'Testing...' : 'Test Connection'}
                  </button>
                </div>
                {testResult && (
                  <div className={`flex items-center gap-3 p-4 rounded-2xl border-2 ${testResult.success ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                    {testResult.success ? <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" /> : <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />}
                    <span className={`font-bold text-sm ${testResult.success ? 'text-emerald-700' : 'text-red-700'}`}>{testResult.message}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Regional Configuration */}
            <div className="bg-white border-2 border-stone-200 rounded-[3rem] p-10 shadow-xl">
              <div className="mb-8">
                <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-stone-400 mb-2">Regional Configuration</h3>
                <h2 className="font-serif text-4xl font-black text-[#0c0a09]">Localization Protocol</h2>
              </div>
              <div className="space-y-6">
                <div>
                  <label className="block font-black text-xs uppercase tracking-widest text-stone-500 mb-3">Primary Language</label>
                  <select value={localLang} onChange={(e) => setLocalLang(e.target.value)}
                    className="w-full bg-stone-50 border-2 border-stone-200 rounded-2xl p-5 font-bold text-stone-700 outline-none focus:ring-4 focus:ring-[#84cc16]/10 focus:border-[#84cc16] transition-all">
                    <option value="EN">English (Default)</option>
                    <option value="KN">ಕನ್ನಡ (Kannada)</option>
                    <option value="TE">తెలుగు (Telugu)</option>
                    <option value="TA">தமிழ் (Tamil)</option>
                    <option value="HI">हिन्दी (Hindi)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-black text-xs uppercase tracking-widest text-stone-500 mb-3">Crop Cluster Region</label>
                  <select value={cropCluster} onChange={(e) => setCropCluster(e.target.value)}
                    className="w-full bg-stone-50 border-2 border-stone-200 rounded-2xl p-5 font-bold text-stone-700 outline-none focus:ring-4 focus:ring-[#84cc16]/10 focus:border-[#84cc16] transition-all">
                    <option value="All Karnataka">All Karnataka (Statewide)</option>
                    <option value="North Karnataka">North Karnataka (Hubli, Belagavi)</option>
                    <option value="South Karnataka">South Karnataka (Bangalore, Mandya)</option>
                    <option value="Coastal Karnataka">Coastal Karnataka (Mangalore, Udupi)</option>
                    <option value="Malnad">Malnad Highlands (Coffee Belt)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Alerts */}
            <div className="bg-white border-2 border-stone-200 rounded-[3rem] p-10 shadow-xl">
              <div className="mb-8">
                <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-stone-400 mb-2">Alert System</h3>
                <h2 className="font-serif text-4xl font-black text-[#0c0a09]">Notification Matrix</h2>
              </div>
              <div className="space-y-4">
                <Toggle checked={notifications} onChange={setNotifications} label="Pathogen Detection Alerts" />
                <Toggle checked={priceAlerts} onChange={setPriceAlerts} label="Market Price Notifications" />
              </div>
            </div>

            {/* Save */}
            <div className="space-y-3">
              <button onClick={handleSave} disabled={saved || saving}
                className={`w-full py-6 rounded-3xl font-black text-lg uppercase tracking-wider shadow-2xl transition-all flex items-center justify-center gap-2 ${saved ? 'bg-[#10b981] text-white' : saving ? 'bg-[#84cc16]/50 text-[#0c0a09] cursor-wait' : 'bg-[#84cc16] text-[#0c0a09] hover:bg-[#facc15] hover:scale-[1.02]'}`}>
                {saving && <Loader2 size={18} className="animate-spin" />}
                {saved ? '✓ Configuration Saved' : 'Save Configuration'}
              </button>
              <button onClick={handleResetSettings} disabled={saving}
                className="w-full py-4 rounded-2xl font-bold text-sm uppercase tracking-wider bg-stone-100 text-stone-700 hover:bg-stone-200 transition-all border-2 border-stone-300">
                Reset to Defaults
              </button>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bg-stone-900 border-2 border-stone-800 rounded-[3rem] p-10 shadow-2xl sticky top-32">
              <div className="mb-8">
                <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-[#facc15] mb-2">Data Sovereignty</h3>
                <h2 className="font-serif text-3xl font-black text-white mb-4">Neural Cache</h2>
                <p className="text-stone-400 text-sm font-medium">Local diagnostic history and metadata storage.</p>
              </div>
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-black uppercase tracking-widest text-stone-500">Cache Usage</span>
                    <span className="text-white font-black">{cacheSize} KB</span>
                  </div>
                  <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-[#84cc16] to-[#facc15] transition-all duration-1000"
                      style={{ width: `${Math.min((cacheSize / 100) * 100, 100)}%` }} />
                  </div>
                </div>
                <button onClick={handlePurgeCache}
                  className="w-full bg-red-600 text-white py-5 rounded-2xl font-black text-sm uppercase tracking-wider hover:bg-red-700 transition-all shadow-xl flex items-center justify-center gap-3">
                  <AlertTriangle size={18} /> Purge Diagnostic Cache
                </button>
                <div className="pt-6 border-t border-white/10">
                  <h4 className="text-white font-black text-sm mb-3">Privacy Statement</h4>
                  <p className="text-stone-400 text-xs leading-relaxed">All diagnostic data is stored locally on your device. No analysis results are transmitted to external servers. You maintain complete sovereignty over your agricultural intelligence footprint.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsTerminal;
