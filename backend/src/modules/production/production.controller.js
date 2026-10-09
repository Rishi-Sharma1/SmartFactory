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
    const result = await productionService.setTarget(req.body, req.factoryId, req.user.sub);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const getLines = async (req, res, next) => {
  try {
    const lines = await productionService.getProductionLines(req.factoryId);
    res.json(lines);
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

export const createLine = async (req, res, next) => {
  try {
    const { name } = req.body;
    const line = await productionService.createProductionLine(req.factoryId, name);
    res.status(201).json(line);
  } catch (err) {
    next(err);
  }
};

