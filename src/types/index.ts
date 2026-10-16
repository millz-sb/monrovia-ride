export type UserRole = 'passenger' | 'driver' | 'admin';

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  avatar_url?: string;
  avatarUrl?: string;
  is_active?: boolean;
  created_at?: string;
}

export type PaymentMethod = 'CASH' | 'LONESTAR_MTN_MOMO' | 'ORANGE_MONEY';

export interface PassengerProfile {
  id: number;
  user_id: number;
  preferred_payment_method: PaymentMethod;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  home_address?: string;
  work_address?: string;
  rating_average: number;
  total_rides: number;
}

export type DriverVerificationStatus = 'PENDING' | 'VERIFIED' | 'SUSPENDED' | 'REJECTED';

export interface DriverProfile {
  id: number;
  user_id: number;
  license_number: string;
  license_expiry_date?: string;
  verification_status: DriverVerificationStatus;
  is_online: boolean;
  is_available: boolean;
  rating_average: number;
  total_trips: number;
  total_earnings_lrd: number;
  current_latitude?: number;
  current_longitude?: number;
  last_location_update?: string;
}

export interface DailyEarning {
  day: string;
  date: string;
  earningsLrd: number;
  trips: number;
}

export type VehicleType = 'KEH_KEH' | 'STANDARD' | 'EXECUTIVE_SUV';

export interface Vehicle {
  id?: number;
  driver_id?: number;
  make: string;
  model: string;
  year: number;
  color: string;
  plate_number?: string;
  plateNumber?: string;
  vehicle_type?: VehicleType;
  vehicleType?: VehicleType;
  capacity?: number;
}

export type RideStatus = 'requested' | 'accepted' | 'arrived' | 'in_progress' | 'completed' | 'cancelled';

export interface Ride {
  id: number;
  passenger_id: number;
  driver_id?: number | null;
  vehicle_type: VehicleType;
  pickup_address: string;
  pickup_latitude: number;
  pickup_longitude: number;
  destination_address: string;
  destination_latitude: number;
  destination_longitude: number;
  distance_km: number;
  estimated_duration_mins: number;
  estimated_fare_lrd: number;
  final_fare_lrd?: number | null;
  status: RideStatus;
  cancellation_reason?: string;
  cancelled_by?: string;
  payment_method: PaymentMethod;
  payment_status: 'PENDING' | 'PAID' | 'FAILED';
  requested_at: string;
  accepted_at?: string;
  arrived_at?: string;
  started_at?: string;
  completed_at?: string;
  cancelled_at?: string;

  // Joined fields
  passenger_name?: string;
  passenger_phone?: string;
  passenger_avatar?: string;
  driver_name?: string;
  driver_phone?: string;
  driver_avatar?: string;
  driver_rating?: number;
  driver_lat?: number;
  driver_lng?: number;
  vehicle_make?: string;
  vehicle_model?: string;
  vehicle_color?: string;
  vehicle_plate?: string;
  rating_score?: number;
  rating_comment?: string;
}

export interface FareEstimate {
  vehicleType: VehicleType;
  name: string;
  description: string;
  baseFare: number;
  perKmRate: number;
  estimatedFareLrd: number;
  capacity: number;
  icon: string;
}

export interface MonroviaLocation {
  id: string;
  name: string;
  neighborhood: string;
  latitude: number;
  longitude: number;
  type: 'commercial' | 'hotel' | 'transit' | 'landmark' | 'residential';
}
