const prisma = require('../config/db');
const safetyService = require('./safety.service');

/**
 * Returns role-specific dashboard metrics and datasets.
 */
const getOverviewData = async (userId, role) => {
  switch (role) {
    case 'ADMIN':
      return getAdminData();
    case 'FLEET_MANAGER':
      return getFleetManagerData();
    case 'DISPATCHER':
      return getDispatcherData();
    case 'DRIVER':
      return getDriverData(userId);
    case 'SAFETY_OFFICER':
      return getSafetyOfficerData();
    case 'FINANCIAL_ANALYST':
      return getFinancialAnalystData();
    default:
      throw new Error(`Unsupported dashboard role: ${role}`);
  }
};

/**
 * FLEET MANAGER DASHBOARD
 */
async function getFleetManagerData() {
  const [totalVehicles, availableVehicles, onTripVehicles, maintenanceVehicles, activeTrips, pendingTrips, driversOnDuty] = await Promise.all([
    prisma.vehicle.count({ where: { status: { not: 'retired' } } }),
    prisma.vehicle.count({ where: { status: 'available' } }),
    prisma.vehicle.count({ where: { status: 'on_trip' } }),
    prisma.vehicle.count({ where: { status: 'in_shop' } }),
    prisma.trip.count({ where: { status: 'dispatched' } }),
    prisma.trip.count({ where: { status: 'draft' } }),
    prisma.driver.count({ where: { status: { in: ['available', 'on_trip'] } } })
  ]);

  const utilizationRate = totalVehicles > 0 
    ? parseFloat(((onTripVehicles / totalVehicles) * 100).toFixed(1)) 
    : 0;

  // Fleet Status Distribution Chart Data
  const fleetStatusData = [
    { name: 'Available', value: availableVehicles, color: '#4CAF50' },
    { name: 'On Trip', value: onTripVehicles, color: '#1E88E5' },
    { name: 'In Shop', value: maintenanceVehicles, color: '#F44336' }
  ];

  // Recent operational activity logs (trips & maintenance records)
  const [recentTrips, activeMaintenance] = await Promise.all([
    prisma.trip.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        vehicle: { select: { registrationNumber: true } },
        driver: { select: { fullName: true } }
      }
    }),
    prisma.maintenanceRecord.findMany({
      take: 5,
      where: { status: 'open' },
      orderBy: { openedAt: 'desc' },
      include: { vehicle: { select: { registrationNumber: true } } }
    })
  ]);

  return {
    kpis: {
      totalVehicles,
      availableVehicles,
      onTripVehicles,
      maintenanceVehicles,
      activeTrips,
      pendingTrips,
      driversOnDuty,
      utilizationRate
    },
    fleetStatusData,
    recentTrips: recentTrips.map(t => ({
      id: t.id,
      route: `${t.source} → ${t.destination}`,
      vehicle: t.vehicle.registrationNumber,
      driver: t.driver.fullName,
      status: t.status.toUpperCase(),
      timestamp: t.createdAt
    })),
    activeMaintenance: activeMaintenance.map(m => ({
      id: m.id,
      vehicle: m.vehicle.registrationNumber,
      type: m.type,
      description: m.description,
      status: m.status.toUpperCase(),
      openedAt: m.openedAt
    }))
  };
}

/**
 * DISPATCHER DASHBOARD
 */
async function getDispatcherData() {
  const [pendingTrips, activeTrips, availableVehicles, availableDrivers] = await Promise.all([
    prisma.trip.findMany({
      where: { status: 'draft' },
      include: {
        vehicle: { select: { registrationNumber: true, model: true } },
        driver: { select: { fullName: true, rollingDutyHours: true } }
      },
      orderBy: { createdAt: 'asc' }
    }),
    prisma.trip.findMany({
      where: { status: 'dispatched' },
      include: {
        vehicle: { select: { registrationNumber: true } },
        driver: { select: { fullName: true } }
      },
      orderBy: { dispatchedAt: 'desc' }
    }),
    prisma.vehicle.findMany({
      where: { status: 'available' },
      select: { id: true, registrationNumber: true, model: true, type: true }
    }),
    prisma.driver.findMany({
      where: { status: 'available' },
      select: { id: true, fullName: true, rollingDutyHours: true, safetyScore: true }
    })
  ]);

  return {
    kpis: {
      pendingCount: pendingTrips.length,
      activeCount: activeTrips.length,
      availableVehiclesCount: availableVehicles.length,
      availableDriversCount: availableDrivers.length
    },
    pendingTrips: pendingTrips.map(t => ({
      id: t.id,
      source: t.source,
      destination: t.destination,
      cargoWeightKg: parseFloat(t.cargoWeightKg),
      plannedDistanceKm: parseFloat(t.plannedDistanceKm),
      vehicle: t.vehicle ? `${t.vehicle.registrationNumber} (${t.vehicle.model})` : 'Unassigned',
      driver: t.driver ? `${t.driver.fullName} (${parseFloat(t.driver.rollingDutyHours)} hrs)` : 'Unassigned'
    })),
    activeTrips: activeTrips.map(t => ({
      id: t.id,
      source: t.source,
      destination: t.destination,
      vehicle: t.vehicle.registrationNumber,
      driver: t.driver.fullName,
      dispatchedAt: t.dispatchedAt
    })),
    availableVehicles,
    availableDrivers
  };
}

