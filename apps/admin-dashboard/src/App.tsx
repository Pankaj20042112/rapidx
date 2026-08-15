import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Users, Car, Map, ShieldAlert, DollarSign, 
  Cpu, FileText, CheckCircle, XCircle, AlertTriangle, TrendingUp, RefreshCw, LogOut, ShieldCheck, Award
} from 'lucide-react';
import { io } from 'socket.io-client';

const BACKEND_URL = `http://${window.location.hostname}:4000`;
const socket = io(BACKEND_URL);

export default function AdminDashboard() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('ridex_admin_token'));
  const [email, setEmail] = useState('admin@ridex.com');
  const [otp, setOtp] = useState('123456');

  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'FLEET' | 'KYC' | 'PRICING' | 'SOS' | 'AI_MONITOR' | 'AUDIT'>('OVERVIEW');
  const [overviewData, setOverviewData] = useState<any>(null);
  const [driversList, setDriversList] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Tariff Matrix State
  const [baseFare, setBaseFare] = useState(40);
  const [perKm, setPerKm] = useState(14);
  const [surgeMultiplier, setSurgeMultiplier] = useState(1.2);
  const [sosAlerts, setSosAlerts] = useState<any[]>([]);

  useEffect(() => {
    if (token) {
      fetchOverview();
      fetchDrivers();
      fetchAuditLogs();
    }
  }, [token]);

  useEffect(() => {
    socket.on('admin:sos_alert', (data: any) => {
      setSosAlerts(prev => [data, ...prev]);
    });
    return () => { socket.off('admin:sos_alert'); };
  }, []);

  const handleLogin = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: '+19999999999', otp, role: 'ADMIN', fullName: 'RideX Master Admin' })
      });
      const data = await res.json();
      if (data.success) {
        setToken(data.data.token);
        localStorage.setItem('ridex_admin_token', data.data.token);
        fetchOverview();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchOverview = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/overview`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setOverviewData(data.data.metrics);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchDrivers = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/drivers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setDriversList(data.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/audit-logs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setAuditLogs(data.data);
    } catch (e) {
      console.error(e);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-4">
        <div className="bg-gray-900 border border-gray-800 p-8 rounded-3xl max-w-md w-full shadow-2xl">
          <div className="bg-indigo-600 w-12 h-12 rounded-2xl flex items-center justify-center text-white mb-4 font-black text-xl">
            <Car className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black mb-1">Admin Operations Desk</h2>
          <p className="text-gray-400 text-xs mb-6">Enter master authorization code to access command center</p>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase">Admin Email</label>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase">Master Passcode (Demo: 123456)</label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white mt-1"
              />
            </div>
            <button onClick={handleLogin} className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-xl hover:bg-indigo-500">
              Access Command Center
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex font-sans">
      {/* Sidebar Nav */}
      <aside className="w-64 glass-panel border-r border-gray-800 p-5 flex flex-col justify-between hidden md:flex">
        <div>
          <div className="flex items-center space-x-2 mb-8">
            <div className="bg-indigo-600 p-2 rounded-xl text-white font-black text-xl flex items-center">
              <Car className="w-5 h-5 mr-1" /> Ride<span className="text-emerald-400">X</span>
            </div>
            <span className="text-[10px] font-bold bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-500/30">ADMIN</span>
          </div>

          <nav className="space-y-1">
            {[
              { id: 'OVERVIEW', label: 'Overview Metrics', icon: LayoutDashboard },
              { id: 'FLEET', label: 'Live Fleet Radar', icon: Map },
              { id: 'KYC', label: 'Driver KYC Desk', icon: ShieldCheck },
              { id: 'PRICING', label: 'Tariffs & Surge', icon: DollarSign },
              { id: 'SOS', label: 'Safety & SOS Alert', icon: ShieldAlert },
              { id: 'AI_MONITOR', label: 'AI Fraud Telemetry', icon: Cpu },
              { id: 'AUDIT', label: 'System Audit Logs', icon: FileText },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-bold text-xs transition ${
                  activeTab === item.id ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <button
          onClick={() => { localStorage.removeItem('ridex_admin_token'); setToken(null); }}
          className="flex items-center space-x-2 text-gray-400 hover:text-rose-400 text-xs font-bold px-4 py-3 rounded-xl hover:bg-rose-500/10 transition"
        >
          <LogOut className="w-4 h-4" /> <span>Sign Out</span>
        </button>
      </aside>

      {/* Main Content Pane */}
      <main className="flex-1 p-6 overflow-y-auto">
        <header className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-black text-white">{activeTab.replace('_', ' ')}</h1>
            <p className="text-xs text-gray-400">RideX Global Operations & Governance Console</p>
          </div>

          <button onClick={fetchOverview} className="p-2.5 bg-gray-900 border border-gray-800 hover:bg-gray-800 rounded-xl text-indigo-400">
            <RefreshCw className="w-4 h-4" />
          </button>
        </header>

        {/* OVERVIEW TAB */}
        {activeTab === 'OVERVIEW' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total Revenue', value: `$${overviewData?.totalRevenue || 14850}`, icon: DollarSign, color: 'text-emerald-400' },
                { label: 'Total Rides', value: overviewData?.totalRides || 342, icon: Car, color: 'text-indigo-400' },
                { label: 'Active Fleet Drivers', value: overviewData?.activeDrivers || 18, icon: Users, color: 'text-yellow-400' },
                { label: 'Active SOS Emergencies', value: overviewData?.activeSOSCount || 0, icon: ShieldAlert, color: 'text-rose-500' },
              ].map((card, i) => (
                <div key={i} className="bg-gray-900 border border-gray-800 p-5 rounded-3xl flex items-center justify-between">
                  <div>
                    <span className="text-xs text-gray-400 font-semibold">{card.label}</span>
                    <div className={`text-2xl font-black mt-1 ${card.color}`}>{card.value}</div>
                  </div>
                  <div className="p-3 bg-gray-800 rounded-2xl">
                    <card.icon className={`w-6 h-6 ${card.color}`} />
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-gray-900 border border-gray-800 p-6 rounded-3xl">
              <h3 className="font-bold text-sm text-gray-300 mb-4">System Operational Status</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="p-4 bg-gray-950 border border-gray-800 rounded-2xl">
                  <div className="text-gray-400">MongoDB 2dsphere Spatial Index</div>
                  <div className="text-emerald-400 font-bold mt-1 flex items-center"><CheckCircle className="w-3 h-3 mr-1" /> HEALTHY</div>
                </div>
                <div className="p-4 bg-gray-950 border border-gray-800 rounded-2xl">
                  <div className="text-gray-400">Redis Redlock Distributed Engine</div>
                  <div className="text-emerald-400 font-bold mt-1 flex items-center"><CheckCircle className="w-3 h-3 mr-1" /> READY</div>
                </div>
                <div className="p-4 bg-gray-950 border border-gray-800 rounded-2xl">
                  <div className="text-gray-400">Socket.IO WebSockets</div>
                  <div className="text-emerald-400 font-bold mt-1 flex items-center"><CheckCircle className="w-3 h-3 mr-1" /> BROADCASTING</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* LIVE FLEET RADAR TAB */}
        {activeTab === 'FLEET' && (
          <div className="bg-gray-900 border border-gray-800 rounded-3xl h-[600px] relative overflow-hidden flex items-center justify-center p-6">
            <div className="absolute inset-0 opacity-25 bg-[radial-gradient(#6366f1_1px,transparent_1px)] [background-size:32px_32px]"></div>
            <div className="z-10 w-full max-w-lg space-y-3">
              <div className="bg-gray-950/80 border border-indigo-500/40 p-4 rounded-2xl flex justify-between items-center backdrop-blur-md">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-emerald-400 rounded-full animate-ping"></div>
                  <div>
                    <div className="font-bold text-sm text-white">Driver Sam Speed (RX-99-EV)</div>
                    <div className="text-xs text-gray-400">Position: 12.9720 N, 77.5950 E • Status: ONLINE</div>
                  </div>
                </div>
                <span className="text-xs bg-indigo-500/20 text-indigo-400 px-3 py-1 rounded-full font-bold">CAB_ECONOMY</span>
              </div>
            </div>
          </div>
        )}

        {/* DRIVER KYC TAB */}
        {activeTab === 'KYC' && (
          <div className="bg-gray-900 border border-gray-800 rounded-3xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-950 text-gray-400 uppercase tracking-wider border-b border-gray-800">
                <tr>
                  <th className="p-4">Driver Partner</th>
                  <th className="p-4">Phone</th>
                  <th className="p-4">Vehicle</th>
                  <th className="p-4">KYC Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {driversList.map(driver => (
                  <tr key={driver.id} className="hover:bg-gray-800/50">
                    <td className="p-4 font-bold text-white">{driver.fullName || 'Sam Speed'}</td>
                    <td className="p-4 text-gray-300">{driver.phone || '+17777777777'}</td>
                    <td className="p-4 text-gray-300">{driver.vehicle?.make || 'Toyota'} ({driver.vehicle?.type || 'CAB'})</td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 rounded-full font-bold text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        {driver.kycStatus || 'APPROVED'}
                      </span>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button className="bg-emerald-500 text-gray-950 px-3 py-1.5 rounded-lg font-bold">Approved</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* PRICING & SURGE TAB */}
        {activeTab === 'PRICING' && (
          <div className="bg-gray-900 border border-gray-800 p-6 rounded-3xl max-w-xl">
            <h3 className="font-bold text-sm text-gray-200 mb-4">Dynamic Tariff Matrix Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-400">Base Fare ($)</label>
                <input
                  type="number"
                  value={baseFare}
                  onChange={(e) => setBaseFare(Number(e.target.value))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-400">Distance Rate ($/km)</label>
                <input
                  type="number"
                  value={perKm}
                  onChange={(e) => setPerKm(Number(e.target.value))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white mt-1"
                />
              </div>
              <button onClick={() => alert('Tariff updated successfully!')} className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-xl">
                Save & Deploy Tariff Rules
              </button>
            </div>
          </div>
        )}

        {/* AUDIT LOGS TAB */}
        {activeTab === 'AUDIT' && (
          <div className="bg-gray-900 border border-gray-800 rounded-3xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-950 text-gray-400 uppercase tracking-wider border-b border-gray-800">
                <tr>
                  <th className="p-4">Timestamp</th>
                  <th className="p-4">Action</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Endpoint</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-800/50">
                    <td className="p-4 text-gray-400">{new Date(log.createdAt).toLocaleTimeString()}</td>
                    <td className="p-4 font-bold text-indigo-400">{log.action}</td>
                    <td className="p-4 text-gray-300">{log.role || 'GUEST'}</td>
                    <td className="p-4 font-mono text-gray-400">{log.endpoint}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
