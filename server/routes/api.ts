import { Router } from 'express';
import * as authController from '../controllers/authController.ts';
import * as passengerController from '../controllers/passengerController.ts';
import * as driverController from '../controllers/driverController.ts';
import * as adminController from '../controllers/adminController.ts';
import { authenticateToken, requireRole } from '../middleware/auth.ts';
import { getRouteEstimate } from '../services/fareService.ts';
import { config } from '../config/config.ts';

const router = Router();

// ============================================================================
// SYSTEM & FARES
// ============================================================================
router.get('/health', (req, res) => {
  res.json({
    status: 'online',
    app: 'MONROVIA RIDE API',
    region: 'Monrovia, Liberia',
    timestamp: new Date().toISOString(),
  });
});

router.get('/fares/config', (req, res) => {
  res.json({
    success: true,
    fares: config.fares,
    center: config.monroviaCenter,
  });
});

router.post('/fares/estimate', (req, res) => {
  try {
    const { pickupLat, pickupLng, destLat, destLng } = req.body;
    if (pickupLat === undefined || pickupLng === undefined || destLat === undefined || destLng === undefined) {
      return res.status(400).json({ success: false, error: 'Pickup and destination coordinates required.' });
    }
    const estimate = getRouteEstimate(
      Number(pickupLat),
      Number(pickupLng),
      Number(destLat),
      Number(destLng)
    );
    return res.json({ success: true, estimate });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// AUTHENTICATION ROUTES
// ============================================================================
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.get('/auth/me', authenticateToken, authController.getMe);

// ============================================================================
// PASSENGER ROUTES
// ============================================================================
router.get('/passenger/profile', authenticateToken, requireRole(['passenger']), passengerController.getProfile);
router.put('/passenger/profile', authenticateToken, requireRole(['passenger']), passengerController.updateProfile);
router.post('/rides', authenticateToken, requireRole(['passenger']), passengerController.createRide);
router.get('/passenger/rides', authenticateToken, requireRole(['passenger']), passengerController.getPassengerRides);
router.get('/rides/:id', authenticateToken, passengerController.getRideById);
router.post('/rides/:id/cancel', authenticateToken, passengerController.cancelRide);
router.post('/rides/:id/rating', authenticateToken, requireRole(['passenger']), passengerController.rateRide);

// ============================================================================
// DRIVER ROUTES
// ============================================================================
router.get('/driver/profile', authenticateToken, requireRole(['driver']), driverController.getProfile);
router.patch('/driver/availability', authenticateToken, requireRole(['driver']), driverController.toggleAvailability);
router.get('/driver/rides/requests', authenticateToken, requireRole(['driver']), driverController.getRideRequests);
router.get('/driver/rides/active', authenticateToken, requireRole(['driver']), driverController.getActiveRide);
router.post('/driver/rides/:id/accept', authenticateToken, requireRole(['driver']), driverController.acceptRide);
router.post('/driver/rides/:id/reject', authenticateToken, requireRole(['driver']), driverController.rejectRide);
router.post('/driver/rides/:id/arrive', authenticateToken, requireRole(['driver']), driverController.arriveAtPickup);
router.post('/driver/rides/:id/start', authenticateToken, requireRole(['driver']), driverController.startRide);
router.post('/driver/rides/:id/complete', authenticateToken, requireRole(['driver']), driverController.completeRide);
router.post('/driver/location', authenticateToken, requireRole(['driver']), driverController.updateLocation);

// ============================================================================
// ADMIN ROUTES
// ============================================================================
router.get('/admin/dashboard', authenticateToken, requireRole(['admin']), adminController.getDashboard);
router.get('/admin/users', authenticateToken, requireRole(['admin']), adminController.getUsers);
router.get('/admin/drivers', authenticateToken, requireRole(['admin']), adminController.getDrivers);
router.patch('/admin/drivers/:id/verification', authenticateToken, requireRole(['admin']), adminController.updateDriverVerification);
router.get('/admin/rides', authenticateToken, requireRole(['admin']), adminController.getRides);
router.get('/admin/reports', authenticateToken, requireRole(['admin']), adminController.getReports);

export default router;
