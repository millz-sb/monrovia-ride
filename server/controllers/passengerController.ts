import { Response } from 'express';
import { query, transaction } from '../db/database.ts';
import { AuthenticatedRequest } from '../middleware/auth.ts';
import { calculateDistanceKm, estimateDurationMins, calculateFare } from '../services/fareService.ts';

export async function getProfile(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.id;
    const profileRes = await query(
      `SELECT p.*, u.name, u.email, u.phone, u.avatar_url
       FROM passenger_profiles p
       JOIN users u ON u.id = p.user_id
       WHERE p.user_id = $1`,
      [userId]
    );

    if (profileRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Passenger profile not found.' });
    }

    // Check for any currently active ride
    const activeRideRes = await query(
      `SELECT r.*, 
              d.name AS driver_name, d.phone AS driver_phone, d.avatar_url AS driver_avatar,
              dp.rating_average AS driver_rating, dp.current_latitude AS driver_lat, dp.current_longitude AS driver_lng,
              v.make AS vehicle_make, v.model AS vehicle_model, v.color AS vehicle_color, v.plate_number AS vehicle_plate
       FROM rides r
       LEFT JOIN users d ON d.id = r.driver_id
       LEFT JOIN driver_profiles dp ON dp.user_id = r.driver_id
       LEFT JOIN vehicles v ON v.driver_id = dp.id
       WHERE r.passenger_id = $1 AND r.status IN ('requested', 'accepted', 'arrived', 'in_progress')
       ORDER BY r.requested_at DESC
       LIMIT 1`,
      [userId]
    );

    return res.json({
      success: true,
      profile: profileRes.rows[0],
      activeRide: activeRideRes.rows[0] || null,
    });
  } catch (error: any) {
    console.error('getProfile error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Error fetching profile.' });
  }
}

export async function updateProfile(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.id;
    const {
      preferredPaymentMethod,
      emergencyContactName,
      emergencyContactPhone,
      homeAddress,
      workAddress,
    } = req.body;

    const updateRes = await query(
      `UPDATE passenger_profiles
       SET preferred_payment_method = COALESCE($1, preferred_payment_method),
           emergency_contact_name = COALESCE($2, emergency_contact_name),
           emergency_contact_phone = COALESCE($3, emergency_contact_phone),
           home_address = COALESCE($4, home_address),
           work_address = COALESCE($5, work_address)
       WHERE user_id = $6
       RETURNING *`,
      [
        preferredPaymentMethod,
        emergencyContactName,
        emergencyContactPhone,
        homeAddress,
        workAddress,
        userId,
      ]
    );

    return res.json({
      success: true,
      message: 'Profile updated successfully.',
      profile: updateRes.rows[0],
    });
  } catch (error: any) {
    console.error('updateProfile error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Error updating profile.' });
  }
}

