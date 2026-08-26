import * as reportService from './report.service.js';

export const getDailyReport = async (req, res, next) => {
  try {
    const { date } = req.query;
    const report = await reportService.getDailyReport(req.factoryId, date);
    res.json(report);
  } catch (err) {
    next(err);
  }
};

export const getWeeklyReport = async (req, res, next) => {
  try {
    const report = await reportService.getWeeklyReport(req.factoryId);
    res.json(report);
  } catch (err) {
    next(err);
  }
};

export const getShiftReport = async (req, res, next) => {
  try {
    const { id } = req.params;
    const report = await reportService.getShiftReport(req.factoryId, id);
    res.json(report);
  } catch (err) {
    next(err);
  }
};

export const exportReport = async (req, res, next) => {
  try {
    const { format, reportType, shiftId, date } = req.body;
    let data;

    if (reportType === 'shift' && shiftId) {
      data = await reportService.getShiftReport(req.factoryId, shiftId);
    } else {
      data = await reportService.getDailyReport(req.factoryId, date);
    }

    if (format === 'excel') {
      await reportService.streamExcelReport(data, res);
    } else {
      reportService.streamPDFReport(data, res);
    }
  } catch (err) {
    next(err);
  }
};
