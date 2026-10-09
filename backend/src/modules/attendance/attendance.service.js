import bcrypt from 'bcrypt';
import prisma from '../../config/db.js';
import { emitToFactory } from '../../config/socket.js';

export const addLabourToRoster = async (data, supervisorUserId, factoryId) => {
  let { name, email, initialStatus = 'ABSENT', shiftId } = data;

  if (!email || !email.trim()) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const rand = Math.floor(1000 + Math.random() * 9000);
    email = `labour_${slug}_${rand}@factory.com`;
  }

  // 1. Find or create user
  let user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    const passwordHash = await bcrypt.hash('password123', 10);
    user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
      },
    });
  }

  // 2. Link user to factory as OPERATOR (Labour)
  await prisma.userFactory.upsert({
    where: {
      userId_factoryId: {
        userId: user.id,
        factoryId,
      },
    },
    update: {
      role: 'OPERATOR',
      isActive: true,
    },
    create: {
      userId: user.id,
      factoryId,
      role: 'OPERATOR',
      isActive: true,
    },
  });

  // 3. Attach to active shift or specified shiftId
  let targetShiftId = shiftId;
  if (!targetShiftId) {
    const activeShift = await prisma.shift.findFirst({
      where: { factoryId, status: 'ACTIVE' },
    });
    if (activeShift) {
      targetShiftId = activeShift.id;
    } else {
      const lastShift = await prisma.shift.findFirst({
        where: { factoryId },
        orderBy: { createdAt: 'desc' },
      });
      if (lastShift) {
        targetShiftId = lastShift.id;
      }
    }
  }

  let attendanceRecord = null;
  if (targetShiftId) {
    attendanceRecord = await prisma.attendance.upsert({
      where: {
        userId_shiftId: {
          userId: user.id,
          shiftId: targetShiftId,
        },
      },
      update: {
        status: initialStatus,
        markedBy: supervisorUserId,
        checkIn: initialStatus === 'PRESENT' ? new Date() : null,
      },
      create: {
        userId: user.id,
        shiftId: targetShiftId,
        status: initialStatus,
        markedBy: supervisorUserId,
        checkIn: initialStatus === 'PRESENT' ? new Date() : null,
      },
    });

    await notifyAttendanceUpdated(targetShiftId, factoryId);
  }

  return {
    userId: user.id,
    name: user.name,
    email: user.email,
    role: 'OPERATOR',
    status: attendanceRecord ? attendanceRecord.status : initialStatus,
    attendanceId: attendanceRecord ? attendanceRecord.id : null,
  };
};

export const selfCheckIn = async (userId, shiftId, factoryId) => {
  const shift = await prisma.shift.findFirst({
    where: { id: shiftId, factoryId, status: 'ACTIVE' },
  });

  if (!shift) {
    throw { statusCode: 400, message: 'Active shift not found' };
  }

  const attendance = await prisma.attendance.upsert({
    where: {
      userId_shiftId: {
        userId,
        shiftId,
      },
    },
    update: {
      status: 'PRESENT',
      checkIn: new Date(),
    },
    create: {
      userId,
      shiftId,
      status: 'PRESENT',
      checkIn: new Date(),
      markedBy: null,
    },
  });

  await notifyAttendanceUpdated(shiftId, factoryId);
  return attendance;
};

export const selfCheckOut = async (attendanceId, userId, factoryId) => {
  const attendance = await prisma.attendance.findUnique({
    where: { id: attendanceId },
    include: { shift: true },
  });

  if (!attendance) {
    throw { statusCode: 404, message: 'Attendance record not found' };
  }

  if (attendance.userId !== userId) {
    throw { statusCode: 403, message: 'You can only check out of your own attendance record' };
  }

  const updated = await prisma.attendance.update({
    where: { id: attendanceId },
    data: { checkOut: new Date() },
  });

  await notifyAttendanceUpdated(attendance.shiftId, factoryId);
  return updated;
};

export const markAttendance = async (targetId, shiftId, status, supervisorUserId, factoryId) => {
  if (!targetId) {
    throw { statusCode: 400, message: 'Worker identifier is required' };
  }

  let targetShiftId = shiftId;
  let workerUserId = targetId;

  const existingAttendance = await prisma.attendance.findUnique({
    where: { id: targetId },
  });

  if (existingAttendance) {
    workerUserId = existingAttendance.userId;
    if (!targetShiftId) {
      targetShiftId = existingAttendance.shiftId;
    }
  }

  if (!targetShiftId) {
    const activeShift = await prisma.shift.findFirst({
      where: { factoryId, status: 'ACTIVE' },
    });
    if (!activeShift) {
      throw { statusCode: 400, message: 'Active shift not found in this factory' };
    }
    targetShiftId = activeShift.id;
  } else {
    const shift = await prisma.shift.findFirst({
      where: { id: targetShiftId, factoryId },
    });
    if (!shift) {
      throw { statusCode: 400, message: 'Shift not found in this factory' };
    }
  }

  // Enforce: Attendance can only be marked for labours (operators)
  const workerMember = await prisma.userFactory.findFirst({
    where: { userId: workerUserId, factoryId, isActive: true },
  });

  if (!workerMember) {
    throw { statusCode: 404, message: 'Worker not found in this factory' };
  }

  if (workerMember.role !== 'OPERATOR') {
    throw {
      statusCode: 403,
      message: 'Attendance can only be marked for labours (operators). Managers, owners, and supervisors cannot have attendance marked.',
    };
  }

  const attendance = await prisma.attendance.upsert({
    where: {
      userId_shiftId: {
        userId: workerUserId,
        shiftId: targetShiftId,
      },
    },
    update: {
      status,
      markedBy: supervisorUserId,
    },
    create: {
      userId: workerUserId,
      shiftId: targetShiftId,
      status,
      markedBy: supervisorUserId,
    },
  });

  await notifyAttendanceUpdated(targetShiftId, factoryId);
  return attendance;
};

