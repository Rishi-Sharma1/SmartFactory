import { Clock, UserCheck, ShieldCheck, Zap, Sparkles, Play, Square, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { useFactoryKPIs, useCloseShiftMutation, useStartShiftMutation } from '../../hooks/useFactoryData';

interface ShiftCardProps {
  shiftName?: string;
  supervisorName?: string;
  timeRange?: string;
}

export const ShiftCard = ({
  shiftName,
  supervisorName,
  timeRange = '06:00 - 14:00 (Floor Schedule)',
}: ShiftCardProps) => {
  const { activeFactory } = useAuthStore();
  const currentRole = activeFactory?.role || 'OWNER';
  const { data: kpis } = useFactoryKPIs();

  const closeShiftMutation = useCloseShiftMutation();
  const startShiftMutation = useStartShiftMutation();

  const activeShift = kpis?.activeShift;
  const lastShift = kpis?.lastShift;
  const currentShift = activeShift || lastShift;
  const isShiftActive = Boolean(activeShift);

  const realShiftName = shiftName || (currentShift ? `${currentShift.type} Shift` : (isShiftActive ? 'Active Shift' : 'No Active Shift'));
  const realSupervisor = supervisorName || currentShift?.supervisorName || 'Unassigned';
  const realActiveStaff = kpis?.activeStaff ?? 0;
  const realTotalStaff = kpis?.totalStaff ?? 0;
  const realEfficiency = kpis?.efficiency ?? 0;

  const shiftStatus = isShiftActive ? 'In Progress' : 'Ended';

  const startTimeStr = currentShift?.startTime
    ? new Date(currentShift.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;
  const endTimeStr = currentShift?.endTime
    ? new Date(currentShift.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  const dynamicTimeRange = startTimeStr
    ? isShiftActive
      ? `Started: ${startTimeStr} • Floor Schedule Active`
      : `Started: ${startTimeStr} • Closed: ${endTimeStr || 'Recently'}`
    : timeRange || 'No active shift running';


  const aiDigest = currentShift?.aiDigest || (
    isShiftActive
      ? 'Gemini AI Shift Digest: Active shift tracking initialized for this factory.'
      : 'No active shift is currently open. Click "Start Shift" to begin tracking.'
  );


  const canManageShift = ['OWNER', 'MANAGER', 'SUPERVISOR'].includes(currentRole);
  const canViewAiDigest = ['OWNER', 'MANAGER'].includes(currentRole);

  const handleEndShift = () => {
    if (!canManageShift || closeShiftMutation.isPending) return;
    const targetShiftId = activeShift?.id || 'active';
    closeShiftMutation.mutate(targetShiftId);
  };

  const handleStartShift = () => {
    if (!canManageShift || startShiftMutation.isPending) return;
    let nextRotation: 'MORNING' | 'AFTERNOON' | 'NIGHT' = 'MORNING';
    const prevType = (currentShift?.type || '').toUpperCase();
    if (prevType === 'MORNING') nextRotation = 'AFTERNOON';
    else if (prevType === 'AFTERNOON') nextRotation = 'NIGHT';
    else nextRotation = 'MORNING';

    startShiftMutation.mutate(nextRotation);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h3 className="font-semibold text-sm text-slate-900 dark:text-white">Active Shift</h3>
          </div>
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded border ${
              shiftStatus === 'In Progress'
                ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
            }`}
          >
            {shiftStatus}
          </span>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400">Current Rotation</span>
              {endTimeStr && !isShiftActive && (
                <span className="text-[11px] font-mono text-amber-600 dark:text-amber-400 font-medium">
                  Closed at {endTimeStr}
                </span>
              )}
            </div>
            <p className="text-base font-semibold text-slate-900 dark:text-white mt-0.5">{realShiftName}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{dynamicTimeRange}</p>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">Shift Elapsed</span>
              <span className="text-slate-700 dark:text-slate-200 font-mono font-medium">
                {isShiftActive ? 'In Progress' : '100% (Completed)'}
              </span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-blue-600 dark:bg-blue-500 h-1.5 rounded-full transition-all duration-500"
                style={{ width: isShiftActive ? '65%' : '100%' }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
            <div className="bg-slate-50 dark:bg-slate-950/50 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-xs mb-1">
                <UserCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Floor Staffing</span>
              </div>
              <p className="text-slate-900 dark:text-white font-bold font-mono text-sm">
                {isShiftActive ? realActiveStaff : 0} <span className="text-slate-500 text-xs font-normal">/ {realTotalStaff} present</span>
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950/50 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-xs mb-1">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span>Floor Efficiency</span>
              </div>
              <p className="text-emerald-600 dark:text-emerald-400 font-bold font-mono text-sm">
                {realEfficiency}%
              </p>
            </div>
          </div>

          {/* Gemini AI Shift Digest (Owner & Manager View) */}
          {canViewAiDigest && aiDigest && (
            <div className="p-3 rounded-lg bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 text-blue-700 dark:text-blue-300 font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Gemini 1.5 Shift Digest</span>
              </div>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
                {aiDigest}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-1.5 truncate">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
          <span className="truncate">Shift Lead: {realSupervisor}</span>
        </div>

        {/* Role-gated Shift Controls (Owner, Manager, Supervisor) */}
        {canManageShift && (
          <div>
            {isShiftActive ? (
              <button
                type="button"
                onClick={handleEndShift}
                disabled={closeShiftMutation.isPending}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900 hover:bg-amber-100 dark:hover:bg-amber-900/60 transition-colors font-medium text-[11px] disabled:opacity-50"
              >
                {closeShiftMutation.isPending ? (
                  <Loader2 className="w-3 h-3 animate-spin text-amber-600" />
                ) : (
                  <Square className="w-3 h-3 text-amber-600" />
                )}
                <span>{closeShiftMutation.isPending ? 'Ending...' : 'End Shift'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStartShift}
                disabled={startShiftMutation.isPending}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors font-medium text-[11px] disabled:opacity-50"
              >
                {startShiftMutation.isPending ? (
                  <Loader2 className="w-3 h-3 animate-spin text-emerald-600" />
                ) : (
                  <Play className="w-3 h-3 text-emerald-600" />
                )}
                <span>{startShiftMutation.isPending ? 'Starting...' : 'Start Shift'}</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
