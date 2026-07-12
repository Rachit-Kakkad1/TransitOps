const prisma = require('../config/db');
const ApiError = require('../utils/ApiError');

/**
 * Get all trips
 */
const getAllTrips = async () => {
  return prisma.trip.findMany({
    include: {
      vehicle: { select: { id: true, registrationNumber: true, model: true, maxLoadCapacityKg: true, odometerKm: true } },
      driver: { select: { id: true, fullName: true, rollingDutyHours: true, safetyScore: true, licenseExpiry: true, status: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
};

/**
 * Create a new draft trip
 */
const createTrip = async (tripData) => {
  const { source, destination, vehicleId, driverId, cargoWeightKg, plannedDistanceKm } = tripData;

  // Verify resources if assigned
  if (vehicleId) {
    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) throw new ApiError(404, 'Vehicle not found');
    if (vehicle.status === 'retired') throw new ApiError(400, 'Cannot assign a retired vehicle');
  }

  if (driverId) {
    const driver = await prisma.driver.findUnique({ where: { id: driverId } });
    if (!driver) throw new ApiError(404, 'Driver not found');
    if (driver.status === 'suspended') throw new ApiError(400, 'Cannot assign a suspended driver');
  }

  return prisma.trip.create({
    data: {
      source,
      destination,
      vehicleId,
      driverId,
      cargoWeightKg,
      plannedDistanceKm,
      status: 'draft',
    },
    include: {
      vehicle: true,
      driver: true,
    }
  });
};

/**
 * Update an existing draft trip
 */
const updateTrip = async (tripId, updateData) => {
  const trip = await prisma.trip.findUnique({ where: { id: tripId } });
  if (!trip) throw new ApiError(404, 'Trip not found');
  if (trip.status !== 'draft') {
    throw new ApiError(400, 'Only draft trips can be updated');
  }

  const { source, destination, vehicleId, driverId, cargoWeightKg, plannedDistanceKm } = updateData;

  // Verify resources if assigned
  if (vehicleId && vehicleId !== trip.vehicleId) {
    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) throw new ApiError(404, 'Vehicle not found');
    if (vehicle.status === 'retired') throw new ApiError(400, 'Cannot assign a retired vehicle');
  }

  if (driverId && driverId !== trip.driverId) {
    const driver = await prisma.driver.findUnique({ where: { id: driverId } });
    if (!driver) throw new ApiError(404, 'Driver not found');
    if (driver.status === 'suspended') throw new ApiError(400, 'Cannot assign a suspended driver');
  }

  return prisma.trip.update({
    where: { id: tripId },
    data: {
      source,
      destination,
      vehicleId,
      driverId,
      cargoWeightKg,
      plannedDistanceKm,
    },
    include: {
      vehicle: true,
      driver: true,
    }
  });
};

/**
 * Get Recommendations for a trip
 */
const getRecommendations = async (tripId) => {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: { vehicle: true, driver: true }
  });
  if (!trip) throw new ApiError(404, 'Trip not found');

  const cargoWeight = parseFloat(trip.cargoWeightKg);

  // Retrieve eligible vehicles: available, not retired, not in_shop, AND capacity >= cargoWeight
  // We also include the vehicle currently assigned to this trip even if its status is 'on_trip' or similar
  const vehicleConditions = [{ status: 'available' }];
  if (trip.vehicleId) {
    vehicleConditions.push({ id: trip.vehicleId });
  }

  const vehicles = await prisma.vehicle.findMany({
    where: {
      OR: vehicleConditions,
      maxLoadCapacityKg: { gte: cargoWeight }
    }
  });

  // Retrieve eligible drivers: available, not suspended, license not expired, duty hours <= 10
  // Also include the driver currently assigned to this trip
  const driverConditions = [{ status: 'available' }];
  if (trip.driverId) {
    driverConditions.push({ id: trip.driverId });
  }

  const currentDate = new Date();
  const drivers = await prisma.driver.findMany({
    where: {
      OR: driverConditions,
      licenseExpiry: { gt: currentDate },
      rollingDutyHours: { lte: 10 }
    }
  });

  const recommendations = [];

  // Compute recommendation scores for all valid pairs
  for (const v of vehicles) {
    const vMaxLoad = parseFloat(v.maxLoadCapacityKg);
    const vOdo = parseFloat(v.odometerKm);

    // Mismatch calculation (Utilization): Cargo weight / Max load.
    // Higher is better (prevents using heavy truck for light load)
    const capacityFitScore = (cargoWeight / vMaxLoad) * 100;
    
    // Vehicle Wear Score (lower odometer gets higher score)
    // Scale odometer relative to 200,000 km baseline
    const vehicleWearScore = Math.max(0, (1 - (vOdo / 200000)) * 100);

    for (const d of drivers) {
      const dSafety = parseFloat(d.safetyScore);
      const dHours = parseFloat(d.rollingDutyHours);

      // Fatigue Score (lower duty hours gets higher score)
      const fatigueScore = ((10 - dHours) / 10) * 100;

      // Weighted Composite Score
      // 40% Driver Safety Score
      // 30% Capacity Fit
      // 15% Fatigue
      // 15% Vehicle Wear
      const compositeScore = (dSafety * 0.4) + (capacityFitScore * 0.3) + (fatigueScore * 0.15) + (vehicleWearScore * 0.15);

      recommendations.push({
        vehicle: {
          id: v.id,
          registrationNumber: v.registrationNumber,
          model: v.model,
          type: v.type,
          maxLoadCapacityKg: vMaxLoad,
          odometerKm: vOdo
        },
        driver: {
          id: d.id,
          fullName: d.fullName,
          safetyScore: dSafety,
          rollingDutyHours: dHours,
          licenseExpiry: d.licenseExpiry
        },
        score: parseFloat(compositeScore.toFixed(1)),
        breakdown: {
          safetyScore: parseFloat((dSafety * 0.4).toFixed(1)),
          capacityFit: parseFloat((capacityFitScore * 0.3).toFixed(1)),
          fatigue: parseFloat((fatigueScore * 0.15).toFixed(1)),
          vehicleWear: parseFloat((vehicleWearScore * 0.15).toFixed(1))
        }
      });
    }
  }

  // Sort recommendations by score descending
  recommendations.sort((a, b) => b.score - a.score);

  return recommendations;
};

/**
 * Dispatch a trip
 */
const dispatchTrip = async (tripId, dispatchData) => {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: { vehicle: true, driver: true }
  });
  if (!trip) throw new ApiError(404, 'Trip not found');
  if (trip.status !== 'draft') {
    throw new ApiError(400, 'Only draft trips can be dispatched');
  }

  // Use values from request body (allows dispatcher to select driver/vehicle at dispatch time)
  // or default to currently assigned
  const vehicleId = dispatchData.vehicleId || trip.vehicleId;
  const driverId = dispatchData.driverId || trip.driverId;

  if (!vehicleId || !driverId) {
    throw new ApiError(400, 'Both vehicle and driver must be assigned to dispatch the trip');
  }

  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
  const driver = await prisma.driver.findUnique({ where: { id: driverId } });

  if (!vehicle) throw new ApiError(404, 'Vehicle not found');
  if (!driver) throw new ApiError(404, 'Driver not found');

  // Hard Business Rules Check
  // 1. Retired or In Shop vehicles blocked
  if (vehicle.status === 'retired') {
    throw new ApiError(400, `Vehicle ${vehicle.registrationNumber} is retired and cannot be dispatched`);
  }
  if (vehicle.status === 'in_shop') {
    throw new ApiError(400, `Vehicle ${vehicle.registrationNumber} is in maintenance and cannot be dispatched`);
  }

  // 2. Suspended driver blocked
  if (driver.status === 'suspended') {
    throw new ApiError(400, `Driver ${driver.fullName} is suspended and cannot be dispatched`);
  }

  // 3. Expired license blocked
  const currentDate = new Date();
  if (new Date(driver.licenseExpiry) < currentDate) {
    throw new ApiError(400, `Driver ${driver.fullName} has an expired license and cannot be dispatched`);
  }

  // 4. Driver rolling duty hours > 10 hours limit blocked
  if (parseFloat(driver.rollingDutyHours) > 10) {
    throw new ApiError(400, `Driver ${driver.fullName} has exceeded the 10-hour duty hour limit`);
  }

  // 5. Double-booking check
  if (vehicle.status === 'on_trip' && vehicle.id !== trip.vehicleId) {
    throw new ApiError(400, `Vehicle ${vehicle.registrationNumber} is already on another active trip`);
  }
  if (driver.status === 'on_trip' && driver.id !== trip.driverId) {
    throw new ApiError(400, `Driver ${driver.fullName} is already on another active trip`);
  }

  // 6. Capacity check
  if (parseFloat(trip.cargoWeightKg) > parseFloat(vehicle.maxLoadCapacityKg)) {
    throw new ApiError(
      400,
      `Cargo weight (${parseFloat(trip.cargoWeightKg)} kg) exceeds vehicle capacity (${parseFloat(vehicle.maxLoadCapacityKg)} kg)`
    );
  }

  // Handle recommendation snapshot and override flag
  const recommendations = await getRecommendations(tripId);
  const topMatch = recommendations[0];
  const isOverride = topMatch 
    ? (topMatch.vehicle.id !== vehicleId || topMatch.driver.id !== driverId)
    : false;

  // Generate public tracking token
  const crypto = require('crypto');
  const publicTrackingToken = crypto.randomBytes(16).toString('hex');

  // DB Transaction: Update trip status & resource statuses atomically
  return prisma.$transaction(async (tx) => {
    // If vehicle/driver has changed, release old vehicle/driver
    if (trip.vehicleId && trip.vehicleId !== vehicleId) {
      await tx.vehicle.update({
        where: { id: trip.vehicleId },
        data: { status: 'available' }
      });
    }
    if (trip.driverId && trip.driverId !== driverId) {
      await tx.driver.update({
        where: { id: trip.driverId },
        data: { status: 'available' }
      });
    }

    // Set new vehicle and driver statuses to 'on_trip'
    await tx.vehicle.update({
      where: { id: vehicleId },
      data: { status: 'on_trip' }
    });

    await tx.driver.update({
      where: { id: driverId },
      data: { status: 'on_trip' }
    });

    // Update Trip record
    return tx.trip.update({
      where: { id: tripId },
      data: {
        vehicleId,
        driverId,
        status: 'dispatched',
        dispatchedAt: new Date(),
        wasOverride: isOverride,
        publicTrackingToken: publicTrackingToken,
        recommendationSnapshot: recommendations.slice(0, 5) // Save top 5 options as snapshot
      },
      include: {
        vehicle: true,
        driver: true
      }
    });
  });
};

