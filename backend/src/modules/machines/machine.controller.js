import * as machineService from './machine.service.js';

export const getMachines = async (req, res, next) => {
  try {
    const machines = await machineService.getMachines(req.factoryId);
    res.json(machines);
  } catch (err) {
    next(err);
  }
};

export const createMachine = async (req, res, next) => {
  try {
    const machine = await machineService.createMachine(req.body, req.factoryId);
    res.status(201).json(machine);
  } catch (err) {
    next(err);
  }
};

export const updateStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, efficiencyPct } = req.body;
    const machine = await machineService.updateStatus(id, status, efficiencyPct, req.factoryId);
    res.json(machine);
  } catch (err) {
    next(err);
  }
};

export const logFault = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { faultDescription } = req.body;
    const log = await machineService.logFault(id, req.user.sub, faultDescription, req.factoryId);
    res.status(201).json(log);
  } catch (err) {
    next(err);
  }
};

export const resolveFault = async (req, res, next) => {
  try {
    const { id } = req.params;
    const machine = await machineService.resolveFault(id, req.user.sub, req.factoryId);
    res.json(machine);
  } catch (err) {
    next(err);
  }
};

export const getLogs = async (req, res, next) => {
  try {
    const { id } = req.params;
    const logs = await machineService.getMachineLogs(id);
    res.json(logs);
  } catch (err) {
    next(err);
  }
};
