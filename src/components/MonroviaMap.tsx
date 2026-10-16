import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

interface MonroviaMapProps {
  pickupCoords?: { lat: number; lng: number } | null;
  destinationCoords?: { lat: number; lng: number } | null;
  driverCoords?: { lat: number; lng: number } | null;
  onSelectCoords?: (coords: { lat: number; lng: number }) => void;
  selectionMode?: 'pickup' | 'destination' | null;
  className?: string;
}

export const MonroviaMap: React.FC<MonroviaMapProps> = ({
  pickupCoords,
  destinationCoords,
  driverCoords,
  onSelectCoords,
  selectionMode,
  className = 'h-[360px] md:h-[460px] w-full',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker | L.Polyline }>({});

  // Monrovia coordinates
  const DEFAULT_CENTER: [number, number] = [6.3005, -10.7969];
  const DEFAULT_ZOOM = 13;

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        zoomControl: true,
      });

      // High-contrast OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors | Monrovia, Liberia',
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;

      // Handle map clicks for custom pin drop
      map.on('click', (e: L.LeafletMouseEvent) => {
        if (onSelectCoords) {
          onSelectCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
        }
      });
    }

    return () => {
      // Cleanup on unmount
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update markers & route when props change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear old markers
    Object.values(markersRef.current).forEach((layer) => {
      map.removeLayer(layer);
    });
    markersRef.current = {};

    const boundsPoints: [number, number][] = [];

    // 1. Pickup Marker
    if (pickupCoords) {
      const pickupIcon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: `
          <div class="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500 text-slate-950 font-bold shadow-lg ring-4 ring-emerald-500/30 transform -translate-x-1/2 -translate-y-1/2">
            <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const pMarker = L.marker([pickupCoords.lat, pickupCoords.lng], { icon: pickupIcon })
        .addTo(map)
        .bindPopup('<b class="text-xs">Pickup Location</b>');
      markersRef.current.pickup = pMarker;
      boundsPoints.push([pickupCoords.lat, pickupCoords.lng]);
    }

    // 2. Destination Marker
    if (destinationCoords) {
      const destIcon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: `
          <div class="flex items-center justify-center w-8 h-8 rounded-full bg-amber-400 text-slate-950 font-bold shadow-lg ring-4 ring-amber-400/30 transform -translate-x-1/2 -translate-y-1/2">
            <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z"/></svg>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const dMarker = L.marker([destinationCoords.lat, destinationCoords.lng], { icon: destIcon })
        .addTo(map)
        .bindPopup('<b class="text-xs">Destination</b>');
      markersRef.current.destination = dMarker;
      boundsPoints.push([destinationCoords.lat, destinationCoords.lng]);
    }

    // 3. Driver Marker
    if (driverCoords) {
      const driverIcon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: `
          <div class="flex items-center justify-center w-9 h-9 rounded-full bg-amber-500 text-slate-950 font-bold shadow-2xl ring-4 ring-amber-500/40 transform -translate-x-1/2 -translate-y-1/2 animate-bounce">
            <span class="text-base">🚕</span>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const drMarker = L.marker([driverCoords.lat, driverCoords.lng], { icon: driverIcon })
        .addTo(map)
        .bindPopup('<b class="text-xs">Driver Position</b>');
      markersRef.current.driver = drMarker;
      boundsPoints.push([driverCoords.lat, driverCoords.lng]);
    }

    // 4. Route Polyline
    if (pickupCoords && destinationCoords) {
      const polyline = L.polyline(
        [
          [pickupCoords.lat, pickupCoords.lng],
          [destinationCoords.lat, destinationCoords.lng],
        ],
        {
          color: '#10b981',
          weight: 4,
          opacity: 0.85,
          dashArray: '8, 8',
        }
      ).addTo(map);

      markersRef.current.route = polyline;
    }

    // Fit map bounds if markers exist
    if (boundsPoints.length > 1) {
      map.fitBounds(L.latLngBounds(boundsPoints), { padding: [50, 50], maxZoom: 16 });
    } else if (boundsPoints.length === 1) {
      map.setView(boundsPoints[0], 14);
    }
  }, [pickupCoords, destinationCoords, driverCoords]);

  return (
    <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 shadow-xl">
      <div ref={mapContainerRef} className={className} />

      {/* Map Helper Overlay */}
      {selectionMode && (
        <div className="absolute top-3 left-3 right-3 z-[1000] pointer-events-none flex justify-center">
          <div className="px-3.5 py-1.5 rounded-lg bg-slate-900/90 backdrop-blur-md border border-slate-700 text-xs font-medium text-amber-300 shadow-lg">
            Tap map to set {selectionMode === 'pickup' ? 'Pickup Location' : 'Destination'}
          </div>
        </div>
      )}

      {/* Monrovia Badge */}
      <div className="absolute bottom-2 left-2 z-[1000] pointer-events-none px-2 py-1 rounded bg-slate-900/80 backdrop-blur text-[11px] text-slate-400 border border-slate-800">
        Monrovia Transit Grid · Liberia
      </div>
    </div>
  );
};
