const prisma = require('../config/db');

const getAllDrivers = async (req, res, next) => {
  try {
    const drivers = await prisma.driver.findMany({
      orderBy: { fullName: 'asc' }
    });
    res.json({ success: true, data: drivers });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllDrivers,
};
