import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  Clock,
  AlertCircle,
  Users,
  Download,
  Search,
  Check,
  X,
  Edit2,
  Calendar,
  Lock,
  ListFilter,
  UserPlus,
  Loader2,
  Plus,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  ChevronRight,
} from 'lucide-react';
import {
  useShiftWorkers,
  useDailyRegisters,
  useSaveDailySheetMutation,
  useOverrideAttendanceMutation,
  useAddLabourMutation,
} from '../hooks/useFactoryData';
import { useAuthStore } from '../store/auth.store';
import type { ShiftWorker, AttendanceStatus } from '../types/index';
import clsx from 'clsx';

export const Attendance: React.FC = () => {
  const { activeFactory } = useAuthStore();
  const currentRole = activeFactory?.role || 'VIEWER';
  const canMarkAttendance = ['SUPERVISOR', 'MANAGER', 'OWNER'].includes(currentRole);

  const { data: workers, isLoading: isLoadingWorkers } = useShiftWorkers();
  const { data: registers, isLoading: isLoadingRegisters } = useDailyRegisters();
  const saveSheetMutation = useSaveDailySheetMutation();
  const overrideMutation = useOverrideAttendanceMutation();
  const addLabourMutation = useAddLabourMutation();

  // Navigation View Modes: 'registers' | 'record' | 'detail' | 'heatmap'
  const [activeTab, setActiveTab] = useState<'registers' | 'record' | 'detail' | 'heatmap'>('registers');
  const [selectedRegister, setSelectedRegister] = useState<any | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedShift, setSelectedShift] = useState<'All' | 'Morning' | 'Afternoon' | 'Night'>('All');

  // Override Modal
  const [overrideWorker, setOverrideWorker] = useState<ShiftWorker | null>(null);
  const [overrideStatus, setOverrideStatus] = useState<AttendanceStatus>('PRESENT');

  // Add Labour Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newLabourName, setNewLabourName] = useState('');

  // Daily Sheet Recording State
  const [recordDate, setRecordDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [sheetStatuses, setSheetStatuses] = useState<Record<string, 'PRESENT' | 'ABSENT'>>({});

  // Filter only floor labours (OPERATOR role)
  const excludedRoles = ['OWNER', 'MANAGER', 'SUPERVISOR'];
  const workerList = (workers || []).filter((w) => {
    const roleUpper = (w.role || '').toUpperCase();
    return !excludedRoles.includes(roleUpper) && !excludedRoles.some((r) => roleUpper.includes(r));
  });

  // Initialize sheet statuses when entering 'record' view or when workerList updates
  useEffect(() => {
    if (activeTab === 'record') {
      const initialMap: Record<string, 'PRESENT' | 'ABSENT'> = {};
      workerList.forEach((w) => {
        initialMap[w.userId || w.id] = (sheetStatuses[w.userId || w.id] as 'PRESENT' | 'ABSENT') || (w.status === 'ABSENT' ? 'ABSENT' : 'PRESENT');
      });
      setSheetStatuses(initialMap);
    }
  }, [activeTab, workers]);

  const recordDayOfWeek = new Date(recordDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' });
  const recordFormattedDate = new Date(recordDate + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const filteredWorkers = workerList.filter((w) => {
    const matchesSearch =
      w.name.toLowerCase().includes(search.toLowerCase()) ||
      w.id.includes(search) ||
      w.role.toLowerCase().includes(search.toLowerCase());
    const matchesShift = selectedShift === 'All' || w.shift === selectedShift;
    return matchesSearch && matchesShift;
  });

  const presentCount = workerList.filter((w) => w.status === 'PRESENT').length;
  const lateCount = workerList.filter((w) => w.status === 'LATE').length;
  const absentCount = workerList.filter((w) => w.status === 'ABSENT').length;
  const totalExpected = workerList.length;

  const handleStartRecordToday = () => {
    setRecordDate(new Date().toISOString().split('T')[0]);
    const initialMap: Record<string, 'PRESENT' | 'ABSENT'> = {};
    workerList.forEach((w) => {
      initialMap[w.userId || w.id] = 'PRESENT';
    });
    setSheetStatuses(initialMap);
    setActiveTab('record');
  };

  const handleSaveDailySheet = () => {
    if (!canMarkAttendance) return;
    const records = Object.entries(sheetStatuses).map(([userId, status]) => ({
      userId,
      status,
    }));

    saveSheetMutation.mutate(
      { date: recordDate, records },
      {
        onSuccess: () => {
          setActiveTab('registers');
        },
      }
    );
  };

  const handleAddLabourSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabourName.trim() || !canMarkAttendance) return;

    addLabourMutation.mutate(
      {
        name: newLabourName.trim(),
      },
      {
        onSuccess: (newWorker) => {
          setShowAddModal(false);
          setNewLabourName('');
          if (newWorker?.userId) {
            setSheetStatuses((prev) => ({
              ...prev,
              [newWorker.userId]: 'PRESENT',
            }));
          }
        },
      }
    );
  };

  const handleConfirmOverride = (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideWorker || !canMarkAttendance) return;

    overrideMutation.mutate(
      { workerId: overrideWorker.id, newStatus: overrideStatus },
      {
        onSuccess: () => {
          setOverrideWorker(null);
        },
      }
    );
  };

  const handleExportCSV = () => {
    const headers = ['Worker ID,Name,Role,Shift,Check-In,Check-Out,Status\n'];
    const rows = filteredWorkers.map(
      (w) => `"${w.id}","${w.name}","${w.role}","${w.shift}","${w.checkIn}","${w.checkOut}","${w.status}"\n`
    );
    const blob = new Blob([...headers, ...rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Shift_Roster_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status: AttendanceStatus) => {
    switch (status) {
      case 'PRESENT':
        return 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800';
      case 'LATE':
        return 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800';
      case 'ABSENT':
        return 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800';
      case 'ON_LEAVE':
        return 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800';
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Top Main Navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800 gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            Daily Attendance Registers
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Record daily floor labour attendance and review historical registers by date and day.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Main Record Today Button with + icon */}
          {canMarkAttendance && activeTab !== 'record' && (
            <button
              type="button"
              onClick={handleStartRecordToday}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition-colors shadow-md hover:shadow-lg active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Record Today's Attendance ({new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })})</span>
            </button>
          )}

          {/* View Mode Switcher */}
          <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setActiveTab('registers')}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                activeTab === 'registers'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              )}
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span>Registers List</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('heatmap')}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                activeTab === 'heatmap'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              )}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Monthly Heatmap</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium px-3.5 py-2 rounded-lg transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> Export CSV
          </button>
        </div>
      </div>

      {/* Role Permission Notice */}
      {!canMarkAttendance && (
        <div className="flex items-center gap-2.5 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-300">
          <Lock className="w-4 h-4 flex-shrink-0 text-amber-600 dark:text-amber-400" />
          <span>
            <strong>Read-only mode:</strong> You are signed in with the{' '}
            <span className="font-semibold uppercase tracking-wider">{activeFactory?.role || 'VIEWER'}</span> role.
            Only <strong>Supervisors</strong> and <strong>Managers</strong> have permission to record or update attendance.
          </span>
        </div>
      )}

      {/* ------------------- VIEW 1: REGISTERS LIST (DEFAULT) ------------------- */}
      {activeTab === 'registers' && (
        <div className="space-y-6">
          {/* Summary KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Total Floor Labours
                </span>
                <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white font-mono">
                  {totalExpected}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Registered active roster</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Today's Present
                </span>
                <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                  <UserCheck className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono">
                  {presentCount}
                </span>
              </div>
              <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                {totalExpected > 0 ? Math.round((presentCount / totalExpected) * 100) : 0}% turnout today
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Today's Late
                </span>
                <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-3xl font-bold tracking-tight text-amber-600 dark:text-amber-400 font-mono">
                  {lateCount}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Logged past grace period</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Today's Absent
                </span>
                <div className="p-2 rounded-lg bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400">
                  <AlertCircle className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-3xl font-bold tracking-tight text-red-600 dark:text-red-400 font-mono">
                  {absentCount}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Unexcused absence</p>
            </div>
          </div>

          {/* Daily Attendance Registers Header & List */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-950/40">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Recorded Attendance Registers
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Click on any previous day's attendance register to view detailed present/absent logs.
                </p>
              </div>

              {canMarkAttendance && (
                <button
                  type="button"
                  onClick={handleStartRecordToday}
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors shadow-sm self-start sm:self-auto"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Attendance For Day</span>
                </button>
              )}
            </div>

            {isLoadingRegisters ? (
              <div className="p-12 text-center text-slate-500 font-mono text-xs flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                Loading daily attendance registers...
              </div>
            ) : !registers || registers.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <Calendar className="w-10 h-10 mx-auto text-slate-400 mb-3 opacity-60" />
                <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm">No Attendance Registers Found</p>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Click the "+ Record Today's Attendance" button above to create and record attendance for today or any date.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {registers.map((reg: any) => (
                  <div
                    key={reg.id}
                    onClick={() => {
                      setSelectedRegister(reg);
                      setActiveTab('detail');
                    }}
                    className="p-4 sm:p-5 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                  >
                    <div className="flex items-start sm:items-center gap-4">
                      <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-900 text-blue-600 dark:text-blue-400 flex flex-col items-center justify-center min-w-[64px]">
                        <span className="text-[10px] uppercase font-bold tracking-wider">{reg.dayOfWeek.slice(0, 3)}</span>
                        <span className="text-lg font-bold leading-tight font-mono">{reg.date.slice(8, 10)}</span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-slate-900 dark:text-white text-base group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {reg.dayOfWeek}, {reg.formattedDate}
                          </h3>
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {reg.shiftType} Shift
                          </span>
                        </div>

                        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-3">
                          <span>Supervisor: <strong>{reg.supervisorName}</strong></span>
                          <span>•</span>
                          <span>Total Workers: <strong>{reg.totalWorkers}</strong></span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-6 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-4 text-xs font-mono">
                        <div className="text-emerald-600 dark:text-emerald-400 font-medium">
                          <span className="font-bold">{reg.presentCount}</span> Present
                        </div>
                        <div className="text-red-600 dark:text-red-400 font-medium">
                          <span className="font-bold">{reg.absentCount}</span> Absent
                        </div>
                        <div className="hidden md:block text-slate-500 font-semibold bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md">
                          {reg.turnoutPct}% Turnout
                        </div>
                      </div>

                      <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 font-semibold group-hover:translate-x-1 transition-transform">
                        <span>View Log</span>
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------- VIEW 2: RECORD ATTENDANCE FOR DAY SECTION ------------------- */}
      {activeTab === 'record' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl p-6 space-y-6 animate-in fade-in duration-200">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setActiveTab('registers')}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
                title="Back to Registers"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Mark Daily Attendance</span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                    {recordDayOfWeek}
                  </span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Details of Day & Date are pre-filled below. Mark workers Present or Absent for the day.
                </p>
              </div>
            </div>

            {canMarkAttendance && (
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors border border-slate-200 dark:border-slate-700 shadow-sm"
              >
                <UserPlus className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>+ Add Labour to Roster</span>
              </button>
            )}
          </div>

          {/* Pre-filled Date & Day Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Attendance Date
              </label>
              <input
                type="date"
                value={recordDate}
                onChange={(e) => setRecordDate(e.target.value)}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs rounded-lg px-3 py-1.5 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Day of Week
              </span>
              <span className="text-sm font-bold text-slate-900 dark:text-white block pt-1">
                {recordDayOfWeek} ({recordFormattedDate})
              </span>
            </div>
            <div>
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Turnout Counter
              </span>
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono block pt-1">
                {Object.values(sheetStatuses).filter((s) => s === 'PRESENT').length} / {workerList.length} Present
              </span>
            </div>
          </div>

          {/* Worker Marking List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Floor Workers Roster ({workerList.length})
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const allPresent: Record<string, 'PRESENT' | 'ABSENT'> = {};
                    workerList.forEach((w) => {
                      allPresent[w.userId || w.id] = 'PRESENT';
                    });
                    setSheetStatuses(allPresent);
                  }}
                  className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  Mark All Present
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={() => {
                    const allAbsent: Record<string, 'PRESENT' | 'ABSENT'> = {};
                    workerList.forEach((w) => {
                      allAbsent[w.userId || w.id] = 'ABSENT';
                    });
                    setSheetStatuses(allAbsent);
                  }}
                  className="text-[11px] font-semibold text-red-600 dark:text-red-400 hover:underline"
                >
                  Mark All Absent
                </button>
              </div>
            </div>

            {isLoadingWorkers ? (
              <div className="p-8 text-center text-slate-500 font-mono text-xs">
                Loading floor labour list...
              </div>
            ) : workerList.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                No floor labours found in roster. Click "+ Add Labour to Roster" above to add workers.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {workerList.map((worker) => {
                  const wId = worker.userId || worker.id;
                  const currentStatus = sheetStatuses[wId] || 'PRESENT';

                  return (
                    <div
                      key={wId}
                      className={clsx(
                        'p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3',
                        currentStatus === 'PRESENT'
                          ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/60'
                          : 'bg-red-50/40 dark:bg-red-950/20 border-red-200 dark:border-red-900/60'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={clsx(
                            'h-9 w-9 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0',
                            currentStatus === 'PRESENT'
                              ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300'
                              : 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
                          )}
                        >
                          {worker.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-bold text-xs text-slate-900 dark:text-white block">
                            {worker.name}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            ID: {wId.slice(0, 8)} • Floor Labour
                          </span>
                        </div>
                      </div>

                      {/* Present / Absent Toggle Controls */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSheetStatuses((prev) => ({ ...prev, [wId]: 'PRESENT' }))}
                          className={clsx(
                            'flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                            currentStatus === 'PRESENT'
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                          )}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Present</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSheetStatuses((prev) => ({ ...prev, [wId]: 'ABSENT' }))}
                          className={clsx(
                            'flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                            currentStatus === 'ABSENT'
                              ? 'bg-red-600 text-white shadow-sm'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                          )}
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Absent</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setActiveTab('registers')}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveDailySheet}
              disabled={saveSheetMutation.isPending || !canMarkAttendance}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors shadow-md active:scale-95"
            >
              {saveSheetMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4 stroke-[3]" />
              )}
              <span>Save & Record Attendance</span>
            </button>
          </div>
        </div>
      )}

      {/* ------------------- VIEW 3: PAST ATTENDANCE DETAIL VIEW ------------------- */}
      {activeTab === 'detail' && selectedRegister && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setActiveTab('registers')}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Attendance Register Details</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Detailed view of who was Present and Absent on {selectedRegister.dayOfWeek}, {selectedRegister.formattedDate}.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('registers')}
              className="px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Back to All Registers
            </button>
          </div>

          {/* Register Info Card */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
            <div>
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Date & Day</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white">{selectedRegister.dayOfWeek}, {selectedRegister.formattedDate}</span>
            </div>
            <div>
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Supervisor</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white">{selectedRegister.supervisorName}</span>
            </div>
            <div>
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Turnout Summary</span>
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                {selectedRegister.presentCount} Present / {selectedRegister.absentCount} Absent ({selectedRegister.turnoutPct}%)
              </span>
            </div>
            <div>
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Shift Type</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white uppercase">{selectedRegister.shiftType} SHIFT</span>
            </div>
          </div>

          {/* Detailed Roster Table */}
          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-950/80 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-semibold tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3.5">Worker Name</th>
                  <th className="p-3.5">Role</th>
                  <th className="p-3.5">Check-In Time</th>
                  <th className="p-3.5">Check-Out Time</th>
                  <th className="p-3.5">Attendance Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {selectedRegister.records && selectedRegister.records.length > 0 ? (
                  selectedRegister.records.map((rec: any) => (
                    <tr key={rec.userId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-3.5 font-semibold text-slate-900 dark:text-white">{rec.name}</td>
                      <td className="p-3.5 text-slate-500">Floor Labour</td>
                      <td className="p-3.5 font-mono text-slate-600 dark:text-slate-300">{rec.checkIn || '—'}</td>
                      <td className="p-3.5 font-mono text-slate-600 dark:text-slate-300">{rec.checkOut || '—'}</td>
                      <td className="p-3.5">
                        <span
                          className={clsx(
                            'px-2.5 py-1 rounded-md text-xs font-bold inline-flex items-center gap-1',
                            rec.status === 'PRESENT'
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              : 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                          )}
                        >
                          {rec.status === 'PRESENT' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                          <span>{rec.status}</span>
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-slate-400">
                      No records logged for this register.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------- VIEW 4: MONTHLY HEATMAP VIEW ------------------- */}
      {activeTab === 'heatmap' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Monthly Floor Presence Heatmap
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                28-day historical shift turnout across active production personnel.
              </p>
            </div>

            <div className="flex items-center gap-4 text-xs font-medium">
              <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                <span className="w-3 h-3 rounded bg-emerald-500 inline-block" /> Present
              </span>
              <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                <span className="w-3 h-3 rounded bg-amber-500 inline-block" /> Late
              </span>
              <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                <span className="w-3 h-3 rounded bg-red-500 inline-block" /> Absent
              </span>
            </div>
          </div>

          <div className="space-y-4">
            {filteredWorkers.map((worker) => {
              const history = worker.attendanceHistory || [];
              const presentDays = history.filter((d) => d.status === 'PRESENT').length;
              const rate = Math.round((presentDays / (history.length || 1)) * 100);

              return (
                <div
                  key={worker.id}
                  className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="w-48 flex-shrink-0">
                    <div className="font-semibold text-xs text-slate-900 dark:text-white">
                      {worker.name}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                      {worker.role} • {worker.shift}
                    </div>
                    <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1">
                      {rate}% monthly rate
                    </div>
                  </div>

                  <div className="flex-1 overflow-x-auto">
                    <div className="flex items-center gap-1">
                      {history.map((day) => (
                        <div
                          key={day.dayOfMonth}
                          title={`Day ${day.dayOfMonth} (${day.date}): ${day.status}`}
                          className={clsx(
                            'w-6 h-6 rounded flex items-center justify-center text-[10px] font-mono cursor-pointer transition-transform hover:scale-110',
                            day.status === 'PRESENT'
                              ? 'bg-emerald-500 text-white'
                              : day.status === 'LATE'
                              ? 'bg-amber-500 text-white'
                              : 'bg-red-500 text-white'
                          )}
                        >
                          {day.dayOfMonth}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Supervisor Override Modal */}
      {overrideWorker && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white text-lg">
                  Attendance Status Override
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  Worker #{overrideWorker.id} — {overrideWorker.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOverrideWorker(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmOverride} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Reclassify Status To:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['PRESENT', 'LATE', 'ABSENT', 'ON_LEAVE'] as const).map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setOverrideStatus(status)}
                      className={clsx(
                        'py-2 px-3 rounded-lg text-xs font-medium border transition-colors',
                        overrideStatus === status
                          ? status === 'PRESENT'
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : status === 'LATE'
                            ? 'bg-amber-600 text-white border-amber-600'
                            : status === 'ABSENT'
                            ? 'bg-red-600 text-white border-red-600'
                            : 'bg-blue-600 text-white border-blue-600'
                          : 'bg-slate-50 dark:bg-slate-950/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                      )}
                    >
                      {status.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setOverrideWorker(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={overrideMutation.isPending}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                >
                  <Check className="w-4 h-4" />
                  {overrideMutation.isPending ? 'Saving...' : 'Confirm Override'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add New Labour Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-5 transition-colors">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    Add Labour to Shift Roster
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Add a new floor labourer by name for attendance logging.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddLabourSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Labour Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Marcus Vance"
                  value={newLabourName}
                  onChange={(e) => setNewLabourName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addLabourMutation.isPending || !newLabourName.trim()}
                  className="flex items-center gap-1.5 px-4.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
                >
                  {addLabourMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Add Labour</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
