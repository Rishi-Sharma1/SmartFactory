import {
  initialFactories,
  initialLines,
  initialMachines,
  initialWorkers,
  initialLogs,
  initialKPIs,
  initialHandoverNotes,
  initial24hEfficiencyTrend,
} from '../data/mockData';
import { useUiStore } from '../store/ui.store';
import type {
  Factory,
  ProductionLine,
  Machine,
  ShiftWorker,
  ProductionLogEntry,
  FactoryKPIs,
  AttendanceStatus,
  ChatMessage,
  ShiftHandoverNote,
  EfficiencyHourlyPoint,
  TicketPriority,
  TicketStatus,
  MaintenanceTicket,
} from '../types/index';

// In-Memory Live Mutable State
let factoriesState: Factory[] = JSON.parse(JSON.stringify(initialFactories));
let linesState: ProductionLine[] = JSON.parse(JSON.stringify(initialLines));
let machinesState: Machine[] = JSON.parse(JSON.stringify(initialMachines));
let workersState: ShiftWorker[] = JSON.parse(JSON.stringify(initialWorkers));
let logsState: ProductionLogEntry[] = JSON.parse(JSON.stringify(initialLogs));
let kpisState: Record<string, FactoryKPIs> = JSON.parse(JSON.stringify(initialKPIs));
let handoverNotesState: ShiftHandoverNote[] = JSON.parse(JSON.stringify(initialHandoverNotes));

