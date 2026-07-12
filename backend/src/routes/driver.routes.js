const router = require('express').Router();
const ctrl = require('../controllers/driver.controller');
const authenticate = require('../middleware/authenticate');

router.use(authenticate);

router.get('/drivers', ctrl.getAllDrivers);

module.exports = router;