/**
 * DRIVER DASHBOARD
 */
async function getDriverData(userId) {
  // 1. Resolve user ID to driver_id from profiles table
  const profile = await prisma.$queryRaw`
    SELECT driver_id FROM public.profiles WHERE id = ${userId}::uuid LIMIT 1
  `;

  const driverId = profile && profile[0] ? profile[0].driver_id : null;
  if (!driverId) {
    return {
      error: 'No driver associated with this profile.'
    };
  }

  // 2. Fetch driver stats, current assignments, and history
  const [driver, trips] = await Promise.all([
    prisma.driver.findUnique({ where: { id: driverId } }),
    prisma.trip.findMany({
      where: { driverId },
      include: { vehicle: true },
      orderBy: { createdAt: 'desc' }
    })
  ]);

  if (!driver) {
    return {
      error: 'Driver details not found in drivers table.'
    };
  }

  const activeTrip = trips.find(t => t.status === 'dispatched');
  const upcomingTrips = trips.filter(t => t.status === 'draft');

  return {
    driver: {
      name: driver.fullName,
      licenseNumber: driver.licenseNumber,
      safetyScore: parseFloat(driver.safetyScore),
      rollingDutyHours: parseFloat(driver.rollingDutyHours),
      status: driver.status.toUpperCase()
    },
    activeTrip: activeTrip ? {
      id: activeTrip.id,
      source: activeTrip.source,
      destination: activeTrip.destination,
      cargoWeightKg: parseFloat(activeTrip.cargoWeightKg),
      plannedDistanceKm: parseFloat(activeTrip.plannedDistanceKm),
      vehicle: `${activeTrip.vehicle.registrationNumber} (${activeTrip.vehicle.model})`,
      dispatchedAt: activeTrip.dispatchedAt
    } : null,
    upcomingTrips: upcomingTrips.map(t => ({
      id: t.id,
      source: t.source,
      destination: t.destination,
      plannedDistanceKm: parseFloat(t.plannedDistanceKm),
      vehicle: `${t.vehicle.registrationNumber} (${t.vehicle.model})`
    }))
  };
}

/**
 * SAFETY OFFICER DASHBOARD
 */
