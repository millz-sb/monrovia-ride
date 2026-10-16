import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query, transaction } from '../db/database.ts';
import { config } from '../config/config.ts';
import { AuthenticatedRequest } from '../middleware/auth.ts';

export async function register(req: Request, res: Response) {
  try {
    const {
      name,
      email,
      phone,
      password,
      role = 'passenger',
      // Driver specific
      licenseNumber,
      vehicleMake,
      vehicleModel,
      vehicleYear,
      vehicleColor,
      vehiclePlate,
      vehicleType = 'STANDARD',
    } = req.body;

    // Validation
    if (!name || !email || !phone || !password) {
      return res.status(400).json({
        success: false,
        error: 'Name, email, phone number, and password are required.',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long.',
      });
    }

    // Security: Disallow self-registering as admin
    if (role === 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Administrator accounts cannot be created via public registration.',
      });
    }

    if (!['passenger', 'driver'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: "Invalid role specified. Must be 'passenger' or 'driver'.",
      });
    }

    // Check existing email or phone
    const existingUser = await query(
      'SELECT id, email, phone FROM users WHERE email = $1 OR phone = $2',
      [email.toLowerCase().trim(), phone.trim()]
    );

    if (existingUser.rows.length > 0) {
      const match = existingUser.rows[0];
      if (match.email.toLowerCase() === email.toLowerCase().trim()) {
        return res.status(409).json({
          success: false,
          error: 'An account with this email address already exists.',
        });
      }
      return res.status(409).json({
        success: false,
        error: 'An account with this phone number already exists.',
      });
    }

    // Password hash
    const passwordHash = await bcrypt.hash(password, 10);

    // Atomic creation
    const newUser = await transaction(async (client) => {
      // 1. Insert User
      const userRes = await client.query(
        `INSERT INTO users (name, email, phone, password_hash, role, is_active)
         VALUES ($1, $2, $3, $4, $5, TRUE)
         RETURNING id, name, email, phone, role, created_at`,
        [name.trim(), email.toLowerCase().trim(), phone.trim(), passwordHash, role]
      );
      const user = userRes.rows[0];

      if (role === 'passenger') {
        // 2. Insert Passenger Profile
        await client.query(
          `INSERT INTO passenger_profiles (user_id, preferred_payment_method)
           VALUES ($1, 'CASH')`,
          [user.id]
        );
      } else if (role === 'driver') {
        // 2. Insert Driver Profile
        const driverRes = await client.query(
          `INSERT INTO driver_profiles (user_id, license_number, verification_status, is_online, is_available)
           VALUES ($1, $2, 'VERIFIED', TRUE, TRUE)
           RETURNING id`,
          [user.id, licenseNumber || `LR-DL-${Date.now().toString().slice(-6)}`]
        );
        const driverProfile = driverRes.rows[0];

        // 3. Insert Vehicle
        await client.query(
          `INSERT INTO vehicles (driver_id, make, model, year, color, plate_number, vehicle_type, capacity)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            driverProfile.id,
            vehicleMake || 'Toyota',
            vehicleModel || (vehicleType === 'KEH_KEH' ? 'Bajaj RE' : 'Corolla'),
            parseInt(vehicleYear || '2018', 10),
            vehicleColor || 'Yellow & Blue',
            vehiclePlate || `ML-${Math.floor(1000 + Math.random() * 9000)}-TX`,
            vehicleType,
            vehicleType === 'KEH_KEH' ? 3 : 4,
          ]
        );
      }

      return user;
    });

    // Generate JWT
    const token = jwt.sign(
      {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
        name: newUser.name,
      },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role,
      },
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Server error during registration.',
    });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email or phone number and password are required.',
      });
    }

    const trimmedId = identifier.trim().toLowerCase();

    // Find by email or phone
    const userRes = await query(
      `SELECT id, name, email, phone, password_hash, role, avatar_url, is_active
       FROM users
       WHERE LOWER(email) = $1 OR phone = $2`,
      [trimmedId, identifier.trim()]
    );

    if (userRes.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials. Please check your email/phone and password.',
      });
    }

    const user = userRes.rows[0];

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        error: 'This account has been deactivated. Please contact support.',
      });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials. Please check your password.',
      });
    }

    // Fetch role details
    let profileData: any = null;
    let vehicleData: any = null;

    if (user.role === 'passenger') {
      const pRes = await query(
        'SELECT * FROM passenger_profiles WHERE user_id = $1',
        [user.id]
      );
      profileData = pRes.rows[0] || null;
    } else if (user.role === 'driver') {
      const dRes = await query(
        `SELECT d.*, v.make, v.model, v.year, v.color, v.plate_number, v.vehicle_type
         FROM driver_profiles d
         LEFT JOIN vehicles v ON v.driver_id = d.id
         WHERE d.user_id = $1`,
        [user.id]
      );
      if (dRes.rows.length > 0) {
        profileData = dRes.rows[0];
        vehicleData = {
          make: profileData.make,
          model: profileData.model,
          year: profileData.year,
          color: profileData.color,
          plateNumber: profileData.plate_number,
          vehicleType: profileData.vehicle_type,
        };
      }
    }

    // Generate JWT
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
      },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    return res.json({
      success: true,
      message: 'Logged in successfully.',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatarUrl: user.avatar_url,
      },
      profile: profileData,
      vehicle: vehicleData,
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Server error during login.',
    });
  }
}

export async function getMe(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized.' });
    }

    const userRes = await query(
      `SELECT id, name, email, phone, role, avatar_url, created_at
       FROM users WHERE id = $1`,
      [req.user.id]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    const user = userRes.rows[0];
    let profileData: any = null;
    let vehicleData: any = null;

    if (user.role === 'passenger') {
      const pRes = await query(
        'SELECT * FROM passenger_profiles WHERE user_id = $1',
        [user.id]
      );
      profileData = pRes.rows[0] || null;
    } else if (user.role === 'driver') {
      const dRes = await query(
        `SELECT d.*, v.make, v.model, v.year, v.color, v.plate_number, v.vehicle_type
         FROM driver_profiles d
         LEFT JOIN vehicles v ON v.driver_id = d.id
         WHERE d.user_id = $1`,
        [user.id]
      );
      if (dRes.rows.length > 0) {
        profileData = dRes.rows[0];
        vehicleData = {
          make: profileData.make,
          model: profileData.model,
          year: profileData.year,
          color: profileData.color,
          plateNumber: profileData.plate_number,
          vehicleType: profileData.vehicle_type,
        };
      }
    }

    return res.json({
      success: true,
      user,
      profile: profileData,
      vehicle: vehicleData,
    });
  } catch (error: any) {
    console.error('GetMe error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Server error fetching user.',
    });
  }
}