/**
 * Complete a trip
 */
const completeTrip = async (tripId) => {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: { vehicle: true, driver: true }
  });
  if (!trip) throw new ApiError(404, 'Trip not found');
  if (trip.status !== 'dispatched') {
    throw new ApiError(400, 'Only active (dispatched) trips can be completed');
  }

  const distance = parseFloat(trip.plannedDistanceKm);
  
  // Calculate simulated driving hours (Distance / average 60 km/h)
  const tripHours = parseFloat((distance / 60).toFixed(1));

  // DB Transaction
  return prisma.$transaction(async (tx) => {
    // 1. Release vehicle and increment odometer
    await tx.vehicle.update({
      where: { id: trip.vehicleId },
      data: {
        status: 'available',
        odometerKm: { increment: distance }
      }
    });

    // 2. Release driver and add rolling duty hours
    await tx.driver.update({
      where: { id: trip.driverId },
      data: {
        status: 'available',
        rollingDutyHours: { increment: tripHours }
      }
    });

    // 3. Mark trip completed
    return tx.trip.update({
      where: { id: tripId },
      data: {
        status: 'completed',
        completedAt: new Date(),
        actualDistanceKm: distance // default actual to planned
      },
      include: {
        vehicle: true,
        driver: true
      }
    });
  });
};

