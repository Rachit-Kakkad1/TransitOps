const prisma = require('../config/db');

const getAllVehicles = async (req, res, next) => {
  try {
    const vehicles = await prisma.vehicle.findMany({
      orderBy: { registrationNumber: 'asc' }
    });
    res.json({ success: true, data: vehicles });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllVehicles,
};
