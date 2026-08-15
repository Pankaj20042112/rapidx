import React, { useState, useEffect } from 'react';
import { 
  Car, Bike, ShieldAlert, Navigation, Wallet, Star, MessageSquare, 
  MapPin, Clock, Tag, CheckCircle2, ChevronRight, Phone, Send, X, AlertTriangle
} from 'lucide-react';
import { io } from 'socket.io-client';

const BACKEND_URL = `http://${window.location.hostname}:4000`;
const socket = io(BACKEND_URL);

export default function CustomerApp() {
  // Auth state
  const [token, setToken] = useState<string | null>(localStorage.getItem('ridex_cust_token'));
  const [phone, setPhone] = useState('+18888888888');
  const [otp, setOtp] = useState('123456');
  const [step, setStep] = useState<'LOGIN' | 'OTP' | 'BOOKING' | 'LIVE_RIDE'>('BOOKING');

  // Booking details
  const [pickup, setPickup] = useState('Tech Park Downtown');
  const [destination, setDestination] = useState('International Airport Terminal 2');
  const [vehicleType, setVehicleType] = useState<'BIKE' | 'AUTO' | 'CAB_ECONOMY' | 'CAB_PREMIUM' | 'RENTAL' | 'OUTSTATION'>('CAB_ECONOMY');
  const [category, setCategory] = useState<'REGULAR' | 'RENTAL' | 'OUTSTATION' | 'SHARED' | 'SCHEDULED'>('REGULAR');
  const [coupon, setCoupon] = useState('RIDEX50');
  const [estimate, setEstimate] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Active Ride state
  const [activeRide, setActiveRide] = useState<any>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ sender: string; text: string }>>([]);
  const [chatInput, setChatInput] = useState('');
  const [sosModal, setSosModal] = useState(false);
  const [ratingModal, setRatingModal] = useState(false);
  const [ratingStars, setRatingStars] = useState(5);
  const [walletBalance, setWalletBalance] = useState(250);

  // Default initial check
  useEffect(() => {
    if (token) {
      fetchEstimate();
      fetchWallet();
    }
  }, [vehicleType, coupon, token]);

  // Listen to Socket.IO real-time events for active ride
  useEffect(() => {
    if (!activeRide?.id) return;

    const interval = setInterval(() => {
      fetchRideDetails(activeRide.id);
    }, 2500);

    socket.on(`chat:ride:${activeRide.id}`, (data: any) => {
      setChatMessages(prev => [...prev, { sender: data.senderId === 'CUSTOMER' ? 'You' : 'Driver', text: data.message }]);
    });

    return () => {
      clearInterval(interval);
      socket.off(`chat:ride:${activeRide.id}`);
    };
  }, [activeRide?.id]);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp, role: 'CUSTOMER', fullName: 'Alex Johnson' })
      });
      const data = await res.json();
      if (data.success) {
        setToken(data.data.token);
        localStorage.setItem('ridex_cust_token', data.data.token);
        setStep('BOOKING');
        fetchEstimate();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
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

  const fetchWallet = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/wallet`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setWalletBalance(data.data.wallet.balance);
    } catch (e) {
      console.error(e);
    }
  };

  const confirmRide = async () => {
    if (!token) return setStep('LOGIN');
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/rides`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          pickupLat: 12.9716, pickupLng: 77.5946, pickupAddress: pickup,
          destinationLat: 13.0827, destinationLng: 80.2707, destinationAddress: destination,
          vehicleType,
          category,
          couponCode: coupon
        })
      });
      const data = await res.json();
      if (data.success) {
        setActiveRide(data.data);
        setStep('LIVE_RIDE');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
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

  const sendChatMessage = () => {
    if (!chatInput.trim() || !activeRide) return;
    socket.emit('chat:send_message', { rideId: activeRide.id, senderId: 'CUSTOMER', message: chatInput });
    setChatInput('');
  };

  const triggerSOS = async () => {
    try {
      await fetch(`${BACKEND_URL}/api/sos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rideId: activeRide?.id, latitude: 12.9716, longitude: 77.5946 })
      });
      alert('⚠️ SOS Triggered! Emergency Response Team & Emergency Contacts have been alerted with live GPS track.');
      setSosModal(false);
    } catch (e) {
      console.error(e);
    }
  };

  const submitRating = async () => {
    try {
      await fetch(`${BACKEND_URL}/api/ratings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rideId: activeRide?.id, score: ratingStars, feedback: 'Great smooth ride!' })
      });
      setRatingModal(false);
      setStep('BOOKING');
      setActiveRide(null);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col justify-between relative font-sans">
      {/* Top Header */}
      <header className="px-5 py-4 glass-panel sticky top-0 z-30 flex items-center justify-between shadow-xl border-b border-gray-800">
        <div className="flex items-center space-x-2">
          <div className="bg-emerald-500 p-2 rounded-xl text-gray-950 font-black tracking-wider text-xl flex items-center">
            <Car className="w-6 h-6 mr-1" /> Ride<span className="text-white">X</span>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="bg-gray-800 px-3 py-1.5 rounded-full flex items-center space-x-2 text-sm border border-gray-700">
            <Wallet className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold text-emerald-400">${walletBalance.toFixed(2)}</span>
          </div>
          {!token && (
            <button onClick={() => setStep('LOGIN')} className="bg-emerald-500 text-gray-950 px-4 py-1.5 rounded-full font-bold text-sm hover:bg-emerald-400">
              Sign In
            </button>
          )}
        </div>
      </header>

      {/* Main Interactive Map Shell */}
      <main className="flex-1 relative flex flex-col justify-between">
        {/* Dynamic Simulated Map View */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-950 to-black overflow-hidden flex items-center justify-center">
          {/* Grid lines simulating map streets */}
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:24px_24px]"></div>

          {/* Route path vector */}
          <svg className="absolute inset-0 w-full h-full stroke-emerald-500 opacity-60 stroke-[3] stroke-dasharray-[8_8]">
            <line x1="20%" y1="30%" x2="80%" y2="70%" />
          </svg>

          {/* Pickup Pin */}
          <div className="absolute top-[30%] left-[20%] transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
            <div className="bg-emerald-500 text-gray-950 text-xs px-2 py-1 rounded shadow-lg font-bold mb-1">Pickup</div>
            <div className="w-5 h-5 bg-emerald-400 rounded-full border-4 border-gray-950 animate-ping"></div>
          </div>

          {/* Destination Pin */}
          <div className="absolute top-[70%] left-[80%] transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
            <div className="bg-rose-500 text-white text-xs px-2 py-1 rounded shadow-lg font-bold mb-1">Destination</div>
            <MapPin className="w-7 h-7 text-rose-500 animate-bounce" />
          </div>

          {/* Moving Driver Marker */}
          {activeRide?.driver && (
            <div className="absolute top-[48%] left-[45%] transform -translate-x-1/2 -translate-y-1/2 bg-yellow-400 text-gray-950 p-2 rounded-full border-2 border-white shadow-2xl animate-pulse">
              <Car className="w-5 h-5" />
            </div>
          )}
        </div>

        {/* AUTH MODAL OVERLAY */}
        {step === 'LOGIN' && (
          <div className="relative z-40 p-6 m-4 glass-panel rounded-3xl max-w-md mx-auto my-auto shadow-2xl border border-emerald-500/30">
            <h2 className="text-2xl font-bold mb-2 text-emerald-400">Welcome to RideX</h2>
            <p className="text-gray-400 text-sm mb-6">Enter your mobile number for instant verification</p>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">Phone Number</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white mt-1 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">OTP Code (Demo: 123456)</label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white mt-1 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                onClick={handleLogin}
                disabled={loading}
                className="w-full bg-emerald-500 text-gray-950 font-bold py-3.5 rounded-xl text-lg hover:bg-emerald-400 transition"
              >
                {loading ? 'Verifying...' : 'Verify & Continue'}
              </button>
            </div>
          </div>
        )}

        {/* BOOKING BOTTOM SHEET */}
        {step === 'BOOKING' && (
          <div className="relative z-20 glass-panel rounded-t-3xl p-5 shadow-2xl border-t border-gray-800 max-w-2xl mx-auto w-full mt-auto">
            {/* Category Selector Pills */}
            <div className="flex space-x-2 overflow-x-auto pb-3 mb-3 border-b border-gray-800 scrollbar-none">
              {(['REGULAR', 'RENTAL', 'OUTSTATION', 'SHARED', 'SCHEDULED'] as const).map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap ${
                    category === cat ? 'bg-emerald-500 text-gray-950' : 'bg-gray-800 text-gray-400 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Location Inputs */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center bg-gray-900 border border-gray-800 rounded-xl p-3">
                <div className="w-3 h-3 bg-emerald-400 rounded-full mr-3"></div>
                <input
                  type="text"
                  value={pickup}
                  onChange={(e) => setPickup(e.target.value)}
                  className="bg-transparent w-full text-sm text-white focus:outline-none font-medium"
                  placeholder="Pickup location"
                />
              </div>

              <div className="flex items-center bg-gray-900 border border-gray-800 rounded-xl p-3">
                <MapPin className="w-4 h-4 text-rose-500 mr-3" />
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="bg-transparent w-full text-sm text-white focus:outline-none font-medium"
                  placeholder="Where to?"
                />
              </div>
            </div>

            {/* Vehicle Options */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { type: 'BIKE', label: 'Bike', icon: Bike, eta: '2 mins' },
                { type: 'AUTO', label: 'Auto', icon: Car, eta: '4 mins' },
                { type: 'CAB_ECONOMY', label: 'Cab Eco', icon: Car, eta: '3 mins' },
              ].map(item => (
                <button
                  key={item.type}
                  onClick={() => setVehicleType(item.type as any)}
                  className={`p-3 rounded-2xl border flex flex-col items-center transition ${
                    vehicleType === item.type ? 'border-emerald-500 bg-emerald-500/10' : 'border-gray-800 bg-gray-900/60'
                  }`}
                >
                  <item.icon className={`w-6 h-6 mb-1 ${vehicleType === item.type ? 'text-emerald-400' : 'text-gray-400'}`} />
                  <span className="text-xs font-bold">{item.label}</span>
                  <span className="text-[10px] text-gray-400">{item.eta}</span>
                </button>
              ))}
            </div>

            {/* Coupon & Fare Calculation */}
            {estimate && (
              <div className="bg-gray-900 p-4 rounded-2xl mb-4 border border-gray-800 flex items-center justify-between">
                <div>
                  <div className="text-xs text-gray-400">Total Distance: <span className="text-white font-semibold">{estimate.distanceKm} km</span></div>
                  <div className="flex items-center text-xs text-emerald-400 mt-0.5">
                    <Tag className="w-3 h-3 mr-1" /> Coupon RIDEX50 Applied (-${estimate.discount})
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-emerald-400">${estimate.finalFare}</div>
                  <div className="text-[10px] text-gray-500">Incl. Taxes & Surge</div>
                </div>
              </div>
            )}

            {/* Confirm Ride Button */}
            <button
              onClick={confirmRide}
              disabled={loading}
              className="w-full bg-emerald-500 text-gray-950 font-extrabold py-4 rounded-2xl text-lg hover:bg-emerald-400 transition shadow-lg shadow-emerald-500/20"
            >
              {loading ? 'Finding Nearby Driver...' : `Confirm ${vehicleType.replace('_', ' ')}`}
            </button>
          </div>
        )}

        {/* LIVE RIDE PANEL */}
        {step === 'LIVE_RIDE' && activeRide && (
          <div className="relative z-20 glass-panel rounded-t-3xl p-5 shadow-2xl border-t border-emerald-500/40 max-w-2xl mx-auto w-full mt-auto">
            {/* Status Pill */}
            <div className="flex items-center justify-between border-b border-gray-800 pb-4 mb-4">
              <div>
                <span className="px-3 py-1 bg-emerald-500/20 border border-emerald-500 text-emerald-400 rounded-full text-xs font-extrabold tracking-wider uppercase">
                  {activeRide.status.replace('_', ' ')}
                </span>
                <p className="text-xs text-gray-400 mt-1">ETA: <span className="text-white font-semibold">{activeRide.durationMin} mins</span></p>
              </div>

              {/* Ride OTP display for Security */}
              <div className="bg-gray-900 border border-emerald-500/50 px-4 py-2 rounded-xl text-center">
                <div className="text-[10px] uppercase text-gray-400 font-bold">Start OTP</div>
                <div className="text-xl font-black tracking-widest text-emerald-400">{activeRide.otp}</div>
              </div>
            </div>

            {/* Driver Details Card */}
            {activeRide.driver ? (
              <div className="bg-gray-900 border border-gray-800 p-4 rounded-2xl mb-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-emerald-500 text-gray-950 rounded-full font-bold flex items-center justify-center text-xl">
                    {activeRide.driver.fullName ? activeRide.driver.fullName[0] : 'D'}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white">{activeRide.driver.fullName || 'Sam Speed'}</h4>
                    <div className="flex items-center text-xs text-yellow-400 mt-0.5">
                      <Star className="w-3 h-3 fill-current mr-1" />
                      <span>{activeRide.driver.rating || '4.9'}</span>
                      <span className="text-gray-400 ml-2">• {activeRide.vehicle?.make || 'Toyota Prius'}</span>
                    </div>
                    <div className="text-xs font-mono text-gray-300 font-bold mt-1 bg-gray-800 px-2 py-0.5 rounded w-max">
                      {activeRide.vehicle?.licensePlate || 'RX-99-EV'}
                    </div>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <button onClick={() => setChatOpen(true)} className="p-3 bg-gray-800 hover:bg-gray-700 text-emerald-400 rounded-full border border-gray-700">
                    <MessageSquare className="w-5 h-5" />
                  </button>
                  <a href={`tel:${activeRide.driver.phone || '+17777777777'}`} className="p-3 bg-gray-800 hover:bg-gray-700 text-emerald-400 rounded-full border border-gray-700">
                    <Phone className="w-5 h-5" />
                  </a>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-gray-900 border border-gray-800 rounded-2xl mb-4 text-center">
                <div className="animate-spin w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                <p className="text-xs text-gray-400">Searching nearest available driver in your zone...</p>
              </div>
            )}

            {/* Action Bar */}
            <div className="flex space-x-3">
              <button
                onClick={() => setSosModal(true)}
                className="flex-1 bg-rose-600/20 border border-rose-500 text-rose-400 font-bold py-3 rounded-xl flex items-center justify-center text-sm hover:bg-rose-600/30"
              >
                <ShieldAlert className="w-4 h-4 mr-2" /> SOS Emergency
              </button>
            </div>
          </div>
        )}
      </main>

      {/* CHAT MODAL */}
      {chatOpen && (
        <div className="fixed inset-0 z-50 glass-panel bg-black/80 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl w-full max-w-md h-[500px] flex flex-col justify-between overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-950">
              <h3 className="font-bold text-emerald-400 flex items-center"><MessageSquare className="w-4 h-4 mr-2" /> Driver Chat</h3>
              <button onClick={() => setChatOpen(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-3">
              {chatMessages.map((m, i) => (
                <div key={i} className={`flex flex-col ${m.sender === 'You' ? 'items-end' : 'items-start'}`}>
                  <div className={`px-4 py-2 rounded-2xl text-sm max-w-[80%] ${m.sender === 'You' ? 'bg-emerald-500 text-gray-950 font-medium' : 'bg-gray-800 text-white'}`}>
                    {m.text}
                  </div>
                  <span className="text-[10px] text-gray-500 mt-1">{m.sender}</span>
                </div>
              ))}
            </div>

            <div className="p-3 border-t border-gray-800 flex space-x-2 bg-gray-950">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type message to driver..."
                className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none"
              />
              <button onClick={sendChatMessage} className="bg-emerald-500 text-gray-950 p-2.5 rounded-xl hover:bg-emerald-400">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SOS CONFIRMATION MODAL */}
      {sosModal && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
          <div className="bg-rose-950/80 border border-rose-500 rounded-3xl p-6 max-w-sm w-full text-center">
            <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-3 animate-pulse" />
            <h3 className="text-xl font-bold text-rose-400 mb-2">Emergency Assistance</h3>
            <p className="text-xs text-rose-200 mb-6">Triggering SOS will broadcast your live location to RideX Safety Desk and emergency contacts immediately.</p>
            
            <div className="space-y-2">
              <button onClick={triggerSOS} className="w-full bg-rose-600 text-white font-bold py-3 rounded-xl hover:bg-rose-500">
                CONFIRM SOS NOW
              </button>
              <button onClick={() => setSosModal(false)} className="w-full bg-gray-800 text-gray-300 font-semibold py-2.5 rounded-xl">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RATING POPUP MODAL */}
      {ratingModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-emerald-500/40 rounded-3xl p-6 max-w-sm w-full text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
            <h3 className="text-xl font-bold text-white mb-1">Ride Completed!</h3>
            <p className="text-xs text-gray-400 mb-4">How was your trip with your driver?</p>

            <div className="flex justify-center space-x-2 mb-6">
              {[1, 2, 3, 4, 5].map((star) => (
                <button key={star} onClick={() => setRatingStars(star)} className="focus:outline-none">
                  <Star className={`w-8 h-8 ${star <= ratingStars ? 'text-yellow-400 fill-current' : 'text-gray-600'}`} />
                </button>
              ))}
            </div>

            <button onClick={submitRating} className="w-full bg-emerald-500 text-gray-950 font-bold py-3 rounded-xl hover:bg-emerald-400">
              Submit Rating
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
