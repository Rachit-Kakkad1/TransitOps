const prisma = require('../config/db');
const ApiError = require('../utils/ApiError');

// ==========================================
// Centralized Terminology and Thresholds
// ==========================================
const THRESHOLDS = {
  CRITICAL: 60,
  HARD_ELIGIBILITY: 75,
  GOOD: 80,
  EXCELLENT: 90
};

/**
 * Centrally calculates explainable driver risk.
 * A driver with score >= 75 can be AT_RISK but still system-eligible.
 */
const calculateDriverRisk = (driver, activeTrips = []) => {
  const now = new Date();
  const expiry = new Date(driver.licenseExpiry);
  const safetyScore = parseFloat(driver.safetyScore);

  const reasons = [];
  let riskScore = 10; // Base baseline score

  // 1. License validity assessments
  const daysDiff = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
  if (daysDiff < 0) {
    const daysOverdue = Math.abs(daysDiff);
    reasons.push({
      code: 'LICENSE_EXPIRED',
      severity: 'CRITICAL',
      message: `Driver license expired on ${expiry.toLocaleDateString()} (${daysOverdue} days ago).`
    });
    riskScore = Math.max(riskScore, 95);

    if (driver.status === 'available') {
      reasons.push({
        code: 'DRIVER_AVAILABLE_WITH_EXPIRED_LICENSE',
        severity: 'CRITICAL',
        message: 'Driver remains operationally marked AVAILABLE despite having an expired license.'
      });
      riskScore = Math.max(riskScore, 100);
    }
  } else if (daysDiff <= 7) {
    reasons.push({
      code: 'LICENSE_EXPIRING_7_DAYS',
      severity: 'HIGH',
      message: `Driver license expires in ${daysDiff} days (${expiry.toLocaleDateString()}).`
    });
    riskScore = Math.max(riskScore, 80);
  } else if (daysDiff <= 30) {
    reasons.push({
      code: 'LICENSE_EXPIRING_30_DAYS',
      severity: 'WARNING',
      message: `Driver license expires in ${daysDiff} days (${expiry.toLocaleDateString()}).`
    });
    riskScore = Math.max(riskScore, 40);
  }

  // 2. Safety Score assessments
  if (safetyScore < THRESHOLDS.CRITICAL) {
    reasons.push({
      code: 'CRITICAL_SAFETY_SCORE',
      severity: 'CRITICAL',
      message: `Driver safety score of ${safetyScore}% is below the critical warning line (${THRESHOLDS.CRITICAL}%).`
    });
    riskScore = Math.max(riskScore, 90);
  } else if (safetyScore < THRESHOLDS.HARD_ELIGIBILITY) {
    reasons.push({
      code: 'LOW_SAFETY_SCORE',
      severity: 'HIGH',
      message: `Driver safety score of ${safetyScore}% falls below required eligibility threshold (${THRESHOLDS.HARD_ELIGIBILITY}%).`
    });
    riskScore = Math.max(riskScore, 75);
  } else if (safetyScore < THRESHOLDS.GOOD) {
    reasons.push({
      code: 'AT_RISK_SAFETY_SCORE',
      severity: 'WARNING',
      message: `Driver safety score falls in the warning warning band (${safetyScore}%).`
    });
    riskScore = Math.max(riskScore, 30);
  }

  // 3. Status checks
  if (driver.status === 'suspended') {
    reasons.push({
      code: 'DRIVER_SUSPENDED',
      severity: 'WARNING',
      message: 'Driver is currently suspended from operations.'
    });
    riskScore = Math.max(riskScore, 50);
  }

  // 4. Active conflict checks
  const driverActiveTrips = activeTrips.filter(t => t.driverId === driver.id && t.status === 'dispatched');
  if (driverActiveTrips.length > 0) {
    const activeTrip = driverActiveTrips[0];
    if (daysDiff < 0) {
      reasons.push({
        code: 'UNSAFE_ACTIVE_TRIP_EXPIRED_LICENSE',
        severity: 'CRITICAL',
        message: `Driver is assigned to active trip (${activeTrip.source} → ${activeTrip.destination}) with an expired license.`
      });
      riskScore = Math.max(riskScore, 100);
    }
    if (driver.status === 'suspended') {
      reasons.push({
        code: 'UNSAFE_ACTIVE_TRIP_SUSPENDED',
        severity: 'CRITICAL',
        message: `Driver is assigned to active trip (${activeTrip.source} → ${activeTrip.destination}) while suspended.`
      });
      riskScore = Math.max(riskScore, 100);
    }
    if (safetyScore < THRESHOLDS.HARD_ELIGIBILITY) {
      reasons.push({
        code: 'UNSAFE_ACTIVE_TRIP_LOW_SCORE',
        severity: 'HIGH',
        message: `Driver is assigned to active trip (${activeTrip.source} → ${activeTrip.destination}) with substandard score (${safetyScore}%).`
      });
      riskScore = Math.max(riskScore, 85);
    }
  }

  // Determine categorical Risk Level
  let riskLevel = 'LOW';
  if (riskScore >= 90) riskLevel = 'CRITICAL';
  else if (riskScore >= 75) riskLevel = 'HIGH';
  else if (riskScore >= 30) riskLevel = 'WARNING';

  return {
    riskScore,
    riskLevel,
    reasons
  };
};

