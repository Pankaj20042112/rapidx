import React, { useState, useEffect } from 'react';
import { 
  Car, Bike, ShieldAlert, Navigation, Wallet, Star, MessageSquare, 
  MapPin, Clock, Tag, CheckCircle2, Phone, Send, X, AlertTriangle, 
  Home, Compass, History, User, Globe, Share2, HelpCircle, Info, ChevronRight, Plus, Search,
  Menu, Bell, Crosshair, SlidersHorizontal, Percent, Calendar, Users, Plane, ShieldCheck, LogOut, Check
} from 'lucide-react';
import { io } from 'socket.io-client';

const BACKEND_URL = `http://${window.location.hostname}:4000`;
const socket = io(BACKEND_URL);

// High-Quality Custom SVG Illustrations for Vehicle Types
const BikeIllustration = () => (
  <svg className="w-16 h-12 my-1" viewBox="0 0 120 80" fill="none">
    <path d="M25 60a15 15 0 1 0 0-30 15 15 0 0 0 0 30z" fill="#312E81" stroke="#818CF8" strokeWidth="4"/>
    <path d="M95 60a15 15 0 1 0 0-30 15 15 0 0 0 0 30z" fill="#312E81" stroke="#818CF8" strokeWidth="4"/>
    <path d="M30 45h30l15-20h20" stroke="#A5B4FC" strokeWidth="6" strokeLinecap="round"/>
    <path d="M45 45l10-25h20" stroke="#6366F1" strokeWidth="6" strokeLinecap="round"/>
    <path d="M60 25h25" stroke="#C7D2FE" strokeWidth="4" strokeLinecap="round"/>
    <circle cx="85" cy="20" r="10" fill="#818CF8"/>
    <path d="M35 30c-5-10 10-15 25-10" fill="#4F46E5"/>
  </svg>
);

const AutoIllustration = () => (
  <svg className="w-16 h-12 my-1" viewBox="0 0 120 80" fill="none">
    <path d="M15 50c0-20 10-35 45-35h30c10 0 15 10 15 20v20H15v-5z" fill="#15803D"/>
    <path d="M20 30h35v15H20z" fill="#FACC15"/>
    <path d="M60 30h30v15H60z" fill="#1E293B"/>
    <path d="M25 65a10 10 0 1 0 0-20 10 10 0 0 0 0 20z" fill="#0F172A" stroke="#FACC15" strokeWidth="3"/>
    <path d="M85 65a10 10 0 1 0 0-20 10 10 0 0 0 0 20z" fill="#0F172A" stroke="#FACC15" strokeWidth="3"/>
  </svg>
);

const CabEcoIllustration = () => (
  <svg className="w-16 h-12 my-1" viewBox="0 0 120 80" fill="none">
    <path d="M10 50c5-15 15-25 35-25h40c15 0 25 10 28 25H10z" fill="#F8FAFC"/>
    <path d="M30 30l10-10h35l12 10H30z" fill="#0284C7"/>
    <path d="M15 50h90v12H15z" fill="#E2E8F0"/>
    <path d="M30 65a10 10 0 1 0 0-20 10 10 0 0 0 0 20z" fill="#0F172A" stroke="#38BDF8" strokeWidth="3"/>
    <path d="M85 65a10 10 0 1 0 0-20 10 10 0 0 0 0 20z" fill="#0F172A" stroke="#38BDF8" strokeWidth="3"/>
  </svg>
);

const CabXLIllustration = () => (
  <svg className="w-16 h-12 my-1" viewBox="0 0 120 80" fill="none">
    <path d="M10 52c3-20 15-30 40-30h45c10 0 15 10 18 30H10z" fill="#F1F5F9"/>
    <path d="M25 28l12-12h45l10 12H25z" fill="#334155"/>
    <path d="M10 52h100v12H10z" fill="#CBD5E1"/>
    <path d="M28 66a11 11 0 1 0 0-22 11 11 0 0 0 0 22z" fill="#0F172A" stroke="#64748B" strokeWidth="4"/>
    <path d="M88 66a11 11 0 1 0 0-22 11 11 0 0 0 0 22z" fill="#0F172A" stroke="#64748B" strokeWidth="4"/>
  </svg>
);

