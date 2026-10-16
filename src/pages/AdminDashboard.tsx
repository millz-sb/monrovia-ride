import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  Users,
  Car,
  TrendingUp,
  ShieldAlert,
  CheckCircle,
  XCircle,
  FileText,
  DollarSign,
  Activity,
  Search,
  Filter,
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [rides, setRides] = useState<any[]>([]);
  const [reports, setReports] = useState<any>(null);
  const [selectedRideFilter, setSelectedRideFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const loadAdminData = async () => {
    try {
      const [dashRes, driversRes, ridesRes, reportsRes] = await Promise.all([
        api.getAdminDashboard(),
        api.getAdminDrivers(),
        api.getAdminRides(selectedRideFilter),
        api.getAdminReports(),
      ]);

      if (dashRes.success) setStats(dashRes.stats);
      if (driversRes.success) setDrivers(driversRes.drivers);
      if (ridesRes.success) setRides(ridesRes.rides);
      if (reportsRes.success) setReports(reportsRes.reports);
    } catch (e) {
      console.warn('Admin load error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, [selectedRideFilter]);

  const handleUpdateVerification = async (driverId: number, status: string) => {
    try {
      const res = await api.updateDriverVerification(driverId, status);
      if (res.success) {
        setActionMessage(res.message);
        setTimeout(() => setActionMessage(null), 4000);
        loadAdminData();
      }
    } catch (err: any) {
      alert(err.message || 'Error updating status');
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center text-xs text-slate-400">
        Loading Monrovia Ride Administration Console...
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <span>Operations & Dispatch Control</span>
            <span className="text-amber-400">🚕</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Monrovia, Republic of Liberia · Real-time Fleet & Financial Monitoring
          </p>
        </div>

        <button
          onClick={loadAdminData}
          className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors self-start sm:self-auto"
        >
          Refresh Feed
        </button>
      </div>

      {actionMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/60 border border-emerald-800 text-xs text-emerald-300">
          {actionMessage}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Registered Users</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white tabular-nums">
            {stats?.total_users || 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {stats?.total_passengers || 0} Passengers · {stats?.total_drivers || 0} Drivers
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Active Rides Now</span>
            <Activity className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400 tabular-nums">
            {stats?.active_rides || 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {stats?.completed_rides || 0} Completed · {stats?.cancelled_rides || 0} Cancelled
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Gross Fare Volume</span>
            <DollarSign className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-white tabular-nums">
            {Number(stats?.gross_volume_lrd || 0).toLocaleString()} LRD
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Gross completed trip fares</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Platform Net Revenue</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 tabular-nums">
            {Number(stats?.net_platform_revenue_lrd || 0).toLocaleString()} LRD
          </div>
          <div className="text-[11px] text-slate-500 mt-1">15% platform commission</div>
        </div>
      </div>

      {/* Driver Verification Management */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-white">Driver Partner Verification Portal</h2>
            <span className="text-xs text-slate-400">Review licenses, vehicles, and status</span>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-amber-400/10 text-amber-300 text-xs font-semibold">
            {drivers.filter((d) => d.verification_status === 'PENDING').length} Pending Review
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="text-[11px] uppercase tracking-wider text-slate-400 bg-slate-950/60 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Driver Name</th>
                <th className="py-3 px-4">Phone</th>
                <th className="py-3 px-4">Vehicle</th>
                <th className="py-3 px-4">License No.</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Trips / Rating</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {drivers.map((d) => (
                <tr key={d.id} className="hover:bg-slate-950/40 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-white">{d.name}</td>
                  <td className="py-3.5 px-4">{d.phone}</td>
                  <td className="py-3.5 px-4">
                    <div>{d.make} {d.model}</div>
                    <div className="text-[11px] text-slate-400 font-mono">{d.plate_number}</div>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-400">{d.license_number}</td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                        d.verification_status === 'VERIFIED'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : d.verification_status === 'PENDING'
                          ? 'bg-amber-400/20 text-amber-300'
                          : 'bg-red-500/20 text-red-300'
                      }`}
                    >
                      {d.verification_status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    {d.total_trips} trips · <span className="text-amber-400">★ {d.rating_average}</span>
                  </td>
                  <td className="py-3.5 px-4 text-right space-x-2">
                    {d.verification_status !== 'VERIFIED' && (
                      <button
                        onClick={() => handleUpdateVerification(d.id, 'VERIFIED')}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[11px]"
                      >
                        Approve
                      </button>
                    )}
                    {d.verification_status === 'VERIFIED' && (
                      <button
                        onClick={() => handleUpdateVerification(d.id, 'SUSPENDED')}
                        className="px-2.5 py-1 rounded-lg bg-red-950 border border-red-800 text-red-300 hover:bg-red-900 text-[11px]"
                      >
                        Suspend
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Real-Time Ride Dispatch Monitor */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-white">Monrovia Live Dispatch Log</h2>
            <span className="text-xs text-slate-400">Track ride bookings across Montserrado</span>
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs">
            {['all', 'requested', 'in_progress', 'completed', 'cancelled'].map((filter) => (
              <button
                key={filter}
                onClick={() => setSelectedRideFilter(filter)}
                className={`px-2.5 py-1 rounded-lg font-medium capitalize transition-colors ${
                  selectedRideFilter === filter
                    ? 'bg-amber-400 text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {filter.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="text-[11px] uppercase tracking-wider text-slate-400 bg-slate-950/60 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Trip ID</th>
                <th className="py-3 px-4">Passenger</th>
                <th className="py-3 px-4">Driver</th>
                <th className="py-3 px-4">Route</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Fare (LRD)</th>
                <th className="py-3 px-4">Payment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {rides.map((r) => (
                <tr key={r.id} className="hover:bg-slate-950/40 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-white">#{r.id}</td>
                  <td className="py-3 px-4">
                    <div className="font-medium text-white">{r.passenger_name}</div>
                    <div className="text-[11px] text-slate-400">{r.passenger_phone}</div>
                  </td>
                  <td className="py-3 px-4">
                    {r.driver_name ? (
                      <div>
                        <div className="font-medium text-white">{r.driver_name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{r.vehicle_plate}</div>
                      </div>
                    ) : (
                      <span className="text-slate-500 italic">Unassigned</span>
                    )}
                  </td>
                  <td className="py-3 px-4 max-w-xs">
                    <div className="truncate text-white">From: {r.pickup_address}</div>
                    <div className="truncate text-slate-400">To: {r.destination_address}</div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-800 text-slate-200 capitalize">
                      {r.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-bold text-amber-400 tabular-nums">
                    {r.final_fare_lrd || r.estimated_fare_lrd} LRD
                  </td>
                  <td className="py-3 px-4 text-[11px]">
                    <div>{r.payment_method.replace(/_/g, ' ')}</div>
                    <span className="text-emerald-400 font-semibold">{r.payment_status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