async function getSafetyOfficerData() {
  const now = new Date();
  const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const [drivers, evaluatedTrips] = await Promise.all([
    prisma.driver.findMany({
      include: {
        trips: {
          where: { status: 'dispatched' }
        }
      }
    }),
    safetyService.getTripsEligibility()
  ]);

  let expiredLicenses = 0;
  let expiringSoonLicenses = 0;
  let safetyScoreSum = 0;
  let totalSuspended = 0;
  
  let excellentCount = 0;
  let goodCount = 0;
  let atRiskCount = 0;
  let criticalCount = 0;

  const alertingDrivers = [];

  for (const d of drivers) {
    const expiry = new Date(d.licenseExpiry);
    const score = parseFloat(d.safetyScore);
    safetyScoreSum += score;

    // Apply centralized risk intelligence
    const riskResult = safetyService.calculateDriverRisk(d, d.trips);
    d.riskScore = riskResult.riskScore;
    d.riskLevel = riskResult.riskLevel;
    d.reasons = riskResult.reasons;

    // Safety classification stats
    if (score >= safetyService.THRESHOLDS.EXCELLENT) excellentCount++;
    else if (score >= safetyService.THRESHOLDS.GOOD) goodCount++;
    else if (score >= safetyService.THRESHOLDS.HARD_ELIGIBILITY) atRiskCount++;
    else criticalCount++;

    if (d.status === 'suspended') {
      totalSuspended++;
    }

    // Expiry classifications
    if (expiry < now) {
      expiredLicenses++;
    } else if (expiry <= thirtyDaysFromNow) {
      expiringSoonLicenses++;
    }

    // Add compliance alerts
    if (d.reasons.length > 0) {
      // Map reasons to a unified list
      d.reasons.forEach(r => {
        let recommendedAction = 'Review driver status';
        if (r.code === 'LICENSE_EXPIRED') recommendedAction = 'Suspend from operations immediately';
        else if (r.code === 'CRITICAL_SAFETY_SCORE') recommendedAction = 'Suspend and enroll in safety retraining';
        else if (r.code === 'DRIVER_AVAILABLE_WITH_EXPIRED_LICENSE') recommendedAction = 'Re-toggle to SUSPENDED status';
        else if (r.code === 'UNSAFE_ACTIVE_TRIP_EXPIRED_LICENSE') recommendedAction = 'Recall active dispatch immediately';
        else if (r.code === 'UNSAFE_ACTIVE_TRIP_SUSPENDED') recommendedAction = 'Recall trip immediately';
        
        alertingDrivers.push({
          id: d.id,
          name: d.fullName,
          code: r.code,
          issue: r.message,
          severity: r.severity,
          expiryDate: d.licenseExpiry,
          safetyScore: score,
          status: d.status,
          riskScore: d.riskScore,
          recommendedAction
        });
      });
    }
  }

  // Fleet Metrics
  const averageSafetyScore = drivers.length > 0
    ? parseFloat((safetyScoreSum / drivers.length).toFixed(1))
    : 100;

  const validLicenseCount = drivers.filter(d => new Date(d.licenseExpiry) >= now).length;
  const licenseComplianceRate = drivers.length > 0
    ? parseFloat(((validLicenseCount / drivers.length) * 100).toFixed(1))
    : 100;

  const tripsAtRiskCount = evaluatedTrips.filter(t => !t.eligible).length;

  const driversRequiringAction = drivers.filter(d => d.riskLevel === 'CRITICAL' || d.riskLevel === 'HIGH' || d.status === 'suspended').length;

  const safetyDistribution = [
    { name: `Excellent (>=${safetyService.THRESHOLDS.EXCELLENT})`, value: excellentCount, color: '#16a34a' },
    { name: `Good (${safetyService.THRESHOLDS.GOOD}-${safetyService.THRESHOLDS.EXCELLENT-1})`, value: goodCount, color: '#ca8a04' },
    { name: `At Risk (${safetyService.THRESHOLDS.HARD_ELIGIBILITY}-${safetyService.THRESHOLDS.GOOD-1})`, value: atRiskCount, color: '#ea580c' },
    { name: `Critical (<${safetyService.THRESHOLDS.HARD_ELIGIBILITY})`, value: criticalCount, color: '#dc2626' }
  ];

  return {
    kpis: {
      averageSafetyScore,
      expiredLicenses,
      expiringSoonLicenses,
      suspendedDrivers: totalSuspended,
      totalDrivers: drivers.length,
      licenseComplianceRate,
      tripsAtRiskCount,
      driversRequiringAction
    },
    safetyDistribution,
    alertingDrivers
  };
}

/**
 * FINANCIAL ANALYST DASHBOARD
 */
