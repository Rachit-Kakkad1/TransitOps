const router = require('express').Router();
const ctrl = require('../controllers/maintenance.controller');
const authenticate = require('../middleware/authenticate');

router.use(authenticate);

router.get('/maintenance', ctrl.getAllMaintenanceRecords);

module.exports = router;
