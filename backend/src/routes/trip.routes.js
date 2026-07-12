const router = require('express').Router();
const ctrl = require('../controllers/trip.controller');
const authenticate = require('../middleware/authenticate');

router.use(authenticate);

router.get('/trips', ctrl.getAllTrips);

module.exports = router;
