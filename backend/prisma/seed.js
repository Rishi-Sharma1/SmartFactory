import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const main = async () => {
  console.log('Seeding Smart Factory database with full operational data...');

  const passwordHash = await bcrypt.hash('password123', 10);

  // 1. Create Users
  const owner = await prisma.user.upsert({
    where: { email: 'owner@factory.com' },
    update: { passwordHash },
    create: {
      name: 'Alice Owner',
      email: 'owner@factory.com',
      passwordHash,
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: 'manager@factory.com' },
    update: { passwordHash },
    create: {
      name: 'Bob Manager',
      email: 'manager@factory.com',
      passwordHash,
    },
  });

  const supervisor = await prisma.user.upsert({
    where: { email: 'supervisor@factory.com' },
    update: { passwordHash },
    create: {
      name: 'Charlie Supervisor',
      email: 'supervisor@factory.com',
      passwordHash,
    },
  });

  const operator = await prisma.user.upsert({
    where: { email: 'operator@factory.com' },
    update: { passwordHash },
    create: {
      name: 'Dave Operator',
      email: 'operator@factory.com',
      passwordHash,
    },
  });

  console.log('Users ready:', {
    owner: owner.email,
    manager: manager.email,
    supervisor: supervisor.email,
    operator: operator.email,
  });

  // 2. Create Factories
  let factory = await prisma.factory.findFirst({
    where: { name: 'Apex Manufacturing Facility' },
  });

  if (!factory) {
    factory = await prisma.factory.create({
      data: {
        name: 'Apex Manufacturing Facility',
        location: 'Building A, Industrial Zone, Austin TX',
      },
    });
  }

  let factory2 = await prisma.factory.findFirst({
    where: { name: 'Detroit Stamping & Assembly Plant' },
  });

  if (!factory2) {
    factory2 = await prisma.factory.create({
      data: {
        name: 'Detroit Stamping & Assembly Plant',
        location: 'Sector 4, Automotive Corridor, Detroit MI',
      },
    });
  }

  // 3. UserFactory Memberships
  const memberships = [
    { userId: owner.id, factoryId: factory.id, role: 'OWNER' },
    { userId: manager.id, factoryId: factory.id, role: 'MANAGER' },
    { userId: supervisor.id, factoryId: factory.id, role: 'SUPERVISOR' },
    { userId: operator.id, factoryId: factory.id, role: 'OPERATOR' },
    { userId: owner.id, factoryId: factory2.id, role: 'OWNER' },
    { userId: manager.id, factoryId: factory2.id, role: 'MANAGER' },
  ];

  for (const m of memberships) {
    await prisma.userFactory.upsert({
      where: {
        userId_factoryId: {
          userId: m.userId,
          factoryId: m.factoryId,
        },
      },
      update: { role: m.role },
      create: {
        userId: m.userId,
        factoryId: m.factoryId,
        role: m.role,
      },
    });
  }

  // 4. Alert Config
  await prisma.alertConfig.upsert({
    where: { factoryId: factory.id },
    update: {},
    create: {
      factoryId: factory.id,
      productionThresholdPct: 80,
      rejectionThresholdPct: 5,
      machineIdleMinutes: 30,
    },
  });

  // 5. Production Lines
  const line1 = (await prisma.productionLine.findFirst({ where: { name: 'Line 1: High Precision CNC', factoryId: factory.id } }))
    || (await prisma.productionLine.create({ data: { name: 'Line 1: High Precision CNC', factoryId: factory.id } }));

  const line2 = (await prisma.productionLine.findFirst({ where: { name: 'Line 2: Stamping & Press', factoryId: factory.id } }))
    || (await prisma.productionLine.create({ data: { name: 'Line 2: Stamping & Press', factoryId: factory.id } }));

  const line3 = (await prisma.productionLine.findFirst({ where: { name: 'Line 3: Robotic Welding', factoryId: factory.id } }))
    || (await prisma.productionLine.create({ data: { name: 'Line 3: Robotic Welding', factoryId: factory.id } }));

  const line4 = (await prisma.productionLine.findFirst({ where: { name: 'Line 4: Final Packaging', factoryId: factory.id } }))
    || (await prisma.productionLine.create({ data: { name: 'Line 4: Final Packaging', factoryId: factory.id } }));

  // 6. Machines
  const machinesData = [
    { name: 'CNC Milling Unit A-1', type: 'CNC Milling', status: 'ACTIVE', efficiencyPct: 96.5 },
    { name: 'Robotic Arm B-4', type: 'Robotic Assembly', status: 'ACTIVE', efficiencyPct: 98.2 },
    { name: 'Automated Packaging Unit C', type: 'Packaging', status: 'IDLE', efficiencyPct: 87.0 },
    { name: 'Hydraulic Press D-2', type: 'Stamping Press', status: 'FAULT', efficiencyPct: 74.0 },
  ];

  for (const m of machinesData) {
    let machine = await prisma.machine.findFirst({
      where: { name: m.name, factoryId: factory.id },
    });
    if (!machine) {
      machine = await prisma.machine.create({
        data: {
          ...m,
          factoryId: factory.id,
        },
      });
    }

    if (m.status === 'FAULT') {
      await prisma.maintenanceLog.create({
        data: {
          machineId: machine.id,
          reporterId: operator.id,
          type: 'CORRECTIVE',
          description: 'Spindle vibration exceeded threshold (4.8 mm/s). Thermal trip alert.',
          severity: 'HIGH',
        },
      }).catch(() => {});
    }
  }

  // 7. Active Shift
  let activeShift = await prisma.shift.findFirst({
    where: { factoryId: factory.id, status: 'ACTIVE' },
  });

  if (!activeShift) {
    activeShift = await prisma.shift.create({
      data: {
        factoryId: factory.id,
        type: 'MORNING',
        startTime: new Date(Date.now() - 4 * 3600 * 1000), // 4 hours ago
        supervisorId: supervisor.id,
        status: 'ACTIVE',
      },
    });
  }

  // 8. Production Runs in Active Shift
  if (line1 && line2 && line3) {
    await prisma.production.create({
      data: {
        shiftId: activeShift.id,
        lineId: line1.id,
        supervisorId: supervisor.id,
        targetUnits: 550,
        producedUnits: 524,
        rejectedUnits: 8,
        delayReason: 'None',
      },
    }).catch(() => {});

    await prisma.production.create({
      data: {
        shiftId: activeShift.id,
        lineId: line2.id,
        supervisorId: supervisor.id,
        targetUnits: 480,
        producedUnits: 442,
        rejectedUnits: 19,
        delayReason: 'Tool Wear Calibration',
      },
    }).catch(() => {});

    await prisma.production.create({
      data: {
        shiftId: activeShift.id,
        lineId: line3.id,
        supervisorId: supervisor.id,
        targetUnits: 620,
        producedUnits: 612,
        rejectedUnits: 6,
        delayReason: 'None',
      },
    }).catch(() => {});
  }

  // 9. Attendance for Active Shift
  await prisma.attendance.upsert({
    where: {
      userId_shiftId: {
        userId: operator.id,
        shiftId: activeShift.id,
      },
    },
    update: {},
    create: {
      userId: operator.id,
      shiftId: activeShift.id,
      checkIn: new Date(Date.now() - 4 * 3600 * 1000),
      status: 'PRESENT',
    },
  });

  await prisma.attendance.upsert({
    where: {
      userId_shiftId: {
        userId: supervisor.id,
        shiftId: activeShift.id,
      },
    },
    update: {},
    create: {
      userId: supervisor.id,
      shiftId: activeShift.id,
      checkIn: new Date(Date.now() - 4.2 * 3600 * 1000),
      status: 'PRESENT',
    },
  });

  // 10. Initial Notifications
  await prisma.notification.create({
    data: {
      factoryId: factory.id,
      type: 'MACHINE_FAULT',
      severity: 'WARNING',
      message: 'Hydraulic Press D-2 reported spindle vibration over limit.',
    },
  }).catch(() => {});

  await prisma.notification.create({
    data: {
      factoryId: factory.id,
      type: 'LOW_PRODUCTION',
      severity: 'INFO',
      message: 'Morning Shift output on Line 1 reached 95% of target.',
    },
  }).catch(() => {});

  console.log('Operational seed successfully loaded into PostgreSQL!');
};

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
