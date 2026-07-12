const prisma = require('../config/db');

const getAllMaintenanceRecords = async (req, res, next) => {
  try {
    const records = await prisma.maintenanceRecord.findMany({
      include: {
        vehicle: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: records });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllMaintenanceRecords,
};
