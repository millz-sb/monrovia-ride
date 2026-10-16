import { Response } from 'express';
import { query } from '../db/database.ts';
import { AuthenticatedRequest } from '../middleware/auth.ts';

export async function getDashboard(req: AuthenticatedRequest, res: Response) {
  try {
    // Platform high-level KPIs
    const userStats = await query(`
      SELECT 
        COUNT(CASE WHEN role = 'passenger' THEN 1 END) AS total_passengers,
        COUNT(CASE WHEN role = 'driver' THEN 1 END) AS total_drivers,
        COUNT(*) AS total_users
      FROM users
    `);

    const driverStats = await query(`
      SELECT 
        COUNT(CASE WHEN verification_status = 'PENDING' THEN 1 END) AS pending_verifications,
        COUNT(CASE WHEN verification_status = 'VERIFIED' THEN 1 END) AS verified_drivers,
        COUNT(CASE WHEN is_online = TRUE THEN 1 END) AS online_drivers
      FROM driver_profiles
    `);

    const rideStats = await query(`
      SELECT 
        COUNT(CASE WHEN status IN ('requested', 'accepted', 'arrived', 'in_progress') THEN 1 END) AS active_rides,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) AS completed_rides,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) AS cancelled_rides,
        COUNT(*) AS total_rides
      FROM rides
    `);

    const financialStats = await query(`
      SELECT 
        COALESCE(SUM(amount_lrd), 0) AS gross_volume_lrd,
        COALESCE(SUM(platform_fee_lrd), 0) AS net_platform_revenue_lrd,
        COALESCE(SUM(driver_earnings_lrd), 0) AS total_payouts_lrd
      FROM payments
      WHERE payment_status = 'COMPLETED'
    `);

    // Recent 5 rides
    const recentRides = await query(`
      SELECT r.id, r.pickup_address, r.destination_address, r.status, r.estimated_fare_lrd, r.requested_at,
             p.name AS passenger_name, d.name AS driver_name
      FROM rides r
      JOIN users p ON p.id = r.passenger_id
      LEFT JOIN users d ON d.id = r.driver_id
      ORDER BY r.requested_at DESC
      LIMIT 6
    `);

    return res.json({
      success: true,
      stats: {
        ...userStats.rows[0],
        ...driverStats.rows[0],
        ...rideStats.rows[0],
        ...financialStats.rows[0],
      },
      recentRides: recentRides.rows,
    });
  } catch (error: any) {
    console.error('getDashboard error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Error fetching dashboard stats.' });
  }
}

