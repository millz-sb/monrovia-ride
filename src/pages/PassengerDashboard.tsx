import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { MonroviaMap } from '../components/MonroviaMap';
import { LocationPicker } from '../components/LocationPicker';
import { Ride, FareEstimate, VehicleType, PaymentMethod } from '../types';
import {
  Navigation,
  Clock,
  Car,
  Shield,
  Phone,
  AlertTriangle,
  Star,
  CheckCircle,
  XCircle,
  X,
  CreditCard,
  User,
  History,
  MapPin,
  RefreshCw,
  Send,
  Zap,
} from 'lucide-react';

export const PassengerDashboard: React.FC = () => {
  const { user } = useAuth();

  // Active Tab: 'book', 'history', 'settings'
  const [activeTab, setActiveTab] = useState<'book' | 'history' | 'settings'>('book');

  // Booking states
  const [pickupAddress, setPickupAddress] = useState('Broad Street & Randall St, Central Monrovia');
  const [pickupCoords, setPickupCoords] = useState<{ lat: number; lng: number }>({
    lat: 6.3135,
    lng: -10.8065,
  });

  const [destAddress, setDestAddress] = useState('Boulevard Palace Hotel, 13th Street, Sinkor');
  const [destCoords, setDestCoords] = useState<{ lat: number; lng: number }>({
    lat: 6.2925,
    lng: -10.7780,
  });

  const [selectedVehicle, setSelectedVehicle] = useState<VehicleType>('STANDARD');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');

  const [distanceKm, setDistanceKm] = useState(4.5);
  const [durationMins, setDurationMins] = useState(14);
  const [fares, setFares] = useState<FareEstimate[]>([]);
  const [isCalculatingFares, setIsCalculatingFares] = useState(false);

  // Active Ride state
  const [activeRide, setActiveRide] = useState<Ride | null>(null);
  const [isBooking, setIsBooking] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Completed trip review modal
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingRideId, setRatingRideId] = useState<number | null>(null);
  const [ratingScore, setRatingScore] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [ratingSubmitting, setRatingSubmitting] = useState(false);

  // Ride History
  const [rideHistory, setRideHistory] = useState<Ride[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Settings / Profile
  const [profile, setProfile] = useState<any>(null);
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  const currentFare = fares.find((f) => f.vehicleType === selectedVehicle) || fares[0];

  // Polling interval ref for active ride updates
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch initial profile & active ride
  const loadDashboardData = async () => {
    try {
      const res = await api.getPassengerProfile();
      if (res.success) {
        setProfile(res.profile);
        if (res.profile.preferred_payment_method) {
          setPaymentMethod(res.profile.preferred_payment_method);
        }
        setEmergencyName(res.profile.emergency_contact_name || '');
        setEmergencyPhone(res.profile.emergency_contact_phone || '');

        if (res.activeRide) {
          setActiveRide(res.activeRide);
        } else if (activeRide && ['requested', 'accepted', 'arrived', 'in_progress'].includes(activeRide.status)) {
          // If we had an active ride and it just completed
          checkJustCompleted(activeRide.id);
        }
      }
    } catch (e) {
      console.warn('Dashboard load error:', e);
    }
  };

  const checkJustCompleted = async (id: number) => {
    try {
      const rideRes = await api.getRideById(id);
      if (rideRes.success && rideRes.ride.status === 'completed') {
        setActiveRide(null);
        setRatingRideId(id);
        setShowRatingModal(true);
      }
    } catch (e) {
      // ignore
    }
  };

  // Recalculate fares when coordinates change
  const refreshEstimates = async () => {
    setIsCalculatingFares(true);
    try {
      const res = await api.getFareEstimate(
        pickupCoords.lat,
        pickupCoords.lng,
        destCoords.lat,
        destCoords.lng
      );
      if (res.success && res.estimate) {
        setFares(res.estimate.fares);
        setDistanceKm(res.estimate.distanceKm);
        setDurationMins(res.estimate.durationMins);
      }
    } catch (e) {
      console.warn('Estimate error:', e);
    } finally {
      setIsCalculatingFares(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
    refreshEstimates();
  }, []);

  useEffect(() => {
    refreshEstimates();
  }, [pickupCoords, destCoords]);

  // Polling for active ride status
  useEffect(() => {
    if (activeRide && ['requested', 'accepted', 'arrived', 'in_progress'].includes(activeRide.status)) {
      pollTimerRef.current = setInterval(async () => {
        try {
          const res = await api.getRideById(activeRide.id);
          if (res.success && res.ride) {
            setActiveRide(res.ride);

            // If it just transitioned to completed
            if (res.ride.status === 'completed') {
              setActiveRide(null);
              setRatingRideId(res.ride.id);
              setShowRatingModal(true);
              if (pollTimerRef.current) clearInterval(pollTimerRef.current);
            }
          }
        } catch (e) {
          console.warn('Ride polling error:', e);
        }
      }, 3000);
    }

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, [activeRide?.id, activeRide?.status]);

  // Load history when tab is clicked
  useEffect(() => {
    if (activeTab === 'history') {
      setLoadingHistory(true);
      api
        .getPassengerRides()
        .then((res) => {
          if (res.success) setRideHistory(res.rides);
        })
        .finally(() => setLoadingHistory(false));
    }
  }, [activeTab]);

  // Book Ride
  const handleRequestRide = async () => {
    setBookingError(null);
    setIsBooking(true);
    try {
      const res = await api.createRide({
        pickupAddress,
        pickupLatitude: pickupCoords.lat,
        pickupLongitude: pickupCoords.lng,
        destinationAddress: destAddress,
        destinationLatitude: destCoords.lat,
        destinationLongitude: destCoords.lng,
        vehicleType: selectedVehicle,
        paymentMethod,
      });

      if (res.success && res.ride) {
        setActiveRide(res.ride);
      }
    } catch (err: any) {
      setBookingError(err.message || 'Failed to book ride.');
    } finally {
      setIsBooking(false);
    }
  };

  // Cancel Ride
  const handleCancelRide = async () => {
    if (!activeRide) return;
    const confirmCancel = window.confirm('Are you sure you want to cancel this ride in Monrovia?');
    if (!confirmCancel) return;

    try {
      const res = await api.cancelRide(activeRide.id, 'Passenger requested cancellation');
      if (res.success) {
        setActiveRide(null);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to cancel ride');
    }
  };

  // Submit Rating
  const handleRatingSubmit = async () => {
    if (!ratingRideId) return;
    setRatingSubmitting(true);
    try {
      await api.submitRideRating(ratingRideId, ratingScore, ratingComment);
      setShowRatingModal(false);
      setRatingRideId(null);
      setRatingComment('');
      loadDashboardData();
    } catch (err: any) {
      alert(err.message || 'Failed to submit rating');
    } finally {
      setRatingSubmitting(false);
    }
  };

  // Update Profile Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.updatePassengerProfile({
        preferred_payment_method: paymentMethod,
        emergency_contact_name: emergencyName,
        emergency_contact_phone: emergencyPhone,
      });
      if (res.success) {
        setSettingsSuccess(true);
        setTimeout(() => setSettingsSuccess(false), 3000);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to save settings');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'requested':
        return (
          <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold animate-pulse">
            Searching for Driver...
          </span>
        );
      case 'accepted':
        return (
          <span className="px-2.5 py-1 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-semibold">
            Driver Confirmed & En Route
          </span>
        );
      case 'arrived':
        return (
          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold">
            Driver Arrived at Pickup!
          </span>
        );
      case 'in_progress':
        return (
          <span className="px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold">
            Trip in Progress to Destination
          </span>
        );
      case 'completed':
        return (
          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold">
            Completed
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-400 text-xs capitalize">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Bar with Passenger Meta */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800 mb-6">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <span>Passenger Portal</span>
            <span className="text-amber-400">🚕</span>
          </h1>
          <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
            <span>Welcome back, {user?.name}</span>
            <span aria-hidden="true">·</span>
            <span>{user?.phone}</span>
            <span aria-hidden="true">·</span>
            <span className="text-amber-400 font-semibold">
              {profile?.rating_average ? `${profile.rating_average} ★` : '5.0 ★'}
            </span>
          </div>
        </div>

        {/* Dashboard Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('book')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'book'
                ? 'bg-amber-400 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Book a Ride
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'history'
                ? 'bg-amber-400 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Ride History
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'settings'
                ? 'bg-amber-400 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Account & SOS
          </button>
        </div>
      </div>

      {/* TAB 1: BOOK A RIDE & ACTIVE TRIP */}
      {activeTab === 'book' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Booking Form or Active Trip Tracker */}
          <div className="lg:col-span-5 space-y-6">
            {activeRide ? (
              /* ACTIVE TRIP CARD */
              <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div>
                    <h2 className="text-base font-bold text-white">Active Ride Details</h2>
                    <span className="text-xs text-slate-400">Trip #{activeRide.id}</span>
                  </div>
                  {getStatusBadge(activeRide.status)}
                </div>

                {/* Driver Info if Assigned */}
                {activeRide.driver_id ? (
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center font-bold text-white text-base">
                          {activeRide.driver_avatar ? (
                            <img
                              src={activeRide.driver_avatar}
                              alt="Driver"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            'ET'
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-white flex items-center gap-1.5">
                            <span>{activeRide.driver_name || 'Assigned Driver'}</span>
                            <span className="text-xs text-amber-400 font-semibold">
                              ★ {activeRide.driver_rating || '4.9'}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400">
                            {activeRide.vehicle_make} {activeRide.vehicle_model}
                          </div>
                        </div>
                      </div>

                      {/* Plate Badge */}
                      <div className="px-3 py-1.5 rounded-xl bg-amber-400/10 border border-amber-400/40 text-amber-300 font-mono font-bold text-xs">
                        {activeRide.vehicle_plate || 'ML-1024-TX'}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs">
                      <a
                        href={`tel:${activeRide.driver_phone}`}
                        className="flex items-center gap-2 text-emerald-400 hover:text-emerald-300 font-medium"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>Call Driver ({activeRide.driver_phone})</span>
                      </a>
                      <span className="text-slate-400">
                        Color: <strong className="text-white">{activeRide.vehicle_color || 'Yellow/Blue'}</strong>
                      </span>
                    </div>
                  </div>
                ) : (
                  /* Searching Radar Animation */
                  <div className="p-8 rounded-2xl bg-slate-950 border border-slate-800/80 text-center space-y-3">
                    <div className="w-16 h-16 mx-auto rounded-full bg-amber-400/10 border border-amber-400/30 flex items-center justify-center animate-spin">
                      <RefreshCw className="w-8 h-8 text-amber-400" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Searching for Nearby Drivers</h4>
                      <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                        Broadcasting your trip to verified drivers in Monrovia...
                      </p>
                    </div>
                  </div>
                )}

                {/* Route Summary */}
                <div className="space-y-2 text-xs">
                  <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-950 border border-slate-800/60">
                    <div className="w-3 h-3 rounded-full bg-emerald-400 mt-1 shrink-0" />
                    <div>
                      <span className="block text-[10px] text-slate-500 uppercase font-semibold">Pickup</span>
                      <span className="text-slate-200 font-medium">{activeRide.pickup_address}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-950 border border-slate-800/60">
                    <div className="w-3 h-3 rounded-full bg-amber-400 mt-1 shrink-0" />
                    <div>
                      <span className="block text-[10px] text-slate-500 uppercase font-semibold">Destination</span>
                      <span className="text-slate-200 font-medium">{activeRide.destination_address}</span>
                    </div>
                  </div>
                </div>

                {/* Fare & Payment Info */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="block text-[11px] text-slate-500">Trip Fare</span>
                    <span className="text-base font-extrabold text-amber-400 tabular-nums">
                      {activeRide.estimated_fare_lrd} LRD
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="block text-[11px] text-slate-500">Payment</span>
                    <span className="text-xs font-semibold text-white">
                      {activeRide.payment_method.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={handleCancelRide}
                    className="flex-1 py-2.5 rounded-xl border border-red-900/60 bg-red-950/30 hover:bg-red-900/40 text-red-300 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Cancel Ride</span>
                  </button>

                  <a
                    href="tel:+231770000001"
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                    title="Monrovia Ride 24/7 Safety Dispatch"
                  >
                    <Shield className="w-4 h-4 text-emerald-400" />
                    <span>SOS</span>
                  </a>
                </div>
              </div>
            ) : (
              /* BOOKING PANEL */
              <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-5">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <h2 className="text-base font-bold text-white">Where are you going?</h2>
                  <span className="text-xs text-amber-400 font-medium">Monrovia, LR</span>
                </div>

                {bookingError && (
                  <div className="p-3 rounded-xl bg-red-950/60 border border-red-800 text-xs text-red-200">
                    {bookingError}
                  </div>
                )}

                {/* Pickup & Destination Pickers */}
                <div className="space-y-3.5">
                  <LocationPicker
                    label="1. Pickup Location"
                    selectedAddress={pickupAddress}
                    selectedCoords={pickupCoords}
                    onSelect={(addr, coords) => {
                      setPickupAddress(addr);
                      setPickupCoords(coords);
                    }}
                    isPickup={true}
                  />

                  <LocationPicker
                    label="2. Destination"
                    selectedAddress={destAddress}
                    selectedCoords={destCoords}
                    onSelect={(addr, coords) => {
                      setDestAddress(addr);
                      setDestCoords(coords);
                    }}
                    isPickup={false}
                  />
                </div>

                {/* Route specs */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <Navigation className="w-4 h-4 text-emerald-400" />
                    <span>Distance: <strong className="text-white tabular-nums">{distanceKm} km</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span>Est. Time: <strong className="text-white tabular-nums">~{durationMins} mins</strong></span>
                  </div>
                </div>

                {/* Vehicle Tier Selection */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    3. Select Vehicle Tier
                  </label>
                  <div className="space-y-2">
                    {fares.map((tier) => {
                      const isSelected = selectedVehicle === tier.vehicleType;
                      return (
                        <button
                          key={tier.vehicleType}
                          type="button"
                          onClick={() => setSelectedVehicle(tier.vehicleType)}
                          className={`w-full flex items-center justify-between p-3 rounded-2xl border text-left transition-all ${
                            isSelected
                              ? 'border-amber-400 bg-amber-400/10 ring-2 ring-amber-400/20'
                              : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-lg">
                              {tier.vehicleType === 'KEH_KEH' ? '🛵' : tier.vehicleType === 'STANDARD' ? '🚕' : '🚙'}
                            </div>
                            <div>
                              <div className="text-xs font-bold text-white flex items-center gap-2">
                                <span>{tier.name}</span>
                                <span className="text-[10px] text-slate-500 font-normal">
                                  · {tier.capacity} seats
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-400">{tier.description}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-black text-amber-400 tabular-nums">
                              {tier.estimatedFareLrd} LRD
                            </div>
                            <div className="text-[10px] text-slate-500">Upfront Fare</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Payment Method Selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    4. Payment Method
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('CASH')}
                      className={`p-2.5 rounded-xl border text-center transition-all ${
                        paymentMethod === 'CASH'
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="text-xs font-bold">Cash (LRD)</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">Pay driver</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('LONESTAR_MTN_MOMO')}
                      className={`p-2.5 rounded-xl border text-center transition-all ${
                        paymentMethod === 'LONESTAR_MTN_MOMO'
                          ? 'border-amber-400 bg-amber-400/10 text-amber-300'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="text-xs font-bold">MTN MoMo</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">*156#</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('ORANGE_MONEY')}
                      className={`p-2.5 rounded-xl border text-center transition-all ${
                        paymentMethod === 'ORANGE_MONEY'
                          ? 'border-orange-500 bg-orange-500/10 text-orange-300'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="text-xs font-bold">Orange Money</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">*144#</div>
                    </button>
                  </div>
                </div>

                {/* Book Ride Button (Opens Confirmation Modal) */}
                <button
                  type="button"
                  onClick={() => {
                    setBookingError(null);
                    setShowConfirmModal(true);
                  }}
                  disabled={isBooking || isCalculatingFares}
                  className="w-full py-3.5 rounded-xl font-bold text-xs text-slate-950 bg-amber-400 hover:bg-amber-300 transition-all shadow-lg shadow-amber-400/20 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isBooking ? (
                    <span>Requesting Monrovia Ride...</span>
                  ) : (
                    <>
                      <span>Review & Request Ride ({fares.find((f) => f.vehicleType === selectedVehicle)?.name || selectedVehicle})</span>
                      <Send className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Right Column: Live Monrovia Leaflet Map */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Live Interactive Monrovia Map
              </span>
              <span className="text-xs text-emerald-400 flex items-center gap-1.5 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                Active GPS Mesh
              </span>
            </div>

            <MonroviaMap
              pickupCoords={
                activeRide
                  ? { lat: Number(activeRide.pickup_latitude), lng: Number(activeRide.pickup_longitude) }
                  : pickupCoords
              }
              destinationCoords={
                activeRide
                  ? {
                      lat: Number(activeRide.destination_latitude),
                      lng: Number(activeRide.destination_longitude),
                    }
                  : destCoords
              }
              driverCoords={
                activeRide?.driver_lat && activeRide?.driver_lng
                  ? { lat: Number(activeRide.driver_lat), lng: Number(activeRide.driver_lng) }
                  : null
              }
              className="h-[480px] w-full"
            />
          </div>
        </div>
      )}

      {/* TAB 2: RIDE HISTORY */}
      {activeTab === 'history' && (
        <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
            <div>
              <h2 className="text-lg font-bold text-white">Your Past Monrovia Trips</h2>
              <span className="text-xs text-slate-400">Complete record of your ride receipts and ratings</span>
            </div>
          </div>

          {loadingHistory ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Loading your ride history...
            </div>
          ) : rideHistory.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No previous rides recorded yet. Book your first trip above!
            </div>
          ) : (
            <div className="space-y-4">
              {rideHistory.map((ride) => (
                <div
                  key={ride.id}
                  className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">
                        Trip #{ride.id} · {ride.vehicle_type}
                      </span>
                      {getStatusBadge(ride.status)}
                    </div>
                    <div className="text-xs text-slate-300">
                      <strong>From:</strong> {ride.pickup_address}
                    </div>
                    <div className="text-xs text-slate-300">
                      <strong>To:</strong> {ride.destination_address}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {new Date(ride.requested_at).toLocaleString()} · {ride.distance_km} km
                      {ride.driver_name && ` · Driver: ${ride.driver_name} (${ride.vehicle_plate})`}
                    </div>
                  </div>

                  <div className="text-right sm:border-l sm:border-slate-800 sm:pl-6 shrink-0">
                    <div className="text-base font-extrabold text-amber-400 tabular-nums">
                      {ride.final_fare_lrd || ride.estimated_fare_lrd} LRD
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {ride.payment_method.replace(/_/g, ' ')}
                    </div>
                    {ride.rating_score && (
                      <div className="text-xs text-amber-400 font-semibold mt-1">
                        Rated: {ride.rating_score} ★
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ACCOUNT & SOS SETTINGS */}
      {activeTab === 'settings' && (
        <div className="max-w-xl mx-auto rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-6">
          <div className="pb-3 border-b border-slate-800">
            <h2 className="text-lg font-bold text-white">Account & Safety Preferences</h2>
            <span className="text-xs text-slate-400">Configure emergency contact and default payment</span>
          </div>

          {settingsSuccess && (
            <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800 text-xs text-emerald-300">
              Settings updated successfully!
            </div>
          )}

          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Emergency Contact Name
              </label>
              <input
                type="text"
                value={emergencyName}
                onChange={(e) => setEmergencyName(e.target.value)}
                placeholder="e.g. Sando Flomo (Brother)"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Emergency Contact Phone Number
              </label>
              <input
                type="text"
                value={emergencyPhone}
                onChange={(e) => setEmergencyPhone(e.target.value)}
                placeholder="+231-77-..."
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Preferred Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-400"
              >
                <option value="CASH">Cash in Liberian Dollars (LRD)</option>
                <option value="LONESTAR_MTN_MOMO">Lonestar MTN Mobile Money</option>
                <option value="ORANGE_MONEY">Orange Money</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl font-bold text-xs text-slate-950 bg-amber-400 hover:bg-amber-300 transition-colors"
            >
              Save Preferences
            </button>
          </form>
        </div>
      )}

      {/* RATING MODAL UPON TRIP COMPLETION */}
      {showRatingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md" />
          <div className="relative w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl z-10 text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-2xl">
              🎉
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">You Have Arrived!</h3>
              <p className="text-xs text-slate-400 mt-1">
                Trip completed safely. How was your experience with the driver?
              </p>
            </div>

            {/* Star selector */}
            <div className="flex items-center justify-center gap-2 py-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRatingScore(star)}
                  className={`p-1.5 transition-transform hover:scale-110 ${
                    star <= ratingScore ? 'text-amber-400' : 'text-slate-700'
                  }`}
                >
                  <Star className="w-7 h-7 fill-current" />
                </button>
              ))}
            </div>

            <div>
              <textarea
                value={ratingComment}
                onChange={(e) => setRatingComment(e.target.value)}
                placeholder="Optional comments (e.g. Clean car, polite driver, smooth ride...)"
                rows={3}
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowRatingModal(false)}
                className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-400 text-xs font-semibold hover:bg-slate-700 transition-colors"
              >
                Skip
              </button>
              <button
                type="button"
                onClick={handleRatingSubmit}
                disabled={ratingSubmitting}
                className="flex-1 py-2 rounded-xl bg-amber-400 text-slate-950 text-xs font-bold hover:bg-amber-300 transition-colors"
              >
                {ratingSubmitting ? 'Submitting...' : 'Submit Rating'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RIDE BOOKING CONFIRMATION & VERIFICATION MODAL */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity"
            onClick={() => !isBooking && setShowConfirmModal(false)}
          />

          {/* Modal Container */}
          <div className="relative w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-700/80 p-6 sm:p-7 shadow-2xl z-10 space-y-5 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-400/10 border border-amber-400/30 text-amber-400 flex items-center justify-center text-xl font-bold">
                  🚕
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white">
                    Confirm Your Ride Booking
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Verify route details and upfront fare in Liberian Dollars
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={isBooking}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Selected Vehicle Tier */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-xl">
                  {selectedVehicle === 'KEH_KEH' ? '🛵' : selectedVehicle === 'STANDARD' ? '🚕' : '🚙'}
                </div>
                <div>
                  <div className="text-xs font-bold text-white">
                    {currentFare?.name || selectedVehicle}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {currentFare?.capacity || 4} Passenger Capacity · Monrovia Fleet
                  </div>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-amber-400/10 text-amber-300 border border-amber-400/30 text-[11px] font-semibold">
                Verified Driver
              </span>
            </div>

            {/* Route Verification: Pickup & Destination */}
            <div className="space-y-2.5">
              <span className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Trip Route & Itinerary
              </span>

              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                {/* Pickup */}
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <MapPin className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">
                      Pickup Point
                    </span>
                    <span className="text-xs sm:text-sm font-medium text-slate-100 block break-words">
                      {pickupAddress}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      GPS: {pickupCoords.lat.toFixed(4)}, {pickupCoords.lng.toFixed(4)}
                    </span>
                  </div>
                </div>

                <div className="h-px bg-slate-800/80 ml-9" />

                {/* Destination */}
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-lg bg-amber-400/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Navigation className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-[10px] font-semibold text-amber-400 uppercase tracking-wider">
                      Dropoff Destination
                    </span>
                    <span className="text-xs sm:text-sm font-medium text-slate-100 block break-words">
                      {destAddress}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      GPS: {destCoords.lat.toFixed(4)}, {destCoords.lng.toFixed(4)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Distance and Travel Time Row */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <Navigation className="w-3.5 h-3.5 text-slate-400" />
                  <span>Est. Distance: <strong className="text-white tabular-nums">{distanceKm} km</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Travel Time: <strong className="text-white tabular-nums">~{durationMins} mins</strong></span>
                </div>
              </div>
            </div>

            {/* Estimated Fare Display in LRD */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-400/10 via-slate-950 to-slate-950 border border-amber-400/40 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Total Estimated Fare
                  </span>
                  <div className="text-2xl sm:text-3xl font-black text-amber-400 tabular-nums">
                    {currentFare?.estimatedFareLrd || 0} LRD
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[11px] text-slate-400 block">Payment Method</span>
                  <span className="text-xs font-bold text-white px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 inline-block mt-1">
                    {paymentMethod === 'CASH'
                      ? 'Cash in LRD'
                      : paymentMethod === 'LONESTAR_MTN_MOMO'
                      ? 'Lonestar MTN MoMo'
                      : 'Orange Money'}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                <span>Base: {currentFare?.baseFare || 300} LRD + ({distanceKm} km × {currentFare?.perKmRate || 80} LRD/km)</span>
                <span className="text-emerald-400 font-medium">Upfront Guarantee</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={isBooking}
                className="flex-1 py-3 px-4 rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800 text-xs font-semibold text-slate-300 transition-colors"
              >
                Back / Edit
              </button>

              <button
                type="button"
                onClick={async () => {
                  setShowConfirmModal(false);
                  await handleRequestRide();
                }}
                disabled={isBooking}
                className="flex-1 py-3 px-4 rounded-xl font-bold text-xs text-slate-950 bg-amber-400 hover:bg-amber-300 transition-all shadow-lg shadow-amber-400/20 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isBooking ? (
                  <span>Dispatching...</span>
                ) : (
                  <>
                    <span>Confirm & Book Ride</span>
                    <Send className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
