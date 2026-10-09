import React, { useState } from 'react';
import {
  Wrench,
  AlertTriangle,
  Activity,
  Thermometer,
  Radio,
  FileText,
  X,
  Check,
  Search,
  Lock,
  UserCheck,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts';
import {
  useMachines,
  useResolveFaultMutation,
  useReportFaultMutation,
  useUpdateTicketMutation,
  useShiftWorkers,
} from '../hooks/useFactoryData';
import { useAuthStore } from '../store/auth.store';
import type {
  Machine,
  MachineStatus,
  TicketPriority,
  TicketStatus,
} from '../types/index';
import clsx from 'clsx';

export const Machines: React.FC = () => {
  const { activeFactory } = useAuthStore();
  const currentRole = activeFactory?.role || 'OWNER';
  const isViewer = currentRole === 'VIEWER';
  const canResolveFault = ['OWNER', 'MANAGER'].includes(currentRole);
  const canReportFault = ['OPERATOR', 'SUPERVISOR', 'MANAGER', 'OWNER'].includes(currentRole);

  const { data: machines, isLoading } = useMachines();
  const { data: workers } = useShiftWorkers();
  const resolveFaultMutation = useResolveFaultMutation();
  const reportFaultMutation = useReportFaultMutation();
  const updateTicketMutation = useUpdateTicketMutation();

  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const [activeLogMachine, setActiveLogMachine] = useState<Machine | null>(null);
  const [faultToResolve, setFaultToResolve] = useState<Machine | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState(
    'Replaced primary drive belt and realigned spindle dampers.'
  );

  // Ticket creation modal state
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [selectedMachineForFault, setSelectedMachineForFault] = useState<string>('M-07');
  const [ticketPriority, setTicketPriority] = useState<TicketPriority>('High');
  const [ticketAssigneeId, setTicketAssigneeId] = useState<string>('');
  const [faultDescription, setFaultDescription] = useState('');

  // Status transition state in logs modal
  const [ticketTransitionNotes, setTicketTransitionNotes] = useState('');

  const machineList = machines || [];

  const filteredMachines = machineList.filter((m) => {
    const matchesFilter =
      selectedStatusFilter === 'ALL' || m.status === selectedStatusFilter;
    const matchesSearch =
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.type.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleConfirmResolve = (e: React.FormEvent) => {
    e.preventDefault();
    if (!faultToResolve || isViewer) return;

    resolveFaultMutation.mutate(
      { machineId: faultToResolve.id, resolutionNotes },
      {
        onSuccess: () => {
          setFaultToResolve(null);
        },
      }
    );
  };

  const handleConfirmReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMachineForFault || !faultDescription.trim() || isViewer) return;

    reportFaultMutation.mutate(
      {
        machineId: selectedMachineForFault,
        faultDescription,
        priority: ticketPriority,
        assigneeId: ticketAssigneeId || undefined,
      },
      {
        onSuccess: () => {
          setReportModalOpen(false);
          setFaultDescription('');
          setTicketAssigneeId('');
        },
      }
    );
  };

  const handleUpdateTicketStatus = (ticketId: string, status: TicketStatus) => {
    updateTicketMutation.mutate(
      {
        ticketId,
        newStatus: status,
        notes: ticketTransitionNotes || undefined,
      },
      {
        onSuccess: (updatedTicket) => {
          setTicketTransitionNotes('');
          if (activeLogMachine && activeLogMachine.activeTicket?.id === ticketId) {
            setActiveLogMachine({
              ...activeLogMachine,
              activeTicket: updatedTicket,
            });
          }
        },
      }
    );
  };

  const getStatusBadge = (status: MachineStatus) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800';
      case 'FAULT':
        return 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 shadow-glow-red';
      case 'IDLE':
        return 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800';
      case 'MAINTENANCE':
        return 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800';
    }
  };

  const getPriorityBadge = (priority: TicketPriority) => {
    switch (priority) {
      case 'Critical':
        return 'bg-red-100 dark:bg-red-900/60 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800';
      case 'High':
        return 'bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      case 'Medium':
        return 'bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'Low':
        return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  const getTicketStatusBadge = (status: TicketStatus) => {
    switch (status) {
      case 'Open':
        return 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800';
      case 'In Progress':
        return 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800';
      case 'Resolved':
        return 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800';
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800 gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Asset Fleet & Maintenance
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time telemetry, 7-day efficiency trends, and maintenance ticket dispatch.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setReportModalOpen(true)}
            disabled={isViewer}
            title={isViewer ? 'Viewer role is read-only' : 'Create maintenance ticket'}
            className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors shadow-sm"
          >
            {isViewer ? <Lock className="w-3.5 h-3.5" /> : <AlertTriangle className="w-4 h-4" />}
            <span>Report Fault</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-wrap items-center gap-1.5">
          {(['ALL', 'ACTIVE', 'IDLE', 'FAULT', 'MAINTENANCE'] as const).map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setSelectedStatusFilter(filter)}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                selectedStatusFilter === filter
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
              )}
            >
              {filter}
              {filter !== 'ALL' && (
                <span className="ml-1 opacity-80">
                  ({machineList.filter((m) => m.status === filter).length})
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filter by ID, name, or type..."
            className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white pl-9 pr-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 w-full sm:w-64"
          />
        </div>
      </div>

      {/* Grid of Machine Cards */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-500 font-mono text-xs">
          Streaming telemetry from factory controllers...
        </div>
      ) : filteredMachines.length === 0 ? (
        <div className="p-12 text-center text-slate-500 text-sm bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
          No machines matched the filter or search query.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMachines.map((m) => {
            const isFaulted = m.status === 'FAULT';
            const ticket = m.activeTicket;

            return (
              <div
                key={m.id}
                className={clsx(
                  'bg-white dark:bg-slate-900 border rounded-lg p-6 flex flex-col justify-between shadow-sm transition-all',
                  isFaulted
                    ? 'border-red-500/80 shadow-glow-red'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                )}
              >
                <div>
                  {/* Top Bar: ID and Status Pill */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900 dark:text-white text-base">
                        {m.id}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        ({m.type})
                      </span>
                    </div>
                    <span
                      className={clsx(
                        'text-xs font-medium px-2.5 py-0.5 rounded',
                        getStatusBadge(m.status)
                      )}
                    >
                      {m.status}
                    </span>
                  </div>

                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white mt-1">
                    {m.name}
                  </h3>

                  {/* Active Ticket Banner */}
                  {ticket && (
                    <div className="mt-3 p-2.5 rounded-lg border bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                          {ticket.id}
                        </span>
                        <span
                          className={clsx(
                            'text-[10px] font-semibold px-1.5 py-0.5 rounded border',
                            getPriorityBadge(ticket.priority)
                          )}
                        >
                          {ticket.priority}
                        </span>
                      </div>
                      <span
                        className={clsx(
                          'text-[10px] font-medium px-2 py-0.5 rounded',
                          getTicketStatusBadge(ticket.status)
                        )}
                      >
                        {ticket.status.replace('_', ' ')}
                      </span>
                    </div>
                  )}

                  {/* Inline Fault Message when Faulted */}
                  {isFaulted && m.faultMessage && (
                    <div className="mt-3 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-lg text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                      <span className="leading-snug">{m.faultMessage}</span>
                    </div>
                  )}

                  {/* Telemetry Metrics */}
                  <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-slate-50 dark:bg-slate-950/50 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                        <Thermometer className="w-3.5 h-3.5 text-amber-500" />
                        <span>Bearing Temp</span>
                      </div>
                      <p
                        className={clsx(
                          'font-mono font-bold text-sm mt-1',
                          m.temperature > 80 ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-slate-200'
                        )}
                      >
                        {m.temperature}°C
                      </p>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-950/50 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                        <Radio className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        <span>Vibration</span>
                      </div>
                      <p
                        className={clsx(
                          'font-mono font-bold text-sm mt-1',
                          m.vibration > 5.0 ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-slate-200'
                        )}
                      >
                        {m.vibration} mm/s
                      </p>
                    </div>
                  </div>

                  {/* Feature 3: 7-Day Efficiency Sparkline */}
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-xs text-slate-500 dark:text-slate-400">7-Day Efficiency Trend</span>
                      <span className="font-mono font-semibold text-slate-900 dark:text-slate-200">
                        {m.efficiency}%
                      </span>
                    </div>

                    {/* Sparkline chart */}
                    <div className="h-10 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={m.efficiencyHistory || []}>
                          <Line
                            type="monotone"
                            dataKey="efficiency"
                            stroke={m.efficiency >= 90 ? '#10b981' : '#f59e0b'}
                            strokeWidth={2}
                            dot={false}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#0f172a',
                              borderColor: '#334155',
                              borderRadius: '6px',
                              padding: '4px 8px',
                              fontSize: '11px',
                              color: '#fff',
                            }}
                            formatter={(val: any) => [`${val}%`, 'OEE']}
                            labelFormatter={(label) => `Day: ${label}`}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    Last Maintenance: <span className="font-mono">{m.lastMaintenance}</span>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                  {isFaulted ? (
                    canResolveFault ? (
                      <button
                        type="button"
                        onClick={() => setFaultToResolve(m)}
                        className="flex-1 py-2 px-3 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <Wrench className="w-3.5 h-3.5" />
                        <span>Resolve Fault</span>
                      </button>
                    ) : (
                      <div className="flex-1 py-2 px-3 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-500 font-medium text-center flex items-center justify-center gap-1.5">
                        <Lock className="w-3 h-3 text-slate-400" />
                        <span>Resolve Fault (Owner/Manager Only)</span>
                      </div>
                    )
                  ) : (
                    canReportFault ? (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedMachineForFault(m.id);
                          setReportModalOpen(true);
                        }}
                        className="flex-1 py-2 px-3 text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                      >
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                        <span>Report Fault</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="flex-1 py-2 px-3 text-xs font-medium bg-slate-50 dark:bg-slate-900 text-slate-400 rounded-lg border border-slate-200 dark:border-slate-800 cursor-not-allowed text-center"
                      >
                        <span>Telemetry Nominal</span>
                      </button>
                    )
                  )}

                  <button
                    type="button"
                    onClick={() => setActiveLogMachine(m)}
                    className="px-3.5 py-2 text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Logs & Tickets</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Resolve Fault Modal */}
      {faultToResolve && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-red-600 dark:text-red-400" />
                <h3 className="font-semibold text-slate-900 dark:text-white text-lg">
                  Resolve Fault: {faultToResolve.id}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setFaultToResolve(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400">
              Confirm resolution for <strong className="text-slate-900 dark:text-white">{faultToResolve.name}</strong>. Entering maintenance notes will reset telemetry status to <span className="text-emerald-600 dark:text-emerald-400 font-semibold">ACTIVE</span> and close any open maintenance tickets.
            </p>

            <form onSubmit={handleConfirmResolve} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Technician Action Notes
                </label>
                <textarea
                  rows={3}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-lg p-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setFaultToResolve(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resolveFaultMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
                >
                  <Check className="w-4 h-4" />
                  {resolveFaultMutation.isPending ? 'Logging...' : 'Confirm Resolution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Feature 5: Report Fault / Create Maintenance Ticket Modal */}
      {reportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <h3 className="font-semibold text-slate-900 dark:text-white text-lg">
                  Dispatch Maintenance Ticket
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setReportModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmReport} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Target Machine
                  </label>
                  <select
                    value={selectedMachineForFault}
                    onChange={(e) => setSelectedMachineForFault(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {machineList.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.id} - {m.name} ({m.type})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Ticket Priority
                  </label>
                  <select
                    value={ticketPriority}
                    onChange={(e) => setTicketPriority(e.target.value as TicketPriority)}
                    className="w-full bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="Critical">Critical (Immediate stoppage)</option>
                    <option value="High">High (Urgent review)</option>
                    <option value="Medium">Medium (Standard queue)</option>
                    <option value="Low">Low (Scheduled inspection)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Assignee from Roster (Optional)
                </label>
                <select
                  value={ticketAssigneeId}
                  onChange={(e) => setTicketAssigneeId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">-- Unassigned (Floor Pool) --</option>
                  {(workers || []).map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.role} - {w.shift})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Observed Fault & Symptoms
                </label>
                <textarea
                  rows={3}
                  value={faultDescription}
                  onChange={(e) => setFaultDescription(e.target.value)}
                  placeholder="e.g. Hydraulic pressure drop below threshold, abnormal high-frequency spindle vibration."
                  className="w-full bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-lg p-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setReportModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reportFaultMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg"
                >
                  <AlertTriangle className="w-4 h-4" />
                  {reportFaultMutation.isPending ? 'Dispatching...' : 'Dispatch Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Feature 5: Machine Logs & Ticket Workflow Management Modal */}
      {activeLogMachine && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg max-w-xl w-full p-6 shadow-xl space-y-4 max-h-[85vh] flex flex-col justify-between">
            <div className="overflow-y-auto pr-1">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white text-lg">
                      Diagnostics & Tickets: {activeLogMachine.id}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {activeLogMachine.name} • {activeLogMachine.type}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveLogMachine(null)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Active Ticket Status Section */}
              {activeLogMachine.activeTicket ? (
                <div className="mt-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-slate-900 dark:text-white">
                        Active Ticket: {activeLogMachine.activeTicket.id}
                      </span>
                      <span
                        className={clsx(
                          'text-[10px] font-semibold px-1.5 py-0.5 rounded border',
                          getPriorityBadge(activeLogMachine.activeTicket.priority)
                        )}
                      >
                        {activeLogMachine.activeTicket.priority}
                      </span>
                    </div>
                    <span
                      className={clsx(
                        'text-xs font-medium px-2 py-0.5 rounded',
                        getTicketStatusBadge(activeLogMachine.activeTicket.status)
                      )}
                    >
                      {activeLogMachine.activeTicket.status.replace('_', ' ')}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 dark:text-slate-300">
                    {activeLogMachine.activeTicket.description}
                  </p>

                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      <span>
                        Assignee: <strong className="text-slate-800 dark:text-slate-200">{activeLogMachine.activeTicket.assigneeName || 'Unassigned'}</strong>
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{activeLogMachine.activeTicket.createdAt}</span>
                    </div>
                  </div>

                  {/* Status Transition Controls */}
                  {canResolveFault && (
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-2">
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-300 mr-1">
                        Transition Status:
                      </span>
                      {(['Open', 'In Progress', 'Resolved'] as const).map((st) => (
                        <button
                          key={st}
                          type="button"
                          disabled={
                            activeLogMachine.activeTicket?.status === st ||
                            updateTicketMutation.isPending
                          }
                          onClick={() =>
                            handleUpdateTicketStatus(activeLogMachine.activeTicket!.id, st)
                          }
                          className={clsx(
                            'px-2.5 py-1 text-xs font-medium rounded transition-colors',
                            activeLogMachine.activeTicket?.status === st
                              ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-default'
                              : 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900 border border-blue-200 dark:border-blue-900'
                          )}
                        >
                          Mark {st}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>No open maintenance tickets. Machine operating nominally.</span>
                </div>
              )}

              {/* Maintenance History Timeline */}
              <div className="mt-4 space-y-2.5">
                <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Event History
                </h4>
                {(activeLogMachine.logs || []).map((log) => (
                  <div
                    key={log.id}
                    className="p-3 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-lg text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={clsx(
                          'text-[10px] font-semibold px-2 py-0.5 rounded',
                          log.type === 'FAULT'
                            ? 'bg-red-100 dark:bg-red-900/60 text-red-700 dark:text-red-300'
                            : log.type === 'MAINTENANCE'
                            ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300'
                            : 'bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300'
                        )}
                      >
                        {log.type}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">{log.timestamp}</span>
                    </div>
                    <p className="text-slate-800 dark:text-slate-200 font-medium">{log.message}</p>
                    {log.technician && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Technician: <span className="font-medium">{log.technician}</span>
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveLogMachine(null)}
                className="px-4 py-2 text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
