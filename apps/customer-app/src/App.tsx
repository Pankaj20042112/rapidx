import React, { useState, useEffect } from 'react';
import { 
  Car, Bike, ShieldAlert, Navigation, Wallet, Star, MessageSquare, 
  MapPin, Clock, Tag, CheckCircle2, Phone, Send, X, AlertTriangle, 
  Home, Compass, History, User, Globe, Share2, HelpCircle, Info, ChevronRight, Plus, Search
} from 'lucide-react';
import { io } from 'socket.io-client';

const BACKEND_URL = `http://${window.location.hostname}:4000`;
const socket = io(BACKEND_URL);

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
  const [resendTimer, setResendTimer] = useState(30);

  // Navigation Tab State
  const [currentTab, setCurrentTab] = useState<'HOME' | 'RIDES' | 'ACTIVITY' | 'WALLET' | 'PROFILE'>('HOME');
  const [language, setLanguage] = useState<'en' | 'hi' | 'gu'>('en');
  const [dict, setDict] = useState<Record<string, string>>({});

  // Booking & Location
  const [pickup, setPickup] = useState('LD collage of engineering');
  const [destination, setDestination] = useState('Chandkheda, Ahmedabad');
  const [vehicleType, setVehicleType] = useState<'BIKE' | 'AUTO' | 'CAB_ECONOMY' | 'CAB_PREMIUM' | 'RENTAL' | 'OUTSTATION'>('CAB_ECONOMY');
  const [coupon, setCoupon] = useState('RIDEX50');
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
  }, [token, vehicleType, coupon]);

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
        setResendTimer(30);
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
          vehicleType,
          couponCode: coupon
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
        body: JSON.stringify({ distanceKm: estimate?.distanceKm || 10, durationMin: estimate?.durationMin || 20, vehicleType, surge: 1.0 })
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
      }
    } catch (e) {
      console.error(e);
    }
  };

  const confirmRide = async () => {
    if (!token) return handleLogin();
    try {
      const res = await fetch(`${BACKEND_URL}/api/rides`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          pickupLat: 12.9716, pickupLng: 77.5946, pickupAddress: pickup,
          destinationLat: 13.0827, destinationLng: 80.2707, destinationAddress: destination,
          vehicleType,
          couponCode: coupon
        })
      });
      const data = await res.json();
      if (data.success) setActiveRide(data.data);
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
        setActiveRide(data.data);
        if (data.data.status === 'COMPLETED' && !ratingModal) {
          setRatingModal(true);
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

  const triggerSOS = async () => {
    try {
      await fetch(`${BACKEND_URL}/api/sos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rideId: activeRide?.id, latitude: 12.9716, longitude: 77.5946 })
      });
      alert('⚠️ SOS Alert Broadcasted! Safety Control Unit & Emergency Contacts Notified.');
      setSosModal(false);
    } catch (e) {
      console.error(e);
    }
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
        alert(`❌ Ride Cancelled. Reason: "${finalReason}"`);
        setCancelModal(false);
        setActiveRide(null);
      }
    } catch (e) {
      console.error(e);
    }
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
    setActiveRide(null); // Clear active ride to return to home search sheet
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col justify-between relative font-sans">
      {/* Top Header */}
      <header className="px-5 py-4 glass-panel sticky top-0 z-30 flex items-center justify-between shadow-xl border-b border-gray-800">
        <div className="flex items-center space-x-2">
          <div className="bg-indigo-600 p-2 rounded-xl text-white font-black text-xl flex items-center shadow-lg shadow-indigo-600/30">
            <Car className="w-5 h-5 mr-1" /> Ride<span className="text-emerald-400">X</span>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Language Switcher */}
          <div className="flex bg-gray-900 border border-gray-800 rounded-full p-1 text-xs font-bold">
            {(['en', 'hi', 'gu'] as const).map(lang => (
              <button
                key={lang}
                onClick={() => setLanguage(lang)}
                className={`px-2.5 py-1 rounded-full uppercase transition ${language === lang ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                {lang}
              </button>
            ))}
          </div>

          <div className="bg-gray-800 px-3 py-1.5 rounded-full flex items-center space-x-2 text-xs border border-gray-700 font-bold">
            <Wallet className="w-4 h-4 text-emerald-400" />
            <span className="text-emerald-400">${walletBalance.toFixed(2)}</span>
          </div>
        </div>
      </header>

      {/* Main Tab Views */}
      <main className="flex-1 relative flex flex-col justify-between overflow-y-auto pb-20">

        {/* HOME TAB (MAP & BOOKING) */}
        {currentTab === 'HOME' && (
          <div className="flex-1 flex flex-col justify-between relative min-h-[500px]">
            {/* Interactive Map Canvas */}
            <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-950 to-black overflow-hidden flex items-center justify-center">
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#6366f1_1px,transparent_1px)] [background-size:24px_24px]"></div>
              
              {/* Pickup Pin */}
              <div className="absolute top-[30%] left-[25%] flex flex-col items-center">
                <div className="bg-emerald-500 text-gray-950 text-xs px-2.5 py-1 rounded shadow-lg font-black mb-1">Pickup</div>
                <div className="w-4 h-4 bg-emerald-400 rounded-full border-4 border-gray-950 animate-ping"></div>
              </div>

              {/* Destination Pin */}
              <div className="absolute top-[70%] left-[75%] flex flex-col items-center">
                <div className="bg-rose-500 text-white text-xs px-2.5 py-1 rounded shadow-lg font-black mb-1">Destination</div>
                <MapPin className="w-7 h-7 text-rose-500 animate-bounce" />
              </div>
            </div>

            {/* Active Ride Card */}
            {activeRide ? (
              <div className="relative z-20 glass-panel rounded-t-3xl p-5 shadow-2xl border-t border-indigo-500/50 max-w-xl mx-auto w-full mt-auto">
                <div className="flex justify-between items-center border-b border-gray-800 pb-3 mb-3">
                  <div>
                    <span className={`px-3 py-1 border rounded-full text-xs font-black uppercase tracking-wider ${
                      activeRide.status === 'COMPLETED'
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        : 'bg-indigo-600/20 text-indigo-400 border-indigo-500/30'
                    }`}>
                      {activeRide.status.replace('_', ' ')}
                    </span>
                    <p className="text-xs text-gray-400 mt-1">
                      {activeRide.status === 'COMPLETED' ? 'Trip finished' : `ETA: ${activeRide.durationMin} mins`}
                    </p>
                  </div>

                  {activeRide.status !== 'COMPLETED' ? (
                    <div className="bg-gray-900 border border-indigo-500/50 px-4 py-2 rounded-xl text-center">
                      <div className="text-[10px] text-gray-400 uppercase font-bold">Start OTP</div>
                      <div className="text-xl font-black text-emerald-400 tracking-widest">{activeRide.otp}</div>
                    </div>
                  ) : (
                    <button
                      onClick={submitRatingAndDismiss}
                      className="bg-emerald-500 text-gray-950 font-black px-4 py-2 rounded-xl text-xs hover:bg-emerald-400"
                    >
                      Book New Ride
                    </button>
                  )}
                </div>

                {activeRide.driver && (
                  <div className="bg-gray-900 border border-gray-800 p-4 rounded-2xl mb-3 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-indigo-600 text-white rounded-full font-bold flex items-center justify-center">
                        {activeRide.driver.fullName ? activeRide.driver.fullName[0] : 'S'}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-white">{activeRide.driver.fullName || 'Sam Speed'}</h4>
                        <div className="text-xs text-yellow-400 flex items-center">
                          <Star className="w-3 h-3 fill-current mr-1" /> {activeRide.driver.rating || '4.85'}
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setChatOpen(true)}
                        className="p-3 bg-gray-800 hover:bg-gray-700 text-indigo-400 rounded-full border border-gray-700 shadow-md active:scale-95 transition"
                      >
                        <MessageSquare className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                )}

                {activeRide.status === 'COMPLETED' ? (
                  <button
                    onClick={() => setRatingModal(true)}
                    className="w-full bg-emerald-500 text-gray-950 font-black py-3.5 rounded-xl flex items-center justify-center text-sm hover:bg-emerald-400"
                  >
                    Rate Driver & Close Receipt
                  </button>
                ) : (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setSosModal(true)}
                      className="flex-1 bg-rose-600/20 border border-rose-500/60 text-rose-400 font-bold py-3 rounded-xl flex items-center justify-center text-xs"
                    >
                      <ShieldAlert className="w-4 h-4 mr-1.5" /> {dict.sosEmergency || 'SOS'}
                    </button>
                    <button
                      onClick={() => setCancelModal(true)}
                      className="flex-1 bg-gray-800 hover:bg-rose-950/40 border border-gray-700 hover:border-rose-500/50 text-gray-300 hover:text-rose-400 font-bold py-3 rounded-xl flex items-center justify-center text-xs transition"
                    >
                      <X className="w-4 h-4 mr-1.5" /> Cancel Ride
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Booking Bottom Sheet */
              <div className="relative z-20 glass-panel rounded-t-3xl p-5 pb-24 shadow-2xl border-t border-gray-800 max-w-xl mx-auto w-full mt-auto max-h-[85vh] overflow-y-auto">
                <h2 className="text-lg font-black mb-3 text-white">{dict.whereTo || 'Where are you going?'}</h2>

                {/* Location Inputs */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center bg-gray-900 border border-gray-800 rounded-xl p-3">
                    <div className="w-3 h-3 bg-emerald-400 rounded-full mr-3"></div>
                    <input
                      type="text"
                      value={pickup}
                      onChange={(e) => setPickup(e.target.value)}
                      className="bg-transparent w-full text-sm text-white focus:outline-none font-medium"
                      placeholder={dict.pickup || 'Pickup location'}
                    />
                  </div>
                  <div className="flex items-center bg-gray-900 border border-gray-800 rounded-xl p-3">
                    <MapPin className="w-4 h-4 text-rose-500 mr-3" />
                    <input
                      type="text"
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      className="bg-transparent w-full text-sm text-white focus:outline-none font-medium"
                      placeholder={dict.destination || 'Destination point'}
                    />
                  </div>
                </div>

                {/* Vehicle Selection Cards */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {[
                    { type: 'BIKE', label: dict.bike || 'Bike', icon: Bike, eta: '2 min' },
                    { type: 'AUTO', label: dict.auto || 'Auto', icon: Car, eta: '4 min' },
                    { type: 'CAB_ECONOMY', label: dict.cabEconomy || 'Cab Eco', icon: Car, eta: '3 min' },
                  ].map(v => (
                    <button
                      key={v.type}
                      onClick={() => setVehicleType(v.type as any)}
                      className={`p-3 rounded-2xl border flex flex-col items-center transition ${
                        vehicleType === v.type ? 'border-indigo-500 bg-indigo-600/20 shadow-lg shadow-indigo-600/20' : 'border-gray-800 bg-gray-900/60'
                      }`}
                    >
                      <v.icon className={`w-6 h-6 mb-1 ${vehicleType === v.type ? 'text-indigo-400' : 'text-gray-400'}`} />
                      <span className="text-xs font-bold">{v.label}</span>
                      <span className="text-[10px] text-gray-400">{v.eta}</span>
                    </button>
                  ))}
                </div>

                {/* Primary FIND RIDE Search Button */}
                <button
                  onClick={() => { fetchEstimate(); confirmRide(); }}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold py-3.5 rounded-2xl flex items-center justify-center text-sm shadow-xl shadow-indigo-600/30 mb-3 active:scale-[0.98] transition"
                >
                  <Search className="w-4 h-4 mr-2" /> Find Ride ({vehicleType})
                </button>

                {/* Fare & "Why this price?" Card & Confirm Ride Button */}
                {estimate && (
                  <div className="bg-gray-900 p-4 rounded-2xl mb-2 border border-indigo-500/40 space-y-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-2xl font-black text-emerald-400">${estimate.finalFare}</div>
                        <button onClick={fetchWhyPrice} className="text-xs text-indigo-400 font-bold flex items-center mt-0.5 hover:underline">
                          <Info className="w-3 h-3 mr-1" /> {dict.whyThisPrice || 'Why this price?'}
                        </button>
                      </div>
                      <span className="text-xs bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 px-3 py-1 rounded-full font-bold">
                        Coupon RIDEX50 Applied
                      </span>
                    </div>

                    <button
                      onClick={confirmRide}
                      className="w-full bg-emerald-500 text-gray-950 font-black py-3.5 rounded-xl hover:bg-emerald-400 text-base shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition"
                    >
                      {dict.confirmRide || 'Confirm Ride & Match Driver'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* RIDES TAB */}
        {currentTab === 'RIDES' && (
          <div className="p-5 max-w-xl mx-auto w-full space-y-4">
            <h2 className="text-xl font-black mb-2">My Rides Activity</h2>
            <div className="bg-gray-900 border border-gray-800 p-4 rounded-2xl flex justify-between items-center">
              <div>
                <div className="font-bold text-sm">Tech Park → Airport Terminal 2</div>
                <div className="text-xs text-gray-400">Completed • $242.00 • CAB_ECONOMY</div>
              </div>
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-bold">Completed</span>
            </div>
          </div>
        )}

        {/* WALLET TAB */}
        {currentTab === 'WALLET' && (
          <div className="p-5 max-w-xl mx-auto w-full space-y-4">
            <div className="bg-gradient-to-br from-indigo-900 via-gray-900 to-gray-950 border border-indigo-500/40 p-6 rounded-3xl text-center shadow-xl">
              <span className="text-xs text-gray-400 uppercase tracking-wider font-bold">Wallet Balance</span>
              <div className="text-4xl font-black text-emerald-400 mt-1">${walletBalance.toFixed(2)}</div>
              <button onClick={() => setAddMoneyModal(true)} className="mt-4 bg-emerald-500 text-gray-950 font-black px-6 py-2.5 rounded-full text-sm hover:bg-emerald-400">
                + Add Money
              </button>
            </div>

            <h3 className="font-bold text-sm text-gray-300">Transaction History</h3>
            <div className="space-y-2">
              {walletTxns.map(t => (
                <div key={t.id} className="bg-gray-900 border border-gray-800 p-4 rounded-2xl flex justify-between items-center">
                  <div>
                    <div className="font-bold text-sm">{t.description}</div>
                    <div className="text-xs text-gray-400">{new Date(t.createdAt).toLocaleDateString()}</div>
                  </div>
                  <div className={`font-bold text-sm ${t.type === 'CREDIT' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {t.type === 'CREDIT' ? '+' : '-'}${t.amount}
                  </div>
                </div>
              ))}
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
                <span className="text-[10px] bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 px-2 py-0.5 rounded-full font-bold mt-1 inline-block">
                  RideX Prime Member
                </span>
              </div>
            </div>

            {/* Saved Places */}
            <div className="bg-gray-900 border border-gray-800 p-4 rounded-2xl space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-gray-400">Saved Places</h4>
              <div className="flex items-center space-x-3 text-sm text-white">
                <Home className="w-4 h-4 text-emerald-400" />
                <span>Home: 124 Innovation Avenue</span>
              </div>
              <div className="flex items-center space-x-3 text-sm text-white">
                <Compass className="w-4 h-4 text-indigo-400" />
                <span>Work: Tech Hub Tower B</span>
              </div>
            </div>

            {/* Referral Code */}
            <div className="bg-gray-900 border border-gray-800 p-4 rounded-2xl flex justify-between items-center">
              <div>
                <div className="text-xs text-gray-400 font-bold uppercase">Referral Code</div>
                <div className="text-lg font-black text-emerald-400 tracking-wider">RIDEX-ALEX50</div>
              </div>
              <button onClick={() => alert('Referral link copied to clipboard!')} className="p-2.5 bg-gray-800 text-indigo-400 rounded-xl">
                <Share2 className="w-4 h-4" />
              </button>
            </div>

            {/* Sign Out Button */}
            <button
              onClick={() => { localStorage.removeItem('ridex_cust_token'); setToken(null); }}
              className="w-full bg-rose-950/30 hover:bg-rose-900/50 border border-rose-500/40 text-rose-400 font-extrabold py-3.5 rounded-2xl text-xs flex items-center justify-center transition"
            >
              Sign Out / Switch Account
            </button>
          </div>
        )}
      </main>

      {/* CHAT MODAL OVERLAY */}
      {chatOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl w-full max-w-md h-[520px] flex flex-col justify-between overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-950">
              <div className="flex items-center space-x-2">
                <MessageSquare className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-white text-sm">Driver Chat</h3>
              </div>
              <button onClick={() => setChatOpen(false)} className="text-gray-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-gray-900/50">
              {chatMessages.map((m, i) => (
                <div key={i} className={`flex flex-col ${m.sender === 'You' ? 'items-end' : 'items-start'}`}>
                  <div className={`px-4 py-2.5 rounded-2xl text-sm max-w-[80%] shadow-md ${
                    m.sender === 'You' ? 'bg-indigo-600 text-white font-medium' : 'bg-gray-800 text-gray-100 border border-gray-700'
                  }`}>
                    {m.text}
                  </div>
                  <span className="text-[10px] text-gray-500 mt-1 px-1">{m.sender}</span>
                </div>
              ))}
            </div>

            {/* Quick Reply Presets */}
            <div className="px-3 py-2 bg-gray-950 flex space-x-2 overflow-x-auto border-t border-gray-800">
              {["I'm at pickup point", "Please wait 2 mins", "Near entrance"].map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => sendChatMessage(preset)}
                  className="px-3 py-1 bg-gray-800 hover:bg-gray-700 text-xs font-semibold text-gray-300 rounded-full whitespace-nowrap border border-gray-700"
                >
                  {preset}
                </button>
              ))}
            </div>

            {/* Input Bar */}
            <div className="p-3 border-t border-gray-800 flex space-x-2 bg-gray-950">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendChatMessage()}
                placeholder="Type message to driver..."
                className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
              <button onClick={() => sendChatMessage()} className="bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-500">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RATING & DISMISSAL MODAL */}
      {ratingModal && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-indigo-500/40 rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl">
            <CheckCircle2 className="w-14 h-14 text-emerald-400 mx-auto mb-2" />
            <h3 className="text-xl font-bold text-white mb-1">Ride Completed!</h3>
            <p className="text-xs text-gray-400 mb-4">How was your trip with driver Sam Speed?</p>

            <div className="flex justify-center space-x-2 mb-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button key={star} onClick={() => setRatingStars(star)} className="focus:outline-none">
                  <Star className={`w-8 h-8 ${star <= ratingStars ? 'text-yellow-400 fill-current' : 'text-gray-600'}`} />
                </button>
              ))}
            </div>

            <input
              type="text"
              value={ratingFeedback}
              onChange={(e) => setRatingFeedback(e.target.value)}
              placeholder="Leave feedback..."
              className="w-full bg-gray-950 border border-gray-700 rounded-xl px-3 py-2 text-xs text-white mb-4"
            />

            <button onClick={submitRatingAndDismiss} className="w-full bg-emerald-500 text-gray-950 font-black py-3.5 rounded-xl hover:bg-emerald-400 text-sm">
              Submit Rating & Book New Ride
            </button>
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

            {/* Reason Options */}
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

            {/* Custom Input */}
            <input
              type="text"
              placeholder="Other reason (optional)..."
              value={customCancelReason}
              onChange={(e) => setCustomCancelReason(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500"
            />

            <div className="flex space-x-2 pt-2">
              <button onClick={() => setCancelModal(false)} className="flex-1 bg-gray-800 text-gray-300 font-bold py-3 rounded-xl text-xs">
                Keep Ride
              </button>
              <button onClick={handleCancelRide} className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-black py-3 rounded-xl text-xs shadow-lg shadow-rose-600/30">
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WHY THIS PRICE MODAL */}
      {whyPriceModal && priceBreakdown && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex justify-between items-center border-b border-gray-800 pb-3 mb-4">
              <h3 className="font-bold text-lg text-white">Fare Breakdown</h3>
              <button onClick={() => setWhyPriceModal(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-2 text-xs text-gray-300 mb-4">
              <div className="flex justify-between"><span>Base Fare</span><span>${priceBreakdown.breakdown.baseFare}</span></div>
              <div className="flex justify-between"><span>Distance Charge</span><span>${priceBreakdown.breakdown.distanceCharge}</span></div>
              <div className="flex justify-between"><span>Time Charge</span><span>${priceBreakdown.breakdown.timeCharge}</span></div>
              <div className="flex justify-between"><span>Booking & Platform Fee</span><span>$25</span></div>
              <div className="flex justify-between text-emerald-400 font-bold"><span>Taxes & GST (5%)</span><span>${priceBreakdown.breakdown.tax}</span></div>
            </div>
            <p className="text-[11px] text-gray-400 bg-gray-950 p-3 rounded-xl mb-4 leading-relaxed">{priceBreakdown.explanation}</p>
            <button onClick={() => setWhyPriceModal(false)} className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl">Got It</button>
          </div>
        </div>
      )}

      {/* ADD MONEY MODAL */}
      {addMoneyModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="font-bold text-lg text-white mb-2">Add Money to Wallet</h3>
            <input
              type="number"
              value={addAmount}
              onChange={(e) => setAddAmount(e.target.value)}
              className="w-full bg-gray-950 border border-gray-700 rounded-xl px-4 py-3 text-xl font-bold text-center text-emerald-400 mb-4"
            />
            <div className="flex space-x-2">
              <button onClick={() => setAddMoneyModal(false)} className="flex-1 bg-gray-800 text-gray-300 font-bold py-3 rounded-xl">Cancel</button>
              <button onClick={addMoneyToWallet} className="flex-1 bg-emerald-500 text-gray-950 font-black py-3 rounded-xl">Add ${addAmount}</button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation Bar */}
      <nav className="glass-panel border-t border-gray-800 py-3 px-4 flex justify-around fixed bottom-0 left-0 right-0 z-30 max-w-xl mx-auto">
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
    </div>
  );
}
