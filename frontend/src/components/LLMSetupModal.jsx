import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, CheckCircle2, AlertTriangle, Copy, Eye, EyeOff } from 'lucide-react';
import axios from 'axios';

const LLMSetupModal = ({ isOpen, onClose, onSuccess }) => {
    const [apiKey, setApiKey] = useState(() => localStorage.getItem('vani_api_key') || '');
    const [showKey, setShowKey] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState(null);
    const [copied, setCopied] = useState(false);
    const [saving, setSaving] = useState(false);
    const [step, setStep] = useState(apiKey ? 'configure' : 'info');

    const handleSave = async () => {
        if (!apiKey.trim()) {
            setTestResult({ success: false, message: 'API key cannot be empty' });
            return;
        }

        setSaving(true);
        try {
            localStorage.setItem('vani_api_key', apiKey);
            setTestResult({ success: true, message: 'API key saved successfully!' });
            setTimeout(() => {
                if (onSuccess) onSuccess();
                onClose();
            }, 1500);
        } catch (err) {
            setTestResult({ success: false, message: 'Failed to save API key' });
        } finally {
            setSaving(false);
        }
    };

    const handleTestKey = async () => {
        if (!apiKey.trim()) {
            setTestResult({ success: false, message: 'Enter an API key first' });
            return;
        }

        setTesting(true);
        setTestResult(null);
        try {
            const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
                model: 'llama-3.3-70b-versatile',
                messages: [{ role: 'user', content: 'Say "Groq API working"' }],
                max_tokens: 10
            }, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.status === 200) {
                setTestResult({
                    success: true,
                    message: 'Connection successful! Groq API is working.',
                    model: 'llama-3.3-70b-versatile'
                });
            }
        } catch (err) {
            const errorMsg = err.response?.data?.error?.message ||
                err.response?.status === 401 ? 'Invalid API key - check your key' :
                err.response?.status === 429 ? 'Rate limit exceeded - try again later' :
                    'Connection failed - check your key and internet';
            setTestResult({ success: false, message: errorMsg });
        } finally {
            setTesting(false);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(apiKey);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                >
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        className="bg-white dark:bg-stone-900 rounded-3xl p-8 max-w-2xl w-full shadow-2xl border-2 border-stone-200 dark:border-stone-700 relative overflow-hidden"
                    >
                        {/* Close button */}
                        <button
                            onClick={onClose}
                            className="absolute top-6 right-6 p-2 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors"
                        >
                            <X size={20} className="text-stone-500" />
                        </button>

                        {step === 'info' && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                <div className="text-center mb-8">
                                    <div className="w-16 h-16 bg-[#84cc16]/10 rounded-3xl flex items-center justify-center mx-auto mb-4">
                                        <span className="text-3xl">🔑</span>
                                    </div>
                                    <h2 className="text-3xl font-black text-stone-900 dark:text-white mb-2">Setup LLM API Key</h2>
                                    <p className="text-stone-600 dark:text-stone-400 text-sm leading-relaxed">
                                        To use Vani AI Chat and advanced features, you'll need a Groq API key. This setup is <strong>completely offline</strong> — your key is stored locally on your device only.
                                    </p>
                                </div>

                                <div className="space-y-4 mb-8">
                                    <div className="bg-blue-100 dark:bg-blue-900 border-2 border-blue-300 dark:border-blue-700 rounded-2xl p-4">
                                        <h3 className="font-bold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
                                            <span className="text-lg">ℹ️</span> What is Groq?
                                        </h3>
                                        <p className="text-sm text-blue-900 dark:text-blue-100 font-semibold">
                                            Groq is a free AI API provider. Their models are fast (perfect for real-time chat) and free up to certain limits.
                                        </p>
                                    </div>

                                    <div className="bg-green-100 dark:bg-green-900 border-2 border-green-300 dark:border-green-700 rounded-2xl p-4">
                                        <h3 className="font-bold text-green-900 dark:text-green-100 mb-2 flex items-center gap-2">
                                            <span className="text-lg">✅</span> Privacy First
                                        </h3>
                                        <p className="text-sm text-green-900 dark:text-green-100 font-semibold">
                                            Your API key is stored <strong>only in your browser</strong>. We never send it to any server. You control your data.
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <ol className="space-y-2 text-sm text-stone-700 dark:text-stone-300">
                                        <li className="flex gap-3">
                                            <span className="font-black text-[#84cc16] flex-shrink-0">1.</span>
                                            <span>Visit <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="text-[#84cc16] font-bold hover:underline">console.groq.com/keys</a></span>
                                        </li>
                                        <li className="flex gap-3">
                                            <span className="font-black text-[#84cc16] flex-shrink-0">2.</span>
                                            <span>Create an account (free) or sign in</span>
                                        </li>
                                        <li className="flex gap-3">
                                            <span className="font-black text-[#84cc16] flex-shrink-0">3.</span>
                                            <span>Click "Create API Key" and copy it</span>
                                        </li>
                                        <li className="flex gap-3">
                                            <span className="font-black text-[#84cc16] flex-shrink-0">4.</span>
                                            <span>Paste the key below</span>
                                        </li>
                                    </ol>
                                </div>

                                <button
                                    onClick={() => setStep('configure')}
                                    className="w-full mt-8 py-4 bg-[#84cc16] text-[#0c0a09] rounded-2xl font-black uppercase text-sm tracking-wider hover:bg-[#a3e635] transition-all shadow-lg"
                                >
                                    Continue
                                </button>
                            </motion.div>
                        )}

                        {step === 'configure' && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                <div className="mb-8">
                                    <h2 className="text-3xl font-black text-stone-900 dark:text-white mb-2">Enter Your API Key</h2>
                                    <p className="text-stone-600 dark:text-stone-400 text-sm">
                                        Your key stays on this device only. Never shared with anyone.
                                    </p>
                                </div>

                                <div className="space-y-4 mb-6">
                                    <label className="block">
                                        <span className="text-xs font-black uppercase tracking-widest text-stone-700 dark:text-stone-300 mb-2 block">
                                            Groq API Key
                                        </span>
                                        <div className="relative">
                                            <input
                                                type={showKey ? 'text' : 'password'}
                                                value={apiKey}
                                                onChange={(e) => setApiKey(e.target.value)}
                                                placeholder="gsk_..."
                                                className="w-full bg-white dark:bg-stone-800 border-2 border-stone-300 dark:border-stone-600 rounded-2xl px-4 py-3 pr-12 font-mono text-sm text-stone-900 dark:text-white outline-none focus:border-[#84cc16] dark:focus:border-[#84cc16] transition-all"
                                            />
                                            <button
                                                onClick={() => setShowKey(!showKey)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-stone-200 dark:hover:bg-stone-700 rounded transition-colors"
                                            >
                                                {showKey ? (
                                                    <EyeOff size={18} className="text-stone-600 dark:text-stone-400" />
                                                ) : (
                                                    <Eye size={18} className="text-stone-600 dark:text-stone-400" />
                                                )}
                                            </button>
                                        </div>
                                    </label>

                                    {apiKey && (
                                        <button
                                            onClick={copyToClipboard}
                                            className="w-full py-2 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-stone-200 dark:hover:bg-stone-700 transition-all"
                                        >
                                            <Copy size={14} />
                                            {copied ? 'Copied!' : 'Copy Key'}
                                        </button>
                                    )}
                                </div>

                                {testResult && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className={`p-4 rounded-2xl border-2 flex items-start gap-3 mb-6 ${testResult.success
                                            ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800'
                                            : 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'
                                            }`}
                                    >
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${testResult.success ? 'bg-green-500' : 'bg-red-500'
                                            }`}>
                                            {testResult.success ? (
                                                <CheckCircle2 size={16} className="text-white" />
                                            ) : (
                                                <AlertTriangle size={16} className="text-white" />
                                            )}
                                        </div>
                                        <div>
                                            <p className={`font-bold text-sm ${testResult.success ? 'text-green-700 dark:text-green-200' : 'text-red-700 dark:text-red-200'}`}>
                                                {testResult.success ? 'Success!' : 'Error'}
                                            </p>
                                            <p className="text-xs text-stone-600 dark:text-stone-400 mt-1">{testResult.message}</p>
                                            {testResult.model && (
                                                <p className="text-[10px] text-stone-500 dark:text-stone-500 mt-1 uppercase tracking-widest font-bold">
                                                    Model: {testResult.model}
                                                </p>
                                            )}
                                        </div>
                                    </motion.div>
                                )}

                                <div className="flex gap-3">
                                    <button
                                        onClick={handleTestKey}
                                        disabled={testing || !apiKey.trim()}
                                        className="flex-1 py-3 bg-stone-200 dark:bg-stone-800 text-stone-800 dark:text-stone-200 rounded-2xl font-black uppercase text-xs tracking-wider hover:bg-stone-300 dark:hover:bg-stone-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {testing ? <Loader2 size={14} className="animate-spin" /> : '🧪'}
                                        {testing ? 'Testing...' : 'Test'}
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        disabled={saving || !apiKey.trim()}
                                        className="flex-1 py-3 bg-[#84cc16] text-[#0c0a09] rounded-2xl font-black uppercase text-xs tracking-wider hover:bg-[#a3e635] transition-all disabled:opacity-50 shadow-lg flex items-center justify-center gap-2"
                                    >
                                        {saving ? <Loader2 size={14} className="animate-spin" /> : '✓'}
                                        {saving ? 'Saving...' : 'Save'}
                                    </button>
                                </div>

                                <button
                                    onClick={() => setStep('info')}
                                    className="w-full mt-3 py-2 text-stone-600 dark:text-stone-400 text-sm font-bold hover:text-stone-800 dark:hover:text-stone-200 transition-colors"
                                >
                                    ← Back
                                </button>
                            </motion.div>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default LLMSetupModal;
