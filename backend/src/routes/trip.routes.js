const router = require('express').Router();
const ctrl = require('../controllers/trip.controller');
const authenticate = require('../middleware/authenticate');

const authorize = require('../middleware/authorize');

// Public routes (no auth required)
router.get('/public/track/:token', ctrl.getPublicTracking);

// Apply authentication middleware to remaining trip routes
router.use(authenticate);

// Trip routes
router.get('/trips', authorize('DISPATCHER', 'FLEET_MANAGER', 'DRIVER'), ctrl.getTrips);
router.get('/trips/positions', authorize('DISPATCHER', 'FLEET_MANAGER'), ctrl.getActivePositions);
router.post('/trips', authorize('DISPATCHER', 'FLEET_MANAGER'), ctrl.createTrip);
router.put('/trips/:id', authorize('DISPATCHER', 'FLEET_MANAGER'), ctrl.updateTrip);
router.get('/trips/:id/recommendations', authorize('DISPATCHER', 'FLEET_MANAGER'), ctrl.getRecommendations);
router.post('/trips/:id/dispatch', authorize('DISPATCHER', 'FLEET_MANAGER'), ctrl.dispatchTrip);
router.post('/trips/:id/complete', authorize('DISPATCHER', 'FLEET_MANAGER', 'DRIVER'), ctrl.completeTrip);
router.post('/trips/:id/cancel', authorize('DISPATCHER', 'FLEET_MANAGER'), ctrl.cancelTrip);
router.post('/trips/:id/expenses', authorize('DISPATCHER', 'DRIVER', 'FLEET_MANAGER'), ctrl.createTripExpense);


module.exports = router;
