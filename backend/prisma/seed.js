const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const DEMO_USERS = [
  {
    name: 'Demo Fleet Manager',
    email: 'manager@transitops.demo',
    role: 'FLEET_MANAGER',
  },
  {
    name: 'Demo Dispatcher',
    email: 'dispatcher@transitops.demo',
    role: 'DISPATCHER',
  },
  {
    name: 'Demo Safety Officer',
    email: 'safety@transitops.demo',
    role: 'SAFETY_OFFICER',
  },
  {
    name: 'Demo Financial Analyst',
    email: 'analyst@transitops.demo',
    role: 'FINANCIAL_ANALYST',
  },
  {
    name: 'Demo Driver',
    email: 'driver@transitops.demo',
    role: 'DRIVER',
  }
];

async function main() {
  console.log('Seeding demo accounts...');
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('password123', salt);

  for (const user of DEMO_USERS) {
    const upsertedUser = await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        role: user.role,
        passwordHash: passwordHash,
        isActive: true,
      },
      create: {
        name: user.name,
        email: user.email,
        role: user.role,
        passwordHash: passwordHash,
        isActive: true,
      },
    });
    console.log(`Upserted user: ${upsertedUser.name} (${upsertedUser.role})`);
  }

  console.log('Clearing existing operational and financial records to ensure fresh seeding...');
  // Delete in correct order to avoid foreign key violations
  await prisma.expense.deleteMany({});
  await prisma.maintenanceRecord.deleteMany({});
  await prisma.trip.deleteMany({});
  await prisma.vehicle.deleteMany({});
  await prisma.driver.deleteMany({});
  console.log('Cleared operational and financial tables.');

  console.log('Seeding rich financial operational data...');

  // 1. Seed Vehicles
  const vehiclesData = [
    { registrationNumber: 'MH-12-PQ-1234', model: 'Tata Prima 5530.S', type: 'Trailer', maxLoadCapacityKg: 40000, odometerKm: 125000, acquisitionCost: 4500000, status: 'available', costPerKmBaseline: 18.5 },
    { registrationNumber: 'DL-01-AB-5678', model: 'Ashok Leyland Ecomet', type: 'Rigid Truck', maxLoadCapacityKg: 15000, odometerKm: 82000, acquisitionCost: 2800000, status: 'available', costPerKmBaseline: 14.2 },
    { registrationNumber: 'KA-03-MM-9012', model: 'BharatBenz 2823R', type: 'Heavy Duty', maxLoadCapacityKg: 28000, odometerKm: 148000, acquisitionCost: 3800000, status: 'available', costPerKmBaseline: 16.8 },
    { registrationNumber: 'HR-55-XY-3456', model: 'Mahindra Blazo X 35', type: 'Tipper', maxLoadCapacityKg: 35000, odometerKm: 65000, acquisitionCost: 4200000, status: 'available', costPerKmBaseline: 22.0 },
    { registrationNumber: 'GJ-01-ZZ-7890', model: 'Volvo FMX 460', type: 'Heavy Puller', maxLoadCapacityKg: 50000, odometerKm: 98000, acquisitionCost: 8500000, status: 'available', costPerKmBaseline: 29.5 },
    { registrationNumber: 'MH-43-RR-4321', model: 'Tata Ultra T.7', type: 'Light Truck', maxLoadCapacityKg: 7000, odometerKm: 34000, acquisitionCost: 1500000, status: 'available', costPerKmBaseline: 9.8 },
    { registrationNumber: 'KA-51-EF-2468', model: 'Eicher Pro 2049', type: 'Mini Truck', maxLoadCapacityKg: 3500, odometerKm: 18000, acquisitionCost: 1100000, status: 'available', costPerKmBaseline: 7.2 },
    { registrationNumber: 'DL-03-CD-1357', model: 'Scania G410', type: 'Heavy Duty', maxLoadCapacityKg: 49000, odometerKm: 210000, acquisitionCost: 9200000, status: 'available', costPerKmBaseline: 26.0 }
  ];

  const seededVehicles = [];
  for (const v of vehiclesData) {
    const seeded = await prisma.vehicle.create({ data: v });
    seededVehicles.push(seeded);
  }
  console.log(`Seeded ${seededVehicles.length} vehicles.`);

  // 2. Seed Drivers
  const driversData = [
    { fullName: 'Rajesh Kumar', licenseNumber: 'DL-1420180098765', licenseCategory: 'HMV', licenseExpiry: new Date('2029-05-15'), contact: '+91 98765 43210', status: 'available', safetyScore: 88.5, rollingDutyHours: 32.0 },
    { fullName: 'Amit Singh', licenseNumber: 'MH-1220150012345', licenseCategory: 'HMV', licenseExpiry: new Date('2027-10-22'), contact: '+91 87654 32109', status: 'available', safetyScore: 92.0, rollingDutyHours: 24.5 },
    { fullName: 'Vikram Rathore', licenseNumber: 'KA-0320120045678', licenseCategory: 'HMV', licenseExpiry: new Date('2026-08-10'), contact: '+91 76543 21098', status: 'available', safetyScore: 78.2, rollingDutyHours: 41.0 },
    { fullName: 'Sanjay Dutt', licenseNumber: 'HR-5520190034567', licenseCategory: 'HMV', licenseExpiry: new Date('2028-12-05'), contact: '+91 65432 10987', status: 'available', safetyScore: 84.0, rollingDutyHours: 18.5 },
    { fullName: 'Gurpreet Singh', licenseNumber: 'PB-0220100099887', licenseCategory: 'HMV', licenseExpiry: new Date('2030-01-30'), contact: '+91 99887 76655', status: 'available', safetyScore: 95.5, rollingDutyHours: 28.0 }
  ];

  const seededDrivers = [];
  for (const d of driversData) {
    const seeded = await prisma.driver.create({ data: d });
    seededDrivers.push(seeded);
  }
  console.log(`Seeded ${seededDrivers.length} drivers.`);

  // 3. Seed Trips (Completed, Dispatched, Draft, Cancelled)
  const tripRoutes = [
    { source: 'Mumbai', destination: 'Pune', distance: 150, baseRevenue: 25000 },
    { source: 'Delhi', destination: 'Jaipur', distance: 270, baseRevenue: 42000 },
    { source: 'Bengaluru', destination: 'Chennai', distance: 350, baseRevenue: 55000 },
    { source: 'Ahmedabad', destination: 'Mumbai', distance: 530, baseRevenue: 85000 },
    { source: 'Delhi', destination: 'Mumbai', distance: 1400, baseRevenue: 210000 },
    { source: 'Hyderabad', destination: 'Bengaluru', distance: 570, baseRevenue: 92000 },
    { source: 'Kolkata', destination: 'Patna', distance: 580, baseRevenue: 88000 },
    { source: 'Pune', destination: 'Goa', distance: 440, baseRevenue: 68000 }
  ];

  console.log('Seeding trips, maintenance logs, and expense records...');
  const now = new Date();
  
  // Seed historical completed trips and expenses
  for (let i = 0; i < 24; i++) {
    const vehicle = seededVehicles[i % seededVehicles.length];
    const driver = seededDrivers[i % seededDrivers.length];
    const route = tripRoutes[i % tripRoutes.length];
    
    const tripDate = new Date();
    // Distribute trips backwards monthly
    tripDate.setMonth(now.getMonth() - Math.floor(i / 4));
    tripDate.setDate(1 + (i * 7) % 28);
    tripDate.setHours(10, 0, 0, 0);

    const completedDate = new Date(tripDate);
    completedDate.setHours(completedDate.getHours() + Math.ceil(route.distance / 50)); // ~50 km/h average speed

    // Create Trip
    const revenue = route.baseRevenue + (Math.random() - 0.5) * 5000;
    const actualDistance = route.distance + (Math.random() - 0.5) * 20;

    const trip = await prisma.trip.create({
      data: {
        source: route.source,
        destination: route.destination,
        vehicleId: vehicle.id,
        driverId: driver.id,
        cargoWeightKg: 1000 + Math.random() * 20000,
        plannedDistanceKm: route.distance,
        actualDistanceKm: actualDistance,
        status: 'completed',
        revenue: revenue,
        dispatchedAt: tripDate,
        completedAt: completedDate,
        createdAt: tripDate,
        updatedAt: completedDate
      }
    });

    // Create Fuel Expense for this trip
    const liters = actualDistance / (4 + Math.random() * 2); // 4-6 km/L efficiency
    const fuelCost = liters * (95 + Math.random() * 5); // Rs. 95-100 per liter
    const fuelExpense = await prisma.expense.create({
      data: {
        vehicleId: vehicle.id,
        tripId: trip.id,
        category: 'fuel',
        liters: liters,
        cost: fuelCost,
        loggedOn: tripDate,
        anomalyFlag: false,
        loggedBy: 'System'
      }
    });

    // Create Toll Expense for this trip
    const tollCost = Math.ceil((actualDistance / 100) * 150); // Rs 150 per 100 km approx
    const tollExpense = await prisma.expense.create({
      data: {
        vehicleId: vehicle.id,
        tripId: trip.id,
        category: 'toll',
        cost: tollCost,
        loggedOn: tripDate,
        anomalyFlag: false,
        loggedBy: 'System'
      }
    });

    // Occasional other expenses or anomaly fuel logs
    if (i % 6 === 0) {
      // Log an other expense
      await prisma.expense.create({
        data: {
          vehicleId: vehicle.id,
          tripId: trip.id,
          category: 'other',
          cost: 800 + Math.random() * 1500, // Miscellaneous repair/unloading charges
          loggedOn: tripDate,
          anomalyFlag: false,
          loggedBy: 'driver@transitops.demo'
        }
      });
    }

    if (i === 4 || i === 12 || i === 18) {
      // Seed some abnormal high fuel expenses (Anomalies)
      await prisma.expense.create({
        data: {
          vehicleId: vehicle.id,
          tripId: trip.id,
          category: 'fuel',
          liters: liters * 1.8, // 80% higher consumption (theft or leakage simulation)
          cost: fuelCost * 1.8,
          loggedOn: new Date(tripDate.getTime() + 12 * 60 * 60 * 1000),
          anomalyFlag: true,
          loggedBy: 'Fuel Card Auto Audit',
          createdAt: tripDate
        }
      });
    }
  }

  // Seed some standalone maintenance logs
  for (let i = 0; i < 8; i++) {
    const vehicle = seededVehicles[i % seededVehicles.length];
    const maintDate = new Date();
    maintDate.setMonth(now.getMonth() - Math.floor(i / 2));
    maintDate.setDate(5 + (i * 10) % 20);

    const cost = i % 3 === 0 
      ? 15000 + Math.random() * 10000 // Regular preventive service
      : 45000 + Math.random() * 40000; // Engine/Transmission work

    await prisma.maintenanceRecord.create({
      data: {
        vehicleId: vehicle.id,
        type: i % 3 === 0 ? 'preventive' : 'reactive',
        description: i % 3 === 0 ? 'Scheduled Engine Oil & Filter Replacement' : 'Brake Liner & Suspension Hanger Overhaul',
        cost: cost,
        status: 'closed',
        openedAt: maintDate,
        closedAt: new Date(maintDate.getTime() + 24 * 60 * 60 * 1000),
        createdAt: maintDate
      }
    });
  }

  // Seed one active maintenance log
  await prisma.maintenanceRecord.create({
    data: {
      vehicleId: seededVehicles[2].id,
      type: 'reactive',
      description: 'Alternator replacement and electrical diagnostics',
      cost: 18500,
      status: 'open',
      openedAt: new Date(now.getTime() - 12 * 60 * 60 * 1000),
    }
  });

  console.log('Seeded complete operational & financial records successfully!');
  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error('Error seeding data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