export async function createRide(req: AuthenticatedRequest, res: Response) {
  try {
    const passengerId = req.user!.id;
    const {
      pickupAddress,
      pickupLatitude,
      pickupLongitude,
      destinationAddress,
      destinationLatitude,
      destinationLongitude,
      vehicleType = 'STANDARD',
      paymentMethod = 'CASH',
    } = req.body;

    if (
      !pickupAddress ||
      pickupLatitude === undefined ||
      pickupLongitude === undefined ||
      !destinationAddress ||
      destinationLatitude === undefined ||
      destinationLongitude === undefined
    ) {
      return res.status(400).json({
        success: false,
        error: 'Pickup and destination addresses with valid coordinates are required.',
      });
    }

    // Check if passenger already has an ongoing ride
    const existingActive = await query(
      `SELECT id, status FROM rides
       WHERE passenger_id = $1 AND status IN ('requested', 'accepted', 'arrived', 'in_progress')`,
      [passengerId]
    );

    if (existingActive.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'You already have an active ride request in progress. Please complete or cancel it first.',
        activeRideId: existingActive.rows[0].id,
      });
    }

    // Calculate real distance & duration
    const distanceKm = calculateDistanceKm(
      Number(pickupLatitude),
      Number(pickupLongitude),
      Number(destinationLatitude),
      Number(destinationLongitude)
    );
    const durationMins = estimateDurationMins(distanceKm);
    const estimatedFareLrd = calculateFare(vehicleType, distanceKm);

    const newRide = await transaction(async (client) => {
      const rideRes = await client.query(
        `INSERT INTO rides (
          passenger_id, vehicle_type,
          pickup_address, pickup_latitude, pickup_longitude,
          destination_address, destination_latitude, destination_longitude,
          distance_km, estimated_duration_mins, estimated_fare_lrd,
          status, payment_method, payment_status
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'requested', $12, 'PENDING'
        ) RETURNING *`,
        [
          passengerId,
          vehicleType,
          pickupAddress,
          pickupLatitude,
          pickupLongitude,
          destinationAddress,
          destinationLatitude,
          destinationLongitude,
          distanceKm,
          durationMins,
          estimatedFareLrd,
          paymentMethod,
        ]
      );

      const ride = rideRes.rows[0];

      // Record in status history
      await client.query(
        `INSERT INTO ride_status_history (ride_id, previous_status, new_status, changed_by_user_id, notes)
         VALUES ($1, NULL, 'requested', $2, 'Ride requested by passenger in Monrovia')`,
        [ride.id, passengerId]
      );

      return ride;
    });

    return res.status(201).json({
      success: true,
      message: 'Ride requested successfully. Searching for nearby Monrovia drivers...',
      ride: newRide,
    });
  } catch (error: any) {
    console.error('createRide error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Error booking ride.' });
  }
}

export async function getPassengerRides(req: AuthenticatedRequest, res: Response) {
  try {
    const passengerId = req.user!.id;
    const ridesRes = await query(
      `SELECT r.*,
              d.name AS driver_name, d.phone AS driver_phone,
              v.make AS vehicle_make, v.model AS vehicle_model, v.plate_number AS vehicle_plate,
              rt.score AS rating_score, rt.comment AS rating_comment
       FROM rides r
       LEFT JOIN users d ON d.id = r.driver_id
       LEFT JOIN driver_profiles dp ON dp.user_id = r.driver_id
       LEFT JOIN vehicles v ON v.driver_id = dp.id
       LEFT JOIN ratings rt ON rt.ride_id = r.id
       WHERE r.passenger_id = $1
       ORDER BY r.requested_at DESC`,
      [passengerId]
    );

    return res.json({
      success: true,
      rides: ridesRes.rows,
    });
  } catch (error: any) {
    console.error('getPassengerRides error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Error fetching ride history.' });
  }
}

export async function getRideById(req: AuthenticatedRequest, res: Response) {
  try {
    const rideId = parseInt(req.params.id, 10);
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const rideRes = await query(
      `SELECT r.*,
              p.name AS passenger_name, p.phone AS passenger_phone, p.avatar_url AS passenger_avatar,
              d.name AS driver_name, d.phone AS driver_phone, d.avatar_url AS driver_avatar,
              dp.rating_average AS driver_rating, dp.current_latitude AS driver_lat, dp.current_longitude AS driver_lng,
              v.make AS vehicle_make, v.model AS vehicle_model, v.color AS vehicle_color, v.plate_number AS vehicle_plate,
              rt.score AS rating_score, rt.comment AS rating_comment
       FROM rides r
       JOIN users p ON p.id = r.passenger_id
       LEFT JOIN users d ON d.id = r.driver_id
       LEFT JOIN driver_profiles dp ON dp.user_id = r.driver_id
       LEFT JOIN vehicles v ON v.driver_id = dp.id
       LEFT JOIN ratings rt ON rt.ride_id = r.id
       WHERE r.id = $1`,
      [rideId]
    );

    if (rideRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Ride not found.' });
    }

    const ride = rideRes.rows[0];

    // Authorization check: passenger, driver, or admin
    if (userRole !== 'admin' && ride.passenger_id !== userId && ride.driver_id !== userId) {
      return res.status(403).json({ success: false, error: 'Access denied to this ride.' });
    }

    return res.json({
      success: true,
      ride,
    });
  } catch (error: any) {
    console.error('getRideById error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Error fetching ride.' });
  }
}

