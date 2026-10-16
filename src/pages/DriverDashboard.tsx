import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { MonroviaMap } from '../components/MonroviaMap';
import { DriverEarningsChart } from '../components/DriverEarningsChart';
import { Ride, DriverProfile, DailyEarning } from '../types';
import {
  Power,
  Car,
  DollarSign,
  Star,
  CheckCircle2,
  Navigation,
  Phone,
  ShieldCheck,
  Clock,
  ArrowRight,
  TrendingUp,
  MapPin,
  AlertCircle,
} from 'lucide-react';

export const DriverDashboard: React.FC = () => {
  const { user } = useAuth();

  const [driver, setDriver] = useState<any>(null);
  const [earnings, setEarnings] = useState<{
    total_earnings: number;
    today_earnings: number;
    week_earnings: number;
    month_earnings: number;
    dailyEarnings?: DailyEarning[];
  }>({
    total_earnings: 0,
    today_earnings: 0,
    week_earnings: 0,
    month_earnings: 0,
    dailyEarnings: [],
  });

  const [isOnline, setIsOnline] = useState(false);
  const [togglingOnline, setTogglingOnline] = useState(false);

  // Incoming Requests & Active Ride
  const [requests, setRequests] = useState<Ride[]>([]);
  const [activeRide, setActiveRide] = useState<Ride | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Driver GPS position
  const [currentPos, setCurrentPos] = useState<{ lat: number; lng: number }>({
    lat: 6.3050,
    lng: -10.7980,
  });

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Support either flattened vehicle fields or a nested vehicle object from the API.
  const vehicle = driver?.vehicle ?? driver?.vehicles?.[0] ?? null;
  const vehicleMake = driver?.make ?? driver?.vehicle_make ?? vehicle?.make ?? '';
  const vehicleModel = driver?.model ?? driver?.vehicle_model ?? vehicle?.model ?? '';
  const vehiclePlate = driver?.plate_number ?? driver?.vehicle_plate_number ?? vehicle?.plate_number ?? vehicle?.license_plate ?? '';
  const vehicleYear = driver?.year ?? vehicle?.year;
  const vehicleColor = driver?.color ?? vehicle?.color;

  const fetchDriverData = async () => {
    try {
      const res = await api.getDriverProfile();
      if (res.success && res.driver) {
        setDriver(res.driver);
        setIsOnline(Boolean(res.driver.is_online));
        if (res.earnings) setEarnings(res.earnings);
        if (res.driver.current_latitude && res.driver.current_longitude) {
          setCurrentPos({
            lat: Number(res.driver.current_latitude),
            lng: Number(res.driver.current_longitude),
          });
        }
      }

      // Check active ride
      const activeRes = await api.getDriverActiveRide();
      if (activeRes.success) {
        setActiveRide(activeRes.activeRide);
      }
    } catch (e) {
      console.warn('Driver profile fetch error:', e);
    }
  };

  const fetchIncomingRequests = async () => {
    if (!isOnline || activeRide) {
      setRequests([]);
      return;
    }
    try {
      const res = await api.getDriverRideRequests();
      if (res.success) {
        setRequests(res.requests);
      }
    } catch (e) {
      console.warn('Request polling error:', e);
    }
  };

  useEffect(() => {
    fetchDriverData();
  }, []);

  // Polling loop for driver: requests and active ride
  useEffect(() => {
    fetchIncomingRequests();

    pollIntervalRef.current = setInterval(() => {
      fetchIncomingRequests();
      // Also sync active ride state if driver has one
      if (activeRide) {
        api.getDriverActiveRide().then((res) => {
          if (res.success) setActiveRide(res.activeRide);
        });
      }
    }, 3500);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [isOnline, activeRide?.id]);

  // Toggle Online
  const handleToggleOnline = async () => {
    setTogglingOnline(true);
    setStatusMessage(null);
    try {
      const res = await api.toggleDriverAvailability(!isOnline);
      if (res.success) {
        setIsOnline(res.isOnline);
        setStatusMessage(res.isOnline ? 'You are now ONLINE' : 'You are now OFFLINE');
        fetchDriverData();
      }
    } catch (err: any) {
      setStatusMessage(err.message || 'Failed to change availability status.');
    } finally {
      setTogglingOnline(false);
    }
  };

  // Accept Ride (Atomic backend transaction)
  const handleAcceptRide = async (rideId: number) => {
    setActionLoading(true);
    setStatusMessage(null);
    try {
      const res = await api.acceptRide(rideId);
      if (res.success && res.ride) {
        setActiveRide(res.ride);
        setRequests([]);
        setStatusMessage('Ride accepted! Please navigate to passenger pickup.');
      }
    } catch (err: any) {
      setStatusMessage(err.message || 'Ride was taken or no longer available.');
      fetchIncomingRequests();
    } finally {
      setActionLoading(false);
    }
  };

  // Reject Ride
  const handleRejectRide = async (rideId: number) => {
    try {
      await api.rejectRide(rideId);
      setRequests((prev) => prev.filter((r) => r.id !== rideId));
    } catch (e) {
      // ignore
    }
  };

  // Arrive at Pickup
  const handleArriveAtPickup = async () => {
    if (!activeRide) return;
    setActionLoading(true);
    try {
      const res = await api.arriveAtPickup(activeRide.id);
      if (res.success && res.ride) {
        setActiveRide(res.ride);
        setStatusMessage('Passenger notified of arrival.');
      }
    } catch (err: any) {
      alert(err.message || 'Error updating status');
    } finally {
      setActionLoading(false);
    }
  };

  // Start Trip
  const handleStartTrip = async () => {
    if (!activeRide) return;
    setActionLoading(true);
    try {
      const res = await api.startRide(activeRide.id);
      if (res.success && res.ride) {
        setActiveRide(res.ride);
        setStatusMessage('Trip started! Proceed safely to destination.');
      }
    } catch (err: any) {
      alert(err.message || 'Error starting trip');
    } finally {
      setActionLoading(false);
    }
  };

  // Complete Trip
  const handleCompleteTrip = async () => {
    if (!activeRide) return;
    setActionLoading(true);
    try {
      const res = await api.completeRide(activeRide.id);
      if (res.success) {
        setStatusMessage(`Trip completed! Earned ${res.data.earnings} LRD.`);
        setActiveRide(null);
        fetchDriverData();
      }
    } catch (err: any) {
      alert(err.message || 'Error completing trip');
    } finally {
      setActionLoading(false);
    }
  };

  // Simulate moving driver toward destination or pickup
  const handleSimulateGPSMove = async () => {
    if (!activeRide) return;
    const target =
      activeRide.status === 'accepted'
        ? { lat: Number(activeRide.pickup_latitude), lng: Number(activeRide.pickup_longitude) }
        : { lat: Number(activeRide.destination_latitude), lng: Number(activeRide.destination_longitude) };

    // Move halfway towards target
    const newLat = currentPos.lat + (target.lat - currentPos.lat) * 0.4;
    const newLng = currentPos.lng + (target.lng - currentPos.lng) * 0.4;
    setCurrentPos({ lat: newLat, lng: newLng });

    await api.updateDriverLocation({
      latitude: newLat,
      longitude: newLng,
      heading: 45,
      speedKmh: 30,
      activeRideId: activeRide.id,
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Driver Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800 mb-6">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <span>Driver Operations</span>
            <span className="text-amber-400">🚕</span>
          </h1>
          <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
            <span>Driver: {driver?.name || user?.name}</span>
            <span aria-hidden="true">·</span>
            <span>{vehiclePlate || 'Vehicle plate not provided'}</span>
            <span aria-hidden="true">·</span>
            <span className="text-amber-400 font-semibold">★ {driver?.rating_average || '4.90'}</span>
            <span aria-hidden="true">·</span>
            <span className="text-emerald-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              Verified
            </span>
          </div>
        </div>

        {/* Go Online / Offline Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleToggleOnline}
            disabled={togglingOnline}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 shadow-lg ${
              isOnline
                ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
                : 'bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-300'
            }`}
          >
            <Power className="w-4 h-4" />
            <span>{isOnline ? 'ONLINE & ACCEPTING' : 'GO ONLINE'}</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="mb-6 p-3 rounded-2xl bg-amber-950/40 border border-amber-800 text-xs text-amber-200 flex items-center justify-between">
          <span>{statusMessage}</span>
          <button onClick={() => setStatusMessage(null)} className="text-amber-400 font-bold ml-2">
            ✕
          </button>
        </div>
      )}

      {/* Driver Metric Strips (Monrovia Earnings) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="block text-[11px] text-slate-400">Today's Earnings</span>
          <div className="text-xl font-black text-amber-400 mt-0.5 tabular-nums">
            {Number(earnings.today_earnings).toLocaleString()} LRD
          </div>
          <span className="text-[10px] text-emerald-400">Net after 15% fee</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="block text-[11px] text-slate-400">Weekly Earnings</span>
          <div className="text-xl font-black text-white mt-0.5 tabular-nums">
            {Number(earnings.week_earnings).toLocaleString()} LRD
          </div>
          <span className="text-[10px] text-slate-500">Last 7 days</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="block text-[11px] text-slate-400">Total Trips Completed</span>
          <div className="text-xl font-black text-white mt-0.5 tabular-nums">
            {driver?.total_trips || 0} Trips
          </div>
          <span className="text-[10px] text-amber-400 font-semibold">★ {driver?.rating_average || '4.90'} Rating</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="block text-[11px] text-slate-400">Vehicle Registered</span>
          <div className="text-sm font-bold text-white mt-0.5 truncate">
            {vehicleMake || vehicleModel
              ? `${vehicleMake} ${vehicleModel}`.trim()
              : 'Vehicle details unavailable'}
          </div>
          <span className="block text-[10px] text-slate-400 font-mono">
            {vehiclePlate || 'Plate number not provided'}
          </span>
          {(vehicleYear || vehicleColor) && (
            <span className="block text-[10px] text-slate-500 mt-1">
              {[vehicleYear, vehicleColor].filter(Boolean).join(' · ')}
            </span>
          )}
        </div>
      </div>

      {/* Recharts Bar Chart: Daily Earnings over Past Week in LRD */}
      <div className="mb-8">
        <DriverEarningsChart
          data={earnings.dailyEarnings || []}
          weekTotalLrd={earnings.week_earnings}
        />
      </div>

      {/* Main Grid: Active Trip / Request Feed & Live Map */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Active Ride Controls OR Request Feed */}
        <div className="lg:col-span-5 space-y-6">
          {activeRide ? (
            /* ACTIVE RIDE CONTROLS */
            <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h2 className="text-base font-bold text-white">Active Trip #{activeRide.id}</h2>
                  <span className="text-xs text-slate-400">Passenger on board or waiting</span>
                </div>
                <span className="px-3 py-1 rounded-xl bg-amber-400/20 text-amber-300 border border-amber-400/30 text-xs font-bold uppercase">
                  {activeRide.status.replace(/_/g, ' ')}
                </span>
              </div>

              {/* Passenger Card */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center">
                      KF
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">{activeRide.passenger_name}</div>
                      <div className="text-[11px] text-slate-400">
                        Payment: {activeRide.payment_method.replace(/_/g, ' ')}
                      </div>
                    </div>
                  </div>
                  <a
                    href={`tel:${activeRide.passenger_phone}`}
                    className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 transition-colors"
                    title="Call passenger"
                  >
                    <Phone className="w-4 h-4" />
                  </a>
                </div>
              </div>

              {/* Addresses */}
              <div className="space-y-2 text-xs">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-2.5">
                  <div className="w-3 h-3 rounded-full bg-emerald-400 mt-1 shrink-0" />
                  <div>
                    <span className="block text-[10px] text-slate-500 uppercase font-semibold">Pickup</span>
                    <span className="text-slate-200 font-medium">{activeRide.pickup_address}</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-2.5">
                  <div className="w-3 h-3 rounded-full bg-amber-400 mt-1 shrink-0" />
                  <div>
                    <span className="block text-[10px] text-slate-500 uppercase font-semibold">Destination</span>
                    <span className="text-slate-200 font-medium">{activeRide.destination_address}</span>
                  </div>
                </div>
              </div>

              {/* Fare & Distance */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <span className="block text-slate-500 text-[10px]">Distance</span>
                  <span className="font-bold text-white tabular-nums">{activeRide.distance_km} km</span>
                </div>
                <div>
                  <span className="block text-slate-500 text-[10px]">Estimated Fare</span>
                  <span className="font-extrabold text-amber-400 text-sm tabular-nums">
                    {activeRide.estimated_fare_lrd} LRD
                  </span>
                </div>
                <div>
                  <span className="block text-slate-500 text-[10px]">Driver Net (85%)</span>
                  <span className="font-extrabold text-emerald-400 text-sm tabular-nums">
                    {Math.round(Number(activeRide.estimated_fare_lrd) * 0.85)} LRD
                  </span>
                </div>
              </div>

              {/* TRIP PROGRESS BUTTONS */}
              <div className="space-y-2 pt-2">
                {activeRide.status === 'accepted' && (
                  <button
                    onClick={handleArriveAtPickup}
                    disabled={actionLoading}
                    className="w-full py-3 rounded-xl font-bold text-xs text-slate-950 bg-amber-400 hover:bg-amber-300 transition-colors shadow-md"
                  >
                    1. Arrived at Pickup Location
                  </button>
                )}

                {activeRide.status === 'arrived' && (
                  <button
                    onClick={handleStartTrip}
                    disabled={actionLoading}
                    className="w-full py-3 rounded-xl font-bold text-xs text-slate-950 bg-emerald-400 hover:bg-emerald-300 transition-colors shadow-md"
                  >
                    2. Passenger Boarded · Start Trip
                  </button>
                )}

                {activeRide.status === 'in_progress' && (
                  <button
                    onClick={handleCompleteTrip}
                    disabled={actionLoading}
                    className="w-full py-3 rounded-xl font-bold text-xs text-white bg-emerald-600 hover:bg-emerald-500 transition-colors shadow-md shadow-emerald-600/20"
                  >
                    3. Arrived at Destination · Complete Trip & Collect Fare
                  </button>
                )}

                {/* GPS Simulator button for demo evaluation */}
                <button
                  type="button"
                  onClick={handleSimulateGPSMove}
                  className="w-full py-2 rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800 text-[11px] text-slate-400 font-medium transition-colors"
                >
                  📍 Simulate Driver Moving Along Route
                </button>
              </div>
            </div>
          ) : (
            /* INCOMING REQUEST FEED */
            <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h2 className="text-base font-bold text-white">Ride Requests Feed</h2>
                <span className="text-xs text-slate-400">
                  {isOnline ? 'Scanning Monrovia...' : 'Go online to receive'}
                </span>
              </div>

              {!isOnline ? (
                <div className="py-12 text-center space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-800 flex items-center justify-center text-slate-400">
                    <Power className="w-6 h-6" />
                  </div>
                  <div className="text-sm font-bold text-white">You Are Currently Offline</div>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">
                    Toggle your status to online above to start receiving ride dispatch requests in Monrovia.
                  </p>
                </div>
              ) : requests.length === 0 ? (
                <div className="py-12 text-center space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-400/10 text-amber-400 flex items-center justify-center animate-pulse">
                    <Navigation className="w-6 h-6" />
                  </div>
                  <div className="text-sm font-bold text-white">Searching for Passenger Requests</div>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">
                    New rides requested by passengers across Monrovia will appear here in real time.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {requests.map((req) => (
                    <div
                      key={req.id}
                      className="p-4 rounded-2xl bg-slate-950 border border-amber-400/40 shadow-lg space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-amber-400/10 text-amber-300 font-bold text-xs">
                            {req.vehicle_type}
                          </span>
                          <span className="text-xs text-slate-400">{req.distance_km} km</span>
                        </div>
                        <div className="text-sm font-black text-amber-400 tabular-nums">
                          {req.estimated_fare_lrd} LRD
                        </div>
                      </div>

                      <div className="space-y-1.5 text-xs">
                        <div className="flex items-start gap-2 text-slate-300">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                          <span className="truncate"><strong>From:</strong> {req.pickup_address}</span>
                        </div>
                        <div className="flex items-start gap-2 text-slate-300">
                          <span className="w-2 h-2 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                          <span className="truncate"><strong>To:</strong> {req.destination_address}</span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-800 flex items-center gap-2">
                        <button
                          onClick={() => handleRejectRide(req.id)}
                          className="flex-1 py-2 rounded-xl border border-slate-800 text-xs font-semibold text-slate-400 hover:bg-slate-900 transition-colors"
                        >
                          Decline
                        </button>
                        <button
                          onClick={() => handleAcceptRide(req.id)}
                          disabled={actionLoading}
                          className="flex-1 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition-colors shadow-md"
                        >
                          Accept Ride
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Driver Live Monrovia Map */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Navigation & Fleet Radar
            </span>
            <span className="text-xs text-amber-400 font-medium">
              GPS Position: {currentPos.lat.toFixed(4)}, {currentPos.lng.toFixed(4)}
            </span>
          </div>

          <MonroviaMap
            pickupCoords={
              activeRide
                ? { lat: Number(activeRide.pickup_latitude), lng: Number(activeRide.pickup_longitude) }
                : null
            }
            destinationCoords={
              activeRide
                ? {
                    lat: Number(activeRide.destination_latitude),
                    lng: Number(activeRide.destination_longitude),
                  }
                : null
            }
            driverCoords={currentPos}
            className="h-[520px] w-full"
          />
        </div>
      </div>
    </div>
  );
};
