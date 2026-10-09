import { useState } from 'react';
import {
  AlertOctagon,
  CheckCircle2,
  Clock,
  Send,
  UserCheck,
  LogOut as LogOutIcon,
  ChevronDown,
  ChevronUp,
  Cpu,
} from 'lucide-react';
import { useMachines, useReportFaultMutation } from '../../hooks/useFactoryData';
import { useAuthStore } from '../../store/auth.store';
import { useUiStore } from '../../store/ui.store';
import clsx from 'clsx';
import type { TicketPriority } from '../../types/index';

export const OperatorStationCard = () => {
  const { user } = useAuthStore();
  const pushToast = useUiStore((s) => s.pushToast);
  const { data: machines, isLoading: machinesLoading } = useMachines();
  const reportFaultMutation = useReportFaultMutation();

  // Self Check-in local state
  const [isCheckedIn, setIsCheckedIn] = useState<boolean>(true);
  const [checkInTime, setCheckInTime] = useState<string>('06:00 AM');
  const [showFaultForm, setShowFaultForm] = useState<boolean>(false);

  // Fault report form state
  const [selectedMachineId, setSelectedMachineId] = useState<string>('');
  const [faultSeverity, setFaultSeverity] = useState<TicketPriority>('Critical');
  const [faultDescription, setFaultDescription] = useState<string>('');

  const machineList = machines || [];
  const currentMachineId = selectedMachineId || machineList[0]?.id || '';

  const handleToggleAttendance = () => {
    if (isCheckedIn) {
      setIsCheckedIn(false);
      pushToast('Clocked out from shift. Attendance record closed.', 'info');
    } else {
      setIsCheckedIn(true);
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setCheckInTime(now);
      pushToast(`Self check-in recorded at ${now}. Welcome to your shift!`, 'success');
    }
  };

  const handleReportFaultSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMachineId || !faultDescription.trim()) return;

    reportFaultMutation.mutate(
      {
        machineId: currentMachineId,
        faultDescription: faultDescription.trim(),
        priority: faultSeverity,
      },
      {
        onSuccess: () => {
          setFaultDescription('');
          setShowFaultForm(false);
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      {/* Operator Station Attendance & Self Check-in */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-semibold text-sm text-slate-900 dark:text-white">
              Operator Station Console
            </h3>
          </div>
          <span
            className={clsx(
              'text-xs font-semibold px-2 py-0.5 rounded border',
              isCheckedIn
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900'
                : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900'
            )}
          >
            {isCheckedIn ? 'Clocked In' : 'Clocked Out'}
          </span>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs">
            <div>
              <p className="text-slate-500 dark:text-slate-400">Assigned Operator</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5">
                {user?.name || 'Dave Operator'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-slate-500 dark:text-slate-400">Current Shift</p>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mt-0.5">
                Morning Shift (06:00 - 14:00)
              </p>
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-950/50 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-slate-600 dark:text-slate-400">
                {isCheckedIn ? `Checked in today at ${checkInTime}` : 'Not currently clocked in'}
              </span>
            </div>
            <button
              type="button"
              onClick={handleToggleAttendance}
              className={clsx(
                'px-3 py-1.5 rounded-lg font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-sm',
                isCheckedIn
                  ? 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900 hover:bg-red-100 dark:hover:bg-red-900/60'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              )}
            >
              {isCheckedIn ? (
                <>
                  <LogOutIcon className="w-3.5 h-3.5" />
                  <span>Clock Out</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Self Check-In</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Machine Telemetry & Quick Fault Reporting (Operator Exclusive) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h3 className="font-semibold text-sm text-slate-900 dark:text-white">
              Station Machinery Status
            </h3>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {machineList.length} Connected Units
          </span>
        </div>

        {/* Machine Quick List */}
        <div className="space-y-2 mb-4">
          {machinesLoading ? (
            <p className="text-xs text-slate-400 py-2">Loading machine telemetry...</p>
          ) : (
            machineList.slice(0, 4).map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={clsx(
                      'w-2 h-2 rounded-full',
                      m.status === 'ACTIVE'
                        ? 'bg-emerald-500'
                        : m.status === 'FAULT'
                        ? 'bg-red-500 animate-pulse'
                        : 'bg-amber-500'
                    )}
                  />
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {m.name}
                    </span>
                    <span className="text-slate-400 ml-1.5 font-mono text-[11px]">({m.type})</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-slate-500 font-mono text-[11px]">
                    {m.temperature}°C • {m.vibration}mm/s
                  </span>
                  <span
                    className={clsx(
                      'text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase',
                      m.status === 'ACTIVE'
                        ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300'
                        : m.status === 'FAULT'
                        ? 'bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300'
                        : 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300'
                    )}
                  >
                    {m.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Report Machine Fault Action Accordion */}
        <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
          <button
            type="button"
            onClick={() => setShowFaultForm(!showFaultForm)}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-xs font-semibold hover:bg-red-100 dark:hover:bg-red-950/70 transition-colors"
          >
            <div className="flex items-center gap-2">
              <AlertOctagon className="w-4 h-4 text-red-600 dark:text-red-400" />
              <span>Report Machine Fault</span>
            </div>
            {showFaultForm ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showFaultForm && (
            <form
              onSubmit={handleReportFaultSubmit}
              className="mt-3 p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-3 text-xs"
            >
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                  Machine
                </label>
                <select
                  value={currentMachineId}
                  onChange={(e) => setSelectedMachineId(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs"
                >
                  {machineList.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                  Severity
                </label>
                <div className="flex gap-2">
                  {(['Medium', 'High', 'Critical'] as TicketPriority[]).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setFaultSeverity(p)}
                      className={clsx(
                        'flex-1 py-1 rounded text-[11px] font-semibold transition-colors border',
                        faultSeverity === p
                          ? p === 'Critical'
                            ? 'bg-red-600 text-white border-red-600'
                            : p === 'High'
                            ? 'bg-amber-600 text-white border-amber-600'
                            : 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                  Fault Description
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g., Abnormal spindle temperature > 80°C or conveyor belt jam..."
                  value={faultDescription}
                  onChange={(e) => setFaultDescription(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs placeholder-slate-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowFaultForm(false)}
                  className="px-3 py-1 rounded text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reportFaultMutation.isPending || !faultDescription.trim()}
                  className="px-3.5 py-1.5 rounded-md bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold flex items-center gap-1.5 shadow-sm"
                >
                  <Send className="w-3 h-3" />
                  <span>{reportFaultMutation.isPending ? 'Logging...' : 'Dispatch Alert'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
