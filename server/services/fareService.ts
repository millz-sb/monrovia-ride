import { config } from '../config/config.ts';

export interface RouteEstimate {
  distanceKm: number;
  durationMins: number;
  fares: {
    vehicleType: string;
    name: string;
    description: string;
    baseFare: number;
    perKmRate: number;
    estimatedFareLrd: number;
    capacity: number;
    icon: string;
  }[];
}

/**
 * Calculates Great-Circle distance using Haversine formula
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const rawDistance = R * c;

  // Road factor adjustment for Monrovia road networks (approx 1.28x straight line)
  const roadFactor = 1.28;
  const estimatedKm = Math.max(0.5, rawDistance * roadFactor);
  return Math.round(estimatedKm * 10) / 10;
}

/**
 * Estimate travel duration in minutes based on Monrovia traffic speeds (~22 km/h avg)
 */
export function estimateDurationMins(distanceKm: number): number {
  const avgSpeedKmh = 22; // Monrovia city average speed factoring street traffic
  const rawMinutes = (distanceKm / avgSpeedKmh) * 60;
  return Math.max(5, Math.round(rawMinutes));
}

/**
 * Calculate fare in Liberian Dollars (LRD) for a given vehicle type
 */
export function calculateFare(
  vehicleType: 'KEH_KEH' | 'STANDARD' | 'EXECUTIVE_SUV',
  distanceKm: number
): number {
  const fareConfig = config.fares[vehicleType] || config.fares.STANDARD;
  const rawFare = fareConfig.baseFare + distanceKm * fareConfig.perKmRate;
  const finalFare = Math.max(fareConfig.minFare, rawFare);
  // Round to nearest 5 LRD (typical currency handling in Liberia)
  return Math.ceil(finalFare / 5) * 5;
}

/**
 * Calculate full route estimate for all vehicle tiers
 */
export function getRouteEstimate(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): RouteEstimate {
  const distanceKm = calculateDistanceKm(lat1, lon1, lat2, lon2);
  const durationMins = estimateDurationMins(distanceKm);

  const vehicleKeys: ('KEH_KEH' | 'STANDARD' | 'EXECUTIVE_SUV')[] = [
    'KEH_KEH',
    'STANDARD',
    'EXECUTIVE_SUV',
  ];

  const fares = vehicleKeys.map((type) => {
    const spec = config.fares[type];
    const estimatedFareLrd = calculateFare(type, distanceKm);
    return {
      vehicleType: type,
      name: spec.name,
      description: spec.description,
      baseFare: spec.baseFare,
      perKmRate: spec.perKmRate,
      estimatedFareLrd,
      capacity: spec.capacity,
      icon: spec.icon,
    };
  });

  return {
    distanceKm,
    durationMins,
    fares,
  };
}
