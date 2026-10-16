import React, { useState } from 'react';
import { LocationPicker } from '../components/LocationPicker';
import { api } from '../services/api';
import { FareEstimate } from '../types';
import {
  ShieldCheck,
  Zap,
  Car,
  ChevronRight,
  Clock,
  PhoneCall,
  CheckCircle2,
  DollarSign,
  Smartphone,
  Navigation,
} from 'lucide-react';

interface LandingPageProps {
  onStartBooking: () => void;
  onOpenDriverSignup: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onStartBooking,
  onOpenDriverSignup,
}) => {
  // Quick estimator state on landing page
  const [pickupAddr, setPickupAddr] = useState('Broad Street & Randall St, Central Monrovia');
  const [pickupCoords, setPickupCoords] = useState<{ lat: number; lng: number }>({
    lat: 6.3135,
    lng: -10.8065,
  });

  const [destAddr, setDestAddr] = useState('Boulevard Palace Hotel, 13th Street, Sinkor');
  const [destCoords, setDestCoords] = useState<{ lat: number; lng: number }>({
    lat: 6.2925,
    lng: -10.7780,
  });

  const [fares, setFares] = useState<FareEstimate[]>([
    {
      vehicleType: 'KEH_KEH',
      name: 'Keh-Keh (Tricycle)',
      description: 'Nimble auto-rickshaw for quick street trips',
      baseFare: 150,
      perKmRate: 40,
      estimatedFareLrd: 330,
      capacity: 3,
      icon: 'zap',
    },
    {
      vehicleType: 'STANDARD',
      name: 'Standard Taxi',
      description: 'Comfortable air-conditioned sedan for everyday rides',
      baseFare: 300,
      perKmRate: 80,
      estimatedFareLrd: 660,
      capacity: 4,
      icon: 'car',
    },
    {
      vehicleType: 'EXECUTIVE_SUV',
      name: 'Executive SUV',
      description: 'High-clearance SUV for highway & VIP comfort',
      baseFare: 600,
      perKmRate: 140,
      estimatedFareLrd: 1235,
      capacity: 4,
      icon: 'shield',
    },
  ]);
  const [distanceKm, setDistanceKm] = useState<number>(4.5);
  const [durationMins, setDurationMins] = useState<number>(14);
  const [isCalculating, setIsCalculating] = useState(false);

  const calculateEstimate = async (
    p: { lat: number; lng: number },
    d: { lat: number; lng: number }
  ) => {
    setIsCalculating(true);
    try {
      const res = await api.getFareEstimate(p.lat, p.lng, d.lat, d.lng);
      if (res.success && res.estimate) {
        setFares(res.estimate.fares);
        setDistanceKm(res.estimate.distanceKm);
        setDurationMins(res.estimate.durationMins);
      }
    } catch (e) {
      console.warn('Fare estimate error:', e);
    } finally {
      setIsCalculating(false);
    }
  };

  const handlePickupChange = (addr: string, coords: { lat: number; lng: number }) => {
    setPickupAddr(addr);
    setPickupCoords(coords);
    calculateEstimate(coords, destCoords);
  };

  const handleDestChange = (addr: string, coords: { lat: number; lng: number }) => {
    setDestAddr(addr);
    setDestCoords(coords);
    calculateEstimate(pickupCoords, coords);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* 1. HERO SECTION */}
      <section className="relative pt-12 pb-20 overflow-hidden border-b border-slate-900">
        {/* Ambient background glow */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 left-10 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-amber-400">
                <span>The Premier Ride-Hailing Service in Liberia</span>
                <span aria-hidden="true">·</span>
                <span>Fares in LRD</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
                Your City. <br />
                Your Ride. <br />
                <span className="text-amber-400">Your Way.</span>
              </h1>

              <p className="text-base sm:text-lg text-slate-300 max-w-xl leading-relaxed">
                Fast, reliable, and transparent transportation throughout Monrovia, Sinkor,
                Paynesville, Bushrod Island, and Robertsfield. Choose from Keh-Keh, Standard
                Taxis, or Executive SUVs with upfront fares in Liberian Dollars.
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button
                  onClick={onStartBooking}
                  className="px-6 py-3.5 rounded-xl font-bold text-sm text-slate-950 bg-amber-400 hover:bg-amber-300 transition-all shadow-lg shadow-amber-400/20 flex items-center gap-2"
                >
                  <span>Book a Ride Now</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={onOpenDriverSignup}
                  className="px-6 py-3.5 rounded-xl font-semibold text-sm text-white bg-slate-900 border border-slate-700 hover:bg-slate-800 transition-all flex items-center gap-2"
                >
                  <span>Become a Driver</span>
                  <Car className="w-4 h-4 text-amber-400" />
                </button>
              </div>

              {/* Social Proof Numbers */}
              <div className="pt-6 border-t border-slate-800/80 grid grid-cols-3 gap-6 max-w-lg">
                <div>
                  <div className="text-2xl font-black text-white tabular-nums">150+</div>
                  <div className="text-xs text-slate-400 mt-0.5">Verified Drivers</div>
                </div>
                <div>
                  <div className="text-2xl font-black text-white tabular-nums">&lt; 5 min</div>
                  <div className="text-xs text-slate-400 mt-0.5">Avg Pickup Time</div>
                </div>
                <div>
                  <div className="text-2xl font-black text-white tabular-nums">100%</div>
                  <div className="text-xs text-slate-400 mt-0.5">Upfront LRD Pricing</div>
                </div>
              </div>
            </div>

            {/* Right: Interactive Quick Estimator Card */}
            <div className="lg:col-span-5">
              <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div>
                    <h2 className="text-base font-bold text-white">Live Fare Calculator</h2>
                    <span className="text-xs text-slate-400">Instant Monrovia rate estimates</span>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-amber-400/10 text-amber-300 border border-amber-400/30 text-xs font-semibold">
                    Monrovia, LR
                  </span>
                </div>

                <div className="space-y-3">
                  <LocationPicker
                    label="Pickup Location"
                    selectedAddress={pickupAddr}
                    selectedCoords={pickupCoords}
                    onSelect={handlePickupChange}
                    isPickup={true}
                  />

                  <LocationPicker
                    label="Destination"
                    selectedAddress={destAddr}
                    selectedCoords={destCoords}
                    onSelect={handleDestChange}
                    isPickup={false}
                  />
                </div>

                {/* Route Summary */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <Navigation className="w-4 h-4 text-emerald-400" />
                    <span>Est. Distance: <strong className="text-white tabular-nums">{distanceKm} km</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span>Travel Time: <strong className="text-white tabular-nums">~{durationMins} mins</strong></span>
                  </div>
                </div>

                {/* Live Fare Cards */}
                <div className="space-y-2">
                  <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Available Ride Tiers:
                  </span>
                  {fares.map((fare) => (
                    <div
                      key={fare.vehicleType}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-amber-400/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-amber-400 font-bold">
                          {fare.vehicleType === 'KEH_KEH' ? '🛵' : fare.vehicleType === 'STANDARD' ? '🚕' : '🚙'}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white">{fare.name}</div>
                          <div className="text-[11px] text-slate-400">{fare.description}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-extrabold text-amber-400 tabular-nums">
                          {fare.estimatedFareLrd} LRD
                        </div>
                        <div className="text-[10px] text-slate-500">Upfront Fare</div>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={onStartBooking}
                  className="w-full py-3 rounded-xl font-bold text-xs text-slate-950 bg-amber-400 hover:bg-amber-300 transition-colors shadow-md shadow-amber-400/20"
                >
                  Book This Trip Now
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. HOW IT WORKS */}
      <section className="py-20 border-b border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
              Seamless Urban Transit
            </span>
            <h2 className="text-3xl font-extrabold text-white mt-1">
              How Monrovia Ride Works
            </h2>
            <p className="text-sm text-slate-400 mt-2">
              Book a reliable ride across Montserrado County in three straightforward steps.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 relative">
              <div className="w-10 h-10 rounded-xl bg-amber-400/10 text-amber-400 flex items-center justify-center font-bold text-base mb-4">
                1
              </div>
              <h3 className="text-base font-bold text-white mb-2">Request on the Map</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Enter your pickup and dropoff anywhere in Monrovia or use GPS locator. View real route distance and estimated arrival time.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 relative">
              <div className="w-10 h-10 rounded-xl bg-emerald-400/10 text-emerald-400 flex items-center justify-center font-bold text-base mb-4">
                2
              </div>
              <h3 className="text-base font-bold text-white mb-2">Confirm Upfront LRD Fare</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Choose between affordable Keh-Keh, standard air-conditioned taxi, or executive SUV. The price you see is the price you pay.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 relative">
              <div className="w-10 h-10 rounded-xl bg-indigo-400/10 text-indigo-400 flex items-center justify-center font-bold text-base mb-4">
                3
              </div>
              <h3 className="text-base font-bold text-white mb-2">Track & Pay Locally</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Watch your driver arrive in real time. Pay smoothly with Cash, Lonestar MTN Mobile Money, or Orange Money upon arrival.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. AUTHENTIC SHOWCASE & LOCAL FLEET */}
      <section className="py-20 border-b border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Generated Image Showcase */}
            <div className="relative rounded-3xl overflow-hidden border border-slate-800 shadow-2xl group">
              <img
                src="/src/assets/images/monrovia_taxi_hero_1792113226573.jpg"
                alt="Monrovia Ride Taxi on Atlantic Coastal Boulevard"
                referrerPolicy="no-referrer"
                className="w-full h-[400px] object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6">
                <span className="text-xs font-semibold text-amber-400">Sinkor & Central Boulevard</span>
                <h4 className="text-lg font-bold text-white">Clean, Licensed & Insured Fleet</h4>
                <p className="text-xs text-slate-300 mt-1">
                  Every vehicle undergoes regular road safety inspections by Monrovia transport authorities.
                </p>
              </div>
            </div>

            {/* Right Information */}
            <div className="space-y-6">
              <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                Reliable Transportation
              </span>
              <h2 className="text-3xl font-extrabold text-white">
                Tailored for Monrovia’s Roads and Communities
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                Whether you need a swift Keh-Keh to maneuver through bustling Red Light Market traffic, a cool air-conditioned taxi for business meetings along Tubman Boulevard, or an Executive SUV for Roberts International Airport (ROB), Monrovia Ride has you covered.
              </p>

              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-white">No Price Haggling or Surprise Rates</h4>
                    <p className="text-xs text-slate-400">Clear rates based on distance and vehicle type, calculated in LRD before booking.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-white">Lonestar MTN MoMo & Orange Money Integration</h4>
                    <p className="text-xs text-slate-400">Pay directly from your phone without worrying about exact cash change.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-white">Emergency SOS & Live Trip Sharing</h4>
                    <p className="text-xs text-slate-400">Share your live trip progress with family members or friends with one tap.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. DRIVER RECRUITMENT BANNER */}
      <section className="py-20 border-b border-slate-900 bg-slate-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center rounded-3xl bg-slate-900 border border-slate-800 p-8 sm:p-12 overflow-hidden relative">
            <div className="lg:col-span-7 space-y-4">
              <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                Drive With Monrovia Ride
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
                Earn More. Keep 85% of Every Fare.
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                Take control of your schedule. Drive your own taxi, Keh-Keh, or SUV in Monrovia with guaranteed fast payouts, steady passenger requests, and comprehensive driver support.
              </p>
              <div className="pt-2 flex flex-wrap gap-4">
                <button
                  onClick={onOpenDriverSignup}
                  className="px-6 py-3 rounded-xl font-bold text-xs text-slate-950 bg-amber-400 hover:bg-amber-300 transition-colors shadow-lg shadow-amber-400/20"
                >
                  Sign Up to Drive
                </button>
              </div>
            </div>

            <div className="lg:col-span-5 flex justify-center">
              <div className="relative rounded-2xl overflow-hidden border border-slate-700/80 max-w-sm">
                <img
                  src="/src/assets/images/driver_profile_showcase_1792113226958.jpg"
                  alt="Professional Monrovia Ride Driver"
                  referrerPolicy="no-referrer"
                  className="w-full h-64 object-cover"
                />
                <div className="p-3 bg-slate-950/90 text-xs text-slate-300 border-t border-slate-800">
                  <div className="font-semibold text-white">Emmanuel Tamba · 4.92 ★</div>
                  <div className="text-[11px] text-slate-400">Driver Partner, Sinkor Fleet</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. FOOTER */}
      <footer className="py-12 bg-slate-950 text-slate-400 border-t border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="space-y-3">
              <div className="text-lg font-bold text-white">
                MONROVIA RIDE <span className="text-amber-400">🚕</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Liberia’s trusted ride-hailing technology. Connecting passengers and verified drivers across Monrovia with dignity, safety, and fairness.
              </p>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">Service Areas</h4>
              <ul className="space-y-1.5 text-xs text-slate-400">
                <li>Central Monrovia & Mamba Point</li>
                <li>Sinkor (1st - 24th Streets)</li>
                <li>Congo Town & Oldest Congo Town</li>
                <li>Paynesville & Red Light Hub</li>
                <li>Bushrod Island & Freeport</li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">Payment Methods</h4>
              <ul className="space-y-1.5 text-xs text-slate-400">
                <li>Cash in Liberian Dollars (LRD)</li>
                <li>Lonestar MTN Mobile Money (*156#)</li>
                <li>Orange Money (*144#)</li>
                <li>Corporate Invoicing</li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">Emergency & Safety</h4>
              <p className="text-xs text-slate-400 leading-relaxed mb-2">
                24/7 Operations Command & Dispatch Hotline:
              </p>
              <div className="text-xs font-bold text-amber-400 tabular-nums">
                +231 77 000 0001
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Tubman Blvd Office, Monrovia, Liberia
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <div>&copy; {new Date().getFullYear()} Monrovia Ride Ltd. All rights reserved. Republic of Liberia.</div>
            <div className="flex items-center gap-4">
              <span>Terms of Service</span>
              <span>·</span>
              <span>Passenger Privacy</span>
              <span>·</span>
              <span>Driver Partner Terms</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
