-- ============================================================================
-- MONROVIA RIDE - Development Seed Data
-- Location: Monrovia, Liberia
-- Password for all seed users: Password123!
-- ============================================================================

-- Insert Users
-- Bcrypt hash for 'Password123!'
INSERT INTO users (id, name, email, phone, password_hash, role, avatar_url, is_active) VALUES
(1, 'Victoria Weah', 'admin@monroviaride.lr', '+231-77-000-0001', '$2a$10$bYg6O9Hq8Yy7iJjE5sYq2uJ3gP9oT1l3vW5sZ7aB9cD1eF3gH5iJu', 'admin', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150', TRUE),
(2, 'Korlu Flomo', 'passenger@monrovia.lr', '+231-77-555-1234', '$2a$10$bYg6O9Hq8Yy7iJjE5sYq2uJ3gP9oT1l3vW5sZ7aB9cD1eF3gH5iJu', 'passenger', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', TRUE),
(3, 'Emmanuel Tamba', 'driver@monrovia.lr', '+231-88-555-4321', '$2a$10$bYg6O9Hq8Yy7iJjE5sYq2uJ3gP9oT1l3vW5sZ7aB9cD1eF3gH5iJu', 'driver', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', TRUE),
(4, 'Joseph Kollie', 'driver2@monrovia.lr', '+231-77-555-8899', '$2a$10$bYg6O9Hq8Yy7iJjE5sYq2uJ3gP9oT1l3vW5sZ7aB9cD1eF3gH5iJu', 'driver', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', TRUE),
(5, 'Mamadee Kamara', 'applicant@monrovia.lr', '+231-88-999-7711', '$2a$10$bYg6O9Hq8Yy7iJjE5sYq2uJ3gP9oT1l3vW5sZ7aB9cD1eF3gH5iJu', 'driver', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', TRUE);

-- Insert Passenger Profiles
INSERT INTO passenger_profiles (id, user_id, preferred_payment_method, emergency_contact_name, emergency_contact_phone, home_address, work_address, rating_average, total_rides) VALUES
(1, 2, 'LONESTAR_MTN_MOMO', 'Sando Flomo', '+231-77-555-9999', 'Tubman Boulevard, 12th Street Sinkor', 'Broad Street, Central Monrovia', 4.95, 14);

-- Insert Driver Profiles
INSERT INTO driver_profiles (id, user_id, license_number, license_expiry_date, verification_status, is_online, is_available, rating_average, total_trips, total_earnings_lrd, current_latitude, current_longitude, last_location_update) VALUES
(1, 3, 'LR-DL-2024-88319', '2028-11-30', 'VERIFIED', TRUE, TRUE, 4.92, 142, 68450.00, 6.3050, -10.7980, CURRENT_TIMESTAMP),
(2, 4, 'LR-DL-2023-44102', '2027-06-15', 'VERIFIED', TRUE, TRUE, 4.88, 89, 41200.00, 6.2890, -10.7650, CURRENT_TIMESTAMP),
(3, 5, 'LR-DL-2025-11904', '2029-01-20', 'PENDING', FALSE, TRUE, 5.00, 0, 0.00, 6.3150, -10.8040, CURRENT_TIMESTAMP);

-- Insert Vehicles
INSERT INTO vehicles (id, driver_id, make, model, year, color, plate_number, vehicle_type, capacity, inspection_valid_until, insurance_policy_number) VALUES
(1, 1, 'Toyota', 'Corolla Matrix', 2017, 'Yellow & Navy', 'ML-1024-TX', 'STANDARD', 4, '2027-05-01', 'NIC-LR-892401'),
(2, 2, 'Bajaj', 'RE 4-Stroke', 2022, 'Bright Yellow', 'RL-552-KK', 'KEH_KEH', 3, '2027-08-15', 'ALLIANZ-LR-33109'),
(3, 3, 'Toyota', 'RAV4 Limited', 2019, 'Midnight Blue', 'ML-8890-TX', 'EXECUTIVE_SUV', 4, '2027-12-01', 'NIC-LR-992384');

-- Insert Sample Past Rides
INSERT INTO rides (
    id, passenger_id, driver_id, vehicle_type,
    pickup_address, pickup_latitude, pickup_longitude,
    destination_address, destination_latitude, destination_longitude,
    distance_km, estimated_duration_mins,
    estimated_fare_lrd, final_fare_lrd,
    status, payment_method, payment_status,
    requested_at, completed_at
) VALUES
(1, 2, 3, 'STANDARD',
 'Boulevard Palace, Sinkor Tubman Blvd', 6.2925, -10.7780,
 'Broad Street & Randall St, Central Monrovia', 6.3135, -10.8065,
 4.8, 16,
 684.00, 684.00,
 'completed', 'LONESTAR_MTN_MOMO', 'PAID',
 CURRENT_TIMESTAMP - INTERVAL '3 hour', CURRENT_TIMESTAMP - INTERVAL '2 hour 40 minute'),
(2, 2, 4, 'KEH_KEH',
 'Catholic Hospital Junction, Congo Town', 6.2750, -10.7420,
 'Paynesville Red Light Market', 6.2710, -10.7100,
 4.1, 14,
 314.00, 314.00,
 'completed', 'CASH', 'PAID',
 CURRENT_TIMESTAMP - INTERVAL '1 day', CURRENT_TIMESTAMP - INTERVAL '23 hour 45 minute');

-- Insert Sample Rating
INSERT INTO ratings (id, ride_id, passenger_id, driver_id, score, comment) VALUES
(1, 1, 2, 3, 5, 'Emmanuel was extremely polite, safe driving around Tubman Blvd traffic, clean AC car. Highly recommended!');

-- Insert Sample Payments
INSERT INTO payments (id, ride_id, passenger_id, driver_id, amount_lrd, platform_fee_lrd, driver_earnings_lrd, payment_method, payment_status, transaction_reference) VALUES
(1, 1, 2, 3, 684.00, 102.60, 581.40, 'LONESTAR_MTN_MOMO', 'COMPLETED', 'LR-MOMO-99214-X8'),
(2, 2, 2, 4, 314.00, 47.10, 266.90, 'CASH', 'COMPLETED', 'CASH-SETTLED');

-- End of seed data