/**
 * Get all drivers with advanced search, filter, and sorting
 */
const getDrivers = async ({ search = '', status = '', licenseState = '', riskLevel = '', sortBy = '' }) => {
  const now = new Date();
  const sevenDays = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const thirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  // Build prisma query
  const where = {};

  if (search) {
    where.OR = [
      { fullName: { contains: search, mode: 'insensitive' } },
      { licenseNumber: { contains: search, mode: 'insensitive' } }
    ];
  }

  if (status) {
    where.status = status;
  }

  if (licenseState) {
    if (licenseState === 'expired') {
      where.licenseExpiry = { lt: now };
    } else if (licenseState === 'expiring_7') {
      where.licenseExpiry = { gte: now, lte: sevenDays };
    } else if (licenseState === 'expiring_30') {
      where.licenseExpiry = { gte: now, lte: thirtyDays };
    } else if (licenseState === 'valid') {
      where.licenseExpiry = { gt: thirtyDays };
    }
  }

  // Dynamic sorting (Prisma-side)
  let orderBy = { fullName: 'asc' };
  if (sortBy) {
    switch (sortBy) {
      case 'safety_score_asc':
        orderBy = { safetyScore: 'asc' };
        break;
      case 'safety_score_desc':
        orderBy = { safetyScore: 'desc' };
        break;
      case 'license_expiry_asc':
        orderBy = { licenseExpiry: 'asc' };
        break;
      case 'license_expiry_desc':
        orderBy = { licenseExpiry: 'desc' };
        break;
      case 'name_asc':
        orderBy = { fullName: 'asc' };
        break;
      case 'name_desc':
        orderBy = { fullName: 'desc' };
        break;
    }
  }

  const drivers = await prisma.driver.findMany({
    where,
    orderBy,
    include: {
      trips: {
        where: { status: 'dispatched' }
      }
    }
  });

  // Merge dynamic risk computations
  let evaluated = drivers.map(d => {
    const risk = calculateDriverRisk(d, d.trips);
    const { trips: driverTrips, ...driverData } = d;
    return {
      ...driverData,
      safetyScore: parseFloat(d.safetyScore),
      rollingDutyHours: parseFloat(d.rollingDutyHours),
      ...risk
    };
  });

  // Filter by risk level in memory
  if (riskLevel) {
    evaluated = evaluated.filter(d => d.riskLevel === riskLevel);
  }

  // Sort by risk (memory-side)
  if (sortBy === 'risk_score_desc') {
    evaluated.sort((a, b) => b.riskScore - a.riskScore);
  } else if (sortBy === 'risk_score_asc') {
    evaluated.sort((a, b) => a.riskScore - b.riskScore);
  }

  return evaluated;
};

