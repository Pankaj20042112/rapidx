import React, { useState, useEffect } from 'react';
import { 
  Power, Navigation, MapPin, DollarSign, Star, CheckCircle, 
  Clock, ShieldCheck, Upload, AlertCircle, Phone, MessageSquare, Car, ArrowRight, Flame, Target, Trophy,
  Menu, Bell, ChevronRight, Info, Check, X, User, Edit, Share2, LogOut, Wallet, ShieldAlert, Award, FileText, CreditCard, RefreshCw
} from 'lucide-react';
import { io } from 'socket.io-client';

const BACKEND_URL = `http://${window.location.hostname}:4000`;
const socket = io(BACKEND_URL);

export default function DriverApp() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('ridex_driver_token'));
  const [phone, setPhone] = useState('+17777777777');
  const [otp, setOtp] = useState('123456');

  // Registration & Auth Screen State
  const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER'>('REGISTER');
  const [fullName, setFullName] = useState('Rahul Sharma');
  const [email, setEmail] = useState('rahul.sharma@ridex-driver.com');
  const [vehicleMake, setVehicleMake] = useState('Toyota');
  const [vehicleModel, setVehicleModel] = useState('Glanza EV');
  const [licensePlate, setLicensePlate] = useState('GJ-01-RX-88');
  const [licenseNumber, setLicenseNumber] = useState('DL-GJ2024-998877');
  const [otpSent, setOtpSent] = useState(false);
  const [language, setLanguage] = useState<'en' | 'hi' | 'gu'>('en');

  // Duty State
  const [isOnline, setIsOnline] = useState(true);
  const [driverProfile, setDriverProfile] = useState<any>(null);
  const [incomingRequest, setIncomingRequest] = useState<any>({
    id: 'rd-demo-99',
    pickupAddress: 'LD College of Engineering',
    pickupSub: 'Paldi, Ahmedabad',
    destinationAddress: 'Chandkheda',
    destinationSub: 'Ahmedabad, Gujarat',
    distanceKm: 12.4,
    durationMin: 28,
    estimatedFare: 473.70,
    paymentMethod: 'Cash',
    customerRating: 4.9,
    otp: '8978'
  });

  const [countdown, setCountdown] = useState(15);
  const [currentTrip, setCurrentTrip] = useState<any>(null);
  const [enteredOtp, setEnteredOtp] = useState('');
  const [earningsData, setEarningsData] = useState<any>(null);

  // Tabs & Modals
  const [activeTab, setActiveTab] = useState<'DUTY' | 'HEATMAP' | 'EARNINGS' | 'KYC'>('DUTY');
  const [editProfileModal, setEditProfileModal] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [declineReasonModal, setDeclineReasonModal] = useState(false);
  const [declineReason, setDeclineReason] = useState('Too far away');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Editable Profile State
  const [editName, setEditName] = useState('Rahul Sharma');
  const [editEmail, setEditEmail] = useState('rahul.sharma@ridex-driver.com');
  const [editMake, setEditMake] = useState('Toyota');
  const [editModel, setEditModel] = useState('Glanza EV');
  const [editPlate, setEditPlate] = useState('GJ-01-RX-88');

  useEffect(() => {
    if (token) {
      fetchDashboard();
      fetchEarnings();
    }
  }, [token]);

  useEffect(() => {
    if (!incomingRequest || countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          showToast('⏳ Trip request timed out');
          setIncomingRequest(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [incomingRequest, countdown]);

  useEffect(() => {
    socket.on('ride:created', () => {
      loadNewTripRequest();
    });
    return () => {
      socket.off('ride:created');
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadNewTripRequest = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/rides/requests`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.data.length > 0) {
        const r = data.data[0];
        setIncomingRequest({
          id: r.id,
          pickupAddress: r.pickupAddress || 'LD College of Engineering',
          pickupSub: 'Paldi, Ahmedabad',
          destinationAddress: r.destinationAddress || 'Chandkheda',
          destinationSub: 'Ahmedabad, Gujarat',
          distanceKm: 12.4,
          durationMin: 28,
          estimatedFare: r.fare || 473.70,
          paymentMethod: 'Cash',
          customerRating: 4.9,
          otp: r.otp || '8978'
        });
        setCountdown(15);
        showToast('🚖 New Trip Request Loaded!');
      } else {
        setIncomingRequest({
          id: 'rd-demo-' + Math.floor(100 + Math.random() * 900),
          pickupAddress: 'LD College of Engineering',
          pickupSub: 'Paldi, Ahmedabad',
          destinationAddress: 'Chandkheda',
          destinationSub: 'Ahmedabad, Gujarat',
          distanceKm: 12.4,
          durationMin: 28,
          estimatedFare: 473.70,
          paymentMethod: 'Cash',
          customerRating: 4.9,
          otp: '8978'
        });
        setCountdown(15);
        showToast('🚖 Trip Request Received!');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const sendOtp = async () => {
    if (!phone) return alert('Please enter phone number');
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
        body: JSON.stringify({ phone, otp, role: 'DRIVER', fullName: authMode === 'REGISTER' ? fullName : undefined })
      });
      const data = await res.json();
      if (data.success) {
        setToken(data.data.token);
        localStorage.setItem('ridex_driver_token', data.data.token);
        fetchDashboard();
      } else {
        alert(data.error?.message || 'Invalid OTP');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchDashboard = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/drivers/me/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setDriverProfile(data.data);
        setIsOnline(data.data.isOnline);
        setEditName(data.data.driverName);
        if (data.data.user?.email) setEditEmail(data.data.user.email);
        if (data.data.vehicle) {
          setEditMake(data.data.vehicle.make);
          setEditModel(data.data.vehicle.model);
          setEditPlate(data.data.vehicle.licensePlate);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchEarnings = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/drivers/earnings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setEarningsData(data.data);
    } catch (e) {
      console.error(e);
    }
  };

  const toggleDuty = async () => {
    const endpoint = isOnline ? '/api/drivers/me/offline' : '/api/drivers/me/online';
    try {
      const res = await fetch(`${BACKEND_URL}${endpoint}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setIsOnline(!isOnline);
        showToast(isOnline ? '🔴 You are now OFFLINE' : '🟢 You are now ONLINE & ready for trips');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const acceptRide = async () => {
    if (!incomingRequest) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/rides/${incomingRequest.id}/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setCurrentTrip(data.data);
        setIncomingRequest(null);
        showToast('🎉 Trip Accepted! Navigate to Pickup');
      } else {
        alert(data.error?.message || 'Trip accepted by another driver');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const declineRide = () => {
    showToast(`Declined: "${declineReason}"`);
    setIncomingRequest(null);
    setDeclineReasonModal(false);
  };

  const markArrived = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/rides/${currentTrip.id}/arrived`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setCurrentTrip(data.data);
        showToast('📍 Marked Arrived! Ask rider for 4-digit OTP');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const startTripWithOtp = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/rides/${currentTrip.id}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ otp: enteredOtp || '8978' })
      });
      const data = await res.json();
      if (data.success) {
        setCurrentTrip(data.data);
        showToast('🟢 OTP Verified! Trip IN PROGRESS');
      } else {
        alert('Invalid OTP entered');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const completeTrip = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/rides/${currentTrip.id}/complete`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        alert(`🎉 Trip Completed! Collect Cash: ₹${data.data.finalFare || 473.70}`);
        setCurrentTrip(null);
        fetchDashboard();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const saveProfile = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/drivers/me/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          fullName: editName,
          email: editEmail,
          make: editMake,
          model: editModel,
          licensePlate: editPlate
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast('✅ Driver Profile Saved Successfully!');
        setEditProfileModal(false);
        fetchDashboard();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Dedicated Registration & Login Screen
  if (!token) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex flex-col justify-between p-5 font-sans relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:24px_24px]"></div>

        <header className="flex justify-between items-center z-10">
          <div className="bg-emerald-500 p-2.5 rounded-2xl text-gray-950 font-black text-xl flex items-center shadow-lg shadow-emerald-500/30">
            <Car className="w-6 h-6 mr-1.5" /> Ride<span className="text-white">X</span> Driver
          </div>

          <div className="flex bg-gray-900 border border-gray-800 rounded-full p-1 text-xs font-bold">
            {(['en', 'hi', 'gu'] as const).map(lang => (
              <button
                key={lang}
                onClick={() => setLanguage(lang)}
                className={`px-3 py-1 rounded-full uppercase transition ${language === lang ? 'bg-emerald-500 text-gray-950' : 'text-gray-400 hover:text-white'}`}
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
              className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition ${authMode === 'REGISTER' ? 'bg-emerald-500 text-gray-950 shadow-md' : 'text-gray-400 hover:text-white'}`}
            >
              Partner Onboarding
            </button>
            <button
              onClick={() => { setAuthMode('LOGIN'); setOtpSent(false); }}
              className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition ${authMode === 'LOGIN' ? 'bg-emerald-500 text-gray-950 shadow-md' : 'text-gray-400 hover:text-white'}`}
            >
              Partner Sign In
            </button>
          </div>

          <h2 className="text-2xl font-black text-white mb-1">
            {authMode === 'REGISTER' ? 'Register Driver Partner' : 'Welcome Back Partner'}
          </h2>
          <p className="text-xs text-gray-400 mb-6">
            {authMode === 'REGISTER' ? 'Enter vehicle & personal details to start earning daily' : 'Enter registered mobile number'}
          </p>

          {!otpSent ? (
            <div className="space-y-3">
              {authMode === 'REGISTER' && (
                <>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Driver Full Name</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 mt-1"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Vehicle Make</label>
                      <input
                        type="text"
                        value={vehicleMake}
                        onChange={(e) => setVehicleMake(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase">License Plate</label>
                      <input
                        type="text"
                        value={licensePlate}
                        onChange={(e) => setLicensePlate(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none mt-1 uppercase"
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase">Mobile Phone Number</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+17777777777"
                  className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 mt-1"
                />
              </div>

              <button
                onClick={sendOtp}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-black py-3.5 rounded-xl text-sm shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition mt-2"
              >
                Send OTP Verification Code
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-gray-900 border border-emerald-500/30 p-4 rounded-2xl text-center">
                <p className="text-xs text-gray-400">OTP Sent to <span className="font-bold text-white">{phone}</span></p>
                <button onClick={() => setOtp('123456')} className="mt-2 text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full font-bold">
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
                  className="w-full bg-gray-900 border border-emerald-500 rounded-xl px-4 py-3 text-center text-2xl font-black tracking-widest text-emerald-400 focus:outline-none mt-1"
                />
              </div>

              <button
                onClick={handleVerifyOtp}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-black py-3.5 rounded-xl text-base shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition"
              >
                Verify & Launch Partner Console
              </button>
            </div>
          )}
        </div>

        <footer className="text-center text-[11px] text-gray-500 z-10">
          RideX Driver Partner Terms • ISO 27001 Certified Security
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070A12] text-white flex flex-col justify-between relative font-sans">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-gray-950 px-5 py-2.5 rounded-full text-xs font-black shadow-2xl animate-bounce">
          {toastMessage}
        </div>
      )}

      {/* 1. Header Bar */}
      <header className="px-4 py-3.5 bg-gray-950/80 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between border-b border-gray-800/60 shadow-xl">
        <div className="flex items-center space-x-3">
          <button onClick={() => setDrawerOpen(true)} className="p-2 bg-gray-900 border border-gray-800 rounded-xl text-gray-300">
            <Menu className="w-5 h-5" />
          </button>
          <div className="text-2xl font-black tracking-tight text-white flex items-center">
            Ride<span className="text-emerald-400">X</span> <span className="text-xs font-bold text-gray-400 ml-1.5">Driver</span>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          <button onClick={() => setNotifOpen(true)} className="p-2 bg-gray-900 border border-gray-800 rounded-xl text-gray-300 relative">
            <Bell className="w-5 h-5" />
            <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full absolute top-1.5 right-1.5 ring-2 ring-gray-950"></span>
          </button>

          <div onClick={() => setActiveTab('EARNINGS')} className="bg-emerald-950/60 border border-emerald-500/40 px-3.5 py-1.5 rounded-xl flex items-center space-x-2 text-xs font-bold shadow-md cursor-pointer">
            <Wallet className="w-4 h-4 text-emerald-400" />
            <span className="text-emerald-400 font-extrabold">₹{driverProfile?.walletBalance || '4,250.00'} &gt;</span>
          </div>
        </div>
      </header>

      {/* 2. Main Body */}
      <main className="flex-1 relative p-4 max-w-xl mx-auto w-full flex flex-col justify-between pb-24 overflow-y-auto">

        {/* DUTY TAB */}
        {activeTab === 'DUTY' && (
          <div className="space-y-4">
            
            {/* Profile Header & Online Duty Power Toggle */}
            <div className="bg-gray-900/90 border border-gray-800 p-4 rounded-3xl flex items-center justify-between shadow-xl">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <div className="w-12 h-12 bg-emerald-600 rounded-full flex items-center justify-center text-white text-xl font-bold border-2 border-emerald-400">
                    RS
                  </div>
                  <div className={`w-3.5 h-3.5 rounded-full absolute bottom-0 right-0 border-2 border-gray-900 ${isOnline ? 'bg-emerald-400' : 'bg-gray-500'}`}></div>
                </div>

                <div>
                  <div className="flex items-center space-x-1.5">
                    <h3 className="font-extrabold text-sm text-white">{driverProfile?.driverName || 'Hello, Rahul'}</h3>
                    <CheckCircle className="w-4 h-4 text-emerald-400 fill-current" />
                  </div>
                  <div className="text-xs text-yellow-400 flex items-center font-bold mt-0.5">
                    <Star className="w-3.5 h-3.5 fill-current mr-1" /> {driverProfile?.rating || '4.8'}
                    <span className="text-gray-400 font-normal ml-1">({driverProfile?.totalRidesCount || 512} rides)</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end">
                <button
                  onClick={toggleDuty}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-full font-black text-xs border shadow-lg transition active:scale-95 ${
                    isOnline
                      ? 'bg-emerald-950/80 border-emerald-500 text-emerald-400 shadow-emerald-500/20'
                      : 'bg-gray-800 border-gray-700 text-gray-400'
                  }`}
                >
                  <Power className={`w-4 h-4 ${isOnline ? 'text-emerald-400 animate-pulse' : 'text-gray-500'}`} />
                  <span>{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
                </button>
                <span className="text-[10px] text-gray-400 font-semibold mt-1">
                  {isOnline ? "You're available for trips" : "You are offline"}
                </span>
              </div>
            </div>

            {/* 4 KPI Statistics Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="bg-gray-900/60 border border-gray-800 p-3.5 rounded-3xl flex flex-col justify-between">
                <div className="p-2 bg-emerald-600/20 text-emerald-400 rounded-xl w-fit mb-2">
                  <Car className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 font-semibold">Today's Earnings</span>
                  <div className="text-xl font-black text-white">₹2,350</div>
                  <div className="text-[9px] text-emerald-400 font-bold">Wallet Balance ₹4,250</div>
                </div>
              </div>

              <div className="bg-gray-900/60 border border-gray-800 p-3.5 rounded-3xl flex flex-col justify-between">
                <div className="p-2 bg-sky-600/20 text-sky-400 rounded-xl w-fit mb-2">
                  <BarChart3Icon className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 font-semibold">Today's Rides</span>
                  <div className="text-xl font-black text-white">12</div>
                  <div className="text-[9px] text-gray-400">Completed</div>
                </div>
              </div>

              <div className="bg-gray-900/60 border border-gray-800 p-3.5 rounded-3xl flex flex-col justify-between">
                <div className="p-2 bg-purple-600/20 text-purple-400 rounded-xl w-fit mb-2">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 font-semibold">Online Hours</span>
                  <div className="text-xl font-black text-white">06h 30m</div>
                  <div className="text-[9px] text-gray-400">Active time</div>
                </div>
              </div>

              <div className="bg-gray-900/60 border border-gray-800 p-3.5 rounded-3xl flex flex-col justify-between">
                <div className="p-2 bg-yellow-600/20 text-yellow-400 rounded-xl w-fit mb-2">
                  <Star className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 font-semibold">Acceptance</span>
                  <div className="text-xl font-black text-white">92%</div>
                  <div className="text-[9px] text-emerald-400 font-bold">High</div>
                </div>
              </div>
            </div>

            {/* Daily Peak Hours Quest Progress Card */}
            <div className="bg-gradient-to-r from-emerald-950/80 via-gray-900 to-gray-950 border border-emerald-500/40 p-4 rounded-3xl flex items-center justify-between shadow-xl">
              <div className="flex items-center space-x-3.5 flex-1">
                <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-2xl flex items-center justify-center">
                  <Trophy className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h4 className="font-extrabold text-xs text-white">Daily Peak Hours Quest</h4>
                  <p className="text-[10px] text-gray-400 mt-0.5">Complete 3 more rides today to unlock ₹250 instant wallet bonus!</p>
                  
                  <div className="w-full max-w-[160px] h-2 bg-gray-800 rounded-full mt-2 overflow-hidden border border-gray-700">
                    <div className="h-full bg-emerald-400 rounded-full" style={{ width: '70%' }}></div>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-400 mt-1 block">7 / 10 Rides</span>
                </div>
              </div>

              <div className="text-right pl-2">
                <div className="text-lg font-black text-emerald-400 flex items-center justify-end">
                  ₹250 <ChevronRight className="w-4 h-4 ml-0.5" />
                </div>
                <span className="text-[10px] text-gray-400 uppercase font-semibold">Bonus</span>
              </div>
            </div>

            {/* TRIP REQUEST CONTAINER (SHOWS NEW REQUEST OR FETCH BUTTON) */}
            {incomingRequest ? (
              <div className="glass-panel border border-emerald-500/60 rounded-3xl p-5 shadow-2xl space-y-4">
                <div className="flex justify-between items-center">
                  <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-black px-3.5 py-1.5 rounded-full text-xs uppercase tracking-wider">
                    NEW TRIP REQUEST
                  </span>
                  <div className="w-9 h-9 rounded-full border-2 border-emerald-400 flex items-center justify-center font-black text-xs text-emerald-400 bg-emerald-950/40 animate-pulse">
                    {countdown}s
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2 space-y-3">
                    <div className="flex items-start space-x-3">
                      <div className="w-3 h-3 bg-emerald-400 rounded-full mt-1"></div>
                      <div>
                        <span className="text-[10px] text-gray-400 font-semibold uppercase">Pickup</span>
                        <div className="font-extrabold text-sm text-white">{incomingRequest.pickupAddress}</div>
                        <div className="text-xs text-gray-400">{incomingRequest.pickupSub}</div>
                      </div>
                    </div>

                    <div className="w-0.5 h-3 bg-gray-700 ml-1.5 border-dashed border-l"></div>

                    <div className="flex items-start space-x-3">
                      <MapPin className="w-4 h-4 text-rose-500 mt-1" />
                      <div>
                        <span className="text-[10px] text-gray-400 font-semibold uppercase">Drop</span>
                        <div className="font-extrabold text-sm text-white">{incomingRequest.destinationAddress}</div>
                        <div className="text-xs text-gray-400">{incomingRequest.destinationSub}</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-950 border border-gray-800 rounded-2xl h-28 relative overflow-hidden flex items-center justify-center">
                    <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:16px_16px]"></div>
                    <svg className="w-full h-full" viewBox="0 0 200 100">
                      <path d="M 20 20 Q 100 80 180 80" stroke="#10B981" strokeWidth="4" fill="none" />
                    </svg>
                    <span className="absolute bottom-2 right-2 bg-gray-900/90 text-white px-2 py-0.5 rounded text-[10px] font-bold border border-gray-800">
                      {incomingRequest.distanceKm} km
                    </span>
                  </div>
                </div>

                <div className="bg-gray-950 p-3.5 rounded-2xl border border-gray-800 grid grid-cols-4 gap-2 text-center">
                  <div>
                    <span className="text-[10px] text-gray-400 font-semibold">Est. Earnings</span>
                    <div className="text-base font-black text-emerald-400">₹{incomingRequest.estimatedFare}</div>
                    <span className="text-[8px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-bold">Includes tolls</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 font-semibold">Distance</span>
                    <div className="text-sm font-bold text-white mt-1">{incomingRequest.distanceKm} km</div>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 font-semibold">Est. Time</span>
                    <div className="text-sm font-bold text-white mt-1">{incomingRequest.durationMin} min</div>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 font-semibold">Payment</span>
                    <div className="text-sm font-bold text-emerald-400 mt-1 flex items-center justify-center">
                      💵 {incomingRequest.paymentMethod}
                    </div>
                  </div>
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={declineRide}
                    className="flex-1 bg-gray-900 border border-gray-700 hover:border-rose-500 text-gray-300 font-bold py-3.5 rounded-2xl flex items-center justify-center text-sm transition"
                  >
                    <X className="w-4 h-4 mr-2" /> DECLINE
                  </button>
                  <button
                    onClick={acceptRide}
                    className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-black py-3.5 rounded-2xl flex items-center justify-center text-sm shadow-xl shadow-emerald-500/20 active:scale-[0.98] transition"
                  >
                    ACCEPT TRIP <ChevronRight className="w-4 h-4 ml-1" />
                  </button>
                </div>
              </div>
            ) : !currentTrip ? (
              <div className="bg-gray-900 border border border-emerald-500/40 p-5 rounded-3xl text-center space-y-3 shadow-xl">
                <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto border border-emerald-500/30">
                  <RefreshCw className="w-6 h-6 animate-spin" />
                </div>
                <h3 className="font-extrabold text-sm text-white">Searching for Nearby Rides...</h3>
                <p className="text-xs text-gray-400">Stay online to receive instant ride requests from customers</p>
                <button
                  onClick={loadNewTripRequest}
                  className="bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-black px-5 py-3 rounded-2xl text-xs shadow-lg shadow-emerald-500/20 active:scale-95 transition"
                >
                  ⚡ Fetch / Load New Trip Request
                </button>
              </div>
            ) : null}

            {/* ACTIVE TRIP CONTROL SHEET */}
            {currentTrip && (
              <div className="glass-panel border border-emerald-500 rounded-3xl p-5 shadow-2xl space-y-4">
                <div className="flex justify-between items-center border-b border-gray-800 pb-3">
                  <div>
                    <span className="text-xs text-emerald-400 font-bold uppercase">{currentTrip.status.replace('_', ' ')}</span>
                    <div className="text-xs text-gray-300 mt-0.5">{currentTrip.destinationAddress}</div>
                  </div>
                  <div className="text-xl font-black text-emerald-400">₹{currentTrip.estimatedFare || 473.70}</div>
                </div>

                {currentTrip.status === 'DRIVER_ASSIGNED' && (
                  <button onClick={markArrived} className="w-full bg-emerald-500 text-gray-950 font-black py-4 rounded-2xl text-sm">
                    I Have Arrived at Pickup
                  </button>
                )}

                {currentTrip.status === 'DRIVER_ARRIVED' && (
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Enter Rider 4-Digit OTP"
                      value={enteredOtp}
                      onChange={(e) => setEnteredOtp(e.target.value)}
                      className="w-full bg-gray-950 border border-emerald-500/50 rounded-2xl px-4 py-3 text-center text-2xl font-black tracking-widest text-emerald-400"
                    />
                    <button onClick={startTripWithOtp} className="w-full bg-emerald-500 text-gray-950 font-black py-3.5 rounded-2xl text-sm">
                      Verify OTP & Start Ride
                    </button>
                  </div>
                )}

                {currentTrip.status === 'IN_PROGRESS' && (
                  <button onClick={completeTrip} className="w-full bg-rose-600 text-white font-black py-4 rounded-2xl text-sm shadow-xl shadow-rose-600/30">
                    Complete Ride & Collect ₹473.70 Cash
                  </button>
                )}
              </div>
            )}

            {/* Hotspots Demand Bar */}
            <div className="bg-gray-900/80 border border-gray-800 p-4 rounded-3xl flex items-center justify-between shadow-xl">
              <div className="flex items-center space-x-3">
                <Flame className="w-5 h-5 text-rose-500 animate-pulse" />
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-extrabold text-xs text-white">Hotspots</span>
                    <div className="flex space-x-1">
                      <div className="w-1.5 h-3 bg-rose-500 rounded-sm"></div>
                      <div className="w-1.5 h-3.5 bg-yellow-400 rounded-sm"></div>
                      <div className="w-1.5 h-4 bg-emerald-400 rounded-sm"></div>
                      <div className="w-1.5 h-3 bg-gray-700 rounded-sm"></div>
                    </div>
                  </div>
                  <div className="text-xs text-yellow-400 font-bold mt-0.5">
                    Very High Demand <span className="text-gray-400 font-normal ml-1">Paldi, Navrangpura</span>
                  </div>
                </div>
              </div>

              <button onClick={() => setActiveTab('HEATMAP')} className="text-xs text-gray-400 font-bold flex items-center hover:text-white">
                See Heatmap &gt;
              </button>
            </div>
          </div>
        )}

        {/* HEATMAP TAB */}
        {activeTab === 'HEATMAP' && (
          <div className="space-y-4">
            <h2 className="text-xl font-black">Zone Demand Heatmap</h2>
            <div className="bg-gray-900 border border-gray-800 p-5 rounded-3xl space-y-3">
              {[
                { zone: 'Paldi / Navrangpura', demand: 'VERY HIGH DEMAND', surge: '1.5x Surge', color: 'border-rose-500 bg-rose-950/20 text-rose-400' },
                { zone: 'LD College Campus', demand: 'HIGH DEMAND', surge: '1.3x Surge', color: 'border-yellow-500 bg-yellow-950/20 text-yellow-400' },
                { zone: 'Chandkheda Hub', demand: 'MODERATE DEMAND', surge: '1.1x Surge', color: 'border-emerald-500 bg-emerald-950/20 text-emerald-400' },
              ].map((z, i) => (
                <div key={i} className={`p-4 rounded-2xl border ${z.color} flex justify-between items-center`}>
                  <div>
                    <div className="font-bold text-sm text-white">{z.zone}</div>
                    <div className="text-xs font-semibold">{z.demand}</div>
                  </div>
                  <span className="px-3 py-1 bg-gray-950 rounded-full font-black text-xs">{z.surge}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* EARNINGS TAB */}
        {activeTab === 'EARNINGS' && (
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-emerald-950 via-gray-900 to-gray-950 border border-emerald-500/40 p-6 rounded-3xl text-center shadow-xl">
              <span className="text-xs text-gray-400 uppercase font-semibold">Today's Net Earnings</span>
              <div className="text-4xl font-black text-emerald-400 mt-1">₹2,350.00</div>
              <p className="text-xs text-gray-400 mt-1">Gross Earnings ₹2,850 • Platform Fee ₹350</p>
              <button onClick={() => showToast('💰 Instant Payout Requested to Bank Account!')} className="mt-4 bg-emerald-500 text-gray-950 font-black px-6 py-2.5 rounded-full text-sm">
                Withdraw to Bank Account
              </button>
            </div>
          </div>
        )}

        {/* KYC TAB */}
        {activeTab === 'KYC' && (
          <div className="bg-gray-900 border border-gray-800 p-5 rounded-3xl space-y-4">
            <h3 className="font-black text-lg text-white">KYC Verification Desk</h3>
            <div className="space-y-2 text-xs">
              {[
                { doc: 'Driving License', status: 'VERIFIED ✓', color: 'text-emerald-400' },
                { doc: 'Government ID (Aadhaar/PAN)', status: 'VERIFIED ✓', color: 'text-emerald-400' },
                { doc: 'Vehicle Registration Certificate (RC)', status: 'VERIFIED ✓', color: 'text-emerald-400' },
                { doc: 'Vehicle Insurance Policy', status: 'VERIFIED ✓', color: 'text-emerald-400' },
              ].map((d, i) => (
                <div key={i} className="bg-gray-950 border border-gray-800 p-3.5 rounded-xl flex justify-between items-center">
                  <span className="font-bold text-gray-200">{d.doc}</span>
                  <span className={`font-extrabold ${d.color}`}>{d.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* 3. Bottom Navigation */}
      <nav className="bg-gray-950/90 backdrop-blur-md border-t border-gray-800/80 py-3 px-6 flex justify-around fixed bottom-0 left-0 right-0 z-30 max-w-xl mx-auto shadow-2xl">
        {[
          { id: 'DUTY', label: 'Duty', icon: Car },
          { id: 'HEATMAP', label: 'Heatmap', icon: Flame },
          { id: 'EARNINGS', label: 'Earnings', icon: DollarSign },
          { id: 'KYC', label: 'KYC', icon: ShieldCheck },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex flex-col items-center text-[10px] font-bold ${activeTab === tab.id ? 'text-emerald-400' : 'text-gray-500'}`}
          >
            <tab.icon className="w-5 h-5 mb-1" />
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* EDIT PROFILE MODAL */}
      {editProfileModal && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-800 pb-3">
              <h3 className="font-bold text-lg text-white">Edit Driver Profile</h3>
              <button onClick={() => setEditProfileModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-gray-400 uppercase">Driver Full Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-white mt-1 font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-gray-400 uppercase">Email Address</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-white mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-gray-400 uppercase">Vehicle Make</label>
                  <input
                    type="text"
                    value={editMake}
                    onChange={(e) => setEditMake(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2.5 text-white mt-1"
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-400 uppercase">Vehicle Model</label>
                  <input
                    type="text"
                    value={editModel}
                    onChange={(e) => setEditModel(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2.5 text-white mt-1"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-gray-400 uppercase">License Plate Number</label>
                <input
                  type="text"
                  value={editPlate}
                  onChange={(e) => setEditPlate(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-emerald-400 font-bold uppercase mt-1"
                />
              </div>
            </div>

            <div className="flex space-x-2 pt-2">
              <button onClick={() => setEditProfileModal(false)} className="flex-1 bg-gray-800 text-gray-300 font-bold py-3 rounded-xl text-xs">
                Cancel
              </button>
              <button onClick={saveProfile} className="flex-1 bg-emerald-500 text-gray-950 font-black py-3 rounded-xl text-xs">
                Save Profile Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SIDE DRAWER MENU (`=`) */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex">
          <div className="bg-gray-950 border-r border-gray-800 w-72 h-full p-5 flex flex-col justify-between shadow-2xl">
            <div>
              <div className="flex justify-between items-center mb-6">
                <div className="text-xl font-black text-white flex items-center">
                  <Car className="w-5 h-5 mr-2 text-emerald-400" /> Ride<span className="text-emerald-400">X</span> Driver
                </div>
                <button onClick={() => setDrawerOpen(false)} className="text-gray-400 hover:text-white p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-gray-900 border border-gray-800 p-4 rounded-2xl mb-6 flex items-center space-x-3">
                <div className="w-10 h-10 bg-emerald-600 text-white rounded-full font-bold flex items-center justify-center border border-emerald-400">
                  RS
                </div>
                <div>
                  <div className="font-bold text-sm text-white">{driverProfile?.driverName || 'Rahul Sharma'}</div>
                  <div className="text-xs text-yellow-400 flex items-center">⭐ 4.8 Rating</div>
                </div>
              </div>

              <div className="space-y-1">
                {[
                  { label: 'Edit Driver Profile', icon: User, action: () => { setEditProfileModal(true); setDrawerOpen(false); } },
                  { label: 'My Earnings & Ledger', icon: DollarSign, action: () => { setActiveTab('EARNINGS'); setDrawerOpen(false); } },
                  { label: 'KYC & Documents', icon: ShieldCheck, action: () => { setActiveTab('KYC'); setDrawerOpen(false); } },
                ].map((item, idx) => (
                  <button
                    key={idx}
                    onClick={item.action}
                    className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold text-gray-300 hover:bg-gray-900 hover:text-white transition"
                  >
                    <item.icon className="w-4 h-4 text-emerald-400" />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => { localStorage.removeItem('ridex_driver_token'); setToken(null); setDrawerOpen(false); }}
              className="flex items-center space-x-2 text-rose-400 font-bold text-xs p-3 hover:bg-rose-950/30 rounded-xl transition"
            >
              <LogOut className="w-4 h-4" /> <span>Sign Out</span>
            </button>
          </div>
          <div className="flex-1" onClick={() => setDrawerOpen(false)}></div>
        </div>
      )}
    </div>
  );
}

function BarChart3Icon(props: any) {
  return (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 20V10m6 10V4M6 20v-4" />
    </svg>
  );
}
