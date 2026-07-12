const prisma = require('../config/db');

const getAllTrips = async (req, res, next) => {
  try {
    const trips = await prisma.trip.findMany({
      include: {
        vehicle: true,
        driver: true,
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: trips });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllTrips,
};