const delay = (min: number = 250, max: number = 600) => {
  const ms = Math.floor(min + Math.random() * (max - min));
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export const mockService = {
  // Queries
  getFactories: async (): Promise<Factory[]> => {
    await delay(200, 450);
    return [...factoriesState];
  },

  getFactory: async (id: string): Promise<Factory | null> => {
    await delay(150, 350);
    return factoriesState.find((f) => f.id === id) || null;
  },

  getLines: async (factoryId: string): Promise<ProductionLine[]> => {
    await delay(200, 450);
    const lines = linesState.filter((l) => l.factoryId === factoryId);
    return lines.length > 0 ? lines : linesState.filter((l) => l.factoryId === 'f-1');
  },

  getMachines: async (factoryId: string): Promise<Machine[]> => {
    await delay(250, 500);
    const machines = machinesState.filter((m) => m.factoryId === factoryId);
    return machines.length > 0 ? machines : machinesState.filter((m) => m.factoryId === 'f-1');
  },

  getAttendance: async (factoryId: string): Promise<ShiftWorker[]> => {
    await delay(200, 450);
    const excludedRoles = ['OWNER', 'MANAGER', 'SUPERVISOR'];
    const workers = workersState
      .filter((w) => w.factoryId === factoryId)
      .filter((w) => {
        const roleUpper = (w.role || '').toUpperCase();
        return !excludedRoles.includes(roleUpper) && !excludedRoles.some((r) => roleUpper.includes(r));
      });
    const fallback = workersState
      .filter((w) => w.factoryId === 'f-1')
      .filter((w) => {
        const roleUpper = (w.role || '').toUpperCase();
        return !excludedRoles.includes(roleUpper) && !excludedRoles.some((r) => roleUpper.includes(r));
      });
    return workers.length > 0 ? workers : fallback;
  },

  getKPIs: async (factoryId: string): Promise<FactoryKPIs> => {
    await delay(180, 400);
    return (
      kpisState[factoryId] || {
        totalOutput: 14827,
        outputDelta: '↑ 4.2% vs yesterday',
        outputPositive: true,
        efficiency: 94.2,
        efficiencyTarget: 90.0,
        activeShiftsRatio: '12/12 active',
        activeStaff: 138,
        totalStaff: 145,
        criticalAlerts: 1,
      }
    );
  },

  getProductionLogs: async (factoryId: string): Promise<ProductionLogEntry[]> => {
    await delay(200, 400);
    const logs = logsState.filter((l) => l.factoryId === factoryId);
    return logs.length > 0 ? logs : logsState.filter((l) => l.factoryId === 'f-1');
  },

  getHandoverNotes: async (factoryId: string): Promise<ShiftHandoverNote[]> => {
    await delay(200, 400);
    const notes = handoverNotesState.filter((n) => n.factoryId === factoryId);
    return notes.length > 0 ? notes : handoverNotesState.filter((n) => n.factoryId === 'f-1');
  },

  get24hEfficiencyTrend: async (_factoryId?: string): Promise<EfficiencyHourlyPoint[]> => {
    await delay(200, 400);
    return [...initial24hEfficiencyTrend];
  },

  // Mutations
  addHandoverNote: async (
    noteData: Omit<ShiftHandoverNote, 'id' | 'timestamp'>
  ): Promise<ShiftHandoverNote> => {
    await delay(300, 600);
    const newNote: ShiftHandoverNote = {
      ...noteData,
      id: `hn-${Date.now()}`,
      timestamp: 'Just now',
    };

    handoverNotesState = [newNote, ...handoverNotesState];

    useUiStore.getState().pushNotification({
      title: 'New Shift Handover Note',
      message: `${newNote.authorName} (${newNote.authorRole}): "${newNote.note.slice(0, 60)}..."`,
      type: 'handover',
      link: '/dashboard',
    });

    return newNote;
  },

  resolveFault: async (machineId: string, resolutionNotes: string): Promise<Machine> => {
    await delay(350, 700);
    const machine = machinesState.find((m) => m.id === machineId);
    if (!machine) {
      throw new Error(`Machine ${machineId} not found`);
    }

    const newLog = {
      id: `log-${Date.now()}`,
      timestamp: 'Just now',
      type: 'MAINTENANCE' as const,
      message: `Fault resolved: ${resolutionNotes}`,
      technician: 'On-duty Tech',
    };

    machine.status = 'ACTIVE';
    machine.faultMessage = undefined;
    machine.vibration = 1.8;
    machine.temperature = 48.5;
    machine.efficiency = 95.0;
    machine.logs = [newLog, ...(machine.logs || [])];

    if (machine.activeTicket) {
      machine.activeTicket.status = 'Resolved';
      machine.activeTicket.resolutionNotes = resolutionNotes;
      machine.activeTicket.updatedAt = 'Just now';
    }

    // Decrement alerts
    if (kpisState[machine.factoryId] && kpisState[machine.factoryId].criticalAlerts > 0) {
      kpisState[machine.factoryId].criticalAlerts -= 1;
    }
    const factory = factoriesState.find((f) => f.id === machine.factoryId);
    if (factory && factory.criticalAlerts > 0) {
      factory.criticalAlerts -= 1;
    }

    useUiStore.getState().pushNotification({
      title: 'Fault Resolved',
      message: `Machine ${machine.id} restored to ACTIVE. Telemetry nominal.`,
      type: 'fault',
      link: '/machines',
    });

    return { ...machine };
  },

  reportFault: async (
    machineId: string,
    faultDescription: string,
    priority: TicketPriority = 'Critical',
    assigneeId: string = '1204'
  ): Promise<Machine> => {
    await delay(350, 700);
    const machine = machinesState.find((m) => m.id === machineId);
    if (!machine) {
      throw new Error(`Machine ${machineId} not found`);
    }

    const assignee = workersState.find((w) => w.id === assigneeId) || workersState[0];

    const ticket: MaintenanceTicket = {
      id: `TCK-${Math.floor(100 + Math.random() * 900)}`,
      machineId: machine.id,
      machineName: machine.name,
      priority,
      status: 'Open',
      description: faultDescription,
      assigneeName: assignee.name,
      assigneeId: assignee.id,
      createdAt: 'Just now',
    };

    const newLog = {
      id: `log-${Date.now()}`,
      timestamp: 'Just now',
      type: 'FAULT' as const,
      message: `Ticket ${ticket.id} (${priority}): ${faultDescription}`,
      technician: assignee.name,
    };

    machine.status = 'FAULT';
    machine.faultMessage = faultDescription;
    machine.activeTicket = ticket;
    machine.vibration = 7.5;
    machine.temperature = 88.0;
    machine.logs = [newLog, ...(machine.logs || [])];

    if (kpisState[machine.factoryId]) {
      kpisState[machine.factoryId].criticalAlerts += 1;
    }
    const factory = factoriesState.find((f) => f.id === machine.factoryId);
    if (factory) {
      factory.criticalAlerts += 1;
    }

    useUiStore.getState().pushNotification({
      title: `Fault Reported: ${machine.id}`,
      message: `Ticket ${ticket.id} (${priority}) assigned to ${assignee.name}: ${faultDescription.slice(0, 50)}...`,
      type: 'fault',
      link: '/machines',
    });

    return { ...machine };
  },

  updateTicketStatus: async (
    ticketId: string,
    newStatus: TicketStatus,
    notes?: string
  ): Promise<MaintenanceTicket> => {
    await delay(300, 600);

    for (const machine of machinesState) {
      if (machine.activeTicket && machine.activeTicket.id === ticketId) {
        machine.activeTicket.status = newStatus;
        machine.activeTicket.updatedAt = 'Just now';
        if (notes) {
          machine.activeTicket.resolutionNotes = notes;
        }

        if (newStatus === 'Resolved') {
          machine.status = 'ACTIVE';
          machine.faultMessage = undefined;
          machine.vibration = 2.0;
          machine.temperature = 49.0;
          if (kpisState[machine.factoryId] && kpisState[machine.factoryId].criticalAlerts > 0) {
            kpisState[machine.factoryId].criticalAlerts -= 1;
          }
          const factory = factoriesState.find((f) => f.id === machine.factoryId);
          if (factory && factory.criticalAlerts > 0) {
            factory.criticalAlerts -= 1;
          }
        }

        useUiStore.getState().pushNotification({
          title: `Ticket ${ticketId} Updated`,
          message: `Ticket status transitioned to ${newStatus}.`,
          type: 'fault',
          link: '/machines',
        });

        return { ...machine.activeTicket };
      }
    }

    throw new Error(`Ticket ${ticketId} not found`);
  },

  overrideAttendance: async (workerId: string, newStatus: AttendanceStatus): Promise<ShiftWorker> => {
    await delay(300, 600);
    const worker = workersState.find((w) => w.id === workerId);
    if (!worker) {
      throw new Error(`Worker ${workerId} not found`);
    }

    const previousStatus = worker.status;
    worker.status = newStatus;
    if (newStatus === 'PRESENT' && (worker.checkIn === '--' || !worker.checkIn)) {
      worker.checkIn = '08:00 AM (Overridden)';
    }

    // Update today's entry in history
    if (worker.attendanceHistory && worker.attendanceHistory.length > 0) {
      worker.attendanceHistory[worker.attendanceHistory.length - 1].status = newStatus;
    }

    useUiStore.getState().pushNotification({
      title: 'Attendance Override',
      message: `${worker.name} status updated from ${previousStatus} to ${newStatus}.`,
      type: 'attendance',
      link: '/attendance',
    });

    return { ...worker };
  },

  submitProductionLog: async (
    entryData: Omit<ProductionLogEntry, 'id' | 'timestamp'>
  ): Promise<ProductionLogEntry> => {
    await delay(400, 800);
    const newEntry: ProductionLogEntry = {
      ...entryData,
      id: `LOG-${Math.floor(100 + Math.random() * 900)}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    logsState = [newEntry, ...logsState];

    const targetLine = linesState.find((l) => l.id === entryData.lineId);
    if (targetLine) {
      targetLine.produced += entryData.unitsProduced;
      targetLine.rejects += entryData.unitsRejected;
      const totalUnits = targetLine.produced + targetLine.rejects;
      targetLine.efficiency = Math.min(
        100,
        Math.round((targetLine.produced / (totalUnits || 1)) * 1000) / 10
      );
      targetLine.yieldRate = Math.min(
        100,
        Math.round((targetLine.produced / (totalUnits || 1)) * 1000) / 10
      );
    }

    if (kpisState[entryData.factoryId]) {
      kpisState[entryData.factoryId].totalOutput += entryData.unitsProduced;
    }

    useUiStore.getState().pushNotification({
      title: 'Production Run Dispatched',
      message: `${newEntry.lineName}: ${newEntry.unitsProduced} units logged (${newEntry.productSku}).`,
      type: 'production',
      link: '/production',
    });

    return newEntry;
  },

  askAi: async (queryText: string): Promise<ChatMessage> => {
    await delay(350, 750);
    const lower = queryText.toLowerCase();

    if (lower.includes('rejection') || lower.includes('scrap') || lower.includes('reject')) {
      return {
        id: `ai-${Date.now()}`,
        sender: 'assistant',
        text: 'Assembly Line Beta (L2) currently records the highest rejections today with 45 units scrapped due to tool wear calibration on the automated stamping feed.',
        sqlQuery: `SELECT l.name, SUM(p.units_rejected) AS total_rejects, \n       p.delay_cause, COUNT(*) AS incident_count\nFROM production_lines l\nJOIN shift_runs p ON l.id = p.line_id\nWHERE p.shift_date = CURRENT_DATE\nGROUP BY l.name, p.delay_cause\nORDER BY total_rejects DESC\nLIMIT 1;`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
    }

    if (lower.includes('downtime') || lower.includes('fault') || lower.includes('stoppage')) {
      return {
        id: `ai-${Date.now()}`,
        sender: 'assistant',
        text: 'Active machine stoppage: Machine M-04 (CNC Router Press) experienced a critical spindle vibration fault (> 7.0 mm/s) at 10:42 AM. Estimated downtime impact: 35 minutes.',
        sqlQuery: `SELECT machine_id, incident_type, duration_minutes, detected_at\nFROM telemetry_alerts\nWHERE severity IN ('CRITICAL', 'FAULT') AND shift_date = CURRENT_DATE\nORDER BY detected_at DESC;`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
    }

    if (lower.includes('attendance') || lower.includes('absent') || lower.includes('staff')) {
      return {
        id: `ai-${Date.now()}`,
        sender: 'assistant',
        text: 'Shift turnout is 95.2% (138/145 present). 5 workers arrived late and 2 unexcused absences were logged (Mike Ross, Cell Lead). 1 on scheduled leave.',
        sqlQuery: `SELECT status, COUNT(*) AS worker_count, \n       ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1) AS pct\nFROM shift_roster\nWHERE shift = 'Morning' AND date = CURRENT_DATE\nGROUP BY status;`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
    }

    return {
      id: `ai-${Date.now()}`,
      sender: 'assistant',
      text: `Analyzed SCADA floor telemetry for "${queryText}". Plant is operating at 94.2% OEE with 14,827 units completed across active cells.`,
      sqlQuery: `SELECT DATE_TRUNC('hour', recorded_at) AS hour,\n       SUM(units_produced) AS gross_output,\n       ROUND(AVG(network_efficiency), 2) AS oee_rate\nFROM factory_telemetry\nWHERE recorded_at >= CURRENT_DATE\nGROUP BY 1 ORDER BY 1 DESC LIMIT 8;`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
  },
};