/**
 * Toggle driver suspended / available status with strict compliance controls and suspension reason logging
 */
const toggleDriverSuspension = async (driverId, requestStatus, reason = '') => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(driverId)) {
    throw new ApiError(400, 'Invalid driver ID format. Expected a standard UUID.');
  }

  const driver = await prisma.driver.findUnique({
    where: { id: driverId }
  });

  if (!driver) {
    throw new ApiError(404, 'Driver not found.');
  }

  let newStatus;
  const isCurrentlySuspended = driver.status === 'suspended';

  if (requestStatus) {
    const validStatuses = ['available', 'on_trip', 'off_duty', 'suspended'];
    if (!validStatuses.includes(requestStatus)) {
      throw new ApiError(400, `Invalid status value: '${requestStatus}'. Allowed values are: ${validStatuses.join(', ')}.`);
    }

    if (requestStatus === 'on_trip') {
      throw new ApiError(403, "Safety Officer cannot assign operational 'on_trip' status. This status is managed by the trip dispatch lifecycle.");
    }

    newStatus = requestStatus;
  } else {
    // Default Toggle logic
    newStatus = isCurrentlySuspended ? 'available' : 'suspended';
  }

  // Reactivation check: require compliance validation
  if (isCurrentlySuspended && newStatus !== 'suspended') {
    const complianceErrors = [];

    // Check 1: License valid
    if (new Date(driver.licenseExpiry) < new Date()) {
      complianceErrors.push(`Expired License: License expired on ${new Date(driver.licenseExpiry).toLocaleDateString()}.`);
    }

    // Check 2: Safety score >= threshold
    const safetyScore = parseFloat(driver.safetyScore);
    if (safetyScore < THRESHOLDS.HARD_ELIGIBILITY) {
      complianceErrors.push(`Safety Score: ${safetyScore}/100 is below minimum threshold (${THRESHOLDS.HARD_ELIGIBILITY}/100).`);
    }

    if (complianceErrors.length > 0) {
      throw new ApiError(400, 'Reactivation Blocked: Driver does not meet compliance requirements.', complianceErrors);
    }
  }

  // Log action for audit completeness
  const previousStatus = driver.status;
  console.log(`[AUDIT] Action: DRIVER_STATUS_CHANGE | Driver: ${driver.fullName} (${driverId}) | Prev State: ${previousStatus} | New State: ${newStatus} | Reason: "${reason || 'No reason provided'}" | Timestamp: ${new Date().toISOString()}`);

  const updatedDriver = await prisma.driver.update({
    where: { id: driverId },
    data: { status: newStatus }
  });

  return {
    ...updatedDriver,
    safetyScore: parseFloat(updatedDriver.safetyScore),
    rollingDutyHours: parseFloat(updatedDriver.rollingDutyHours)
  };
};

/**
 * Get all trips with their dynamic safety checks
 */
