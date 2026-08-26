import * as productionService from './production.service.js';

export const updateProduction = async (req, res, next) => {
  try {
    const result = await productionService.createOrUpdateProductionLog(
      req.body,
      req.user.sub,
      req.factoryId
    );
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

export const setTarget = async (req, res, next) => {
  try {
    const result = await productionService.setTarget(req.body, req.factoryId);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const getProductionLogs = async (req, res, next) => {
  try {
    const { shiftId } = req.query;
    const logs = await productionService.getProductionLogs(req.factoryId, shiftId);
    res.json(logs);
  } catch (err) {
    next(err);
  }
};

export const getSummary = async (req, res, next) => {
  try {
    const summary = await productionService.getProductionSummary(req.factoryId);
    res.json(summary);
  } catch (err) {
    next(err);
  }
};
