import { User, PassengerProfile, DriverProfile, Ride, FareEstimate } from '../types';

const API_BASE = '/api';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('monrovia_ride_token') || sessionStorage.getItem('monrovia_ride_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleResponse<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}: ${res.statusText}`);
  }
  return data;
}

export const api = {
  // --------------------------------------------------------------------------
  // AUTH
  // --------------------------------------------------------------------------
  async register(payload: any) {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse<{ success: boolean; token: string; user: User }>(res);
  },

  async login(identifier: string, password: string) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password }),
    });
    return handleResponse<{
      success: boolean;
      token: string;
      user: User;
      profile?: any;
      vehicle?: any;
    }>(res);
  },

  async getMe() {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<{
      success: boolean;
      user: User;
      profile?: any;
      vehicle?: any;
    }>(res);
  },

  // --------------------------------------------------------------------------
  // FARES & ESTIMATES
  // --------------------------------------------------------------------------
  async getFareEstimate(pickupLat: number, pickupLng: number, destLat: number, destLng: number) {
    const res = await fetch(`${API_BASE}/fares/estimate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pickupLat, pickupLng, destLat, destLng }),
    });
    return handleResponse<{
      success: boolean;
      estimate: {
        distanceKm: number;
        durationMins: number;
        fares: FareEstimate[];
      };
    }>(res);
  },

  // --------------------------------------------------------------------------
  // PASSENGER
  // --------------------------------------------------------------------------
  async getPassengerProfile() {
    const res = await fetch(`${API_BASE}/passenger/profile`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<{
      success: boolean;
      profile: PassengerProfile;
      activeRide: Ride | null;
    }>(res);
  },

  async updatePassengerProfile(data: Partial<PassengerProfile>) {
    const res = await fetch(`${API_BASE}/passenger/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return handleResponse<{ success: boolean; profile: PassengerProfile }>(res);
  },

  async createRide(rideData: {
    pickupAddress: string;
    pickupLatitude: number;
    pickupLongitude: number;
    destinationAddress: string;
    destinationLatitude: number;
    destinationLongitude: number;
    vehicleType: string;
    paymentMethod: string;
  }) {
    const res = await fetch(`${API_BASE}/rides`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(rideData),
    });
    return handleResponse<{ success: boolean; ride: Ride; message: string }>(res);
  },

  async getPassengerRides() {
    const res = await fetch(`${API_BASE}/passenger/rides`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<{ success: boolean; rides: Ride[] }>(res);
  },

  async getRideById(id: number) {
    const res = await fetch(`${API_BASE}/rides/${id}`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<{ success: boolean; ride: Ride }>(res);
  },

  async cancelRide(id: number, reason?: string) {
    const res = await fetch(`${API_BASE}/rides/${id}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ reason }),
    });
    return handleResponse<{ success: boolean; ride: Ride; message: string }>(res);
  },

  async submitRideRating(rideId: number, score: number, comment?: string) {
    const res = await fetch(`${API_BASE}/rides/${rideId}/rating`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ score, comment }),
    });
    return handleResponse<{ success: boolean; message: string; rating: any }>(res);
  },

  // --------------------------------------------------------------------------
  // DRIVER
  // --------------------------------------------------------------------------
  async getDriverProfile() {
    const res = await fetch(`${API_BASE}/driver/profile`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<{
      success: boolean;
      driver: DriverProfile & {
        name: string;
        email: string;
        phone: string;
        avatar_url?: string;
        make?: string;
        model?: string;
        year?: number;
        color?: string;
        plate_number?: string;
        vehicle_type?: string;
        capacity?: number;
      };
      earnings: {
        total_earnings: number;
        today_earnings: number;
        week_earnings: number;
        month_earnings: number;
      };
    }>(res);
  },

  async toggleDriverAvailability(isOnline: boolean) {
    const res = await fetch(`${API_BASE}/driver/availability`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ isOnline }),
    });
    return handleResponse<{ success: boolean; isOnline: boolean; isAvailable: boolean }>(res);
  },

  async getDriverRideRequests() {
    const res = await fetch(`${API_BASE}/driver/rides/requests`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<{ success: boolean; requests: Ride[]; note?: string }>(res);
  },

  async getDriverActiveRide() {
    const res = await fetch(`${API_BASE}/driver/rides/active`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<{ success: boolean; activeRide: Ride | null }>(res);
  },

  async acceptRide(rideId: number) {
    const res = await fetch(`${API_BASE}/driver/rides/${rideId}/accept`, {
      method: 'POST',
      headers: { ...getAuthHeader() },
    });
    return handleResponse<{ success: boolean; ride: Ride; message: string }>(res);
  },

  async rejectRide(rideId: number) {
    const res = await fetch(`${API_BASE}/driver/rides/${rideId}/reject`, {
      method: 'POST',
      headers: { ...getAuthHeader() },
    });
    return handleResponse<{ success: boolean; message: string }>(res);
  },

  async arriveAtPickup(rideId: number) {
    const res = await fetch(`${API_BASE}/driver/rides/${rideId}/arrive`, {
      method: 'POST',
      headers: { ...getAuthHeader() },
    });
    return handleResponse<{ success: boolean; ride: Ride; message: string }>(res);
  },

  async startRide(rideId: number) {
    const res = await fetch(`${API_BASE}/driver/rides/${rideId}/start`, {
      method: 'POST',
      headers: { ...getAuthHeader() },
    });
    return handleResponse<{ success: boolean; ride: Ride; message: string }>(res);
  },

  async completeRide(rideId: number) {
    const res = await fetch(`${API_BASE}/driver/rides/${rideId}/complete`, {
      method: 'POST',
      headers: { ...getAuthHeader() },
    });
    return handleResponse<{
      success: boolean;
      message: string;
      data: { ride: Ride; earnings: number; finalFare: number };
    }>(res);
  },

  async updateDriverLocation(payload: {
    latitude: number;
    longitude: number;
    heading?: number;
    speedKmh?: number;
    activeRideId?: number;
  }) {
    const res = await fetch(`${API_BASE}/driver/location`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(payload),
    });
    return handleResponse<{ success: boolean; coordinates: { latitude: number; longitude: number } }>(res);
  },

  // --------------------------------------------------------------------------
  // ADMIN
  // --------------------------------------------------------------------------
  async getAdminDashboard() {
    const res = await fetch(`${API_BASE}/admin/dashboard`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<{
      success: boolean;
      stats: any;
      recentRides: any[];
    }>(res);
  },

  async getAdminUsers(role?: string, search?: string) {
    const params = new URLSearchParams();
    if (role) params.set('role', role);
    if (search) params.set('search', search);

    const res = await fetch(`${API_BASE}/admin/users?${params.toString()}`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<{ success: boolean; users: any[] }>(res);
  },

  async getAdminDrivers() {
    const res = await fetch(`${API_BASE}/admin/drivers`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<{ success: boolean; drivers: any[] }>(res);
  },

  async updateDriverVerification(driverId: number, verificationStatus: string) {
    const res = await fetch(`${API_BASE}/admin/drivers/${driverId}/verification`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ verificationStatus }),
    });
    return handleResponse<{ success: boolean; driver: any; message: string }>(res);
  },

  async getAdminRides(status?: string) {
    const params = new URLSearchParams();
    if (status) params.set('status', status);

    const res = await fetch(`${API_BASE}/admin/rides?${params.toString()}`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<{ success: boolean; rides: any[] }>(res);
  },

  async getAdminReports() {
    const res = await fetch(`${API_BASE}/admin/reports`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<{ success: boolean; reports: any }>(res);
  },
};
