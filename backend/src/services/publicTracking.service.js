const prisma = require('../config/db');
const ApiError = require('../utils/ApiError');
const crypto = require('crypto');

/**
 * Returns a public-safe DTO of a trip, excluding internal details.
 */
const getTripByTrackingToken = async (token) => {
  if (!token || token.trim() === '') {
    throw new ApiError(400, 'Tracking token is required.');
  }

  const trip = await prisma.trip.findFirst({
    where: { publicTrackingToken: token },
    include: {
      driver: {
        select: {
          fullName: true
        }
      },
      vehicle: {
        select: {
          registrationNumber: true,
          model: true,
          type: true
        }
      }
    }
  });

  if (!trip) {
    return null;
  }

  // Calculate estimated progress & remaining details deterministically
  let progressPercent = 0;
  let estimatedArrival = null;
  let distanceRemainingKm = parseFloat(trip.plannedDistanceKm);

  if (trip.status === 'completed') {
    progressPercent = 100;
    distanceRemainingKm = 0;
    estimatedArrival = trip.completedAt;
  } else if (trip.status === 'dispatched' && trip.dispatchedAt) {
    const dispatchedTime = new Date(trip.dispatchedAt).getTime();
    const now = Date.now();
    const elapsedTimeMs = now - dispatchedTime;

    // Estimate expected duration based on 50 km/h average speed
    const plannedDistance = parseFloat(trip.plannedDistanceKm);
    const expectedDurationMs = (plannedDistance / 50) * 3600 * 1000;

    if (expectedDurationMs > 0) {
      const computedProgress = (elapsedTimeMs / expectedDurationMs) * 100;
      // Clamp between 5% (just started) and 95% (almost arrived) during active dispatch
      progressPercent = Math.min(95, Math.max(5, Math.round(computedProgress)));
      
      const ratioRemaining = (100 - progressPercent) / 100;
      distanceRemainingKm = parseFloat((plannedDistance * ratioRemaining).toFixed(1));
    }

    estimatedArrival = new Date(dispatchedTime + expectedDurationMs);
  }

  // Derive timeline milestones
  const milestones = [
    {
      id: 'm1',
      title: 'Order Confirmed',
      description: 'Shipment registered in TransitOps',
      timestamp: trip.createdAt,
      status: 'completed',
      icon: 'CheckCircle2'
    },
    {
      id: 'm2',
      title: 'Trip Prepared',
      description: 'Vehicle and driver assigned',
      timestamp: trip.createdAt,
      status: trip.status !== 'draft' ? 'completed' : 'current',
      icon: 'FileCheck2'
    },
    {
      id: 'm3',
      title: 'Dispatched',
      description: `Departed origin point`,
      timestamp: trip.dispatchedAt,
      status: trip.status === 'completed' || trip.status === 'dispatched' 
        ? 'completed' 
        : (trip.status === 'cancelled' ? 'skipped' : 'upcoming'),
      icon: 'LogOut'
    },
    {
      id: 'm4',
      title: 'In Transit',
      description: 'En route to destination',
      timestamp: null,
      status: trip.status === 'completed' 
        ? 'completed' 
        : (trip.status === 'dispatched' ? 'current' : 'upcoming'),
      icon: 'Navigation'
    },
    {
      id: 'm5',
      title: 'Delivered',
      description: `Arrived at destination`,
      timestamp: trip.completedAt,
      status: trip.status === 'completed' ? 'completed' : 'upcoming',
      icon: 'MapPin'
    }
  ];

  // Return mapped Customer-Safe DTO
  return {
    trackingToken: trip.publicTrackingToken,
    status: trip.status,
    source: trip.source,
    destination: trip.destination,
    plannedDistanceKm: parseFloat(trip.plannedDistanceKm),
    cargoWeightKg: parseFloat(trip.cargoWeightKg),
    dispatchedAt: trip.dispatchedAt,
    completedAt: trip.completedAt,
    vehicle: {
      model: trip.vehicle.model,
      type: trip.vehicle.type,
      registrationNumber: trip.vehicle.registrationNumber
    },
    driver: {
      fullName: trip.driver.fullName
    },
    journey: {
      progressPercent,
      estimatedArrival,
      distanceRemainingKm
    },
    milestones
  };
};

/**
 * Backfills any NULL tracking tokens in the database with high-entropy unique tokens on startup.
 */
const backfillTrackingTokens = async () => {
  try {
    const tripsWithoutTokens = await prisma.trip.findMany({
      where: { publicTrackingToken: null }
    });

    if (tripsWithoutTokens.length > 0) {
      console.log(`[BACKFILL] Generating public tracking tokens for ${tripsWithoutTokens.length} trips...`);
      for (const trip of tripsWithoutTokens) {
        const token = crypto.randomBytes(24).toString('hex');
        await prisma.trip.update({
          where: { id: trip.id },
          data: { publicTrackingToken: token }
        });
      }
      console.log(`[BACKFILL] Successfully backfilled tracking tokens!`);
    }
  } catch (err) {
    console.error('[BACKFILL] Error backfilling tracking tokens:', err);
  }
};

// Execute self-invoking backfill after database bindings load
setTimeout(backfillTrackingTokens, 1500);

module.exports = {
  getTripByTrackingToken,
  backfillTrackingTokens
};
