export type Role = 'OWNER' | 'MANAGER' | 'SUPERVISOR' | 'OPERATOR' | 'VIEWER';

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface UserFactory {
  factoryId: string;
  factoryName: string;
  role: Role;
}

export interface Factory {
  id: string;
  name: string;
  location: string;
  status: 'Online' | 'Maintenance Mode' | 'Offline';
  activeLines: number;
  totalLines: number;
  efficiency: number;
  members: number;
  criticalAlerts: number;
}

export type MachineStatus = 'ACTIVE' | 'IDLE' | 'FAULT' | 'MAINTENANCE';
export type TicketPriority = 'Low' | 'Medium' | 'High' | 'Critical';
export type TicketStatus = 'Open' | 'In Progress' | 'Resolved';

export interface MaintenanceTicket {
  id: string;
  machineId: string;
  machineName: string;
  priority: TicketPriority;
  status: TicketStatus;
  description: string;
  assigneeName: string;
  assigneeId: string;
  createdAt: string;
  updatedAt?: string;
  resolutionNotes?: string;
}

export interface MachineLog {
  id: string;
  timestamp: string;
  type: 'TELEMETRY' | 'MAINTENANCE' | 'ALERT' | 'FAULT';
  message: string;
  technician?: string;
}

export interface Machine {
  id: string;
  factoryId: string;
  name: string;
  type: string;
  status: MachineStatus;
  efficiency: number;
  temperature: number; // °C
  vibration: number; // mm/s
  uptimeHours: number;
  lastMaintenance: string;
  faultMessage?: string;
  logs?: MachineLog[];
  efficiencyHistory?: { day: string; efficiency: number }[];
  activeTicket?: MaintenanceTicket;
}

export type AttendanceStatus = 'PRESENT' | 'LATE' | 'ABSENT' | 'ON_LEAVE';

export interface WorkerAttendanceDay {
  date: string;
  dayOfMonth: number;
  status: 'PRESENT' | 'LATE' | 'ABSENT' | 'ON_LEAVE' | 'WEEKEND';
}

export interface ShiftWorker {
  id: string;
  factoryId: string;
  name: string;
  role: string;
  shift: 'Morning' | 'Afternoon' | 'Night';
  checkIn: string;
  checkOut: string;
  status: AttendanceStatus;
  initials?: string;
  attendanceHistory?: WorkerAttendanceDay[];
}

export interface ProductionLine {
  id: string;
  factoryId: string;
  name: string;
  target: number;
  hasTarget?: boolean;
  produced: number;
  rejects: number;
  efficiency: number;
  status: 'Optimal' | 'Degraded' | 'Critical';
  operator?: string;
  shift?: string;
  yieldRate?: number;
}

export interface ProductionLogEntry {
  id: string;
  factoryId: string;
  timestamp: string;
  lineId: string;
  lineName: string;
  shift: string;
  productSku: string;
  unitsProduced: number;
  unitsRejected: number;
  delayCause: string;
  loggedBy: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  sqlQuery?: string;
  timestamp?: string;
}

export interface FactoryKPIs {
  totalOutput: number;
  outputDelta: string;
  outputPositive: boolean;
  efficiency: number;
  efficiencyTarget: number;
  activeShiftsRatio: string;
  activeStaff: number;
  totalStaff: number;
  criticalAlerts: number;
  activeShift?: {
    id: string;
    type: string;
    supervisorName?: string;
    startTime?: string;
    endTime?: string | null;
    status?: string;
    aiDigest?: string | null;
  } | null;
  lastShift?: {
    id: string;
    type: string;
    supervisorName?: string;
    startTime?: string;
    endTime?: string | null;
    status?: string;
    aiDigest?: string | null;
  } | null;
}

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'fault' | 'attendance' | 'production' | 'handover' | 'system';
  timestamp: string;
  read: boolean;
  link?: string;
}

export interface ShiftHandoverNote {
  id: string;
  factoryId: string;
  authorName: string;
  authorRole: string;
  shift: string;
  note: string;
  timestamp: string;
  priority: 'Normal' | 'Urgent';
}

export interface EfficiencyHourlyPoint {
  hour: string;
  efficiency: number;
  target: number;
}

export type DashboardDensity = 'comfortable' | 'compact';