/**
 * Cancel a trip
 */
const cancelTrip = async (tripId) => {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: { vehicle: true, driver: true }
  });
  if (!trip) throw new ApiError(404, 'Trip not found');
  if (trip.status !== 'draft' && trip.status !== 'dispatched') {
    throw new ApiError(400, 'Only draft or dispatched trips can be cancelled');
  }

  // DB Transaction
  return prisma.$transaction(async (tx) => {
    // Release resources if dispatched
    if (trip.status === 'dispatched') {
      await tx.vehicle.update({
        where: { id: trip.vehicleId },
        data: { status: 'available' }
      });

      await tx.driver.update({
        where: { id: trip.driverId },
        data: { status: 'available' }
      });
    }

    // Mark trip cancelled
    return tx.trip.update({
      where: { id: tripId },
      data: {
        status: 'cancelled',
        completedAt: null
      },
      include: {
        vehicle: true,
        driver: true
      }
    });
  });
};

/**
 * HUB Geolocation mappings for simulated maps
 */
const HUB_COORDINATES = {
  'Warehouse A': { lat: 19.0760, lng: 72.8777 }, // Mumbai
  'Retail Hub B': { lat: 18.5204, lng: 73.8567 }, // Pune
  'Terminal 2': { lat: 28.7041, lng: 77.1025 }, // Delhi
  'Factory Depot': { lat: 28.4595, lng: 77.0266 }, // Gurugram
  'Verification Depot A': { lat: 22.3072, lng: 73.1812 }, // Vadodara
  'Verification Station B': { lat: 23.0225, lng: 72.5714 }, // Ahmedabad
  'Warehouse B': { lat: 12.9716, lng: 77.5946 }, // Bengaluru
  'Distribution Center': { lat: 13.0827, lng: 80.2707 } // Chennai
};