const getTripsEligibility = async () => {
  const now = new Date();

  const trips = await prisma.trip.findMany({
    where: {
      status: { in: ['draft', 'dispatched'] }
    },
    include: {
      driver: true,
      vehicle: true
    },
    orderBy: { createdAt: 'desc' }
  });

  const evaluatedTrips = [];

  for (const trip of trips) {
    const driver = trip.driver;
    const vehicle = trip.vehicle;

    const checks = [];

    // 1. License Validity Check
    const isLicenseExpired = new Date(driver.licenseExpiry) < now;
    const daysDiff = Math.ceil((new Date(driver.licenseExpiry) - now) / (1000 * 60 * 60 * 24));
    checks.push({
      code: 'DRIVER_LICENSE_VALID',
      passed: !isLicenseExpired,
      severity: 'CRITICAL',
      message: isLicenseExpired 
        ? `Driver license expired on ${new Date(driver.licenseExpiry).toLocaleDateString()}, ${Math.abs(daysDiff)} days ago.`
        : `Driver license is valid (expires ${new Date(driver.licenseExpiry).toLocaleDateString()}, ${daysDiff} days remaining).`
    });

    // 2. Driver Status Check
    const isDriverSuspended = driver.status === 'suspended';
    checks.push({
      code: 'DRIVER_STATUS_ACTIVE',
      passed: !isDriverSuspended,
      severity: 'CRITICAL',
      message: isDriverSuspended
        ? 'Driver is currently suspended from operations.'
        : `Driver operational status is active (${driver.status}).`
    });

    // 3. Driver Safety Score Check
    const safetyScore = parseFloat(driver.safetyScore);
    const hasLowSafetyScore = safetyScore < THRESHOLDS.HARD_ELIGIBILITY;
    checks.push({
      code: 'DRIVER_SAFETY_SCORE_ELIGIBLE',
      passed: !hasLowSafetyScore,
      severity: hasLowSafetyScore ? 'HIGH' : 'INFO',
      message: hasLowSafetyScore
        ? `Driver safety score of ${safetyScore}% is below required threshold (${THRESHOLDS.HARD_ELIGIBILITY}%).`
        : `Driver safety score (${safetyScore}%) meets system threshold (${THRESHOLDS.HARD_ELIGIBILITY}%).`
    });

    // 4. Vehicle Status Check
    const isVehicleInShop = vehicle.status === 'in_shop';
    checks.push({
      code: 'VEHICLE_STATUS_ACTIVE',
      passed: !isVehicleInShop,
      severity: 'CRITICAL',
      message: isVehicleInShop
        ? 'Vehicle is in maintenance shop. Active maintenance block.'
        : `Vehicle status is active and operational.`
    });

    // 5. Cargo Capacity Check
    const cargoWeight = parseFloat(trip.cargoWeightKg);
    const maxCapacity = parseFloat(vehicle.maxLoadCapacityKg);
    const isOverloaded = cargoWeight > maxCapacity;
    checks.push({
      code: 'VEHICLE_CAPACITY_OK',
      passed: !isOverloaded,
      severity: 'CRITICAL',
      message: isOverloaded
        ? `Cargo weight (${cargoWeight.toLocaleString()} kg) exceeds vehicle max capacity (${maxCapacity.toLocaleString()} kg) by ${(cargoWeight - maxCapacity).toLocaleString()} kg.`
        : `Cargo weight (${cargoWeight.toLocaleString()} kg) is within vehicle capacity limits.`
    });

    const eligible = checks.every(c => c.severity === 'INFO' || c.passed);

    // Compute Trip Risk Level
    let riskLevel = 'LOW';
    const failedCriticalCount = checks.filter(c => c.severity === 'CRITICAL' && !c.passed).length;
    const failedHighCount = checks.filter(c => c.severity === 'HIGH' && !c.passed).length;

    if (failedCriticalCount > 0) riskLevel = 'CRITICAL';
    else if (failedHighCount > 0) riskLevel = 'HIGH';
    else if (!eligible) riskLevel = 'WARNING';

    evaluatedTrips.push({
      id: trip.id,
      source: trip.source,
      destination: trip.destination,
      status: trip.status,
      cargoWeightKg: parseFloat(trip.cargoWeightKg),
      plannedDistanceKm: parseFloat(trip.plannedDistanceKm),
      createdAt: trip.createdAt,
      driver: {
        id: driver.id,
        fullName: driver.fullName,
        licenseNumber: driver.licenseNumber,
        safetyScore: parseFloat(driver.safetyScore),
        status: driver.status
      },
      vehicle: {
        id: vehicle.id,
        registrationNumber: vehicle.registrationNumber,
        model: vehicle.model,
        status: vehicle.status,
        maxLoadCapacityKg: parseFloat(vehicle.maxLoadCapacityKg)
      },
      eligible,
      riskLevel,
      checks
    });
  }

  return evaluatedTrips;
};

module.exports = {
  THRESHOLDS,
  calculateDriverRisk,
  getDrivers,
  toggleDriverSuspension,
  getTripsEligibility
};
