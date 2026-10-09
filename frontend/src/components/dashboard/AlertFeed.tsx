import { useState } from 'react';
import { AlertTriangle, CheckCircle, Flame, ShieldAlert, ArrowRight, Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useNotifications, useMachines } from '../../hooks/useFactoryData';
import { notificationApi } from '../../lib/api';
import { useUiStore } from '../../store/ui.store';

interface AlertItem {
  id: string;
  severity: 'FAULT' | 'WARNING' | 'INFO';
  title: string;
  source: string;
  timestamp: string;
  acknowledged?: boolean;
}

export const AlertFeed = () => {
  const pushToast = useUiStore((s) => s.pushToast);
  const { data: serverNotifications, refetch: refetchNotifications } = useNotifications();
  const { data: machines } = useMachines();
  const [acknowledgedIds, setAcknowledgedIds] = useState<Set<string>>(new Set());

  // Derive live alerts from real backend notifications and machine telemetry faults
  const notificationsList = serverNotifications || [];
  const machineList = machines || [];

  // Identify machines that are currently in FAULT state vs non-faulted state
  const faultedMachines = machineList.filter((m) => m.status === 'FAULT');
  const healthyMachineNames = new Set(
    machineList.filter((m) => m.status !== 'FAULT').map((m) => m.name.toLowerCase())
  );

  const realAlerts: AlertItem[] = [
    // 1. Live machine faults from PostgreSQL database
    ...faultedMachines.map((m) => ({
      id: `fault-${m.id}`,
      severity: 'FAULT' as const,
      title: m.faultMessage || `${m.name} (${m.type}) reported critical operational trip`,
      source: `Telemetry Fleet / ${m.name}`,
      timestamp: m.lastMaintenance || 'Active Trip',
      acknowledged: acknowledgedIds.has(`fault-${m.id}`),
    })),

    // 2. Real notification records from PostgreSQL database
    ...notificationsList
      .filter((n: any) => {
        // If this is a MACHINE_FAULT notification, synchronize with machine fleet status
        if (n.type === 'MACHINE_FAULT') {
          if (n.isRead) return false;
          const lowerMsg = (n.message || '').toLowerCase();
          const isForHealthyMachine = Array.from(healthyMachineNames).some((name) =>
            lowerMsg.includes(name)
          );
          if (isForHealthyMachine) {
            // Machine is ACTIVE or IDLE in the fleet; this fault alert is resolved
            return false;
          }
          const isForFaultedMachine = faultedMachines.some((m) =>
            lowerMsg.includes(m.name.toLowerCase())
          );
          if (isForFaultedMachine) {
            // Handled cleanly by live telemetry item above
            return false;
          }
        }
        return true;
      })
      .map((n: any) => {
        const severityMap: Record<string, 'FAULT' | 'WARNING' | 'INFO'> = {
          CRITICAL: 'FAULT',
          WARNING: 'WARNING',
          INFO: 'INFO',
        };
        return {
          id: n.id,
          severity: severityMap[n.severity] || 'INFO',
          title: n.message,
          source: `System Alert • ${n.type || 'NOTIFICATION'}`,
          timestamp: n.createdAt
            ? new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : 'Live',
          acknowledged: n.isRead || acknowledgedIds.has(n.id),
        };
      }),
  ];

  const handleAcknowledge = async (id: string) => {
    setAcknowledgedIds((prev) => new Set([...prev, id]));
    if (!id.startsWith('fault-')) {
      try {
        await notificationApi.markAsRead(id);
        refetchNotifications();
        pushToast('Notification marked as read in database.', 'info');
      } catch {
        // acknowledged locally
      }
    } else {
      pushToast('Fault alert acknowledged by supervisor.', 'info');
    }
  };

  const activeCount = realAlerts.filter((a) => !a.acknowledged).length;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-500" />
            <h3 className="font-semibold text-sm text-slate-900 dark:text-white">Active Alerts</h3>
          </div>
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {activeCount} unacknowledged
          </span>
        </div>

        <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
          {realAlerts.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400 space-y-2">
              <Bell className="w-6 h-6 mx-auto text-slate-300 dark:text-slate-600" />
              <p>All factory telemetry is nominal. Zero active alerts.</p>
            </div>
          ) : (
            realAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-3.5 rounded-lg border text-xs transition-all ${
                  alert.acknowledged
                    ? 'bg-slate-50/50 dark:bg-slate-950/30 border-slate-200 dark:border-slate-800/80 opacity-60'
                    : alert.severity === 'FAULT'
                    ? 'bg-red-50/60 dark:bg-red-950/30 border-red-200 dark:border-red-900/60'
                    : alert.severity === 'WARNING'
                    ? 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60'
                    : 'bg-blue-50/60 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/60'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {alert.severity === 'FAULT' ? (
                      <Flame className="w-3.5 h-3.5 text-red-600 dark:text-red-400 flex-shrink-0" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                    )}
                    <span
                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                        alert.severity === 'FAULT'
                          ? 'bg-red-100 dark:bg-red-900/60 text-red-700 dark:text-red-300'
                          : alert.severity === 'WARNING'
                          ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300'
                          : 'bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300'
                      }`}
                    >
                      {alert.severity}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px] truncate max-w-[140px]">
                      {alert.source}
                    </span>
                  </div>
                  <span className="text-slate-400 text-[11px] font-mono">{alert.timestamp}</span>
                </div>

                <p className="mt-2 text-slate-800 dark:text-slate-200 font-medium leading-snug">
                  {alert.title}
                </p>

                <div className="mt-3 flex items-center justify-between border-t border-slate-200/60 dark:border-slate-800/80 pt-2">
                  {alert.acknowledged ? (
                    <span className="text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-1 font-medium">
                      <CheckCircle className="w-3 h-3" /> Acknowledged
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleAcknowledge(alert.id)}
                      className="text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                    >
                      Acknowledge
                    </button>
                  )}

                  {alert.severity === 'FAULT' && (
                    <Link
                      to="/machines"
                      className="text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 flex items-center gap-1"
                    >
                      Inspect Machine <ArrowRight className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
        <Link
          to="/machines"
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium inline-flex items-center gap-1"
        >
          Open Machine Fleet Diagnostics <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
};
