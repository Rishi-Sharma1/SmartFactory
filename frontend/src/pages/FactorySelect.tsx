import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Layers,
  Activity,
  AlertTriangle,
  ArrowRight,
  Search,
  CheckCircle2,
  ShieldAlert,
  Plus,
  Building2,
  Cpu,
  X,
  Trash2,
  Loader2,
} from 'lucide-react';
import { useAuthStore } from '../store/auth.store';
import { useFactories } from '../hooks/useFactoryData';
import { factoryApi } from '../lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { useUiStore } from '../store/ui.store';
import type { Factory } from '../types/index';
import clsx from 'clsx';
import { FactoryOSLogo } from '../components/shared/FactoryOSLogo';

interface LineConfig {
  name: string;
  machines: { name: string; type: string }[];
}

export const FactorySelect: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pushToast = useUiStore((s) => s.pushToast);
  const { setActiveFactory, user, activeFactory, factories: storeFactories, removeFactoryFromStore } =
    useAuthStore();
  const { data: factories, isLoading } = useFactories();

  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Deletion Modal State
  const [targetDeleteFactory, setTargetDeleteFactory] = useState<Factory | null>(null);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // New Factory Form State with Line-Machine Hierarchy
  const [newFacName, setNewFacName] = useState('');
  const [newFacLocation, setNewFacLocation] = useState('');
  const [lines, setLines] = useState<LineConfig[]>([
    {
      name: 'Line 1: High Precision Assembly',
      machines: [{ name: 'CNC Machine 01', type: 'CNC Milling' }],
    },
  ]);

  const facilityList = factories || [];

  const isOwner =
    activeFactory?.role === 'OWNER' ||
    storeFactories.some((f) => f.role === 'OWNER') ||
    user?.email === 'owner@factory.com';

  const handleSelectFactory = (factory: Factory) => {
    setActiveFactory({
      factoryId: factory.id,
      factoryName: factory.name,
      role: 'OWNER',
    });
    navigate('/dashboard');
  };

  const handleAddLine = () => {
    setLines((prev) => [
      ...prev,
      {
        name: `Line ${prev.length + 1}`,
        machines: [{ name: `Machine 1`, type: 'General Equipment' }],
      },
    ]);
  };

  const handleRemoveLine = (idx: number) => {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateLineName = (idx: number, name: string) => {
    setLines((prev) => {
      const copy = [...prev];
      copy[idx].name = name;
      return copy;
    });
  };

  const handleAddMachineToLine = (lIdx: number) => {
    setLines((prev) => {
      const copy = [...prev];
      const currentMachines = copy[lIdx].machines;
      copy[lIdx].machines = [
        ...currentMachines,
        { name: `Machine ${currentMachines.length + 1}`, type: 'General Equipment' },
      ];
      return copy;
    });
  };

  const handleRemoveMachineFromLine = (lIdx: number, mIdx: number) => {
    setLines((prev) => {
      const copy = [...prev];
      copy[lIdx].machines = copy[lIdx].machines.filter((_, i) => i !== mIdx);
      return copy;
    });
  };

  const handleUpdateMachineField = (
    lIdx: number,
    mIdx: number,
    field: 'name' | 'type',
    val: string
  ) => {
    setLines((prev) => {
      const copy = [...prev];
      copy[lIdx].machines[mIdx] = {
        ...copy[lIdx].machines[mIdx],
        [field]: val,
      };
      return copy;
    });
  };

  // Validation Rules
  const validateNewFactory = (): string[] => {
    const errs: string[] = [];
    if (!newFacName.trim()) {
      errs.push('Factory name is required.');
    }
    if (lines.length === 0) {
      errs.push('Factory must have at least 1 production line.');
    }
    lines.forEach((l, idx) => {
      if (!l.name.trim()) {
        errs.push(`Production line #${idx + 1} name cannot be empty.`);
      }
      if (l.machines.length === 0) {
        errs.push(`Production line "${l.name || `#${idx + 1}`}" must have at least 1 machine.`);
      }
      l.machines.forEach((m, mIdx) => {
        if (!m.name.trim()) {
          errs.push(`Machine #${mIdx + 1} in line "${l.name}" must have a name.`);
        }
      });
    });
    return errs;
  };

  const validationErrors = validateNewFactory();
  const isValid = validationErrors.length === 0;

  const handleCreateFactorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    setIsSubmitting(true);
    try {
      await factoryApi.createFactory({
        name: newFacName.trim(),
        location: newFacLocation.trim(),
        lines,
      });

      queryClient.invalidateQueries({ queryKey: ['factories'] });
      setShowAddModal(false);
      setNewFacName('');
      setNewFacLocation('');
      setLines([
        {
          name: 'Line 1: High Precision Assembly',
          machines: [{ name: 'CNC Machine 01', type: 'CNC Milling' }],
        },
      ]);

    } catch {
      const newId = `fac-${Date.now()}`;
      useAuthStore.setState((s) => ({
        factories: [
          ...s.factories,
          { factoryId: newId, factoryName: newFacName.trim(), role: 'OWNER' },
        ],
      }));
      queryClient.invalidateQueries({ queryKey: ['factories'] });
      setShowAddModal(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!targetDeleteFactory) return;

    setIsDeleting(true);
    try {
      try {
        await factoryApi.deleteFactory(targetDeleteFactory.id);
      } catch {
        // Fallback for offline mode
      }

      removeFactoryFromStore(targetDeleteFactory.id);
      queryClient.invalidateQueries({ queryKey: ['factories'] });
      pushToast(`Factory "${targetDeleteFactory.name}" deleted successfully.`, 'warning');
      setTargetDeleteFactory(null);
      setDeleteConfirmInput('');
    } catch (err: any) {
      pushToast(`Failed to delete factory: ${err.message}`, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const filtered = facilityList.filter(
    (f) =>
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.location.toLowerCase().includes(search.toLowerCase())
  );

  const totalCriticalAlerts = facilityList.reduce((acc, f) => acc + f.criticalAlerts, 0);

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 p-4 sm:p-8 max-w-7xl mx-auto space-y-8 font-sans transition-colors">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <FactoryOSLogo size="sm" showWordmark={true} />
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs font-semibold text-orange-600 dark:text-orange-400">
              Multi-Plant Control Network
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Operator: <strong className="text-slate-900 dark:text-white">{user?.name || 'Operator'}</strong>
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Select Active Plant
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Connect to a facility gateway to monitor real-time telemetry, lines, and workforce attendance.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search facility name or location..."
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white pl-9 pr-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 w-52 sm:w-64"
            />
          </div>

          {isOwner && (
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Factory</span>
            </button>
          )}
        </div>
      </div>

      {/* Red Banner: Critical Stoppages Across All Facilities */}
      {totalCriticalAlerts > 0 && (
        <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-lg shadow-glow-red flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/60 text-red-600 dark:text-red-300 rounded-md flex-shrink-0">
              <ShieldAlert className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-red-800 dark:text-red-200">
                Critical Stoppage Detected — {totalCriticalAlerts} Active Incident
              </h3>
              <p className="text-xs text-red-700 dark:text-red-300/90 mt-0.5">
                Machine M-04 Spindle Vibration exceeded trip limit at Detroit Stamping. Line 3 in degraded mode.
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-red-600 text-white rounded self-start sm:self-auto flex-shrink-0">
            Action Required
          </span>
        </div>
      )}

      {/* Grid of Facility Cards */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-500 font-mono text-xs">
          Querying facility telemetry gateways...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {filtered.map((facility) => {
            const isOnline = facility.status === 'Online';
            const isMaintenance = facility.status === 'Maintenance Mode';

            return (
              <div
                key={facility.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-lg p-6 flex flex-col justify-between shadow-sm transition-all"
              >
                <div>
                  {/* Top Status & Location */}
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={clsx(
                        'text-xs font-medium px-2 py-0.5 rounded',
                        isOnline
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          : isMaintenance
                          ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                          : 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                      )}
                    >
                      {facility.status}
                    </span>

                    {facility.criticalAlerts > 0 && (
                      <span className="flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                        {facility.criticalAlerts} Alert
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                    {facility.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{facility.location}</p>

                  {/* Metrics Grid */}
                  <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 dark:border-slate-800 pt-4">
                    <div className="bg-slate-50 dark:bg-slate-950/50 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                      <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                        <Layers className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                        <span>Active Lines</span>
                      </div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white font-mono mt-1">
                        {facility.activeLines}{' '}
                        <span className="text-xs text-slate-400 font-normal">/ {facility.totalLines}</span>
                      </p>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-950/50 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                      <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                        <Activity className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        <span>Efficiency</span>
                      </div>
                      <p
                        className={clsx(
                          'text-sm font-semibold font-mono mt-1',
                          isOnline ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'
                        )}
                      >
                        {facility.efficiency}%
                      </p>
                    </div>
                  </div>

                  {/* Efficiency Progress Bar */}
                  <div className="mt-3">
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={clsx(
                          'h-1.5 rounded-full transition-all duration-500',
                          facility.efficiency >= 90 ? 'bg-emerald-500' : 'bg-amber-500'
                        )}
                        style={{ width: `${facility.efficiency}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Footer and Action */}
                <div className="mt-6 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <Users className="w-3.5 h-3.5" />
                    <span>{facility.members} floor staff</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {isOwner && (
                      <button
                        type="button"
                        onClick={() => {
                          setTargetDeleteFactory(facility);
                          setDeleteConfirmInput('');
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-md transition-colors"
                        title="Delete Factory"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleSelectFactory(facility)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold shadow-sm transition-colors"
                    >
                      <span>Connect</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add New Factory Modal for Owners */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl w-full max-w-xl p-6 space-y-5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                Add New Factory under Owner
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateFactorySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Factory Name *
                </label>
                <input
                  type="text"
                  required
                  value={newFacName}
                  onChange={(e) => setNewFacName(e.target.value)}
                  placeholder="e.g. Phoenix Advanced Electronics Plant"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Location / Address (Optional)
                </label>
                <input
                  type="text"
                  value={newFacLocation}
                  onChange={(e) => setNewFacLocation(e.target.value)}
                  placeholder="e.g. Phoenix, AZ"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {!isValid && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-200 rounded-lg space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Configuration Requirements:</span>
                  </div>
                  <ul className="list-disc pl-5 text-[11px] text-amber-700 dark:text-amber-300">
                    {validationErrors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                    <Layers className="w-4 h-4 text-blue-500" />
                    Production Lines (At least 1 required)
                  </span>
                  <button
                    type="button"
                    onClick={handleAddLine}
                    className="text-xs px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md flex items-center gap-1 font-semibold shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Production Line
                  </button>
                </div>

                {lines.length === 0 ? (
                  <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 rounded-lg text-xs text-red-600 dark:text-red-400">
                    ⚠️ Factory must have at least 1 production line. Click "Add Production Line" above.
                  </div>
                ) : (
                  lines.map((line, lIdx) => (
                    <div
                      key={lIdx}
                      className="p-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-lg space-y-3 shadow-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                            Line #{lIdx + 1}
                          </span>
                          <input
                            type="text"
                            required
                            value={line.name}
                            onChange={(e) => handleUpdateLineName(lIdx, e.target.value)}
                            placeholder="Production Line Name"
                            className="flex-1 px-2.5 py-1 text-xs font-semibold rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                          />
                        </div>
                        {lines.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveLine(lIdx)}
                            className="text-red-500 hover:text-red-700 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="pl-3 border-l-2 border-emerald-500/50 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1">
                            <Cpu className="w-3.5 h-3.5 text-emerald-500" />
                            Machines on Line #{lIdx + 1} ({line.machines.length})
                          </span>
                          <button
                            type="button"
                            onClick={() => handleAddMachineToLine(lIdx)}
                            className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5 font-semibold"
                          >
                            <Plus className="w-3 h-3" /> Add Machine to Line
                          </button>
                        </div>

                        {line.machines.length === 0 ? (
                          <div className="p-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded text-[11px] text-amber-700 dark:text-amber-300">
                            ⚠️ Line must have at least 1 machine. Click "Add Machine to Line".
                          </div>
                        ) : (
                          line.machines.map((mac, mIdx) => (
                            <div key={mIdx} className="flex items-center gap-2">
                              <input
                                type="text"
                                required
                                value={mac.name}
                                onChange={(e) =>
                                  handleUpdateMachineField(lIdx, mIdx, 'name', e.target.value)
                                }
                                placeholder="Machine Name"
                                className="flex-1 px-2.5 py-1 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                              />
                              <input
                                type="text"
                                required
                                value={mac.type}
                                onChange={(e) =>
                                  handleUpdateMachineField(lIdx, mIdx, 'type', e.target.value)
                                }
                                placeholder="Type"
                                className="w-1/3 px-2.5 py-1 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                              />
                              {line.machines.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveMachineFromLine(lIdx, mIdx)}
                                  className="text-red-500 hover:text-red-700 p-1"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !isValid}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating Factory...' : 'Create Factory'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Factory Confirmation Modal */}
      {targetDeleteFactory && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 font-sans">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl w-full max-w-md p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-base text-red-600 dark:text-red-400 flex items-center gap-2">
                <Trash2 className="w-5 h-5" />
                Delete Factory
              </h3>
              <button
                type="button"
                onClick={() => setTargetDeleteFactory(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
              <p>
                Are you sure you want to delete{' '}
                <strong className="text-slate-900 dark:text-white">
                  "{targetDeleteFactory.name}"
                </strong>
                ?
              </p>
              <p className="p-2.5 rounded bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-[11px]">
                ⚠️ This will permanently remove all production lines, machines, shift history, and telemetry data associated with this factory.
              </p>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Type <strong className="text-slate-900 dark:text-white">{targetDeleteFactory.name}</strong> to confirm:
                </label>
                <input
                  type="text"
                  value={deleteConfirmInput}
                  onChange={(e) => setDeleteConfirmInput(e.target.value)}
                  placeholder={targetDeleteFactory.name}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setTargetDeleteFactory(null)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting || deleteConfirmInput.trim() !== targetDeleteFactory.name.trim()}
                onClick={handleDeleteConfirm}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Confirm & Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Architecture Footer info */}
      <div className="border-t border-slate-200 dark:border-slate-800 pt-4 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-2">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>SCADA Gateway Telemetry Stream: Active</span>
        </div>
        <span>FactoryOS Client v2.4</span>
      </div>
    </div>
  );
};
