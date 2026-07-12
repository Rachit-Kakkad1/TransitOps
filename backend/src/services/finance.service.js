const prisma = require('../config/db');

/**
 * FINANCE SERVICE — Fleet Financial Intelligence
 *
 * Provides 5 analytical data methods for the Financial Analyst role.
 * All monetary values are returned as plain numbers (not Decimal).
 */

// ─────────────────────────────────────────────────
// 1. FINANCIAL OVERVIEW — Fleet-level KPIs
// ─────────────────────────────────────────────────
async function getFinancialOverview() {
  const [
    fuelAgg,
    tollAgg,
    otherAgg,
    maintenanceAgg,
    revenueAgg,
    totalDistanceAgg,
    anomalyCount,
    completedTripCount,
  ] = await Promise.all([
    prisma.expense.aggregate({ where: { category: 'fuel' }, _sum: { cost: true } }),
    prisma.expense.aggregate({ where: { category: 'toll' }, _sum: { cost: true } }),
    prisma.expense.aggregate({ where: { category: 'other' }, _sum: { cost: true } }),
    prisma.maintenanceRecord.aggregate({ _sum: { cost: true } }),
    prisma.trip.aggregate({ where: { status: 'completed' }, _sum: { revenue: true } }),
    prisma.trip.aggregate({ where: { status: 'completed' }, _sum: { actualDistanceKm: true } }),
    prisma.expense.count({ where: { anomalyFlag: true } }),
    prisma.trip.count({ where: { status: 'completed' } }),
  ]);

  const fuelCost = parseFloat(fuelAgg._sum.cost) || 0;
  const tollCost = parseFloat(tollAgg._sum.cost) || 0;
  const otherCost = parseFloat(otherAgg._sum.cost) || 0;
  const maintenanceCost = parseFloat(maintenanceAgg._sum.cost) || 0;
  const totalRevenue = parseFloat(revenueAgg._sum.revenue) || 0;
  const totalDistanceKm = parseFloat(totalDistanceAgg._sum.actualDistanceKm) || 0;

  const totalOpex = fuelCost + tollCost + otherCost + maintenanceCost;
  const fleetProfit = totalRevenue - totalOpex;
  const profitMarginPct = totalRevenue > 0
    ? parseFloat(((fleetProfit / totalRevenue) * 100).toFixed(1))
    : 0;
  const avgCostPerKm = totalDistanceKm > 0
    ? parseFloat((totalOpex / totalDistanceKm).toFixed(2))
    : 0;
  const fuelSharePct = totalOpex > 0
    ? parseFloat(((fuelCost / totalOpex) * 100).toFixed(1))
    : 0;
  const maintenanceSharePct = totalOpex > 0
    ? parseFloat(((maintenanceCost / totalOpex) * 100).toFixed(1))
    : 0;

  const expenseBreakdown = [
    { name: 'Fuel', value: fuelCost, color: '#f59e0b' },
    { name: 'Maintenance', value: maintenanceCost, color: '#ef4444' },
    { name: 'Toll', value: tollCost, color: '#3b82f6' },
    { name: 'Other', value: otherCost, color: '#8b5cf6' },
  ];

  return {
    kpis: {
      totalRevenue,
      totalOpex,
      fleetProfit,
      profitMarginPct,
      avgCostPerKm,
      fuelCost,
      tollCost,
      otherCost,
      maintenanceCost,
      fuelSharePct,
      maintenanceSharePct,
      anomalyCount,
      completedTripCount,
      totalDistanceKm,
    },
    expenseBreakdown,
  };
}