export const getShiftAttendance = async (shiftId, factoryId) => {
  const shift = await prisma.shift.findFirst({
    where: { id: shiftId, factoryId },
  });

  if (!shift) {
    throw { statusCode: 404, message: 'Shift not found' };
  }

  // Exclude manager, owner, and supervisor from the attendance sheet; only show labours (OPERATOR)
  const members = await prisma.userFactory.findMany({
    where: {
      factoryId,
      isActive: true,
      role: 'OPERATOR',
    },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  const attendanceRecords = await prisma.attendance.findMany({
    where: { shiftId },
  });

  const attendanceMap = new Map(attendanceRecords.map((a) => [a.userId, a]));

  const roster = members.map((m) => {
    const record = attendanceMap.get(m.userId);
    return {
      userId: m.userId,
      name: m.user.name,
      email: m.user.email,
      role: m.role,
      status: record ? record.status : 'ABSENT',
      checkIn: record?.checkIn || null,
      checkOut: record?.checkOut || null,
      markedBy: record?.markedBy || null,
      attendanceId: record?.id || null,
    };
  });

  return roster;
};

const notifyAttendanceUpdated = async (shiftId, factoryId) => {
  const operatorMembers = await prisma.userFactory.findMany({
    where: { factoryId, role: 'OPERATOR', isActive: true },
    select: { userId: true },
  });
  const operatorUserIds = new Set(operatorMembers.map((m) => m.userId));

  const records = await prisma.attendance.findMany({
    where: { shiftId },
  });

  const operatorRecords = records.filter((r) => operatorUserIds.has(r.userId));
  const presentCount = operatorRecords.filter((r) => r.status === 'PRESENT').length;

  emitToFactory(factoryId, 'attendance:updated', {
    shiftId,
    presentCount,
    totalCount: operatorMembers.length,
  });
};

export const getDailyRegisters = async (factoryId) => {
  const shifts = await prisma.shift.findMany({
    where: { factoryId },
    include: {
      supervisor: { select: { id: true, name: true, email: true } },
      attendance: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
    orderBy: { startTime: 'desc' },
    take: 30,
  });

  const members = await prisma.userFactory.findMany({
    where: { factoryId, role: 'OPERATOR', isActive: true },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  const registers = shifts.map((shift) => {
    const shiftDate = new Date(shift.startTime);
    const dayOfWeek = shiftDate.toLocaleDateString('en-US', { weekday: 'long' });
    const formattedDate = shiftDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const isoDate = shiftDate.toISOString().split('T')[0];

    const attendanceMap = new Map(shift.attendance.map((a) => [a.userId, a]));

    const records = members.map((m) => {
      const rec = attendanceMap.get(m.userId);
      return {
        userId: m.userId,
        name: m.user.name,
        email: m.user.email,
        role: 'OPERATOR',
        status: rec ? rec.status : 'ABSENT',
        checkIn: rec?.checkIn ? new Date(rec.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null,
        checkOut: rec?.checkOut ? new Date(rec.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null,
        attendanceId: rec?.id || null,
      };
    });

    const presentCount = records.filter((r) => r.status === 'PRESENT').length;
    const absentCount = records.filter((r) => r.status === 'ABSENT').length;
    const lateCount = records.filter((r) => r.status === 'LATE').length;
    const totalWorkers = members.length;
    const turnoutPct = totalWorkers > 0 ? Math.round((presentCount / totalWorkers) * 100) : 0;

    return {
      id: shift.id,
      shiftId: shift.id,
      shiftType: shift.type,
      date: isoDate,
      dayOfWeek,
      formattedDate,
      supervisorName: shift.supervisor?.name || 'Shift Supervisor',
      presentCount,
      absentCount,
      lateCount,
      totalWorkers,
      turnoutPct,
      isRecorded: shift.attendance.length > 0,
      records,
    };
  });

  return registers;
};

export const saveDailySheet = async (data, supervisorUserId, factoryId) => {
  const { date, records } = data;

  let activeShift = await prisma.shift.findFirst({
    where: { factoryId, status: 'ACTIVE' },
    orderBy: { createdAt: 'desc' },
  });

  if (!activeShift) {
    activeShift = await prisma.shift.create({
      data: {
        factoryId,
        type: 'MORNING',
        supervisorId: supervisorUserId,
        startTime: new Date(),
        status: 'ACTIVE',
      },
    });
  }

  const shiftId = activeShift.id;

  if (Array.isArray(records)) {
    for (const item of records) {
      if (item.userId) {
        await prisma.attendance.upsert({
          where: {
            userId_shiftId: {
              userId: item.userId,
              shiftId,
            },
          },
          update: {
            status: item.status || 'PRESENT',
            markedBy: supervisorUserId,
            checkIn: item.status === 'PRESENT' ? new Date() : null,
          },
          create: {
            userId: item.userId,
            shiftId,
            status: item.status || 'PRESENT',
            markedBy: supervisorUserId,
            checkIn: item.status === 'PRESENT' ? new Date() : null,
          },
        });
      }
    }
  }

  await notifyAttendanceUpdated(shiftId, factoryId);

  return {
    shiftId,
    date: date || new Date().toISOString().split('T')[0],
    savedRecordsCount: records?.length || 0,
  };
};
