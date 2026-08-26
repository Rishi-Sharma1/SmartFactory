import * as shiftService from './shift.service.js';

export const openShift = async (req, res, next) => {
  try {
    const { type } = req.body;
    const shift = await shiftService.openShift(type, req.user.sub, req.factoryId);
    res.status(201).json(shift);
  } catch (err) {
    next(err);
  }
};

export const closeShift = async (req, res, next) => {
  try {
    const { id } = req.params;
    const shift = await shiftService.closeShift(id, req.factoryId);
    res.json(shift);
  } catch (err) {
    next(err);
  }
};

export const getShifts = async (req, res, next) => {
  try {
    const shifts = await shiftService.getShifts(req.factoryId);
    res.json(shifts);
  } catch (err) {
    next(err);
  }
};