export async function getUsers(req: AuthenticatedRequest, res: Response) {
  try {
    const { role, search } = req.query;
    let sql = `
      SELECT u.id, u.name, u.email, u.phone, u.role, u.is_active, u.created_at,
             pp.rating_average AS passenger_rating, pp.total_rides,
             dp.rating_average AS driver_rating, dp.verification_status, dp.total_trips, dp.total_earnings_lrd
      FROM users u
      LEFT JOIN passenger_profiles pp ON pp.user_id = u.id
      LEFT JOIN driver_profiles dp ON dp.user_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (role) {
      params.push(role);
      sql += ` AND u.role = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (LOWER(u.name) LIKE LOWER($${params.length}) OR LOWER(u.email) LIKE LOWER($${params.length}) OR u.phone LIKE $${params.length})`;
    }

    sql += ' ORDER BY u.created_at DESC';

    const usersRes = await query(sql, params);
    return res.json({ success: true, users: usersRes.rows });
  } catch (error: any) {
    console.error('getUsers error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Error fetching users.' });
  }
}

export async function getDrivers(req: AuthenticatedRequest, res: Response) {
  try {
    const driversRes = await query(`
      SELECT dp.*, u.name, u.email, u.phone, u.avatar_url, u.is_active,
             v.make, v.model, v.year, v.color, v.plate_number, v.vehicle_type
      FROM driver_profiles dp
      JOIN users u ON u.id = dp.user_id
      LEFT JOIN vehicles v ON v.driver_id = dp.id
      ORDER BY dp.created_at DESC
    `);

    return res.json({ success: true, drivers: driversRes.rows });
  } catch (error: any) {
    console.error('getDrivers error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Error fetching drivers.' });
  }
}

export async function updateDriverVerification(req: AuthenticatedRequest, res: Response) {
  try {
    const driverId = parseInt(req.params.id, 10);
    const { verificationStatus } = req.body;

    if (!['VERIFIED', 'PENDING', 'SUSPENDED', 'REJECTED'].includes(verificationStatus)) {
      return res.status(400).json({
        success: false,
        error: "Status must be 'VERIFIED', 'PENDING', 'SUSPENDED', or 'REJECTED'.",
      });
    }

    const updateRes = await query(
      `UPDATE driver_profiles
       SET verification_status = $1,
           is_online = CASE WHEN $1 = 'VERIFIED' THEN is_online ELSE FALSE END
       WHERE id = $2
       RETURNING *`,
      [verificationStatus, driverId]
    );

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Driver profile not found.' });
    }

    return res.json({
      success: true,
      message: `Driver status successfully updated to ${verificationStatus}.`,
      driver: updateRes.rows[0],
    });
  } catch (error: any) {
    console.error('updateDriverVerification error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Error updating driver verification.' });
  }
}

export async function getRides(req: AuthenticatedRequest, res: Response) {
  try {
    const { status, limit = 50 } = req.query;
    let sql = `
      SELECT r.*,
             p.name AS passenger_name, p.phone AS passenger_phone,
             d.name AS driver_name, d.phone AS driver_phone,
             v.make AS vehicle_make, v.model AS vehicle_model, v.plate_number AS vehicle_plate
      FROM rides r
      JOIN users p ON p.id = r.passenger_id
      LEFT JOIN users d ON d.id = r.driver_id
      LEFT JOIN driver_profiles dp ON dp.user_id = r.driver_id
      LEFT JOIN vehicles v ON v.driver_id = dp.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (status && status !== 'all') {
      params.push(status);
      sql += ` AND r.status = $${params.length}`;
    }

    params.push(Number(limit));
    sql += ` ORDER BY r.requested_at DESC LIMIT $${params.length}`;

    const ridesRes = await query(sql, params);
    return res.json({ success: true, rides: ridesRes.rows });
  } catch (error: any) {
    console.error('getRides error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Error fetching rides.' });
  }
}

export async function getReports(req: AuthenticatedRequest, res: Response) {
  try {
    // 1. Rides by vehicle type
    const byVehicleType = await query(`
      SELECT vehicle_type, COUNT(*) as count, COALESCE(SUM(final_fare_lrd), 0) as total_volume_lrd
      FROM rides
      WHERE status = 'completed'
      GROUP BY vehicle_type
    `);

    // 2. Payments by method
    const byPaymentMethod = await query(`
      SELECT payment_method, COUNT(*) as count, COALESCE(SUM(amount_lrd), 0) as total_amount_lrd
      FROM payments
      WHERE payment_status = 'COMPLETED'
      GROUP BY payment_method
    `);

    // 3. Top drivers
    const topDrivers = await query(`
      SELECT d.user_id, u.name, d.total_trips, d.total_earnings_lrd, d.rating_average, v.plate_number
      FROM driver_profiles d
      JOIN users u ON u.id = d.user_id
      LEFT JOIN vehicles v ON v.driver_id = d.id
      ORDER BY d.total_trips DESC
      LIMIT 5
    `);

    return res.json({
      success: true,
      reports: {
        byVehicleType: byVehicleType.rows,
        byPaymentMethod: byPaymentMethod.rows,
        topDrivers: topDrivers.rows,
      },
    });
  } catch (error: any) {
    console.error('getReports error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Error generating reports.' });
  }
}
