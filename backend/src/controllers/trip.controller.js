const tripService = require('../services/trip.service');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Get all trips
 */
const getTrips = asyncHandler(async (req, res) => {
  const trips = await tripService.getAllTrips();
  res.json({
    success: true,
    data: trips
  });
});

/**
 * Create a new trip
 */
const createTrip = asyncHandler(async (req, res) => {
  const { source, destination, vehicleId, driverId, cargoWeightKg, plannedDistanceKm } = req.body;

  if (!source || !destination || !cargoWeightKg || !plannedDistanceKm) {
    throw new ApiError(400, 'Source, destination, cargo weight and planned distance are required');
  }

  const trip = await tripService.createTrip({
    source,
    destination,
    vehicleId,
    driverId,
    cargoWeightKg: parseFloat(cargoWeightKg),
    plannedDistanceKm: parseFloat(plannedDistanceKm)
  });

  res.status(201).json({
    success: true,
    message: 'Draft trip created successfully',
    data: trip
  });
});

/**
 * Update a trip details
 */
const updateTrip = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { source, destination, vehicleId, driverId, cargoWeightKg, plannedDistanceKm } = req.body;

  const trip = await tripService.updateTrip(id, {
    source,
    destination,
    vehicleId,
    driverId,
    cargoWeightKg: cargoWeightKg ? parseFloat(cargoWeightKg) : undefined,
    plannedDistanceKm: plannedDistanceKm ? parseFloat(plannedDistanceKm) : undefined
  });

  res.json({
    success: true,
    message: 'Trip updated successfully',
    data: trip
  });
});

/**
 * Get recommendation matches for a trip
 */
const getRecommendations = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const recommendations = await tripService.getRecommendations(id);
  res.json({
    success: true,
    data: recommendations
  });
});

/**
 * Dispatch a trip
 */
const dispatchTrip = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { vehicleId, driverId } = req.body;

  const trip = await tripService.dispatchTrip(id, { vehicleId, driverId });
  res.json({
    success: true,
    message: 'Trip dispatched and in transit',
    data: trip
  });
});

/**
 * Complete an active trip
 */
const completeTrip = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const trip = await tripService.completeTrip(id);
  res.json({
    success: true,
    message: 'Trip completed successfully',
    data: trip
  });
});

/**
 * Cancel a trip
 */
const cancelTrip = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const trip = await tripService.cancelTrip(id);
  res.json({
    success: true,
    message: 'Trip cancelled successfully',
    data: trip
  });
});

/**
 * Public tracking endpoint (no auth required)
 */
const getPublicTracking = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const trackingData = await tripService.getTripByTrackingToken(token);
  res.json({
    success: true,
    data: trackingData
  });
});

/**
 * Get active trip positions for live map
 */
const getActivePositions = asyncHandler(async (req, res) => {
  const positions = await tripService.getActiveTripPositions();
  res.json({
    success: true,
    data: positions
  });
});

/**
 * Create toll/fuel expense for a trip
 */
const createTripExpense = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { category, cost, liters, date } = req.body;
  const loggedBy = req.user.name;

  if (!category || !cost) {
    throw new ApiError(400, 'Expense category and cost are required');
  }

  const expense = await tripService.addTripExpense(id, { category, cost, liters, date }, loggedBy);
  res.status(201).json({
    success: true,
    message: 'Trip expense logged successfully',
    data: expense
  });
});

module.exports = {
  getTrips,
  createTrip,
  updateTrip,
  getRecommendations,
  dispatchTrip,
  completeTrip,
  cancelTrip,
  getPublicTracking,
  getActivePositions,
  createTripExpense
};
