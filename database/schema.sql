-- ============================================================================
-- MONROVIA RIDE - Relational PostgreSQL Database Schema
-- Location: Monrovia, Republic of Liberia
-- Currency: Liberian Dollar (LRD)
-- ============================================================================

-- Clean up existing tables in reverse dependency order
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS ratings CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS driver_locations CASCADE;
DROP TABLE IF EXISTS ride_status_history CASCADE;
DROP TABLE IF EXISTS rides CASCADE;
DROP TABLE IF EXISTS vehicles CASCADE;
DROP TABLE IF EXISTS driver_profiles CASCADE;
DROP TABLE IF EXISTS passenger_profiles CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 1. USERS TABLE
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(160) NOT NULL UNIQUE,
    phone VARCHAR(40) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('passenger', 'driver', 'admin')),
    avatar_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_role ON users(role);

-- 2. PASSENGER PROFILES
CREATE TABLE passenger_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    preferred_payment_method VARCHAR(30) DEFAULT 'CASH' CHECK (preferred_payment_method IN ('CASH', 'LONESTAR_MTN_MOMO', 'ORANGE_MONEY')),
    emergency_contact_name VARCHAR(120),
    emergency_contact_phone VARCHAR(40),
    home_address TEXT,
    work_address TEXT,
    rating_average NUMERIC(3, 2) DEFAULT 5.00,
    total_rides INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. DRIVER PROFILES
CREATE TABLE driver_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    license_number VARCHAR(60) NOT NULL UNIQUE,
    license_expiry_date DATE,
    verification_status VARCHAR(20) NOT NULL DEFAULT 'VERIFIED' CHECK (verification_status IN ('PENDING', 'VERIFIED', 'SUSPENDED', 'REJECTED')),
    is_online BOOLEAN NOT NULL DEFAULT FALSE,
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    rating_average NUMERIC(3, 2) DEFAULT 4.90,
    total_trips INTEGER DEFAULT 0,
    total_earnings_lrd NUMERIC(12, 2) DEFAULT 0.00,
    current_latitude NUMERIC(10, 7),
    current_longitude NUMERIC(10, 7),
    last_location_update TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_driver_availability ON driver_profiles(is_online, is_available, verification_status);

-- 4. VEHICLES TABLE
CREATE TABLE vehicles (
    id SERIAL PRIMARY KEY,
    driver_id INTEGER NOT NULL REFERENCES driver_profiles(id) ON DELETE CASCADE UNIQUE,
    make VARCHAR(50) NOT NULL,
    model VARCHAR(50) NOT NULL,
    year INTEGER NOT NULL,
    color VARCHAR(30) NOT NULL,
    plate_number VARCHAR(30) NOT NULL UNIQUE,
    vehicle_type VARCHAR(30) NOT NULL DEFAULT 'STANDARD' CHECK (vehicle_type IN ('KEH_KEH', 'STANDARD', 'EXECUTIVE_SUV')),
    capacity INTEGER NOT NULL DEFAULT 4,
    inspection_valid_until DATE,
    insurance_policy_number VARCHAR(60),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. RIDES TABLE
CREATE TABLE rides (
    id SERIAL PRIMARY KEY,
    passenger_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    driver_id INTEGER REFERENCES users(id) ON DELETE RESTRICT,
    vehicle_type VARCHAR(30) NOT NULL DEFAULT 'STANDARD' CHECK (vehicle_type IN ('KEH_KEH', 'STANDARD', 'EXECUTIVE_SUV')),
    
    pickup_address TEXT NOT NULL,
    pickup_latitude NUMERIC(10, 7) NOT NULL,
    pickup_longitude NUMERIC(10, 7) NOT NULL,
    
    destination_address TEXT NOT NULL,
    destination_latitude NUMERIC(10, 7) NOT NULL,
    destination_longitude NUMERIC(10, 7) NOT NULL,
    
    distance_km NUMERIC(6, 2) NOT NULL,
    estimated_duration_mins INTEGER NOT NULL,
    
    estimated_fare_lrd NUMERIC(10, 2) NOT NULL,
    final_fare_lrd NUMERIC(10, 2),
    
    status VARCHAR(30) NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'accepted', 'arrived', 'in_progress', 'completed', 'cancelled')),
    cancellation_reason TEXT,
    cancelled_by VARCHAR(20) CHECK (cancelled_by IS NULL OR cancelled_by IN ('passenger', 'driver', 'admin', 'system')),
    
    payment_method VARCHAR(30) NOT NULL DEFAULT 'CASH' CHECK (payment_method IN ('CASH', 'LONESTAR_MTN_MOMO', 'ORANGE_MONEY')),
    payment_status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (payment_status IN ('PENDING', 'PAID', 'FAILED', 'REFUNDED')),
    
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    accepted_at TIMESTAMP WITH TIME ZONE,
    arrived_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_rides_passenger ON rides(passenger_id);
CREATE INDEX idx_rides_driver ON rides(driver_id);
CREATE INDEX idx_rides_status ON rides(status);
CREATE INDEX idx_rides_created ON rides(requested_at DESC);

-- 6. RIDE STATUS HISTORY
CREATE TABLE ride_status_history (
    id SERIAL PRIMARY KEY,
    ride_id INTEGER NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
    previous_status VARCHAR(30),
    new_status VARCHAR(30) NOT NULL,
    changed_by_user_id INTEGER REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_status_history_ride ON ride_status_history(ride_id);

-- 7. DRIVER LOCATIONS TELEMETRY
CREATE TABLE driver_locations (
    id SERIAL PRIMARY KEY,
    driver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    latitude NUMERIC(10, 7) NOT NULL,
    longitude NUMERIC(10, 7) NOT NULL,
    heading NUMERIC(5, 2),
    speed_kmh NUMERIC(5, 2),
    active_ride_id INTEGER REFERENCES rides(id) ON DELETE SET NULL,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_driver_locations_driver ON driver_locations(driver_id, recorded_at DESC);

-- 8. PAYMENTS TABLE
CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    ride_id INTEGER NOT NULL REFERENCES rides(id) ON DELETE RESTRICT,
    passenger_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    driver_id INTEGER REFERENCES users(id) ON DELETE RESTRICT,
    amount_lrd NUMERIC(10, 2) NOT NULL,
    platform_fee_lrd NUMERIC(10, 2) NOT NULL,
    driver_earnings_lrd NUMERIC(10, 2) NOT NULL,
    payment_method VARCHAR(30) NOT NULL CHECK (payment_method IN ('CASH', 'LONESTAR_MTN_MOMO', 'ORANGE_MONEY')),
    payment_status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (payment_status IN ('PENDING', 'COMPLETED', 'FAILED')),
    transaction_reference VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. RATINGS AND REVIEWS
CREATE TABLE ratings (
    id SERIAL PRIMARY KEY,
    ride_id INTEGER NOT NULL REFERENCES rides(id) ON DELETE CASCADE UNIQUE,
    passenger_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    driver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    score INTEGER NOT NULL CHECK (score >= 1 AND score <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. NOTIFICATIONS
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(160) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(40) NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    ride_id INTEGER REFERENCES rides(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read, created_at DESC);