// ─────────────────────────────────────────────────
// 2. VEHICLE PROFITABILITY — Per-vehicle breakdown
// ─────────────────────────────────────────────────
async function getVehicleProfitability() {
  const vehicles = await prisma.vehicle.findMany({
    where: { status: { not: 'retired' } },
    select: {
      id: true,
      registrationNumber: true,
      model: true,
      type: true,
      acquisitionCost: true,
      odometerKm: true,
      costPerKmBaseline: true,
    },
  });

  const [allTrips, allExpenses, allMaintenance] = await Promise.all([
    prisma.trip.findMany({
      where: { status: 'completed' },
      select: { vehicleId: true, revenue: true, actualDistanceKm: true },
    }),
    prisma.expense.findMany({
      select: { vehicleId: true, category: true, cost: true, anomalyFlag: true },
    }),
    prisma.maintenanceRecord.findMany({
      select: { vehicleId: true, cost: true },
    }),
  ]);

  // Index by vehicleId for O(n) lookup
  const tripsByVehicle = {};
  const expensesByVehicle = {};
  const maintByVehicle = {};

  for (const t of allTrips) {
    (tripsByVehicle[t.vehicleId] ||= []).push(t);
  }
  for (const e of allExpenses) {
    (expensesByVehicle[e.vehicleId] ||= []).push(e);
  }
  for (const m of allMaintenance) {
    (maintByVehicle[m.vehicleId] ||= []).push(m);
  }

  const result = vehicles.map(v => {
    const vTrips = tripsByVehicle[v.id] || [];
    const vExpenses = expensesByVehicle[v.id] || [];
    const vMaint = maintByVehicle[v.id] || [];

    const revenue = vTrips.reduce((s, t) => s + (parseFloat(t.revenue) || 0), 0);
    const totalKm = vTrips.reduce((s, t) => s + (parseFloat(t.actualDistanceKm) || 0), 0);
    const fuelCost = vExpenses.filter(e => e.category === 'fuel').reduce((s, e) => s + (parseFloat(e.cost) || 0), 0);
    const tollCost = vExpenses.filter(e => e.category === 'toll').reduce((s, e) => s + (parseFloat(e.cost) || 0), 0);
    const otherCost = vExpenses.filter(e => e.category === 'other').reduce((s, e) => s + (parseFloat(e.cost) || 0), 0);
    const maintenanceCost = vMaint.reduce((s, m) => s + (parseFloat(m.cost) || 0), 0);
    const anomalyCount = vExpenses.filter(e => e.anomalyFlag === true).length;

    const totalOpex = fuelCost + tollCost + otherCost + maintenanceCost;
    const profit = revenue - totalOpex;
    const acqCost = parseFloat(v.acquisitionCost) || 0;
    const roiPct = acqCost > 0 ? parseFloat(((profit / acqCost) * 100).toFixed(1)) : 0;
    const costPerKm = totalKm > 0 ? parseFloat((totalOpex / totalKm).toFixed(2)) : null;

    return {
      id: v.id,
      registrationNumber: v.registrationNumber,
      model: v.model,
      type: v.type,
      acquisitionCost: acqCost,
      odometerKm: parseFloat(v.odometerKm) || 0,
      costPerKmBaseline: v.costPerKmBaseline ? parseFloat(v.costPerKmBaseline) : null,
      revenue,
      fuelCost,
      tollCost,
      otherCost,
      maintenanceCost,
      totalOpex,
      profit,
      roiPct,
      costPerKm,
      tripCount: vTrips.length,
      totalKm,
      anomalyCount,
    };
  });

  // Sort by ROI descending (most profitable first)
  result.sort((a, b) => b.roiPct - a.roiPct);

  return result;
}

