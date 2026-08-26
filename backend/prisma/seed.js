import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const main = async () => {
  console.log('Seeding Smart Factory database...');

  const passwordHash = await bcrypt.hash('password123', 10);

  // 1. Create Users
  const owner = await prisma.user.upsert({
    where: { email: 'owner@factory.com' },
    update: {},
    create: {
      name: 'Alice Owner',
      email: 'owner@factory.com',
      passwordHash,
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: 'manager@factory.com' },
    update: {},
    create: {
      name: 'Bob Manager',
      email: 'manager@factory.com',
      passwordHash,
    },
  });

  const supervisor = await prisma.user.upsert({
    where: { email: 'supervisor@factory.com' },
    update: {},
    create: {
      name: 'Charlie Supervisor',
      email: 'supervisor@factory.com',
      passwordHash,
    },
  });

  const operator = await prisma.user.upsert({
    where: { email: 'operator@factory.com' },
    update: {},
    create: {
      name: 'Dave Operator',
      email: 'operator@factory.com',
      passwordHash,
    },
  });

  console.log('Created Users:', { owner: owner.id, manager: manager.id, supervisor: supervisor.id, operator: operator.id });

  // 2. Create Factory
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

  console.log('Created Factory:', factory.id);

  // 3. UserFactory Memberships
  const memberships = [
    { userId: owner.id, role: 'OWNER' },
    { userId: manager.id, role: 'MANAGER' },
    { userId: supervisor.id, role: 'SUPERVISOR' },
    { userId: operator.id, role: 'OPERATOR' },
  ];

  for (const m of memberships) {
    await prisma.userFactory.upsert({
      where: {
        userId_factoryId: {
          userId: m.userId,
          factoryId: factory.id,
        },
      },
      update: { role: m.role },
      create: {
        userId: m.userId,
        factoryId: factory.id,
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
  const lineNames = ['Assembly Line 1', 'Packaging Line 2'];
  for (const name of lineNames) {
    const existing = await prisma.productionLine.findFirst({
      where: { name, factoryId: factory.id },
    });
    if (!existing) {
      await prisma.productionLine.create({
        data: { name, factoryId: factory.id },
      });
    }
  }

  // 6. Machines
  const machinesData = [
    { name: 'CNC Milling Unit A', type: 'CNC Milling', status: 'ACTIVE', efficiencyPct: 94.5 },
    { name: 'Robotic Arm B', type: 'Robotic Arm', status: 'ACTIVE', efficiencyPct: 98.2 },
    { name: 'Automated Packaging Machine C', type: 'Packaging', status: 'IDLE', efficiencyPct: 85.0 },
  ];

  for (const m of machinesData) {
    const existing = await prisma.machine.findFirst({
      where: { name: m.name, factoryId: factory.id },
    });
    if (!existing) {
      await prisma.machine.create({
        data: {
          ...m,
          factoryId: factory.id,
        },
      });
    }
  }

  console.log('Seeding completed successfully!');
};

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
