import * as attendanceService from './attendance.service.js';

export const selfCheckIn = async (req, res, next) => {
  try {
    const { shiftId } = req.body;
    const result = await attendanceService.selfCheckIn(req.user.sub, shiftId, req.factoryId);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

export const selfCheckOut = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await attendanceService.selfCheckOut(id, req.user.sub, req.factoryId);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const markAttendance = async (req, res, next) => {
  try {
    const { userId, shiftId, status } = req.body;
    const result = await attendanceService.markAttendance(
      userId,
      shiftId,
      status,
      req.user.sub,
      req.factoryId
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const getShiftAttendance = async (req, res, next) => {
  try {
    const { shiftId } = req.params;
    const roster = await attendanceService.getShiftAttendance(shiftId, req.factoryId);
    res.json(roster);
  } catch (err) {
    next(err);
  }
};
