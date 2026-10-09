import React, { useState, useEffect } from 'react';
import {
  Factory,
  CheckCircle2,
  AlertTriangle,
  Send,
  BarChart3,
  Layers,
  Lock,
  Target,
  ShieldCheck,
  UserCheck,
  TrendingUp,
} from 'lucide-react';
import {
  useProductionLines,
  useProductionLogs,
  useAddProductionLogMutation,
  useSetProductionTargetMutation,
  useFactoryKPIs,
} from '../hooks/useFactoryData';
import { useAuthStore } from '../store/auth.store';
import clsx from 'clsx';

const delayCauses = [
  'None',
  'Material Shortage',
  'Tool Wear Calibration',
  'Power Fluctuation',
  'Unplanned Machine Stoppage',
  'Operator Shift Changeover',
  'Quality Control Hold',
];

const skuList = [
  'SKU-TURBINE-X (Heavy Core)',
  'SKU-VALVE-CAST (Cast Alloy)',
  'SKU-HOUSING-B (Precision Shield)',
  'SKU-MOTOR-STATOR-04 (Electric)',
];

export const Production: React.FC = () => {
  const { user, activeFactory } = useAuthStore();
  const userRole = activeFactory?.role || 'VIEWER';
  const isViewer = userRole === 'VIEWER';
  const isManager = userRole === 'MANAGER' || userRole === 'OWNER';
  const isSupervisorOrOperator = userRole === 'SUPERVISOR' || userRole === 'OPERATOR';

  const { data: lines } = useProductionLines();
  const { data: logs, isLoading: logsLoading } = useProductionLogs();
  const { data: kpis } = useFactoryKPIs();

  const addLogMutation = useAddProductionLogMutation();
  const setTargetMutation = useSetProductionTargetMutation();

  const lineList = lines || [];
  const logList = logs || [];

  // Common Selection State
  const [selectedLineId, setSelectedLineId] = useState(lineList[0]?.id || '');
  const [selectedShift, setSelectedShift] = useState('Morning');

  const activeShiftType = kpis?.activeShift?.type;
  const activeShiftLabel = activeShiftType === 'MORNING'
    ? 'Morning Shift (06:00 - 14:00)'
    : activeShiftType === 'AFTERNOON'
    ? 'Afternoon Shift (14:00 - 22:00)'
    : activeShiftType === 'NIGHT'
    ? 'Night Shift (22:00 - 06:00)'
    : `${selectedShift} Shift (Manager Scheduled)`;

  // Update selectedLineId once lines load if currently empty
  useEffect(() => {
    if (!selectedLineId && lineList.length > 0) {
      setSelectedLineId(lineList[0].id);
    }
  }, [lineList, selectedLineId]);

  const selectedLine = lineList.find((l) => l.id === selectedLineId) || lineList[0] || {
    id: 'L-1',
    name: 'Production Line 1',
    target: 0,
    produced: 0,
    rejects: 0,
    efficiency: 0,
    yieldRate: 100,
  };

  // Manager Target Form State
  const [targetUnitsInput, setTargetUnitsInput] = useState<number | ''>(
    selectedLine?.target > 0 ? selectedLine.target : ''
  );
  const [targetSuccess, setTargetSuccess] = useState(false);

  useEffect(() => {
    if (selectedLine?.target && selectedLine.target > 0) {
      setTargetUnitsInput(selectedLine.target);
    } else {
      setTargetUnitsInput('');
    }
  }, [selectedLine?.target, selectedLineId]);

  // Operator / Supervisor Run Log State
  const selectedSku = skuList[0];
  const [unitsProduced, setUnitsProduced] = useState<number | ''>('');
  const [unitsRejected, setUnitsRejected] = useState<number | ''>('');
  const [selectedDelayCause, setSelectedDelayCause] = useState('None');
  const [logSuccess, setLogSuccess] = useState(false);

  // Calculated Real-time Yield Metrics
  const numProduced = typeof unitsProduced === 'number' ? unitsProduced : 0;
  const numRejected = typeof unitsRejected === 'number' ? unitsRejected : 0;
  const grossUnits = numProduced + numRejected;
  const scrapRate = grossUnits > 0 ? ((numRejected / grossUnits) * 100).toFixed(1) : '0.0';
  const yieldRate = grossUnits > 0 ? ((numProduced / grossUnits) * 100).toFixed(1) : '100.0';

  // Handler for Manager setting target
  const handleSetTarget = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isManager || !selectedLineId) return;

    const parsedTarget = typeof targetUnitsInput === 'number' ? targetUnitsInput : parseInt(String(targetUnitsInput), 10);
    if (isNaN(parsedTarget) || parsedTarget < 1) return;

    setTargetMutation.mutate(
      {
        lineId: selectedLineId,
        targetUnits: parsedTarget,
        shiftType: selectedShift,
      },
      {
        onSuccess: () => {
          setTargetSuccess(true);
          setTimeout(() => setTargetSuccess(false), 3500);
        },
      }
    );
  };

  // Handler for Operator / Supervisor submitting output log
  const handleLogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupervisorOrOperator) return;

    const produced = typeof unitsProduced === 'number' ? unitsProduced : parseInt(String(unitsProduced) || '0', 10);
    const rejected = typeof unitsRejected === 'number' ? unitsRejected : parseInt(String(unitsRejected) || '0', 10);

    addLogMutation.mutate(
      {
        factoryId: activeFactory?.factoryId || 'f-1',
        lineId: selectedLineId,
        lineName: selectedLine?.name || 'Production Line',
        shift: activeShiftLabel,
        productSku: selectedSku,
        unitsProduced: isNaN(produced) ? 0 : produced,
        unitsRejected: isNaN(rejected) ? 0 : rejected,
        delayCause: selectedDelayCause,
        loggedBy: user?.name || userRole,
      },
      {
        onSuccess: () => {
          setLogSuccess(true);
          setTimeout(() => setLogSuccess(false), 3500);
        },
      }
    );
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800 gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Production Management & Yield Tracking
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Plant Managers set shift output targets. Supervisors and floor operators log final produced and rejected units.
          </p>
        </div>

        {/* Role Badge Indicator */}
        <div>
          {isManager ? (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900/60 text-xs text-blue-700 dark:text-blue-300 font-semibold shadow-sm">
              <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Manager Role: Target Authorization</span>
            </div>
          ) : isSupervisorOrOperator ? (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900/60 text-xs text-emerald-700 dark:text-emerald-300 font-semibold shadow-sm">
              <UserCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>{userRole === 'SUPERVISOR' ? 'Supervisor' : 'Operator'} Role: Output Logging</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-xs text-amber-700 dark:text-amber-300 font-medium">
              <Lock className="w-3.5 h-3.5" />
              <span>Viewer Mode: Read-Only Access</span>
            </div>
          )}
        </div>
      </div>

      {/* Target Notice Banner: Visible to EVERYONE (Manager, Supervisor, Operator, Owner) */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-blue-950/30 border border-blue-200 dark:border-blue-900/60 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-blue-100 dark:border-blue-900/40 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-blue-600 text-white shadow-sm">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Today's Shift Production Targets
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 dark:bg-blue-900/70 text-blue-800 dark:text-blue-200 uppercase tracking-wide">
                  Manager Defined
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                Active targets broadcast across all production lines. Output is logged by Supervisors and Operators at shift end.
              </p>
            </div>
          </div>

          <div className="text-left md:text-right">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block uppercase tracking-wider">
              Total Factory Target
            </span>
            {lineList.some((l) => (l.target || 0) > 0) ? (
              <span className="text-2xl font-bold font-mono text-blue-600 dark:text-blue-400">
                {lineList.reduce((acc, l) => acc + (l.target || 0), 0).toLocaleString()} <span className="text-xs font-normal text-slate-500">units</span>
              </span>
            ) : (
              <span className="text-sm font-semibold text-amber-500 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/40 px-2.5 py-1 rounded inline-block mt-1">
                Pending Manager Target
              </span>
            )}
          </div>
        </div>

        {/* Line-by-Line Target Breakdown Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {lineList.map((line) => {
            const hasTarget = Boolean(line.target && line.target > 0);
            const pct = hasTarget ? Math.min(100, Math.round((line.produced / line.target) * 100)) : 0;
            const isSelected = line.id === selectedLineId;
            return (
              <div
                key={line.id}
                onClick={() => setSelectedLineId(line.id)}
                className={clsx(
                  'p-3.5 rounded-lg border transition-all cursor-pointer bg-white dark:bg-slate-900/80',
                  isSelected
                    ? 'border-blue-500 dark:border-blue-400 ring-2 ring-blue-500/20 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                    {line.name}
                  </span>
                  {isSelected && (
                    <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400">Selected</span>
                  )}
                </div>

                <div className="mt-2.5 flex items-baseline justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Shift Target:</span>
                  {hasTarget ? (
                    <span className="font-bold font-mono text-slate-900 dark:text-white">
                      {line.target.toLocaleString()} units
                    </span>
                  ) : (
                    <span className="font-medium text-amber-600 dark:text-amber-400 italic text-[11px] bg-amber-50 dark:bg-amber-950/50 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-900/40">
                      Not Set
                    </span>
                  )}
                </div>

                <div className="mt-1 flex items-baseline justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Produced:</span>
                  <span className="font-semibold font-mono text-emerald-600 dark:text-emerald-400">
                    {line.produced.toLocaleString()} {hasTarget ? `(${pct}%)` : ''}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="mt-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={clsx(
                      'h-1.5 rounded-full transition-all duration-300',
                      pct >= 100 ? 'bg-emerald-500' : 'bg-blue-600'
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Columns: Action Form (Role-Gated) & Recent Runs */}
        <div className="lg:col-span-2 space-y-8">
          {/* MANAGER VIEW: Set Production Target Form */}
          {isManager && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-5">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <div>
                    <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                      Set Shift Production Target
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      As Plant Manager, configure the target units for today's operational shifts.
                    </p>
                  </div>
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Manager: <span className="font-semibold text-slate-800 dark:text-slate-200">{user?.name || 'Bob Manager'}</span>
                </span>
              </div>

              {targetSuccess && (
                <div className="mb-4 p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                  <span>
                    Production target successfully updated in PostgreSQL database and broadcast to floor terminals.
                  </span>
                </div>
              )}

              <form onSubmit={handleSetTarget} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      Target Production Line
                    </label>
                    <select
                      value={selectedLineId}
                      onChange={(e) => setSelectedLineId(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      {lineList.map((line) => (
                        <option key={line.id} value={line.id}>
                          {line.name} (Current Target: {line.target > 0 ? `${line.target} units` : 'Not Set'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      Operational Shift
                    </label>
                    <select
                      value={selectedShift}
                      onChange={(e) => setSelectedShift(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="Morning">Morning Shift (06:00 - 14:00)</option>
                      <option value="Afternoon">Afternoon Shift (14:00 - 22:00)</option>
                      <option value="Night">Night Shift (22:00 - 06:00)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Target Quota for this Line (Units)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      placeholder="e.g. 500"
                      value={targetUnitsInput}
                      onChange={(e) =>
                        setTargetUnitsInput(e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value) || 1))
                      }
                      className="w-full bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-sm font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      required
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-mono">
                      parts / shift
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Previous quota: {selectedLine?.target > 0 ? `${selectedLine.target} units` : 'Not Set yet'}. Once published, this line's target will update for all operators.
                  </p>
                </div>

                <div className="p-3 bg-blue-50/60 dark:bg-blue-950/30 rounded-lg border border-blue-200/60 dark:border-blue-900/40 text-xs text-blue-800 dark:text-blue-300 flex items-start gap-2">
                  <TrendingUp className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
                  <span>
                    <strong>Delegation Notice:</strong> Managers establish target quotas. At the end of the shift,
                    floor supervisors and operators record the actual units produced and rejected.
                  </span>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={setTargetMutation.isPending}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition-colors shadow-sm"
                  >
                    <Target className="w-4 h-4" />
                    <span>{setTargetMutation.isPending ? 'Setting Target...' : 'Publish Shift Target'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* SUPERVISOR / OPERATOR VIEW: Log Produced & Rejected Units */}
          {isSupervisorOrOperator && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-5">
                <div className="flex items-center gap-2">
                  <Factory className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                      Record End-of-Shift Production Output
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Record final good parts produced and defect rejections against the Manager's target.
                    </p>
                  </div>
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Logged by: <span className="font-semibold text-slate-800 dark:text-slate-200">{user?.name || userRole}</span>
                </span>
              </div>

              {logSuccess && (
                <div className="mb-4 p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                  <span>Production run logged. Line counters, scrap rate, and OEE metrics synchronized.</span>
                </div>
              )}

              {/* Target Banner for Operator/Supervisor */}
              <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-950/60 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-slate-600 dark:text-slate-300">
                    Manager's Established Target for <strong>{selectedLine.name}</strong>:
                  </span>
                </div>
                {selectedLine.target > 0 ? (
                  <span className="font-bold font-mono text-blue-600 dark:text-blue-400 text-sm">
                    {selectedLine.target.toLocaleString()} units
                  </span>
                ) : (
                  <span className="font-semibold text-amber-600 dark:text-amber-400 text-xs px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800">
                    Not Set by Manager
                  </span>
                )}
              </div>

              <form onSubmit={handleLogSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      Target Production Line
                    </label>
                    <select
                      value={selectedLineId}
                      onChange={(e) => setSelectedLineId(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      {lineList.map((line) => (
                        <option key={line.id} value={line.id}>
                          {line.name} (Target: {line.target > 0 ? `${line.target} units` : 'Not Set'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                      <span>Operational Shift</span>
                    </label>
                    <div className="w-full bg-slate-100 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-xs text-slate-800 dark:text-slate-200 font-medium flex items-center justify-between cursor-not-allowed">
                      <span className="font-semibold">{activeShiftLabel}</span>
                      <span className="text-[10px] bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-semibold px-2 py-0.5 rounded">
                        Manager Scheduled
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      Units Produced (Good Parts)
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={unitsProduced}
                      onChange={(e) =>
                        setUnitsProduced(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0))
                      }
                      className="w-full bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-xs text-slate-900 dark:text-white font-mono font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      Units Rejected (Scrap / Defect)
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={unitsRejected}
                      onChange={(e) =>
                        setUnitsRejected(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0))
                      }
                      className="w-full bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-xs text-slate-900 dark:text-white font-mono font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Observed Delay / Downtime Cause (Optional)
                  </label>
                  <select
                    value={selectedDelayCause}
                    onChange={(e) => setSelectedDelayCause(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {delayCauses.map((cause) => (
                      <option key={cause} value={cause}>
                        {cause}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={addLogMutation.isPending}
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition-colors shadow-sm"
                  >
                    <Send className="w-4 h-4" />
                    <span>{addLogMutation.isPending ? 'Logging Run...' : 'Submit Shift Output'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* VIEWER NOTICE */}
          {isViewer && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 shadow-sm flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
              <Lock className="w-5 h-5 text-amber-500 flex-shrink-0" />
              <span>
                <strong>Viewer Mode:</strong> You have read-only permissions. Target setting is reserved for
                Managers, and output logging is reserved for Supervisors and Operators.
              </span>
            </div>
          )}

          {/* Recent Submissions List */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h3 className="font-semibold text-sm text-slate-900 dark:text-white">
                  Recent Production Runs
                </h3>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {logList.length} Runs Logged
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-950/80 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-semibold tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3">Log ID</th>
                    <th className="p-3">Line & SKU</th>
                    <th className="p-3">Produced</th>
                    <th className="p-3">Rejections</th>
                    <th className="p-3">Delay Reason</th>
                    <th className="p-3">Logged By</th>
                    <th className="p-3">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                  {logsLoading ? (
                    <tr>
                      <td colSpan={7} className="p-4 text-center text-slate-500 font-sans">
                        Loading log stream...
                      </td>
                    </tr>
                  ) : logList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-slate-500 font-sans">
                        No production logs recorded yet for this active cycle.
                      </td>
                    </tr>
                  ) : (
                    logList.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="p-3 text-slate-500 dark:text-slate-400">{log.id.slice(0, 8)}...</td>
                        <td className="p-3 font-sans">
                          <span className="text-slate-900 dark:text-white font-medium block">{log.lineName}</span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">{log.productSku}</span>
                        </td>
                        <td className="p-3 text-emerald-600 dark:text-emerald-400 font-semibold">{log.unitsProduced} units</td>
                        <td className="p-3">
                          <span className={log.unitsRejected > 10 ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-slate-600 dark:text-slate-300'}>
                            {log.unitsRejected}
                          </span>
                        </td>
                        <td className="p-3 font-sans">
                          <span
                            className={clsx(
                              'px-2 py-0.5 rounded text-xs',
                              log.delayCause === 'None'
                                ? 'text-slate-500 dark:text-slate-400'
                                : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-medium'
                            )}
                          >
                            {log.delayCause}
                          </span>
                        </td>
                        <td className="p-3 text-slate-600 dark:text-slate-300 font-sans">{log.loggedBy}</td>
                        <td className="p-3 text-slate-400 text-xs font-mono">{log.timestamp}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right 1 Column: Live Calculations & Selected Line Preview */}
        <div className="space-y-8">
          {/* Real-time Yield Calculation Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="font-semibold text-sm text-slate-900 dark:text-white">
                  Real-Time Batch Yield
                </h3>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Live Analysis
              </span>
            </div>

            <div className="space-y-3">
              <div className="bg-slate-50 dark:bg-slate-950/50 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">First Pass Yield</span>
                <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 font-mono mt-1">{yieldRate}%</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Good units ratio: {unitsProduced} / {grossUnits} total parts
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950/50 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Scrap Rate</span>
                <p
                  className={clsx(
                    'text-2xl font-bold font-mono mt-1',
                    parseFloat(scrapRate) > 5 ? 'text-red-600 dark:text-red-400' : 'text-slate-800 dark:text-slate-200'
                  )}
                >
                  {scrapRate}%
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Rejection cost impact: ${(numRejected * 45).toLocaleString()}
                </p>
              </div>

              {selectedDelayCause !== 'None' && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-lg text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                  <div>
                    <span className="font-semibold block">Downtime Cause Flagged:</span>
                    <span className="text-slate-600 dark:text-slate-300">
                      {selectedDelayCause} will be tagged in the shift downtime breakdown.
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Selected Line Diagnostic Snapshot */}
          {selectedLine && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 shadow-sm space-y-3">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Selected Cell Diagnostics
              </span>
              <h4 className="text-base font-semibold text-slate-900 dark:text-white">{selectedLine.name}</h4>

              <div className="space-y-2.5 text-xs pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Shift Target (Manager):</span>
                  {selectedLine.target > 0 ? (
                    <span className="font-bold text-blue-600 dark:text-blue-400 font-mono">
                      {selectedLine.target.toLocaleString()} units
                    </span>
                  ) : (
                    <span className="font-medium text-amber-600 dark:text-amber-400 italic text-xs">
                      Not Set
                    </span>
                  )}
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Produced so far:</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
                    {selectedLine.produced.toLocaleString()} units
                  </span>
                </div>
                {selectedLine.target > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Remaining to Goal:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300 font-mono">
                      {Math.max(0, selectedLine.target - selectedLine.produced).toLocaleString()} units
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Current OEE:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                    {selectedLine.efficiency}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Quality Yield:</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
                    {selectedLine.yieldRate || 100}%
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