export async function cancelRide(req: AuthenticatedRequest, res: Response) {
  try {
    const rideId = parseInt(req.params.id, 10);
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const { reason = 'Cancelled by passenger' } = req.body;

    const updated = await transaction(async (client) => {
      const checkRes = await client.query('SELECT * FROM rides WHERE id = $1 FOR UPDATE', [rideId]);
      if (checkRes.rows.length === 0) {
        throw new Error('Ride not found.');
      }
      const ride = checkRes.rows[0];

      if (userRole !== 'admin' && ride.passenger_id !== userId && ride.driver_id !== userId) {
        throw new Error('Access denied to cancel this ride.');
      }

      if (['completed', 'cancelled'].includes(ride.status)) {
        throw new Error(`Cannot cancel ride. Current status is already '${ride.status}'.`);
      }

      const updateRes = await client.query(
        `UPDATE rides
         SET status = 'cancelled',
             cancellation_reason = $1,
             cancelled_by = $2,
             cancelled_at = CURRENT_TIMESTAMP
         WHERE id = $3
         RETURNING *`,
        [reason, userRole, rideId]
      );

      // Record in history
      await client.query(
        `INSERT INTO ride_status_history (ride_id, previous_status, new_status, changed_by_user_id, notes)
         VALUES ($1, $2, 'cancelled', $3, $4)`,
        [rideId, ride.status, userId, `Ride cancelled: ${reason}`]
      );

      // If a driver was assigned, free them up
      if (ride.driver_id) {
        await client.query(
          `UPDATE driver_profiles SET is_available = TRUE WHERE user_id = $1`,
          [ride.driver_id]
        );
      }

      return updateRes.rows[0];
    });

    return res.json({
      success: true,
      message: 'Ride cancelled successfully.',
      ride: updated,
    });
  } catch (error: any) {
    console.error('cancelRide error:', error);
    return res.status(400).json({ success: false, error: error.message || 'Error cancelling ride.' });
  }
}

export async function rateRide(req: AuthenticatedRequest, res: Response) {
  try {
    const rideId = parseInt(req.params.id, 10);
    const passengerId = req.user!.id;
    const { score, comment } = req.body;

    if (!score || score < 1 || score > 5) {
      return res.status(400).json({
        success: false,
        error: 'A rating score between 1 and 5 is required.',
      });
    }

    const result = await transaction(async (client) => {
      const rideRes = await client.query('SELECT * FROM rides WHERE id = $1', [rideId]);
      if (rideRes.rows.length === 0) {
        throw new Error('Ride not found.');
      }
      const ride = rideRes.rows[0];

      if (ride.passenger_id !== passengerId) {
        throw new Error('Only the passenger who booked this ride can submit a rating.');
      }

      if (ride.status !== 'completed') {
        throw new Error('Only completed rides can be rated.');
      }

      if (!ride.driver_id) {
        throw new Error('No driver was assigned to this ride.');
      }

      // Check if already rated
      const existing = await client.query('SELECT id FROM ratings WHERE ride_id = $1', [rideId]);
      if (existing.rows.length > 0) {
        throw new Error('This ride has already been rated.');
      }

      // Insert rating
      const ratingRes = await client.query(
        `INSERT INTO ratings (ride_id, passenger_id, driver_id, score, comment)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [rideId, passengerId, ride.driver_id, Math.round(score), comment || null]
      );

      // Recalculate driver's average rating
      const avgRes = await client.query(
        `SELECT ROUND(AVG(score), 2) as avg_score, COUNT(*) as count
         FROM ratings WHERE driver_id = $1`,
        [ride.driver_id]
      );

      if (avgRes.rows.length > 0 && avgRes.rows[0].avg_score) {
        await client.query(
          `UPDATE driver_profiles
           SET rating_average = $1
           WHERE user_id = $2`,
          [avgRes.rows[0].avg_score, ride.driver_id]
        );
      }

      return ratingRes.rows[0];
    });

    return res.status(201).json({
      success: true,
      message: 'Thank you! Your feedback has been recorded.',
      rating: result,
    });
  } catch (error: any) {
    console.error('rateRide error:', error);
    return res.status(400).json({ success: false, error: error.message || 'Error rating ride.' });
  }
}
