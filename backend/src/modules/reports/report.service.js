import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import prisma from '../../config/db.js';

export const getDailyReport = async (factoryId, targetDateStr) => {
  const targetDate = targetDateStr ? new Date(targetDateStr) : new Date();
  const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
  const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

  const shifts = await prisma.shift.findMany({
    where: {
      factoryId,
      startTime: { gte: startOfDay, lte: endOfDay },
    },
    include: { supervisor: { select: { name: true } } },
  });

  const productionLogs = await prisma.production.findMany({
    where: {
      line: { factoryId },
      recordedAt: { gte: startOfDay, lte: endOfDay },
    },
    include: { line: true },
  });

  const totalProduced = productionLogs.reduce((a, b) => a + b.producedUnits, 0);
  const totalTarget = productionLogs.reduce((a, b) => a + b.targetUnits, 0);
  const totalRejected = productionLogs.reduce((a, b) => a + b.rejectedUnits, 0);

  const maintenanceLogs = await prisma.maintenanceLog.findMany({
    where: {
      machine: { factoryId },
      downtimeStart: { gte: startOfDay, lte: endOfDay },
    },
    include: { machine: true },
  });

  return {
    date: startOfDay.toISOString().split('T')[0],
    shiftsCount: shifts.length,
    totalProduced,
    totalTarget,
    totalRejected,
    efficiencyPct: totalTarget > 0 ? parseFloat(((totalProduced / totalTarget) * 100).toFixed(1)) : 0,
    productionLogs,
    maintenanceLogs,
  };
};

export const getWeeklyReport = async (factoryId) => {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 7);

  const productionLogs = await prisma.production.findMany({
    where: {
      line: { factoryId },
      recordedAt: { gte: startDate, lte: endDate },
    },
    include: { line: true },
  });

  const totalProduced = productionLogs.reduce((a, b) => a + b.producedUnits, 0);
  const totalTarget = productionLogs.reduce((a, b) => a + b.targetUnits, 0);
  const totalRejected = productionLogs.reduce((a, b) => a + b.rejectedUnits, 0);

  return {
    period: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
    totalProduced,
    totalTarget,
    totalRejected,
    efficiencyPct: totalTarget > 0 ? parseFloat(((totalProduced / totalTarget) * 100).toFixed(1)) : 0,
    productionLogsCount: productionLogs.length,
  };
};

export const getShiftReport = async (factoryId, shiftId) => {
  const shift = await prisma.shift.findFirst({
    where: { id: shiftId, factoryId },
    include: {
      supervisor: { select: { name: true, email: true } },
      production: { include: { line: true, defects: true } },
      attendance: { include: { user: { select: { name: true } } } },
    },
  });

  if (!shift) {
    throw { statusCode: 404, message: 'Shift not found' };
  }

  const totalProduced = shift.production.reduce((a, b) => a + b.producedUnits, 0);
  const totalTarget = shift.production.reduce((a, b) => a + b.targetUnits, 0);
  const totalRejected = shift.production.reduce((a, b) => a + b.rejectedUnits, 0);

  return {
    shiftId: shift.id,
    type: shift.type,
    supervisor: shift.supervisor.name,
    status: shift.status,
    startTime: shift.startTime,
    endTime: shift.endTime,
    aiDigest: shift.aiDigest,
    totalProduced,
    totalTarget,
    totalRejected,
    efficiencyPct: totalTarget > 0 ? parseFloat(((totalProduced / totalTarget) * 100).toFixed(1)) : 0,
    production: shift.production,
    attendance: shift.attendance,
  };
};

export const streamPDFReport = (data, res) => {
  const doc = new PDFDocument({ margin: 40 });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=report-${Date.now()}.pdf`);

  doc.pipe(res);

  doc.fontSize(20).text('Smart Factory Operations Report', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text(`Generated Date: ${new Date().toLocaleString()}`);
  doc.text(`Efficiency: ${data.efficiencyPct || 0}%`);
  doc.text(`Total Produced Units: ${data.totalProduced || 0}`);
  doc.text(`Total Target Units: ${data.totalTarget || 0}`);
  doc.text(`Total Rejected Units: ${data.totalRejected || 0}`);
  doc.moveDown();

  doc.fontSize(14).text('Summary Overview', { underline: true });
  doc.fontSize(10).text(JSON.stringify(data, null, 2));

  doc.end();
};

export const streamExcelReport = async (data, res) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Operations Report');

  worksheet.columns = [
    { header: 'Metric', key: 'metric', width: 25 },
    { header: 'Value', key: 'value', width: 35 },
  ];

  worksheet.addRow({ metric: 'Efficiency %', value: `${data.efficiencyPct || 0}%` });
  worksheet.addRow({ metric: 'Total Produced Units', value: data.totalProduced || 0 });
  worksheet.addRow({ metric: 'Total Target Units', value: data.totalTarget || 0 });
  worksheet.addRow({ metric: 'Total Rejected Units', value: data.totalRejected || 0 });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=report-${Date.now()}.xlsx`);

  await workbook.xlsx.write(res);
  res.end();
};