// ─────────────────────────────────────────────────
// 3. EXPENSE DRILLDOWN — Filterable expense list
// ─────────────────────────────────────────────────
async function getExpenseDrilldown({ category, vehicleId, startDate, endDate } = {}) {
  const where = {};

  if (category && ['fuel', 'toll', 'other'].includes(category)) {
    where.category = category;
  }
  if (vehicleId) {
    where.vehicleId = vehicleId;
  }
  if (startDate || endDate) {
    where.loggedOn = {};
    if (startDate) where.loggedOn.gte = new Date(startDate);
    if (endDate) where.loggedOn.lte = new Date(endDate);
  }

  const expenses = await prisma.expense.findMany({
    where,
    include: {
      vehicle: { select: { registrationNumber: true, model: true } },
      trip: { select: { source: true, destination: true } },
    },
    orderBy: { loggedOn: 'desc' },
  });

  // Aggregate for filtered totals
  const totals = { fuel: 0, toll: 0, other: 0, total: 0, count: expenses.length, anomalies: 0 };
  const rows = expenses.map(e => {
    const cost = parseFloat(e.cost) || 0;
    totals[e.category] = (totals[e.category] || 0) + cost;
    totals.total += cost;
    if (e.anomalyFlag) totals.anomalies++;

    return {
      id: e.id,
      vehicleReg: e.vehicle.registrationNumber,
      vehicleModel: e.vehicle.model,
      tripRoute: e.trip ? `${e.trip.source} → ${e.trip.destination}` : null,
      category: e.category,
      liters: e.liters ? parseFloat(e.liters) : null,
      cost,
      loggedOn: e.loggedOn,
      anomalyFlag: e.anomalyFlag || false,
    };
  });

  return { expenses: rows, totals };
}

// ─────────────────────────────────────────────────
// 4. MONTHLY TRENDS — Revenue & cost time series
// ─────────────────────────────────────────────────
async function getMonthlyTrends() {
  // Get all completed trips and all expenses/maintenance for the last 12 months
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
  twelveMonthsAgo.setDate(1);
  twelveMonthsAgo.setHours(0, 0, 0, 0);

  const [trips, expenses, maintenance] = await Promise.all([
    prisma.trip.findMany({
      where: { status: 'completed', completedAt: { gte: twelveMonthsAgo } },
      select: { revenue: true, completedAt: true },
    }),
    prisma.expense.findMany({
      where: { loggedOn: { gte: twelveMonthsAgo } },
      select: { cost: true, category: true, loggedOn: true },
    }),
    prisma.maintenanceRecord.findMany({
      where: { openedAt: { gte: twelveMonthsAgo } },
      select: { cost: true, openedAt: true },
    }),
  ]);

  // Build monthly buckets
  const months = {};
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    months[key] = { month: key, revenue: 0, fuel: 0, maintenance: 0, toll: 0, other: 0, totalCost: 0 };
  }

  for (const t of trips) {
    if (!t.completedAt) continue;
    const d = new Date(t.completedAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (months[key]) months[key].revenue += parseFloat(t.revenue) || 0;
  }

  for (const e of expenses) {
    const d = new Date(e.loggedOn);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (months[key]) {
      const cost = parseFloat(e.cost) || 0;
      months[key][e.category] = (months[key][e.category] || 0) + cost;
      months[key].totalCost += cost;
    }
  }

  for (const m of maintenance) {
    const d = new Date(m.openedAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (months[key]) {
      const cost = parseFloat(m.cost) || 0;
      months[key].maintenance += cost;
      months[key].totalCost += cost;
    }
  }

  // Return as sorted array
  return Object.values(months).sort((a, b) => a.month.localeCompare(b.month));
}

// ─────────────────────────────────────────────────
// 5. ANOMALY REPORT — Flagged expenses
// ─────────────────────────────────────────────────
async function getAnomalyReport() {
  const anomalies = await prisma.expense.findMany({
    where: { anomalyFlag: true },
    include: {
      vehicle: { select: { registrationNumber: true, model: true } },
      trip: { select: { source: true, destination: true } },
    },
    orderBy: { loggedOn: 'desc' },
  });

  return anomalies.map(e => ({
    id: e.id,
    vehicleId: e.vehicleId,
    vehicleReg: e.vehicle.registrationNumber,
    vehicleModel: e.vehicle.model,
    tripRoute: e.trip ? `${e.trip.source} → ${e.trip.destination}` : null,
    category: e.category,
    liters: e.liters ? parseFloat(e.liters) : null,
    cost: parseFloat(e.cost) || 0,
    loggedOn: e.loggedOn,
  }));
}

module.exports = {
  getFinancialOverview,
  getVehicleProfitability,
  getExpenseDrilldown,
  getMonthlyTrends,
  getAnomalyReport,
};