export default function CustomerApp() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('ridex_cust_token'));
  const [phone, setPhone] = useState('+18888888888');
  const [otp, setOtp] = useState('123456');

  // Auth Screen State
  const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER'>('REGISTER');
  const [fullName, setFullName] = useState('Alex Johnson');
  const [email, setEmail] = useState('alex.johnson@ridex.com');
  const [referralInput, setReferralInput] = useState('RIDEX50');
  const [otpSent, setOtpSent] = useState(false);

  // Navigation Tab State
  const [currentTab, setCurrentTab] = useState<'HOME' | 'RIDES' | 'ACTIVITY' | 'WALLET' | 'PROFILE'>('HOME');
  const [language, setLanguage] = useState<'en' | 'hi' | 'gu'>('en');
  const [dict, setDict] = useState<Record<string, string>>({});

  // Interactive UI Feature Drawers & Modals
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [addStopOpen, setAddStopOpen] = useState(false);
  const [intermediateStop, setIntermediateStop] = useState('');
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [routeFilter, setRouteFilter] = useState<'FASTEST' | 'AVOID_TOLLS' | 'EV_ONLY'>('FASTEST');
  const [serviceModal, setServiceModal] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Location & Booking State
  const [pickup, setPickup] = useState('LD College of Engineering');
  const [destination, setDestination] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'BIKE' | 'AUTO' | 'CAB_ECONOMY' | 'CAB_PREMIUM'>('BIKE');
  const [coupon, setCoupon] = useState('RIDEX10');
  const [couponApplied, setCouponApplied] = useState(false);
  const [estimate, setEstimate] = useState<any>(null);
  const [whyPriceModal, setWhyPriceModal] = useState(false);
  const [priceBreakdown, setPriceBreakdown] = useState<any>(null);

  // Active Ride & Chat
  const [activeRide, setActiveRide] = useState<any>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ sender: string; text: string }>>([
    { sender: 'Driver', text: "Hello! I am on my way to your pickup location." }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [sosModal, setSosModal] = useState(false);
  const [ratingModal, setRatingModal] = useState(false);
  const [ratingStars, setRatingStars] = useState(5);
  const [ratingFeedback, setRatingFeedback] = useState('Smooth and safe ride!');
  const [cancelModal, setCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('⏱️ Driver taking too long to arrive');
  const [customCancelReason, setCustomCancelReason] = useState('');

  // Wallet & User Profile
  const [userProfile, setUserProfile] = useState<any>(null);
  const [walletBalance, setWalletBalance] = useState(350);
  const [walletTxns, setWalletTxns] = useState<any[]>([]);
  const [addMoneyModal, setAddMoneyModal] = useState(false);
  const [addAmount, setAddAmount] = useState('100');

  useEffect(() => {
    fetchTranslations(language);
  }, [language]);

  useEffect(() => {
    if (token) {
      fetchProfile();
      fetchEstimate();
      fetchWallet();
    }
  }, [token, selectedCategory, couponApplied]);

  useEffect(() => {
    if (!activeRide?.id) return;
    const interval = setInterval(() => { fetchRideDetails(activeRide.id); }, 2500);
    socket.on(`chat:ride:${activeRide.id}`, (data: any) => {
      setChatMessages(prev => [...prev, { sender: data.senderId === 'CUSTOMER' ? 'You' : 'Driver', text: data.message }]);
    });
    return () => {
      clearInterval(interval);
      socket.off(`chat:ride:${activeRide.id}`);
    };
  }, [activeRide?.id]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const fetchTranslations = async (lang: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/i18n/${lang}`);
      const data = await res.json();
      if (data.success) setDict(data.data);
    } catch (e) {
      console.error(e);
    }
  };

  const sendOtp = async () => {
    if (!phone) return alert('Please enter a valid phone number');
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      });
      const data = await res.json();
      if (data.success) {
        setOtpSent(true);
        setOtp('123456');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleVerifyOtp = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp, role: 'CUSTOMER', fullName: authMode === 'REGISTER' ? fullName : undefined })
      });
      const data = await res.json();
      if (data.success) {
        setToken(data.data.token);
        localStorage.setItem('ridex_cust_token', data.data.token);
        fetchProfile();
        fetchEstimate();
      } else {
        alert(data.error?.message || 'Invalid OTP');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchProfile = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/users/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setUserProfile(data.data);
        setWalletBalance(data.data.walletBalance);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchEstimate = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/rides/estimate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pickupLat: 12.9716, pickupLng: 77.5946,
          destinationLat: 13.0827, destinationLng: 80.2707,
          vehicleType: selectedCategory,
          couponCode: couponApplied ? 'RIDEX10' : undefined
        })
      });
      const data = await res.json();
      if (data.success) setEstimate(data.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchWhyPrice = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/rides/breakdown`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ distanceKm: estimate?.distanceKm || 10, durationMin: estimate?.durationMin || 20, vehicleType: selectedCategory, surge: 1.0 })
      });
      const data = await res.json();
      if (data.success) {
        setPriceBreakdown(data.data);
        setWhyPriceModal(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchWallet = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/wallet`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setWalletBalance(data.data.wallet.balance);
        setWalletTxns(data.data.transactions);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const addMoneyToWallet = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/wallet/add-money`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount: Number(addAmount) })
      });
      const data = await res.json();
      if (data.success) {
        setWalletBalance(data.data.balance);
        setAddMoneyModal(false);
        fetchWallet();
        showToast(`💰 Added $${addAmount} to Wallet successfully!`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const confirmRide = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/rides`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          pickupLat: 12.9716, pickupLng: 77.5946, pickupAddress: pickup,
          destinationLat: 13.0827, destinationLng: 80.2707, destinationAddress: destination || 'Chandkheda, Ahmedabad',
          vehicleType: selectedCategory,
          couponCode: couponApplied ? 'RIDEX10' : undefined
        })
      });
      const data = await res.json();
      if (data.success) {
        setActiveRide(data.data);
        showToast('🚖 Searching for nearby RideX driver...');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchRideDetails = async (rideId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/rides/${rideId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        if (data.data.status === 'COMPLETED') {
          if (!ratingModal) setRatingModal(true);
          setActiveRide(null);
        } else if (data.data.status === 'CANCELLED') {
          setActiveRide(null);
        } else {
          setActiveRide(data.data);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const sendChatMessage = (textToSend?: string) => {
    const messageText = textToSend || chatInput;
    if (!messageText.trim() || !activeRide) return;
    socket.emit('chat:send_message', { rideId: activeRide.id, senderId: 'CUSTOMER', message: messageText });
    setChatMessages(prev => [...prev, { sender: 'You', text: messageText }]);
    setChatInput('');
  };

  const handleCancelRide = async () => {
    if (!activeRide?.id || !token) return;
    const finalReason = customCancelReason.trim() || cancelReason;
    try {
      const res = await fetch(`${BACKEND_URL}/api/rides/${activeRide.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason: finalReason })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`❌ Ride Cancelled: "${finalReason}"`);
        setCancelModal(false);
        setActiveRide(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCurrentLocation = () => {
    setPickup('LD College of Engineering, Navrangpura, Ahmedabad');
    showToast('🎯 Pickup set to Current GPS Location');
  };

  const handleRecenterMap = () => {
    showToast('🗺️ Map recentered on current pickup location');
  };

  const handleSelectQuickFilter = (placeLabel: string) => {
    switch (placeLabel) {
      case 'Home': setDestination('Home: 124 Innovation Avenue'); break;
      case 'Work': setDestination('Work: Tech Hub Tower B'); break;
      case 'Recent': setDestination('Recent: Airport Terminal 2'); break;
      case 'Favorite': setDestination('Favorite: Central Mall Downtown'); break;
      case 'More': setDestination('Saefliapur Lake, Paldi, Ahmedabad'); break;
    }
    showToast(`📍 Destination set to ${placeLabel}`);
  };

  const submitRatingAndDismiss = async () => {
    if (activeRide?.id) {
      try {
        await fetch(`${BACKEND_URL}/api/ratings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ rideId: activeRide.id, score: ratingStars, feedback: ratingFeedback })
        });
      } catch (e) {
        console.error(e);
      }
    }
    setRatingModal(false);
    setActiveRide(null);
    showToast('⭐ Thank you for rating your driver!');
  };

  // Dedicated Registration & Login Screen
  if (!token) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex flex-col justify-between p-5 font-sans relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#6366f1_1px,transparent_1px)] [background-size:24px_24px]"></div>

        <header className="flex justify-between items-center z-10">
          <div className="bg-indigo-600 p-2.5 rounded-2xl text-white font-black text-xl flex items-center shadow-lg shadow-indigo-600/30">
            <Car className="w-6 h-6 mr-1.5" /> Ride<span className="text-emerald-400">X</span>
          </div>

          <div className="flex bg-gray-900 border border-gray-800 rounded-full p-1 text-xs font-bold">
            {(['en', 'hi', 'gu'] as const).map(lang => (
              <button
                key={lang}
                onClick={() => setLanguage(lang)}
                className={`px-3 py-1 rounded-full uppercase transition ${language === lang ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                {lang}
              </button>
            ))}
          </div>
        </header>

        <div className="my-auto max-w-md w-full mx-auto z-10 glass-panel border border-gray-800 p-6 rounded-3xl shadow-2xl">
          <div className="flex bg-gray-900 border border-gray-800 rounded-2xl p-1 mb-6">
            <button
              onClick={() => { setAuthMode('REGISTER'); setOtpSent(false); }}
              className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition ${authMode === 'REGISTER' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
            >
              Create Account
            </button>
            <button
              onClick={() => { setAuthMode('LOGIN'); setOtpSent(false); }}
              className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition ${authMode === 'LOGIN' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
            >
              Sign In
            </button>
          </div>

          <h2 className="text-2xl font-black text-white mb-1">
            {authMode === 'REGISTER' ? 'Register New Rider' : 'Welcome Back'}
          </h2>
          <p className="text-xs text-gray-400 mb-6">
            {authMode === 'REGISTER' ? 'Enter your details to create a RideX account & get $50 bonus' : 'Enter your mobile number to sign in'}
          </p>

          {!otpSent ? (
            <div className="space-y-4">
              {authMode === 'REGISTER' && (
                <>
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase">Full Name</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Alex Johnson"
                      className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase">Email Address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. alex@example.com"
                      className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 mt-1"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="text-xs font-bold text-gray-400 uppercase">Mobile Phone Number</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+18888888888"
                  className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 mt-1"
                />
              </div>

              {authMode === 'REGISTER' && (
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase">Referral Code (Optional)</label>
                  <input
                    type="text"
                    value={referralInput}
                    onChange={(e) => setReferralInput(e.target.value)}
                    placeholder="RIDEX50"
                    className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 mt-1 uppercase"
                  />
                </div>
              )}

              <button
                onClick={sendOtp}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold py-3.5 rounded-xl text-sm shadow-lg shadow-indigo-600/30 active:scale-[0.98] transition mt-2"
              >
                Send OTP Verification Code
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-gray-900 border border-indigo-500/30 p-4 rounded-2xl text-center">
                <p className="text-xs text-gray-400">OTP Sent to <span className="font-bold text-white">{phone}</span></p>
                <button onClick={() => setOtp('123456')} className="mt-2 text-xs bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 px-3 py-1 rounded-full font-bold">
                  ⚡ Auto-Fill Demo OTP (123456)
                </button>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 uppercase">Enter 6-Digit OTP</label>
                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-full bg-gray-900 border border-indigo-500 rounded-xl px-4 py-3 text-center text-2xl font-black tracking-widest text-emerald-400 focus:outline-none mt-1"
                />
              </div>

              <button
                onClick={handleVerifyOtp}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-black py-3.5 rounded-xl text-base shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition"
              >
                {authMode === 'REGISTER' ? 'Complete Registration' : 'Verify & Sign In'}
              </button>

              <div className="flex justify-between items-center text-xs text-gray-400 pt-2">
                <button onClick={() => setOtpSent(false)} className="hover:text-white font-bold">← Change Phone</button>
                <button onClick={sendOtp} className="text-indigo-400 font-bold hover:underline">Resend OTP</button>
              </div>
            </div>
          )}
        </div>

        <footer className="text-center text-[11px] text-gray-500 z-10">
          By signing in, you agree to RideX Terms of Service & Privacy Policy
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070A12] text-white flex flex-col justify-between relative font-sans">
      {/* Live Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-indigo-600 text-white px-5 py-2.5 rounded-full text-xs font-black shadow-2xl border border-indigo-400 animate-bounce">
          {toastMessage}
        </div>
      )}

      {/* 1. Header Bar */}
      <header className="px-4 py-3.5 bg-gray-950/80 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between border-b border-gray-800/60 shadow-xl">
        <div className="flex items-center space-x-3">
          {/* Hamburger Drawer Button */}
          <button onClick={() => setDrawerOpen(true)} className="p-2 bg-gray-900 border border-gray-800 hover:border-indigo-500/50 rounded-xl text-gray-300 transition">
            <Menu className="w-5 h-5" />
          </button>
          <div className="text-2xl font-black tracking-tight text-white flex items-center">
            Ride<span className="text-indigo-500">X</span>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          {/* Notification Bell Button */}
          <button onClick={() => setNotifOpen(true)} className="p-2 bg-gray-900 border border-gray-800 hover:border-indigo-500/50 rounded-xl text-gray-300 relative transition">
            <Bell className="w-5 h-5" />
            <span className="w-2.5 h-2.5 bg-rose-500 rounded-full absolute top-1.5 right-1.5 ring-2 ring-gray-950"></span>
          </button>

          {/* Wallet Balance Badge */}
          <div onClick={() => setCurrentTab('WALLET')} className="bg-indigo-950/60 border border-indigo-500/40 px-3.5 py-1.5 rounded-xl flex items-center space-x-2 text-xs font-bold shadow-md cursor-pointer hover:bg-indigo-900/60 transition">
            <Wallet className="w-4 h-4 text-indigo-400" />
            <span className="text-indigo-300">${walletBalance.toFixed(2)}</span>
          </div>
        </div>
      </header>

      {/* 2. Main Scrollable Container */}
      <main className="flex-1 relative flex flex-col justify-between overflow-y-auto pb-24">

        {/* HOME TAB */}
        {currentTab === 'HOME' && (
          <div className="p-4 space-y-4 max-w-xl mx-auto w-full">

            {/* Location Inputs Box */}
            <div className="bg-gray-900/90 border border-gray-800 rounded-3xl p-4 shadow-xl space-y-3 relative">
              {/* Pickup Location */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 flex-1">
                  <div className="w-3 h-3 bg-emerald-400 rounded-full ring-4 ring-emerald-500/20"></div>
                  <div className="flex-1">
                    <span className="text-[10px] text-gray-400 uppercase font-semibold">Pickup location</span>
                    <input
                      type="text"
                      value={pickup}
                      onChange={(e) => setPickup(e.target.value)}
                      className="bg-transparent w-full text-sm font-bold text-white focus:outline-none"
                    />
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button onClick={handleCurrentLocation} className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs font-bold flex items-center transition">
                    <Crosshair className="w-3 h-3 mr-1 text-emerald-400" /> Current
                  </button>
                  <button onClick={() => setAddStopOpen(!addStopOpen)} className={`p-1.5 rounded-lg transition ${addStopOpen ? 'bg-rose-600 text-white' : 'bg-indigo-600 text-white'}`}>
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Optional Intermediate Stop Box */}
              {addStopOpen && (
                <div className="flex items-center space-x-3 bg-gray-950 border border-indigo-500/40 p-2.5 rounded-xl">
                  <div className="w-2.5 h-2.5 bg-yellow-400 rounded-full"></div>
                  <input
                    type="text"
                    value={intermediateStop}
                    onChange={(e) => setIntermediateStop(e.target.value)}
                    placeholder="Add intermediate stop (e.g. Saefliapur Lake)"
                    className="bg-transparent w-full text-xs font-bold text-white placeholder-gray-500 focus:outline-none"
                  />
                  <button onClick={() => setAddStopOpen(false)} className="text-gray-400 hover:text-white"><X className="w-4 h-4" /></button>
                </div>
              )}

              {/* Dotted Connecting Line */}
              <div className="w-0.5 h-3 bg-gray-700 ml-1.5 border-dashed border-l"></div>

              {/* Drop Location */}
              <div className="flex items-center space-x-3">
                <MapPin className="w-4 h-4 text-rose-500" />
                <div className="flex-1">
                  <span className="text-[10px] text-gray-400 uppercase font-semibold">Drop location</span>
                  <input
                    type="text"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="Where are you going?"
                    className="bg-transparent w-full text-sm font-bold text-white placeholder-gray-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Quick Location Filter Pills */}
            <div className="flex space-x-2 overflow-x-auto pb-1 no-scrollbar">
              {[
                { label: 'Home', icon: Home },
                { label: 'Work', icon: Compass },
                { label: 'Recent', icon: Clock },
                { label: 'Favorite', icon: Star },
                { label: 'More', icon: ChevronRight },
              ].map((pill, i) => (
                <button
                  key={i}
                  onClick={() => handleSelectQuickFilter(pill.label)}
                  className="px-4 py-2 bg-gray-900/80 border border-gray-800 hover:border-indigo-500/50 rounded-xl text-xs font-bold text-gray-300 flex items-center space-x-1.5 whitespace-nowrap shadow-sm active:scale-95 transition"
                >
                  <pill.icon className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{pill.label}</span>
                </button>
              ))}
            </div>

            {/* Dark Interactive Map Canvas */}
            <div className="h-48 bg-gray-900 border border-gray-800 rounded-3xl relative overflow-hidden flex items-center justify-center shadow-inner">
              <div className="absolute inset-0 opacity-30 bg-[radial-gradient(#6366f1_1px,transparent_1px)] [background-size:20px_20px]"></div>

              {/* Gradient Route Line */}
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 200">
                <path d="M 120 40 Q 200 100 280 160" stroke="url(#route-grad)" strokeWidth="5" strokeLinecap="round" fill="none" />
                <defs>
                  <linearGradient id="route-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#10B981" />
                    <stop offset="50%" stopColor="#6366F1" />
                    <stop offset="100%" stopColor="#EF4444" />
                  </linearGradient>
                </defs>
              </svg>

              {/* Map Floating Safety Center Badge */}
              <div onClick={() => setSosModal(true)} className="absolute left-3 bottom-3 bg-gray-950/90 border border-indigo-500/40 px-3 py-2 rounded-2xl flex items-center space-x-2 text-xs backdrop-blur-md shadow-lg cursor-pointer hover:border-indigo-400 transition">
                <div className="p-1 bg-indigo-600 rounded-lg text-white">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-white text-[11px]">Safety Center</div>
                  <div className="text-[9px] text-gray-400">We've got your back &gt;</div>
                </div>
              </div>

              {/* Map Control Buttons */}
              <div className="absolute right-3 bottom-3 flex flex-col space-y-2 z-10">
                <button onClick={handleRecenterMap} className="p-2.5 bg-gray-950/90 border border-gray-800 hover:border-indigo-500 text-gray-300 rounded-2xl shadow-lg backdrop-blur-md transition">
                  <Crosshair className="w-4 h-4" />
                </button>
                <button onClick={() => setFilterModalOpen(true)} className="p-2.5 bg-gray-950/90 border border-gray-800 hover:border-indigo-500 text-gray-300 rounded-2xl shadow-lg backdrop-blur-md transition">
                  <SlidersHorizontal className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Active Ride Sheet */}
            {activeRide && activeRide.status !== 'COMPLETED' && activeRide.status !== 'CANCELLED' ? (
              <div className="glass-panel border border-indigo-500/50 rounded-3xl p-5 shadow-2xl space-y-3">
                <div className="flex justify-between items-center border-b border-gray-800 pb-3">
                  <div>
                    <span className="px-3 py-1 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 rounded-full text-xs font-black uppercase">
                      {activeRide.status.replace('_', ' ')}
                    </span>
                    <p className="text-xs text-gray-400 mt-1">ETA: <span className="text-white font-bold">{activeRide.durationMin} mins</span></p>
                  </div>

                  <div className="bg-gray-900 border border-indigo-500/50 px-4 py-2 rounded-xl text-center">
                    <div className="text-[10px] text-gray-400 uppercase font-bold">Start OTP</div>
                    <div className="text-xl font-black text-emerald-400 tracking-widest">{activeRide.otp}</div>
                  </div>
                </div>

                <div className="flex space-x-2 pt-2">
                  <button onClick={() => setSosModal(true)} className="flex-1 bg-rose-600/20 border border-rose-500/60 hover:bg-rose-600/30 text-rose-400 font-bold py-3 rounded-xl text-xs flex items-center justify-center transition">
                    <ShieldAlert className="w-4 h-4 mr-1.5" /> SOS Emergency
                  </button>
                  <button onClick={() => setCancelModal(true)} className="flex-1 bg-gray-800 border border-gray-700 hover:border-rose-500 text-gray-300 hover:text-rose-400 font-bold py-3 rounded-xl text-xs flex items-center justify-center transition">
                    <X className="w-4 h-4 mr-1.5" /> Cancel Ride
                  </button>
                </div>
              </div>
            ) : (
              /* Choose a Ride Section */
              <div className="space-y-3">
                <div className="flex justify-between items-center px-1">
                  <h3 className="text-base font-black text-white">Choose a ride</h3>
                  <button onClick={() => showToast('✨ All Ride Categories Loaded')} className="text-xs text-indigo-400 font-bold flex items-center hover:underline">
                    See all <ChevronRight className="w-4 h-4 ml-0.5" />
                  </button>
                </div>

                {/* 4 Vehicle Selection Cards Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { type: 'BIKE', title: 'Bike', info: '2 min away • 1 Rider', fare: '$3.20', badge: '⚡ Fastest', badgeColor: 'bg-indigo-600/30 text-indigo-300 border-indigo-500/40', Component: BikeIllustration },
                    { type: 'AUTO', title: 'Auto', info: '4 min away • 3 Rider', fare: '$5.10', badge: '🚗 Affordable', badgeColor: 'bg-emerald-600/30 text-emerald-300 border-emerald-500/40', Component: AutoIllustration },
                    { type: 'CAB_ECONOMY', title: 'Cab Eco', info: '3 min away • 4 Rider', fare: '$8.45', badge: '👤 Comfortable', badgeColor: 'bg-sky-600/30 text-sky-300 border-sky-500/40', Component: CabEcoIllustration },
                    { type: 'CAB_PREMIUM', title: 'Cab XL', info: '5 min away • 4 Rider', fare: '$11.50', badge: '💎 Premium', badgeColor: 'bg-purple-600/30 text-purple-300 border-purple-500/40', Component: CabXLIllustration },
                  ].map((v) => (
                    <div
                      key={v.type}
                      onClick={() => setSelectedCategory(v.type as any)}
                      className={`p-3.5 rounded-3xl border flex flex-col items-center justify-between cursor-pointer transition relative ${
                        selectedCategory === v.type
                          ? 'bg-gradient-to-b from-indigo-950/80 to-gray-900 border-indigo-500 shadow-xl shadow-indigo-600/20 ring-2 ring-indigo-500/50'
                          : 'bg-gray-900/60 border-gray-800/80 hover:border-gray-700'
                      }`}
                    >
                      <v.Component />
                      <div className="text-center mt-1">
                        <h4 className="font-extrabold text-sm text-white">{v.title}</h4>
                        <p className="text-[9px] text-gray-400 font-semibold">{v.info}</p>
                        <div className="text-sm font-black text-white mt-1">{v.fare}</div>
                      </div>
                      <span className={`mt-2 px-2.5 py-0.5 rounded-full text-[9px] font-bold border ${v.badgeColor}`}>
                        {v.badge}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Primary Action Button */}
                <button
                  onClick={confirmRide}
                  className="w-full bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-black py-4 rounded-2xl text-sm shadow-xl shadow-indigo-600/30 active:scale-[0.98] transition flex items-center justify-center"
                >
                  <Car className="w-5 h-5 mr-2" /> Book {selectedCategory.replace('_', ' ')} Now
                </button>

                {/* Promo Banner Card */}
                <div className="bg-gradient-to-r from-indigo-950 via-gray-900 to-purple-950 border border-indigo-500/40 p-4 rounded-3xl flex items-center justify-between shadow-xl">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 bg-indigo-600 text-white rounded-2xl shadow-lg">
                      <Percent className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-white">Get 10% OFF on your first 3 rides</h4>
                      <p className="text-[10px] text-gray-400">Use code: <span className="font-bold text-indigo-400">RIDEX10</span></p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setCouponApplied(true); showToast('🎉 Coupon RIDEX10 Applied! 10% Discount Saved.'); }}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-md"
                  >
                    {couponApplied ? 'Applied ✓' : 'Apply Now'}
                  </button>
                </div>

                {/* Services Quick Grid */}
                <div className="grid grid-cols-5 gap-2 pt-1">
                  {[
                    { id: 'SCHEDULE', label: 'Schedule', sub: 'Book later', icon: Calendar, color: 'text-indigo-400' },
                    { id: 'RENTALS', label: 'Rentals', sub: 'By the hour', icon: Clock, color: 'text-emerald-400' },
                    { id: 'OUTSTATION', label: 'Outstation', sub: 'Long trips', icon: Navigation, color: 'text-sky-400' },
                    { id: 'SHARE', label: 'Ride Share', sub: 'Save more', icon: Users, color: 'text-purple-400' },
                    { id: 'AIRPORT', label: 'Airport', sub: 'Flat fare', icon: Plane, color: 'text-rose-400' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setServiceModal(s.id)}
                      className="bg-gray-900/60 border border-gray-800 hover:border-indigo-500/50 p-2.5 rounded-2xl flex flex-col items-center text-center transition active:scale-95"
                    >
                      <s.icon className={`w-5 h-5 mb-1 ${s.color}`} />
                      <span className="text-[10px] font-bold text-white">{s.label}</span>
                      <span className="text-[8px] text-gray-500">{s.sub}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* RIDES TAB */}
        {currentTab === 'RIDES' && (
          <div className="p-5 max-w-xl mx-auto w-full space-y-4">
            <h2 className="text-xl font-black">My Rides Activity</h2>
            <div className="bg-gray-900 border border-gray-800 p-4 rounded-2xl flex justify-between items-center">
              <div>
                <div className="font-bold text-sm">LD College → Chandkheda</div>
                <div className="text-xs text-gray-400">Completed • $3.20 • BIKE</div>
              </div>
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-bold">Completed</span>
            </div>
          </div>
        )}

        {/* WALLET TAB */}
        {currentTab === 'WALLET' && (
          <div className="p-5 max-w-xl mx-auto w-full space-y-4">
            <div className="bg-gradient-to-br from-indigo-900 via-gray-900 to-gray-950 border border-indigo-500/40 p-6 rounded-3xl text-center shadow-xl">
              <span className="text-xs text-gray-400 uppercase font-bold">Wallet Balance</span>
              <div className="text-4xl font-black text-emerald-400 mt-1">${walletBalance.toFixed(2)}</div>
              <button onClick={() => setAddMoneyModal(true)} className="mt-4 bg-emerald-500 text-gray-950 font-black px-6 py-2.5 rounded-full text-sm">
                + Add Money
              </button>
            </div>
          </div>
        )}

        {/* PROFILE TAB */}
        {currentTab === 'PROFILE' && (
          <div className="p-5 max-w-xl mx-auto w-full space-y-4">
            <div className="bg-gray-900 border border-gray-800 p-5 rounded-3xl flex items-center space-x-4">
              <div className="w-14 h-14 bg-indigo-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                AJ
              </div>
              <div>
                <h3 className="font-bold text-lg text-white">Alex Johnson</h3>
                <p className="text-xs text-gray-400">+18888888888</p>
              </div>
            </div>
            <button
              onClick={() => { localStorage.removeItem('ridex_cust_token'); setToken(null); }}
              className="w-full bg-rose-950/30 border border-rose-500/40 text-rose-400 font-extrabold py-3.5 rounded-2xl text-xs"
            >
              Sign Out / Switch Account
            </button>
          </div>
        )}
      </main>

      {/* 3. Bottom Navigation Bar */}
      <nav className="bg-gray-950/90 backdrop-blur-md border-t border-gray-800/80 py-3 px-4 flex justify-around fixed bottom-0 left-0 right-0 z-30 max-w-xl mx-auto shadow-2xl">
        {[
          { id: 'HOME', label: 'Home', icon: Home },
          { id: 'RIDES', label: 'Rides', icon: History },
          { id: 'ACTIVITY', label: 'Activity', icon: Compass },
          { id: 'WALLET', label: 'Wallet', icon: Wallet },
          { id: 'PROFILE', label: 'Profile', icon: User },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setCurrentTab(tab.id as any)}
            className={`flex flex-col items-center text-[10px] font-bold ${currentTab === tab.id ? 'text-indigo-400' : 'text-gray-500'}`}
          >
            <tab.icon className="w-5 h-5 mb-1" />
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* SIDE NAVIGATION DRAWER (`=`) */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex">
          <div className="bg-gray-950 border-r border-gray-800 w-72 h-full p-5 flex flex-col justify-between shadow-2xl">
            <div>
              <div className="flex justify-between items-center mb-6">
                <div className="text-xl font-black text-white flex items-center">
                  <Car className="w-5 h-5 mr-2 text-indigo-500" /> Ride<span className="text-emerald-400">X</span>
                </div>
                <button onClick={() => setDrawerOpen(false)} className="text-gray-400 hover:text-white p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-gray-900 border border-gray-800 p-4 rounded-2xl mb-6 flex items-center space-x-3">
                <div className="w-10 h-10 bg-indigo-600 text-white rounded-full font-bold flex items-center justify-center">AJ</div>
                <div>
                  <div className="font-bold text-sm text-white">Alex Johnson</div>
                  <div className="text-xs text-emerald-400">Prime Member</div>
                </div>
              </div>

              <div className="space-y-1">
                {[
                  { label: 'My Trips & History', icon: History, action: () => { setCurrentTab('RIDES'); setDrawerOpen(false); } },
                  { label: 'RideX Wallet', icon: Wallet, action: () => { setCurrentTab('WALLET'); setDrawerOpen(false); } },
                  { label: 'Safety Center & SOS', icon: ShieldAlert, action: () => { setSosModal(true); setDrawerOpen(false); } },
                  { label: 'Language & i18n', icon: Globe, action: () => { showToast('🌐 Language set to ' + language.toUpperCase()); setDrawerOpen(false); } },
                  { label: 'Help & Support', icon: HelpCircle, action: () => { showToast('💬 AI Customer Support Active'); setDrawerOpen(false); } },
                ].map((item, idx) => (
                  <button
                    key={idx}
                    onClick={item.action}
                    className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold text-gray-300 hover:bg-gray-900 hover:text-white transition"
                  >
                    <item.icon className="w-4 h-4 text-indigo-400" />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => { localStorage.removeItem('ridex_cust_token'); setToken(null); setDrawerOpen(false); }}
              className="flex items-center space-x-2 text-rose-400 font-bold text-xs p-3 hover:bg-rose-950/30 rounded-xl transition"
            >
              <LogOut className="w-4 h-4" /> <span>Sign Out</span>
            </button>
          </div>
          <div className="flex-1" onClick={() => setDrawerOpen(false)}></div>
        </div>
      )}

      {/* NOTIFICATION DRAWER (`🔔`) */}
      {notifOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex justify-end">
          <div className="bg-gray-950 border-l border-gray-800 w-80 h-full p-5 flex flex-col justify-between shadow-2xl">
            <div>
              <div className="flex justify-between items-center border-b border-gray-800 pb-3 mb-4">
                <div className="flex items-center space-x-2">
                  <Bell className="w-5 h-5 text-indigo-400" />
                  <h3 className="font-bold text-white text-sm">Notifications</h3>
                </div>
                <button onClick={() => setNotifOpen(false)} className="text-gray-400 hover:text-white p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="bg-gray-900 border border-indigo-500/30 p-3.5 rounded-2xl">
                  <div className="font-bold text-white">🎉 10% Discount Applied</div>
                  <p className="text-gray-400 mt-0.5">Use code RIDEX10 to save on your next 3 rides!</p>
                </div>
                <div className="bg-gray-900 border border-gray-800 p-3.5 rounded-2xl">
                  <div className="font-bold text-white">🚗 Driver Sam Speed Nearby</div>
                  <p className="text-gray-400 mt-0.5">Driver is 2 minutes away from LD College of Engineering.</p>
                </div>
                <div className="bg-gray-900 border border-gray-800 p-3.5 rounded-2xl">
                  <div className="font-bold text-white">💰 Wallet Top-Up Completed</div>
                  <p className="text-gray-400 mt-0.5">Successfully credited $100 to your wallet balance.</p>
                </div>
              </div>
            </div>
            <button onClick={() => setNotifOpen(false)} className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl text-xs">Close</button>
          </div>
          <div className="flex-1" onClick={() => setNotifOpen(false)}></div>
        </div>
      )}

      {/* MAP ROUTE FILTER MODAL (`SlidersHorizontal`) */}
      {filterModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-gray-800 pb-3">
              <h3 className="font-bold text-lg text-white">Route Preferences</h3>
              <button onClick={() => setFilterModalOpen(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-2 text-xs">
              {[
                { id: 'FASTEST', label: '⚡ Fastest Route (Default)' },
                { id: 'AVOID_TOLLS', label: '🛣️ Avoid Toll Expressways' },
                { id: 'EV_ONLY', label: '🌱 EV & Eco-Friendly Only' },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setRouteFilter(f.id as any)}
                  className={`w-full p-3.5 rounded-xl border text-left font-bold flex justify-between items-center ${
                    routeFilter === f.id ? 'bg-indigo-600/30 border-indigo-500 text-white' : 'bg-gray-950 border-gray-800 text-gray-400'
                  }`}
                >
                  <span>{f.label}</span>
                  {routeFilter === f.id && <Check className="w-4 h-4 text-emerald-400" />}
                </button>
              ))}
            </div>

            <button onClick={() => { showToast('⚡ Route Filter Updated'); setFilterModalOpen(false); }} className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl text-xs">
              Apply Preferences
            </button>
          </div>
        </div>
      )}

      {/* SPECIAL SERVICES MODAL (`Schedule`, `Rentals`, `Outstation`, `Ride Share`, `Airport`) */}
      {serviceModal && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-indigo-500/40 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-gray-800 pb-3">
              <h3 className="font-bold text-lg text-white">{serviceModal} Booking</h3>
              <button onClick={() => setServiceModal(null)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            {serviceModal === 'SCHEDULE' && (
              <div className="space-y-3 text-xs">
                <p className="text-gray-400">Book your ride in advance for a guaranteed pickup:</p>
                <div>
                  <label className="font-bold text-gray-400">Date</label>
                  <input type="date" defaultValue="2026-08-16" className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-white mt-1" />
                </div>
                <div>
                  <label className="font-bold text-gray-400">Time</label>
                  <input type="time" defaultValue="09:30" className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-white mt-1" />
                </div>
              </div>
            )}

            {serviceModal === 'RENTALS' && (
              <div className="space-y-2 text-xs">
                <p className="text-gray-400">Select hourly rental package:</p>
                {['2 Hours / 20 km ($35)', '4 Hours / 40 km ($65)', '8 Hours / 80 km ($120)'].map((pkg, i) => (
                  <button key={i} onClick={() => { showToast(`🚗 Selected ${pkg}`); setServiceModal(null); }} className="w-full p-3 bg-gray-950 border border-gray-800 rounded-xl font-bold text-white text-left hover:border-indigo-500">
                    {pkg}
                  </button>
                ))}
              </div>
            )}

            {serviceModal === 'OUTSTATION' && (
              <div className="space-y-3 text-xs">
                <p className="text-gray-400">Intercity Outstation Booking:</p>
                <input type="text" placeholder="Enter Destination City (e.g. Vadodara)" className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-white" />
              </div>
            )}

            {serviceModal === 'SHARE' && (
              <div className="space-y-3 text-xs">
                <p className="text-gray-400">Shared Ride (Save 30% on fare):</p>
                <div className="bg-indigo-950/40 border border-indigo-500/40 p-3 rounded-xl text-emerald-400 font-bold">
                  ✓ Co-Passenger Matching Enabled
                </div>
              </div>
            )}

            {serviceModal === 'AIRPORT' && (
              <div className="space-y-3 text-xs">
                <p className="text-gray-400">Flat Rate Airport Pickup / Drop:</p>
                <div className="bg-gray-950 p-4 rounded-xl text-center">
                  <div className="text-xl font-black text-emerald-400">$25.00 Flat Rate</div>
                  <p className="text-[10px] text-gray-400 mt-1">Includes all toll & airport entry fees</p>
                </div>
              </div>
            )}

            <button
              onClick={() => {
                showToast(`✅ ${serviceModal} Reserved Successfully!`);
                setServiceModal(null);
                if (serviceModal === 'AIRPORT') setDestination('Airport Terminal 2 (Flat Rate $25)');
              }}
              className="w-full bg-emerald-500 text-gray-950 font-black py-3.5 rounded-xl text-sm"
            >
              Confirm {serviceModal}
            </button>
          </div>
        </div>
      )}

      {/* SOS EMERGENCY MODAL */}
      {sosModal && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-rose-500/60 rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl space-y-4">
            <ShieldAlert className="w-14 h-14 text-rose-500 mx-auto animate-bounce" />
            <h3 className="text-xl font-black text-white">SOS Emergency Alert</h3>
            <p className="text-xs text-gray-400">This will instantly dispatch safety control and alert emergency contacts.</p>

            <div className="space-y-2 text-xs text-left bg-gray-950 p-3 rounded-xl border border-gray-800">
              <div className="flex items-center text-rose-400 font-bold"><Check className="w-4 h-4 mr-1.5" /> 24/7 RideX Safety Unit Alerted</div>
              <div className="flex items-center text-rose-400 font-bold"><Check className="w-4 h-4 mr-1.5" /> Live GPS Coordinates Shared</div>
            </div>

            <div className="flex space-x-2 pt-2">
              <button onClick={() => setSosModal(false)} className="flex-1 bg-gray-800 text-gray-300 font-bold py-3 rounded-xl text-xs">Cancel</button>
              <button onClick={() => { alert('⚠️ SOS Emergency Broadcast Sent!'); setSosModal(false); }} className="flex-1 bg-rose-600 text-white font-black py-3 rounded-xl text-xs shadow-lg shadow-rose-600/40">
                DISPATCH SOS
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CANCELLATION REASON MODAL OVERLAY */}
      {cancelModal && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-gray-800 pb-3">
              <h3 className="font-bold text-lg text-white">Cancel Ride</h3>
              <button onClick={() => setCancelModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-400">Please select a reason for cancelling this trip:</p>

            <div className="space-y-2 text-xs">
              {[
                "⏱️ Driver taking too long to arrive",
                "📍 Pickup location entered by mistake",
                "🚗 Driver requested to cancel / offline ride",
                "💳 Payment method / price issue",
                "❌ Changed my mind / plans changed",
              ].map((reasonText, idx) => (
                <label
                  key={idx}
                  onClick={() => setCancelReason(reasonText)}
                  className={`flex items-center space-x-3 p-3 rounded-xl border cursor-pointer transition ${
                    cancelReason === reasonText ? 'bg-rose-950/40 border-rose-500 text-white font-bold' : 'bg-gray-950 border-gray-800 text-gray-400'
                  }`}
                >
                  <input
                    type="radio"
                    name="cancel_reason"
                    checked={cancelReason === reasonText}
                    onChange={() => setCancelReason(reasonText)}
                    className="accent-rose-500"
                  />
                  <span>{reasonText}</span>
                </label>
              ))}
            </div>

            <input
              type="text"
              placeholder="Other reason (optional)..."
              value={customCancelReason}
              onChange={(e) => setCustomCancelReason(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500"
            />

            <div className="flex space-x-2 pt-2">
              <button onClick={() => setCancelModal(false)} className="flex-1 bg-gray-800 text-gray-300 font-bold py-3 rounded-xl text-xs">Keep Ride</button>
              <button onClick={handleCancelRide} className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-black py-3 rounded-xl text-xs shadow-lg shadow-rose-600/30">
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