async function getFinancialAnalystData() {
  const [fuelAggregate, maintenanceAggregate, otherAggregate, vehicles, trips] = await Promise.all([
    prisma.expense.aggregate({
      where: { category: 'fuel' },
      _sum: { cost: true }
    }),
    prisma.maintenanceRecord.aggregate({
      _sum: { cost: true }
    }),
    prisma.expense.aggregate({
      where: { category: { not: 'fuel' } },
      _sum: { cost: true }
    }),
    prisma.vehicle.findMany({
      select: { id: true, registrationNumber: true, model: true, acquisitionCost: true }
    }),
    prisma.trip.findMany({
      where: { status: 'completed' },
      select: { id: true, vehicleId: true, revenue: true }
    })
  ]);

  const fuelCost = parseFloat(fuelAggregate._sum.cost) || 0;
  const maintenanceCost = parseFloat(maintenanceAggregate._sum.cost) || 0;
  const otherCost = parseFloat(otherAggregate._sum.cost) || 0;
  const totalCost = fuelCost + maintenanceCost + otherCost;

  // Expenses chart data
  const expenseBreakdown = [
    { name: 'Fuel Expenditure', value: fuelCost, color: '#FFB300' },
    { name: 'Maintenance Log Costs', value: maintenanceCost, color: '#E53935' },
    { name: 'Other (Toll/Misc)', value: otherCost, color: '#1E88E5' }
  ];

  // Dynamically calculate ROI per vehicle
  // ROI = (Revenue - Expenses - Maintenance) / Acquisition Cost * 100
  const vehicleROI = [];
  for (const v of vehicles) {
    const acqCost = parseFloat(v.acquisitionCost) || 0;

    // Filter completed trips for this vehicle
    const vehicleTrips = trips.filter(t => t.vehicleId === v.id);
    const revenue = vehicleTrips.reduce((sum, t) => sum + (parseFloat(t.revenue) || 0), 0);

    // Sum fuel and maintenance for this vehicle
    const [fuelVeh, maintVeh] = await Promise.all([
      prisma.expense.aggregate({
        where: { vehicleId: v.id, category: 'fuel' },
        _sum: { cost: true }
      }),
      prisma.maintenanceRecord.aggregate({
        where: { vehicleId: v.id },
        _sum: { cost: true }
      })
    ]);

    const fuelSpend = parseFloat(fuelVeh._sum.cost) || 0;
    const maintSpend = parseFloat(maintVeh._sum.cost) || 0;

    const profit = revenue - (fuelSpend + maintSpend);
    const roiPercent = acqCost > 0
      ? parseFloat(((profit / acqCost) * 100).toFixed(1))
      : 0;

    vehicleROI.push({
      id: v.id,
      registrationNumber: v.registrationNumber,
      model: v.model,
      revenue,
      costs: fuelSpend + maintSpend,
      profit,
      acquisitionCost: acqCost,
      roiPercent
    });
  }

  // Sort by highest ROI percent first
  vehicleROI.sort((a, b) => b.roiPercent - a.roiPercent);

  return {
    kpis: {
      fuelCost,
      maintenanceCost,
      otherCost,
      totalCost
    },
    expenseBreakdown,
    vehicleROI
  };
}

/**
 * ADMIN DASHBOARD DATA
 */
async function getAdminData() {
  const [totalUsers, totalVehicles, totalDrivers, totalTrips, lockedUsersCount, inactiveUsersCount] = await Promise.all([
    prisma.user.count(),
    prisma.vehicle.count(),
    prisma.driver.count(),
    prisma.trip.count(),
    prisma.user.count({ where: { lockedUntil: { gt: new Date() } } }),
    prisma.user.count({ where: { isActive: false } })
  ]);

  const recentUsers = await prisma.user.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      failedLoginAttempts: true,
      lockedUntil: true
    }
  });

  const [recentTrips, recentMaintenance] = await Promise.all([
    prisma.trip.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        vehicle: { select: { registrationNumber: true } },
        driver: { select: { fullName: true } }
      }
    }),
    prisma.maintenanceRecord.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        vehicle: { select: { registrationNumber: true } }
      }
    })
  ]);

  const systemActivity = [];

  for (const t of recentTrips) {
    systemActivity.push({
      id: t.id,
      type: 'TRIP',
      description: `Trip dispatched: ${t.source} → ${t.destination}`,
      details: `Vehicle: ${t.vehicle.registrationNumber} · Driver: ${t.driver.fullName}`,
      timestamp: t.createdAt
    });
  }

  for (const m of recentMaintenance) {
    systemActivity.push({
      id: m.id,
      type: 'MAINTENANCE',
      description: `Maintenance logged: ${m.description}`,
      details: `Vehicle: ${m.vehicle.registrationNumber} · Type: ${m.type}`,
      timestamp: m.createdAt
    });
  }

  // Sort combined activity by timestamp descending
  systemActivity.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return {
    kpis: {
      totalUsers,
      totalVehicles,
      totalDrivers,
      totalTrips,
      lockedUsers: lockedUsersCount,
      inactiveUsers: inactiveUsersCount
    },
    recentUsers: recentUsers.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      isActive: u.isActive,
      failedAttempts: u.failedLoginAttempts,
      lockedUntil: u.lockedUntil
    })),
    systemActivity: systemActivity.slice(0, 5)
  };
}

module.exports = {
  getOverviewData,
};
