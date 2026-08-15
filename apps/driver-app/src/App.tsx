import React, { useState, useEffect } from 'react';
import { 
  Power, Navigation, MapPin, DollarSign, Star, CheckCircle, 
  Clock, ShieldCheck, Upload, AlertCircle, Phone, MessageSquare, Car, ArrowRight
} from 'lucide-react';
import { io } from 'socket.io-client';

const BACKEND_URL = 'http://localhost:4000';
const socket = io(BACKEND_URL);

export default function DriverApp() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('ridex_driver_token'));
  const [phone, setPhone] = useState('+17777777777');
  const [otp, setOtp] = useState('123456');

  const [isOnline, setIsOnline] = useState(false);
  const [driverProfile, setDriverProfile] = useState<any>(null);
  const [incomingRequest, setIncomingRequest] = useState<any>(null);
  const [countdown, setCountdown] = useState(10);

  const [currentTrip, setCurrentTrip] = useState<any>(null);
  const [enteredOtp, setEnteredOtp] = useState('');
  const [earnings, setEarnings] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'DUTY' | 'EARNINGS' | 'KYC'>('DUTY');

  const [docType, setDocType] = useState('LICENSE');
  const [docUrl, setDocUrl] = useState('');

  useEffect(() => {
    if (token) {
      fetchDriverProfile();
      fetchEarnings();
    }
  }, [token]);

  // Poll for searching rides when online
  useEffect(() => {
    if (!token || !isOnline || currentTrip) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/rides`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
          const searchingRide = data.data.find((r: any) => r.status === 'SEARCHING_DRIVER');
          if (searchingRide && !incomingRequest) {
            setIncomingRequest(searchingRide);
            setCountdown(10);
          }
        }
      } catch (e) {
        console.error(e);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [token, isOnline, currentTrip, incomingRequest]);

  // 10s Dispatch Countdown Timer
  useEffect(() => {
    if (!incomingRequest || countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          setIncomingRequest(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [incomingRequest, countdown]);

  // Simulate GPS WebSocket broadcast when on an active trip
  useEffect(() => {
    if (!currentTrip || !driverProfile) return;
    const gpsInterval = setInterval(() => {
      const simLat = 12.9716 + (Math.random() - 0.5) * 0.005;
      const simLng = 77.5946 + (Math.random() - 0.5) * 0.005;
      socket.emit('driver:location_update', { driverId: driverProfile.id, latitude: simLat, longitude: simLng });
    }, 3000);
    return () => clearInterval(gpsInterval);
  }, [currentTrip, driverProfile]);

  const handleLogin = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp, role: 'DRIVER', fullName: 'Sam Speed' })
      });
      const data = await res.json();
      if (data.success) {
        setToken(data.data.token);
        localStorage.setItem('ridex_driver_token', data.data.token);
        fetchDriverProfile();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchDriverProfile = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/users/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.data.driverProfile) {
        setDriverProfile(data.data.driverProfile);
        setIsOnline(data.data.driverProfile.status === 'ONLINE');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const toggleDuty = async () => {
    const endpoint = isOnline ? '/api/drivers/offline' : '/api/drivers/online';
    try {
      const res = await fetch(`${BACKEND_URL}${endpoint}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setIsOnline(!isOnline);
      } else {
        alert(data.error?.message || 'Action failed');
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
      } else {
        alert(data.error?.message || 'Ride no longer available');
        setIncomingRequest(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const markArrived = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/rides/${currentTrip.id}/arrived`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setCurrentTrip(data.data);
    } catch (e) {
      console.error(e);
    }
  };

  const startTripWithOtp = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/rides/${currentTrip.id}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ otp: enteredOtp })
      });
      const data = await res.json();
      if (data.success) {
        setCurrentTrip(data.data);
      } else {
        alert(data.error?.message || 'Invalid Ride OTP');
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
        alert(`🎉 Trip Completed! Final Fare: $${data.data.finalFare}`);
        setCurrentTrip(null);
        fetchEarnings();
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
      if (data.success) setEarnings(data.data);
    } catch (e) {
      console.error(e);
    }
  };

  const uploadKycDoc = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/kyc/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ documentType: docType, documentUrl: docUrl || 'https://via.placeholder.com/400x250?text=License' })
      });
      const data = await res.json();
      if (data.success) {
        alert('Document uploaded successfully for Admin Review!');
        setDocUrl('');
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-4">
        <div className="bg-gray-900 border border-gray-800 p-6 rounded-3xl max-w-md w-full shadow-2xl">
          <div className="bg-emerald-500 w-12 h-12 rounded-2xl flex items-center justify-center text-gray-950 mb-4">
            <Car className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black mb-1">Driver Partner Portal</h2>
          <p className="text-gray-400 text-xs mb-6">Sign in to go online and start accepting trip requests</p>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase">Mobile Number</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase">OTP Code (Demo: 123456)</label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white mt-1"
              />
            </div>
            <button onClick={handleLogin} className="w-full bg-emerald-500 text-gray-950 font-bold py-3.5 rounded-xl hover:bg-emerald-400">
              Sign In Partner
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col justify-between font-sans">
      {/* Top Bar */}
      <header className="px-5 py-4 glass-panel sticky top-0 z-30 flex items-center justify-between shadow-xl border-b border-gray-800">
        <div className="flex items-center space-x-2">
          <div className="bg-emerald-500 p-2 rounded-xl text-gray-950 font-black text-xl flex items-center">
            <Car className="w-5 h-5 mr-1" /> Ride<span className="text-white">X</span> Driver
          </div>
        </div>

        {/* Online / Offline Power Toggle */}
        <button
          onClick={toggleDuty}
          className={`flex items-center space-x-2 px-4 py-2 rounded-full font-bold text-xs border transition shadow-lg ${
            isOnline
              ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-emerald-500/10'
              : 'bg-gray-800 border-gray-700 text-gray-400'
          }`}
        >
          <Power className={`w-4 h-4 ${isOnline ? 'text-emerald-400 animate-pulse' : 'text-gray-500'}`} />
          <span>{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
        </button>
      </header>

      {/* Main Body */}
      <main className="flex-1 relative p-4 max-w-xl mx-auto w-full flex flex-col justify-between">

        {/* DUTY & TRIP TAB */}
        {activeTab === 'DUTY' && (
          <div className="flex-1 flex flex-col justify-between">
            {/* Status Card */}
            <div className="bg-gray-900 border border-gray-800 p-4 rounded-2xl mb-4 flex items-center justify-between">
              <div>
                <span className="text-xs text-gray-400">Rating</span>
                <div className="flex items-center text-yellow-400 font-bold text-sm">
                  <Star className="w-4 h-4 fill-current mr-1" /> {driverProfile?.rating || '4.85'}
                </div>
              </div>
              <div className="border-r border-gray-800 h-8"></div>
              <div>
                <span className="text-xs text-gray-400">Rides Completed</span>
                <div className="font-bold text-sm text-white">{driverProfile?.totalRides || 0}</div>
              </div>
              <div className="border-r border-gray-800 h-8"></div>
              <div>
                <span className="text-xs text-gray-400">Acceptance</span>
                <div className="font-bold text-sm text-emerald-400">{driverProfile?.acceptanceRate || 100}%</div>
              </div>
            </div>

            {/* Simulated Live Turn-by-Turn Map */}
            <div className="flex-1 bg-gray-900 border border-gray-800 rounded-3xl min-h-[300px] relative overflow-hidden flex items-center justify-center mb-4">
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:24px_24px]"></div>

              {!isOnline && !currentTrip && (
                <div className="text-center p-6 z-10">
                  <Power className="w-12 h-12 text-gray-600 mx-auto mb-2" />
                  <h3 className="font-bold text-gray-300">You are Offline</h3>
                  <p className="text-xs text-gray-500">Switch status to ONLINE to receive incoming ride dispatch requests</p>
                </div>
              )}

              {isOnline && !currentTrip && !incomingRequest && (
                <div className="text-center p-6 z-10 animate-pulse">
                  <Navigation className="w-12 h-12 text-emerald-400 mx-auto mb-2" />
                  <h3 className="font-bold text-white">Searching Nearby Requests...</h3>
                  <p className="text-xs text-gray-400">PostGIS Redis Geo Engine scanning active zone</p>
                </div>
              )}

              {/* INCOMING DISPATCH MODAL CARD */}
              {incomingRequest && (
                <div className="absolute inset-x-4 bottom-4 glass-panel border border-emerald-500/50 rounded-3xl p-5 shadow-2xl z-20">
                  <div className="flex justify-between items-center mb-3">
                    <span className="bg-emerald-500 text-gray-950 font-black px-3 py-1 rounded-full text-xs uppercase">
                      New Trip Request
                    </span>
                    <div className="w-8 h-8 rounded-full border-2 border-emerald-400 flex items-center justify-center font-bold text-xs text-emerald-400">
                      {countdown}s
                    </div>
                  </div>

                  <div className="space-y-2 mb-4 text-xs">
                    <div className="flex items-center text-gray-300">
                      <div className="w-2 h-2 bg-emerald-400 rounded-full mr-2"></div>
                      <span className="font-semibold text-white">Pickup:</span> {incomingRequest.pickupAddress}
                    </div>
                    <div className="flex items-center text-gray-300">
                      <MapPin className="w-3 h-3 text-rose-500 mr-2" />
                      <span className="font-semibold text-white">Drop:</span> {incomingRequest.destinationAddress}
                    </div>
                    <div className="flex items-center justify-between bg-gray-950 p-2 rounded-xl border border-gray-800 text-emerald-400 font-bold text-sm">
                      <span>Est. Earning</span>
                      <span>${incomingRequest.estimatedFare}</span>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <button onClick={() => setIncomingRequest(null)} className="flex-1 bg-gray-800 text-gray-400 font-bold py-3 rounded-xl">
                      Decline
                    </button>
                    <button onClick={acceptRide} className="flex-1 bg-emerald-500 text-gray-950 font-black py-3 rounded-xl hover:bg-emerald-400">
                      ACCEPT TRIP
                    </button>
                  </div>
                </div>
              )}

              {/* ACTIVE TRIP CONTROL SHEET */}
              {currentTrip && (
                <div className="absolute inset-x-4 bottom-4 glass-panel border border-emerald-500 rounded-3xl p-5 shadow-2xl z-20">
                  <div className="flex items-center justify-between border-b border-gray-800 pb-3 mb-3">
                    <div>
                      <span className="text-xs text-emerald-400 font-bold uppercase">{currentTrip.status.replace('_', ' ')}</span>
                      <div className="text-xs text-gray-300">{currentTrip.destinationAddress}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-black text-emerald-400">${currentTrip.estimatedFare}</div>
                    </div>
                  </div>

                  {currentTrip.status === 'DRIVER_ASSIGNED' && (
                    <button onClick={markArrived} className="w-full bg-emerald-500 text-gray-950 font-bold py-3.5 rounded-xl">
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
                        className="w-full bg-gray-950 border border-emerald-500/50 rounded-xl px-4 py-3 text-center text-xl font-bold tracking-widest text-emerald-400"
                      />
                      <button onClick={startTripWithOtp} className="w-full bg-emerald-500 text-gray-950 font-bold py-3.5 rounded-xl">
                        Verify OTP & Start Ride
                      </button>
                    </div>
                  )}

                  {currentTrip.status === 'IN_PROGRESS' && (
                    <button onClick={completeTrip} className="w-full bg-rose-500 text-white font-extrabold py-3.5 rounded-xl hover:bg-rose-600">
                      Complete Ride & Collect Fare
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* EARNINGS TAB */}
        {activeTab === 'EARNINGS' && (
          <div className="space-y-4">
            <div className="bg-gray-900 border border-gray-800 p-6 rounded-3xl text-center">
              <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Total Earnings</span>
              <div className="text-4xl font-black text-emerald-400 mt-1">${earnings?.totalEarnings?.toFixed(2) || '0.00'}</div>
              <div className="text-xs text-gray-500 mt-2">After 15% platform commission & taxes</div>
            </div>

            <h3 className="font-bold text-sm text-gray-300">Recent Completed Trips</h3>
            <div className="space-y-2">
              {earnings?.earnings?.map((e: any) => (
                <div key={e.id} className="bg-gray-900 border border-gray-800 p-4 rounded-2xl flex justify-between items-center">
                  <div>
                    <div className="font-bold text-sm">Ride #{e.rideId}</div>
                    <div className="text-xs text-gray-400">Gross: ${e.grossFare} | Fee: -${e.platformCommission}</div>
                  </div>
                  <div className="text-emerald-400 font-bold text-base">+${e.netEarnings}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* KYC DOCUMENT TAB */}
        {activeTab === 'KYC' && (
          <div className="space-y-4">
            <div className="bg-gray-900 border border-gray-800 p-5 rounded-3xl">
              <div className="flex items-center space-x-3 mb-4">
                <ShieldCheck className="w-6 h-6 text-emerald-400" />
                <div>
                  <h3 className="font-bold text-sm">Verification Status</h3>
                  <p className="text-xs text-emerald-400 font-semibold">{driverProfile?.kycStatus || 'PENDING'}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-gray-400">Document Type</label>
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white mt-1"
                  >
                    <option value="LICENSE">Driving License</option>
                    <option value="RC">Vehicle RC</option>
                    <option value="INSURANCE">Vehicle Insurance</option>
                    <option value="GOVT_ID">National Govt ID</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-400">Document Image URL</label>
                  <input
                    type="text"
                    placeholder="https://document-url.com/file.jpg"
                    value={docUrl}
                    onChange={(e) => setDocUrl(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white mt-1"
                  />
                </div>

                <button onClick={uploadKycDoc} className="w-full bg-emerald-500 text-gray-950 font-bold py-3 rounded-xl hover:bg-emerald-400">
                  Upload Document for Admin Verification
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="glass-panel border-t border-gray-800 py-3 px-6 flex justify-around sticky bottom-0 z-30">
        <button
          onClick={() => setActiveTab('DUTY')}
          className={`flex flex-col items-center text-xs font-bold ${activeTab === 'DUTY' ? 'text-emerald-400' : 'text-gray-500'}`}
        >
          <Car className="w-5 h-5 mb-1" /> Duty
        </button>

        <button
          onClick={() => setActiveTab('EARNINGS')}
          className={`flex flex-col items-center text-xs font-bold ${activeTab === 'EARNINGS' ? 'text-emerald-400' : 'text-gray-500'}`}
        >
          <DollarSign className="w-5 h-5 mb-1" /> Earnings
        </button>

        <button
          onClick={() => setActiveTab('KYC')}
          className={`flex flex-col items-center text-xs font-bold ${activeTab === 'KYC' ? 'text-emerald-400' : 'text-gray-500'}`}
        >
          <ShieldCheck className="w-5 h-5 mb-1" /> KYC Docs
        </button>
      </nav>
    </div>
  );
}
