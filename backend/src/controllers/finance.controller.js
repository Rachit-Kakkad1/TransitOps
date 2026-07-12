const financeService = require('../services/finance.service');

const getOverview = async (req, res, next) => {
  try {
    const data = await financeService.getFinancialOverview();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const getVehicles = async (req, res, next) => {
  try {
    const data = await financeService.getVehicleProfitability();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const getExpenses = async (req, res, next) => {
  try {
    const { category, vehicleId, startDate, endDate } = req.query;
    const data = await financeService.getExpenseDrilldown({ category, vehicleId, startDate, endDate });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const getTrends = async (req, res, next) => {
  try {
    const data = await financeService.getMonthlyTrends();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const getAnomalies = async (req, res, next) => {
  try {
    const data = await financeService.getAnomalyReport();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getOverview,
  getVehicles,
  getExpenses,
  getTrends,
  getAnomalies,
};
