const router = require('express').Router();
const ctrl = require('../controllers/publicTracking.controller');

// Completely public endpoint for external customer queries
router.get('/public/tracking/:token', ctrl.getPublicTripDetails);

module.exports = router;
