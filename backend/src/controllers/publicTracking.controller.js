const publicTrackingService = require('../services/publicTracking.service');
const ApiError = require('../utils/ApiError');

const getPublicTripDetails = async (req, res, next) => {
  try {
    const { token } = req.params;
    
    if (!token || token.trim() === '') {
      throw new ApiError(400, 'Tracking token is invalid.');
    }

    const trip = await publicTrackingService.getTripByTrackingToken(token);
    
    if (!trip) {
      throw new ApiError(404, 'Tracking link is invalid, expired, or revoked.');
    }

    res.json({
      success: true,
      data: trip
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPublicTripDetails
};
