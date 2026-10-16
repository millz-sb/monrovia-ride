import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  jwtSecret: process.env.JWT_SECRET || 'monrovia_ride_jwt_secure_secret_2026_liberia',
  jwtExpiresIn: '7d',
  environment: process.env.NODE_ENV || 'development',
  
  // Platform Commission
  platformFeePercent: 0.15, // 15% platform fee, 85% driver earnings
  
  // Monrovia Ride Fare Structure (in Liberian Dollars - LRD)
  fares: {
    KEH_KEH: {
      name: 'Keh-Keh (Tricycle)',
      description: 'Quick & affordable auto-rickshaw for nimble Monrovia traffic',
      baseFare: 150.00,
      perKmRate: 40.00,
      minFare: 200.00,
      capacity: 3,
      icon: 'zap',
    },
    STANDARD: {
      name: 'Standard Taxi',
      description: 'Comfortable air-conditioned sedan for everyday rides',
      baseFare: 300.00,
      perKmRate: 80.00,
      minFare: 400.00,
      capacity: 4,
      icon: 'car',
    },
    EXECUTIVE_SUV: {
      name: 'Executive SUV',
      description: 'High-clearance SUV for coastal roads, Robertsfield highway & VIP comfort',
      baseFare: 600.00,
      perKmRate: 140.00,
      minFare: 800.00,
      capacity: 4,
      icon: 'shield',
    },
  },
  
  // Monrovia City Center Default Coordinates
  monroviaCenter: {
    latitude: 6.3005,
    longitude: -10.7969,
  },
};
