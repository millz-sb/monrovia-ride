import React, { useState } from 'react';
import { MONROVIA_LOCATIONS } from '../data/monroviaLocations';
import { MonroviaLocation } from '../types';
import { MapPin, Navigation, Search, Check, Building2, Hotel, Bus } from 'lucide-react';

interface LocationPickerProps {
  label: string;
  selectedAddress: string;
  selectedCoords?: { lat: number; lng: number } | null;
  onSelect: (address: string, coords: { lat: number; lng: number }) => void;
  placeholder?: string;
  isPickup?: boolean;
}

export const LocationPicker: React.FC<LocationPickerProps> = ({
  label,
  selectedAddress,
  selectedCoords,
  onSelect,
  placeholder = 'Select location in Monrovia...',
  isPickup = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const filtered = MONROVIA_LOCATIONS.filter(
    (loc) =>
      loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loc.neighborhood.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleUseBrowserGPS = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const { latitude, longitude } = pos.coords;
        onSelect('Current GPS Location (Monrovia)', { lat: latitude, lng: longitude });
        setIsOpen(false);
      },
      (err) => {
        setIsLocating(false);
        console.warn('Geolocation error:', err.message);
        // Fallback default to Central Monrovia
        setLocationError('GPS permission denied or unavailable. Please choose a landmark below.');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const getIcon = (type: MonroviaLocation['type']) => {
    switch (type) {
      case 'hotel':
        return <Hotel className="w-4 h-4 text-amber-400" />;
      case 'transit':
        return <Bus className="w-4 h-4 text-emerald-400" />;
      default:
        return <Building2 className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="relative">
      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
        {label}
      </label>

      {/* Selector Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border text-left transition-all ${
          isOpen
            ? 'border-amber-400/80 bg-slate-900 ring-2 ring-amber-400/20'
            : 'border-slate-800 bg-slate-900/90 hover:border-slate-700'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
              isPickup ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
            }`}
          >
            <MapPin className="w-4 h-4" />
          </div>
          <div className="truncate">
            <span
              className={`block text-sm font-medium truncate ${
                selectedAddress ? 'text-slate-100' : 'text-slate-400'
              }`}
            >
              {selectedAddress || placeholder}
            </span>
            {selectedCoords && (
              <span className="block text-[11px] text-slate-500 tabular-nums">
                {selectedCoords.lat.toFixed(4)}, {selectedCoords.lng.toFixed(4)}
              </span>
            )}
          </div>
        </div>
        <Search className="w-4 h-4 text-slate-400 shrink-0" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute left-0 right-0 top-full mt-2 z-50 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-3 max-h-[380px] overflow-y-auto">
            {/* Search Input */}
            <div className="relative mb-2.5">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Broad St, Sinkor, Paynesville..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400"
                autoFocus
              />
            </div>

            {/* Browser GPS Action for Pickup */}
            {isPickup && (
              <button
                type="button"
                onClick={handleUseBrowserGPS}
                disabled={isLocating}
                className="w-full mb-2 flex items-center gap-2.5 px-3 py-2 rounded-xl bg-emerald-950/40 border border-emerald-800/50 hover:bg-emerald-900/40 text-emerald-300 text-xs font-medium transition-colors"
              >
                <Navigation className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
                <span>{isLocating ? 'Acquiring GPS Signal...' : 'Use My Current Location'}</span>
              </button>
            )}

            {locationError && (
              <div className="mb-2 p-2 rounded-lg bg-red-950/50 border border-red-800 text-[11px] text-red-300">
                {locationError}
              </div>
            )}

            <div className="text-[11px] font-semibold text-slate-400 px-1 py-1 uppercase tracking-wider">
              Popular Monrovia Hubs
            </div>

            {/* Location List */}
            <div className="space-y-1">
              {filtered.map((loc) => {
                const isSelected = selectedAddress === `${loc.name}, ${loc.neighborhood}`;
                return (
                  <button
                    key={loc.id}
                    type="button"
                    onClick={() => {
                      onSelect(`${loc.name}, ${loc.neighborhood}`, {
                        lat: loc.latitude,
                        lng: loc.longitude,
                      });
                      setIsOpen(false);
                      setSearchQuery('');
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-colors ${
                      isSelected
                        ? 'bg-amber-400/15 border border-amber-400/30 text-amber-200'
                        : 'hover:bg-slate-800 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-1 rounded-md bg-slate-800 shrink-0">
                        {getIcon(loc.type)}
                      </div>
                      <div className="truncate">
                        <div className="text-xs font-medium truncate">{loc.name}</div>
                        <div className="text-[11px] text-slate-400">{loc.neighborhood}</div>
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-amber-400 shrink-0 ml-2" />}
                  </button>
                );
              })}

              {filtered.length === 0 && (
                <div className="py-6 text-center text-xs text-slate-400">
                  No matching Monrovia landmarks found.
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
