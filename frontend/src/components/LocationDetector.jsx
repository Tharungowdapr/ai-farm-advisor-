import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Search, Loader2, AlertCircle, CheckCircle2, Navigation } from 'lucide-react';
import axios from 'axios';

const LocationDetector = ({ onLocationDetected, savedLocation }) => {
    const [location, setLocation] = useState(savedLocation || null);
    const [detecting, setDetecting] = useState(false);
    const [citySearch, setCitySearch] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [error, setError] = useState(null);
    const [showSearch, setShowSearch] = useState(false);

    // Detect location using GPS
    const detectLocation = async () => {
        setDetecting(true);
        setError(null);

        if (!navigator.geolocation) {
            setError('Geolocation is not supported by your browser');
            setDetecting(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                try {
                    // Reverse geocode to get city name
                    const res = await axios.get(
                        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
                    );
                    const addr = res.data.address || {};
                    const city = addr.city || addr.town || addr.village || addr.county || addr.state_district || 'Unknown';
                    const locationData = { lat: latitude, lon: longitude, city, accuracy: position.coords.accuracy };

                    // Save to localStorage
                    localStorage.setItem('user_lat', latitude);
                    localStorage.setItem('user_lon', longitude);
                    localStorage.setItem('user_city', city);
                    localStorage.setItem('location_accuracy', position.coords.accuracy);

                    setLocation(locationData);
                    onLocationDetected?.(locationData);
                    setError(null);
                } catch (err) {
                    const locationData = { lat: latitude, lon: longitude, city: 'GPS Detected', accuracy: position.coords.accuracy };
                    localStorage.setItem('user_lat', latitude);
                    localStorage.setItem('user_lon', longitude);
                    localStorage.setItem('location_accuracy', position.coords.accuracy);
                    setLocation(locationData);
                    onLocationDetected?.(locationData);
                }
                setDetecting(false);
            },
            (err) => {
                setError('Could not detect location: ' + (err.message || 'Permission denied'));
                setDetecting(false);
            },
            { timeout: 10000, enableHighAccuracy: false }
        );
    };

    // Search for city and geocode
    const searchCity = async (city) => {
        if (!city.trim()) {
            setSearchResults([]);
            return;
        }

        setSearching(true);
        try {
            const res = await axios.get(
                `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city + ', India')}&format=json&limit=5`
            );
            setSearchResults(res.data);
        } catch (err) {
            setError('Failed to search cities');
        } finally {
            setSearching(false);
        }
    };

    // Handle city selection
    const selectCity = (result) => {
        const cityName = result.display_name?.split(',')[0] || result.name || result.display_name || 'Unknown';
        const locationData = {
            lat: parseFloat(result.lat),
            lon: parseFloat(result.lon),
            city: cityName,
            accuracy: 1000
        };

        localStorage.setItem('user_lat', result.lat);
        localStorage.setItem('user_lon', result.lon);
        localStorage.setItem('user_city', cityName);
        localStorage.setItem('location_accuracy', 1000);

        setLocation(locationData);
        setShowSearch(false);
        setCitySearch('');
        setSearchResults([]);
        onLocationDetected?.(locationData);
    };

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (citySearch) searchCity(citySearch);
        }, 500);
        return () => clearTimeout(timer);
    }, [citySearch]);

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-[#84cc16]/5 to-[#84cc16]/10 border-2 border-[#84cc16]/30 rounded-3xl p-4 mb-6"
        >
            <div className="flex items-center justify-between gap-4">
                {/* Location Display */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-[#84cc16]/20 flex items-center justify-center flex-shrink-0">
                        <MapPin size={18} className="text-[#84cc16]" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-stone-500">Current Location</p>
                        {location ? (
                            <p className="text-sm font-black text-[#0c0a09] truncate">
                                📍 {location.city || 'Unknown'}
                                <span className="text-[10px] text-stone-500 ml-1.5 opacity-70">
                                    ({Number(location.lat).toFixed(2)}°, {Number(location.lon).toFixed(2)}°)
                                </span>
                            </p>
                        ) : (
                            <p className="text-sm font-bold text-stone-500">No location detected yet</p>
                        )}
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 flex-shrink-0">
                    {location && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex items-center gap-1.5 px-3 py-2 bg-green-500/10 border border-green-500/30 rounded-xl"
                        >
                            <CheckCircle2 size={14} className="text-green-600" />
                            <span className="text-[10px] font-black text-green-700">Located</span>
                        </motion.div>
                    )}

                    <button
                        onClick={() => setShowSearch(!showSearch)}
                        className="px-4 py-2 bg-white border-2 border-[#84cc16]/30 text-[#84cc16] rounded-xl font-black text-xs uppercase tracking-widest hover:bg-[#84cc16]/5 transition-all"
                    >
                        <Search size={14} className="inline mr-1" /> Search
                    </button>

                    <button
                        onClick={detectLocation}
                        disabled={detecting}
                        className="px-4 py-2 bg-[#84cc16] text-[#0c0a09] rounded-xl font-black text-xs uppercase tracking-widest hover:bg-[#a3e635] transition-all disabled:opacity-50 flex items-center gap-1.5"
                    >
                        {detecting ? (
                            <Loader2 size={14} className="animate-spin" />
                        ) : (
                            <Navigation size={14} />
                        )}
                        {detecting ? 'Detecting...' : 'Detect GPS'}
                    </button>
                </div>
            </div>

            {/* Search Box */}
            <AnimatePresence>
                {showSearch && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-4 pt-4 border-t-2 border-[#84cc16]/20"
                    >
                        <div className="relative mb-3">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                            <input
                                type="text"
                                placeholder="Search city name..."
                                value={citySearch}
                                onChange={(e) => setCitySearch(e.target.value)}
                                className="w-full bg-white border-2 border-[#84cc16]/30 rounded-2xl pl-10 pr-4 py-2.5 font-bold text-sm outline-none focus:border-[#84cc16] transition-all"
                                autoFocus
                            />
                            {searching && <Loader2 size={16} className="animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-[#84cc16]" />}
                        </div>

                        {/* Search Results */}
                        {searchResults.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="space-y-2 max-h-60 overflow-y-auto"
                            >
                                {searchResults.map((result, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => selectCity(result)}
                                        className="w-full text-left p-2.5 bg-white hover:bg-[#84cc16]/10 border border-stone-200 hover:border-[#84cc16]/50 rounded-xl transition-all text-sm font-bold text-[#0c0a09] group"
                                    >
                                        <div className="flex items-center gap-2">
                                            <MapPin size={14} className="text-[#84cc16] group-hover:scale-110 transition-transform" />
                                            <div className="flex-1 min-w-0">
                                                <p className="truncate">{result.name || result.display_name}</p>
                                                <p className="text-[10px] text-stone-500 truncate">{result.address?.state || 'India'}</p>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </motion.div>
                        )}

                        {error && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="p-3 bg-red-50 border-2 border-red-200 rounded-xl flex items-start gap-2"
                            >
                                <AlertCircle size={14} className="text-red-600 flex-shrink-0 mt-0.5" />
                                <p className="text-xs font-bold text-red-700">{error}</p>
                            </motion.div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default LocationDetector;
