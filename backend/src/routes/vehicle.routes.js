const router = require('express').Router();
const ctrl = require('../controllers/vehicle.controller');
const authenticate = require('../middleware/authenticate');

router.use(authenticate);

router.get('/vehicles', ctrl.getAllVehicles);

module.exports = router;
