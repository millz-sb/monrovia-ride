# MONROVIA RIDE - Database & Architecture Documentation

## Overview
Monrovia Ride is a high-availability ride-hailing backend engineered specifically for Monrovia, Republic of Liberia. It supports real-time dispatching, role-based security (passenger, driver, administrator), fare estimation in Liberian Dollars (LRD), concurrent ride matching, and trip telemetry.

## Database Technologies
- **Primary Engine**: PostgreSQL 14+ (compatible with Cloud SQL, Neon, Supabase, Amazon RDS)
- **Application Runtime**: Embedded in-memory PostgreSQL engine (`pg-mem`) for instantaneous development, zero-configuration local evaluation, and test suites.

## Database Tables
1. `users`: Authentication credentials, phone numbers, roles, account status.
2. `passenger_profiles`: Preferred payment method (Cash, Lonestar MTN MoMo, Orange Money), emergency contacts, ratings.
3. `driver_profiles`: Verification status, license details, online/available flags, ratings, cumulative earnings in LRD, last known GPS coordinates.
4. `vehicles`: Driver's vehicle details (Keh-Keh, Standard Taxi, Executive SUV), registration plates, capacity.
5. `rides`: Full trip lifecycle (`requested`, `accepted`, `arrived`, `in_progress`, `completed`, `cancelled`), pickup & destination coordinates, distance, estimated and final fares in LRD.
6. `ride_status_history`: Audit trail of all state transitions with timestamps and notes.
7. `driver_locations`: Real-time driver telemetry records (latitude, longitude, speed, heading).
8. `payments`: Payment settlement records, platform commission, driver net earnings, mobile money transaction references.
9. `ratings`: 1-5 star ratings and written reviews between passengers and drivers.
10. `notifications`: In-app push notifications for ride assignments, arrivals, and receipts.

## Seed Test Accounts
Password for all demo accounts: `Password123!`

| Role | Name | Email | Phone |
| :--- | :--- | :--- | :--- |
| **Admin** | Victoria Weah | `admin@monroviaride.lr` | `+231-77-000-0001` |
| **Passenger** | Korlu Flomo | `passenger@monrovia.lr` | `+231-77-555-1234` |
| **Driver 1 (Standard)** | Emmanuel Tamba | `driver@monrovia.lr` | `+231-88-555-4321` |
| **Driver 2 (Keh-Keh)** | Joseph Kollie | `driver2@monrovia.lr` | `+231-77-555-8899` |
| **Pending Driver** | Mamadee Kamara | `applicant@monrovia.lr` | `+231-88-999-7711` |

## PostgreSQL Installation & Execution
```bash
# Connect to PostgreSQL instance
psql -U postgres -d monrovia_ride -f database/schema.sql
psql -U postgres -d monrovia_ride -f database/seed.sql
```
