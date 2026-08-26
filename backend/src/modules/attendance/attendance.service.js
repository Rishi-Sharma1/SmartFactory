import prisma from '../../config/db.js';
import { emitToFactory } from '../../config/socket.js';

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

export const markAttendance = async (workerUserId, shiftId, status, supervisorUserId, factoryId) => {
  const shift = await prisma.shift.findFirst({
    where: { id: shiftId, factoryId },
  });

  if (!shift) {
    throw { statusCode: 400, message: 'Shift not found in this factory' };
  }

  const attendance = await prisma.attendance.upsert({
    where: {
      userId_shiftId: {
        userId: workerUserId,
        shiftId,
      },
    },
    update: {
      status,
      markedBy: supervisorUserId,
    },
    create: {
      userId: workerUserId,
      shiftId,
      status,
      markedBy: supervisorUserId,
    },
  });

  await notifyAttendanceUpdated(shiftId, factoryId);
  return attendance;
};

export const getShiftAttendance = async (shiftId, factoryId) => {
  const shift = await prisma.shift.findFirst({
    where: { id: shiftId, factoryId },
  });

  if (!shift) {
    throw { statusCode: 404, message: 'Shift not found' };
  }

  const members = await prisma.userFactory.findMany({
    where: { factoryId, isActive: true },
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
  const records = await prisma.attendance.findMany({
    where: { shiftId },
  });

  const presentCount = records.filter((r) => r.status === 'PRESENT').length;

  emitToFactory(factoryId, 'attendance:updated', {
    shiftId,
    presentCount,
    totalCount: records.length,
  });
};
