const safetyService = require('../services/safety.service');

const getDrivers = async (req, res, next) => {
  try {
    const { search, status, licenseState, riskLevel, sortBy } = req.query;
    const drivers = await safetyService.getDrivers({ search, status, licenseState, riskLevel, sortBy });
    res.json({ success: true, data: drivers });
  } catch (error) {
    next(error);
  }
};

const toggleDriverSuspension = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;
    const updatedDriver = await safetyService.toggleDriverSuspension(id, status, reason);
    res.json({ success: true, data: updatedDriver });
  } catch (error) {
    next(error);
  }
};

const getTripsEligibility = async (req, res, next) => {
  try {
    const trips = await safetyService.getTripsEligibility();
    res.json({ success: true, data: trips });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDrivers,
  toggleDriverSuspension,
  getTripsEligibility
};