const COORDINATE_CACHE = {};

const getCoordinates = async (name) => {
  if (HUB_COORDINATES[name]) return HUB_COORDINATES[name];
  if (COORDINATE_CACHE[name]) return COORDINATE_CACHE[name];

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(name)}+India&limit=1`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'TransitOps-Logistics-Platform/1.0'
      }
    });
    if (response.ok) {
      const data = await response.json();
      if (data && data.length > 0) {
        const coords = {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon)
        };
        COORDINATE_CACHE[name] = coords;
        console.log(`🌐 Geocoded custom location "${name}" to [${coords.lat}, ${coords.lng}]`);
        return coords;
      }
    }
  } catch (err) {
    console.error(`Failed to geocode address "${name}":`, err);
  }

  // Deterministic coordinate based on name hash as fallback
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const lat = 15 + Math.abs((hash % 12));
  const lng = 72 + Math.abs(((hash >> 3) % 15));
  const coords = { lat, lng };
  COORDINATE_CACHE[name] = coords;
  return coords;
};

/**
 * Public shipment tracking lookup
 */
const getTripByTrackingToken = async (token) => {
  const trip = await prisma.trip.findFirst({
    where: { publicTrackingToken: token },
    include: {
      vehicle: { select: { type: true, model: true } },
      driver: { select: { fullName: true } }
    }
  });

  if (!trip) {
    throw new ApiError(404, 'Shipment tracking details not found or expired');
  }

  // Calculate simulated live status
  let simulatedLocation = null;
  let progress = 0;

  const start = await getCoordinates(trip.source);
  const end = await getCoordinates(trip.destination);
  
  if (trip.status === 'dispatched' && trip.dispatchedAt) {
    const elapsedHrs = (Date.now() - new Date(trip.dispatchedAt).getTime()) / (1000 * 60 * 60);
    const speedKmph = 65; // average speed
    const distanceCovered = elapsedHrs * speedKmph;
    const plannedDist = parseFloat(trip.plannedDistanceKm);
    
    progress = Math.min(99, Math.round((distanceCovered / plannedDist) * 100));
    
    simulatedLocation = {
      lat: start.lat + (end.lat - start.lat) * (progress / 100),
      lng: start.lng + (end.lng - start.lng) * (progress / 100)
    };
  } else if (trip.status === 'completed') {
    progress = 100;
    simulatedLocation = end;
  } else {
    simulatedLocation = start;
  }

  return {
    id: trip.id,
    source: trip.source,
    destination: trip.destination,
    cargoWeightKg: parseFloat(trip.cargoWeightKg),
    plannedDistanceKm: parseFloat(trip.plannedDistanceKm),
    status: trip.status,
    dispatchedAt: trip.dispatchedAt,
    completedAt: trip.completedAt,
    vehicle: trip.vehicle,
    driver: trip.driver,
    progress,
    simulatedLocation,
    startLocation: start,
    endLocation: end
  };
};

/**
 * Get active trip positions for dispatcher live map
 */
const getActiveTripPositions = async () => {
  const trips = await prisma.trip.findMany({
    where: { status: 'dispatched' },
    include: {
      vehicle: { select: { registrationNumber: true, model: true, type: true } },
      driver: { select: { fullName: true, rollingDutyHours: true } }
    }
  });

  return Promise.all(trips.map(async (trip) => {
    const elapsedHrs = (Date.now() - new Date(trip.dispatchedAt).getTime()) / (1000 * 60 * 60);
    const speedKmph = 65;
    const distanceCovered = elapsedHrs * speedKmph;
    const plannedDist = parseFloat(trip.plannedDistanceKm);
    
    const progress = Math.min(99, Math.round((distanceCovered / plannedDist) * 100));
    
    const start = await getCoordinates(trip.source);
    const end = await getCoordinates(trip.destination);
    
    const currentLocation = {
      lat: start.lat + (end.lat - start.lat) * (progress / 100),
      lng: start.lng + (end.lng - start.lng) * (progress / 100)
    };

    // Flag fatigue alerts (> 9 hrs rolling duty hours)
    const isFatigued = parseFloat(trip.driver.rollingDutyHours) > 9;

    return {
      id: trip.id,
      source: trip.source,
      destination: trip.destination,
      plannedDistanceKm: plannedDist,
      vehicle: trip.vehicle.registrationNumber,
      vehicleModel: trip.vehicle.model,
      driver: trip.driver.fullName,
      dispatchedAt: trip.dispatchedAt,
      progress,
      currentLocation,
      startLocation: start,
      endLocation: end,
      isFatigued
    };
  }));
};

/**
 * Add an expense for a trip
 */
const addTripExpense = async (tripId, expenseData, loggedBy) => {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: { vehicle: true }
  });
  if (!trip) throw new ApiError(404, 'Trip not found');

  const cost = parseFloat(expenseData.cost);
  if (isNaN(cost) || cost <= 0) {
    throw new ApiError(400, 'Invalid expense cost');
  }

  // Cost Leakage Detection (Anomaly flags)
  let anomalyFlag = false;
  if (expenseData.category === 'toll' && cost > 1000) {
    anomalyFlag = true;
  }
  if (expenseData.category === 'fuel') {
    if (cost > 6000) {
      anomalyFlag = true;
    }
    // Also flag if liters are anomalously low/high compared to cost (e.g. > 150 INR per liter)
    if (expenseData.liters) {
      const liters = parseFloat(expenseData.liters);
      if (liters > 0 && (cost / liters) > 150) {
        anomalyFlag = true;
      }
    }
  }

  return prisma.expense.create({
    data: {
      tripId,
      vehicleId: trip.vehicleId,
      category: expenseData.category,
      cost,
      liters: expenseData.liters ? parseFloat(expenseData.liters) : null,
      loggedOn: new Date(),
      loggedBy,
      anomalyFlag
    }
  });
};

module.exports = {
  getAllTrips,
  createTrip,
  updateTrip,
  getRecommendations,
  dispatchTrip,
  completeTrip,
  cancelTrip,
  getTripByTrackingToken,
  getActiveTripPositions,
  addTripExpense
};
