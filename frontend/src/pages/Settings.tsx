import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sun,
  Moon,
  Laptop,
  Sliders,
  Bell,
  Check,
  Building2,
  UserCheck,
  Shield,
  Trash2,
  MonitorCheck,
  AlertTriangle,
  RotateCcw,
  X,
  Loader2,
  UserPlus,
  Users,
  Key,
  Eye,
  EyeOff,
  Copy,
} from 'lucide-react';
import { useThemeStore } from '../store/theme.store';
import type { Theme } from '../store/theme.store';
import { useUiStore } from '../store/ui.store';
import type { DashboardDensity } from '../types/index';
import { useAuthStore } from '../store/auth.store';
import { factoryApi } from '../lib/api';
import { useFactoryMembers } from '../hooks/useFactoryData';
import { useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';


export const Settings: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { theme, setTheme } = useThemeStore();
  const {
    dashboardDensity,
    setDashboardDensity,
    notificationPreferences,
    toggleNotificationPreference,
    clearNotifications,
    pushToast,
  } = useUiStore();
  const { user, activeFactory, removeFactoryFromStore } = useAuthStore();

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmName, setConfirmName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const isOwner =
    activeFactory?.role === 'OWNER' ||
    user?.email === 'owner@factory.com';

  const isOwnerOrManager =
    isOwner || activeFactory?.role === 'MANAGER';

  const { data: members = [], isLoading: isLoadingMembers } = useFactoryMembers(
    activeFactory?.factoryId
  );

  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [memberName, setMemberName] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [memberPassword, setMemberPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [memberRole, setMemberRole] = useState<'OWNER' | 'MANAGER' | 'SUPERVISOR' | 'OPERATOR'>(
    'SUPERVISOR'
  );
  const [isSubmittingMember, setIsSubmittingMember] = useState(false);

  const [copiedSuccess, setCopiedSuccess] = useState(false);
  const [createdCredential, setCreatedCredential] = useState<{
    name: string;
    email: string;
    password: string;
    role: string;
  } | null>(null);

  const handleGeneratePassword = () => {
    const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let pass = 'Pass@';
    for (let i = 0; i < 5; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setMemberPassword(pass);
  };

  const handleCreateMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFactory?.factoryId) {
      pushToast('No active factory selected', 'error');
      return;
    }

    if (!memberName.trim() || !memberEmail.trim() || !memberPassword.trim()) {
      pushToast('Please complete all required fields', 'warning');
      return;
    }

    setIsSubmittingMember(true);
    try {
      await factoryApi.createMember(activeFactory.factoryId, {
        name: memberName.trim(),
        email: memberEmail.trim().toLowerCase(),
        password: memberPassword,
        role: memberRole,
      });

      queryClient.invalidateQueries({ queryKey: ['factory-members', activeFactory.factoryId] });
      pushToast(`User account created successfully for ${memberName}`, 'success');

      setCreatedCredential({
        name: memberName.trim(),
        email: memberEmail.trim().toLowerCase(),
        password: memberPassword,
        role: memberRole,
      });

      setShowAddMemberModal(false);
      setMemberName('');
      setMemberEmail('');
      setMemberPassword('');
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.message || err.message;
      pushToast(`Failed to create user ID: ${msg}`, 'error');
    } finally {
      setIsSubmittingMember(false);
    }
  };

  const handleRevokeMember = async (targetUserId: string, targetName: string) => {
    if (!activeFactory?.factoryId) return;
    try {
      await factoryApi.removeMember(activeFactory.factoryId, targetUserId);
      queryClient.invalidateQueries({ queryKey: ['factory-members', activeFactory.factoryId] });
      pushToast(`Revoked access for member: ${targetName}`, 'warning');
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.message || err.message;
      pushToast(`Failed to revoke access: ${msg}`, 'error');
    }
  };


  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    pushToast(`Theme updated to ${newTheme.toUpperCase()}`, 'info');
  };

  const handleDensityChange = (density: DashboardDensity) => {
    setDashboardDensity(density);
    pushToast(`Display density set to ${density === 'compact' ? 'Compact' : 'Comfortable'}`, 'info');
  };

  const handleClearNotifications = () => {
    clearNotifications();
    pushToast('Notification history cleared', 'success');
  };

  const handleDeleteFactory = async () => {
    if (!activeFactory?.factoryId) return;

    setIsDeleting(true);
    try {
      try {
        await factoryApi.deleteFactory(activeFactory.factoryId);
      } catch {
        // Fallback for offline mode
      }

      const deletedName = activeFactory.factoryName;
      removeFactoryFromStore(activeFactory.factoryId);
      queryClient.invalidateQueries({ queryKey: ['factories'] });

      pushToast(`Factory "${deletedName}" has been permanently deleted.`, 'warning');
      setShowDeleteModal(false);

      navigate('/factories');
    } catch (err: any) {
      pushToast(`Failed to delete factory: ${err.message}`, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const notificationCategories = [
    {
      id: 'faults' as const,
      label: 'Machine Faults & Critical Alarms',
      description: 'Instant notification on spindle trips, emergency stops, and thermal overshoots.',
      icon: AlertTriangle,
    },
    {
      id: 'attendance' as const,
      label: 'Shift Attendance & Roster Audits',
      description: 'Alerts when operators arrive late, miss clock-in, or shift minimums drop below threshold.',
      icon: UserCheck,
    },
    {
      id: 'production' as const,
      label: 'Production Batches & Target Milestones',
      description: 'Milestones logged on completion of production work orders or batch rejections.',
      icon: MonitorCheck,
    },
    {
      id: 'handover' as const,
      label: 'Supervisor Shift Handover Notes',
      description: 'Broadcasts new incoming shift notes and equipment handover checkpoints.',
      icon: Bell,
    },
  ];

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12 font-sans">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          System Settings
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Configure interface appearance, layout density, telemetry alerts, and profile credentials.
        </p>
      </div>

      {/* Section 1: Appearance & Theme */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <Sun className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Appearance</h2>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          Choose how FactoryOS looks across your terminals and monitors.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button
            type="button"
            onClick={() => handleThemeChange('light')}
            className={clsx(
              'flex flex-col items-start p-4 rounded-lg border text-left transition-all',
              theme === 'light'
                ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/20 ring-1 ring-blue-600'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-950/30'
            )}
          >
            <div className="flex items-center justify-between w-full mb-3">
              <div className="w-8 h-8 rounded-md bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <Sun className="w-4 h-4" />
              </div>
              {theme === 'light' && <Check className="w-4 h-4 text-blue-600" />}
            </div>
            <span className="font-medium text-sm text-slate-900 dark:text-white">Light Mode</span>
            <span className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              High-contrast warm neutral palette (#f8f9fb) optimized for bright shop-floor daylight.
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleThemeChange('dark')}
            className={clsx(
              'flex flex-col items-start p-4 rounded-lg border text-left transition-all',
              theme === 'dark'
                ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/20 ring-1 ring-blue-600'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-950/30'
            )}
          >
            <div className="flex items-center justify-between w-full mb-3">
              <div className="w-8 h-8 rounded-md bg-slate-800 flex items-center justify-center text-blue-400">
                <Moon className="w-4 h-4" />
              </div>
              {theme === 'dark' && <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
            </div>
            <span className="font-medium text-sm text-slate-900 dark:text-white">Dark Industrial</span>
            <span className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Control-room slate-950 background with low glare for 24/7 operations monitoring.
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleThemeChange('system')}
            className={clsx(
              'flex flex-col items-start p-4 rounded-lg border text-left transition-all',
              theme === 'system'
                ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/20 ring-1 ring-blue-600'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-950/30'
            )}
          >
            <div className="flex items-center justify-between w-full mb-3">
              <div className="w-8 h-8 rounded-md bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
                <Laptop className="w-4 h-4" />
              </div>
              {theme === 'system' && <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
            </div>
            <span className="font-medium text-sm text-slate-900 dark:text-white">System Preference</span>
            <span className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Synchronize automatically with workstation OS display preferences.
            </span>
          </button>
        </div>
      </section>

      {/* Section 2: Display Density */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <Sliders className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Layout Density</h2>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          Adjust the whitespace and component spacing across all operation dashboards.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => handleDensityChange('comfortable')}
            className={clsx(
              'p-4 rounded-lg border text-left transition-all',
              dashboardDensity === 'comfortable'
                ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/20 ring-1 ring-blue-600'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
            )}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-sm text-slate-900 dark:text-white">Comfortable (Standard)</span>
              {dashboardDensity === 'comfortable' && <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Spacious spacing (p-6, space-y-8) ideal for standard desktop screens and touchscreen tablets.
            </p>
          </button>

          <button
            type="button"
            onClick={() => handleDensityChange('compact')}
            className={clsx(
              'p-4 rounded-lg border text-left transition-all',
              dashboardDensity === 'compact'
                ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/20 ring-1 ring-blue-600'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
            )}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-sm text-slate-900 dark:text-white">Compact (High Density)</span>
              {dashboardDensity === 'compact' && <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Condensed margins and card padding for multi-monitor setups and industrial control walls.
            </p>
          </button>
        </div>
      </section>

      {/* Section 3: Notification Preferences */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Telemetry & Notification Feeds</h2>
          </div>
          <button
            type="button"
            onClick={handleClearNotifications}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear Notification History
          </button>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          Specify which operational events broadcast to your header alert bell and notification feed.
        </p>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {notificationCategories.map((cat) => {
            const isChecked = notificationPreferences[cat.id];
            const Icon = cat.icon;
            return (
              <label
                key={cat.id}
                className="flex items-start justify-between py-4 cursor-pointer select-none group"
              >
                <div className="flex items-start gap-3 pr-4">
                  <div className="p-2 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 mt-0.5">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {cat.label}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {cat.description}
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleNotificationPreference(cat.id)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
              </label>
            );
          })}
        </div>
      </section>

      {/* Section 4: Team & User Account Provisioning (Hierarchy Based) */}
      {isOwnerOrManager && (
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                  Team Members & User Account Provisioning
                </h2>
                <span className="px-2 py-0.5 text-[11px] font-mono font-medium rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                  Role: {activeFactory?.role || 'OWNER'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {isOwner
                  ? 'As Factory Owner, you can provision user accounts for Managers, Supervisors, and Belt Operators.'
                  : 'As Factory Manager, you can provision user accounts for Supervisors and Belt Operators.'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setMemberRole(isOwner ? 'MANAGER' : 'SUPERVISOR');
                setShowAddMemberModal(true);
              }}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg flex items-center gap-2 shadow-sm transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              <span>Provision New User Account</span>
            </button>
          </div>

          {/* Roster Table */}
          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950/60 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-semibold">
                  <th className="py-3 px-4">User Details</th>
                  <th className="py-3 px-4">Email Address</th>
                  <th className="py-3 px-4">System Role</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {isLoadingMembers ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto mb-1" />
                      Loading team members...
                    </td>
                  </tr>
                ) : members.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400">
                      No members added yet. Click <strong>Provision New User Account</strong> to add team members.
                    </td>
                  </tr>
                ) : (
                  members.map((m: any) => {
                    const memberUser = m.user || m;
                    const role = m.role || 'OPERATOR';
                    const canManageMember =
                      isOwner ||
                      (activeFactory?.role === 'MANAGER' && ['SUPERVISOR', 'OPERATOR'].includes(role));

                    return (
                      <tr key={m.id || memberUser.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">
                            {memberUser.name?.charAt(0)?.toUpperCase() || 'U'}
                          </div>
                          <span>{memberUser.name || 'User Account'}</span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-500 dark:text-slate-400">
                          {memberUser.email}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={clsx(
                              'px-2 py-0.5 text-[10px] font-mono font-bold rounded uppercase border',
                              role === 'OWNER' && 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
                              role === 'MANAGER' && 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
                              role === 'SUPERVISOR' && 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
                              role === 'OPERATOR' && 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                            )}
                          >
                            {role === 'OPERATOR' ? 'BELT OPERATOR' : role}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                            Active
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {canManageMember && memberUser.id !== user?.id && (
                            <button
                              type="button"
                              onClick={() => handleRevokeMember(memberUser.id, memberUser.name)}
                              className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 font-medium hover:underline"
                            >
                              Revoke Access
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Section 5: Facility & User Context */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 shadow-sm">

        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Operator Profile & Facility Context</h2>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          Active session identity and permissions derived from facility role assignments.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              <UserCheck className="w-3.5 h-3.5" />
              Authenticated Operator
            </div>
            <div className="text-sm font-semibold text-slate-900 dark:text-white">
              {user?.name || 'Operator Session'}
            </div>
            <div className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-0.5">
              {user?.email || 'operator@factoryos.local'}
            </div>
            <div className="mt-3 inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
              Role: {activeFactory?.role || 'OPERATOR'}
            </div>
          </div>

          <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              <Building2 className="w-3.5 h-3.5" />
              Connected Facility
            </div>
            <div className="text-sm font-semibold text-slate-900 dark:text-white">
              {activeFactory?.factoryName || 'Primary Manufacturing Facility'}
            </div>
            <div className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-0.5">
              ID: {activeFactory?.factoryId || 'f-1'} • Status: Synchronized
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              Telemetry Gateway Connected (WebSocket TLS)
            </div>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            FactoryOS Client Build v2.4.0 • Node React 18 / TypeScript
          </div>
          <button
            type="button"
            onClick={() => {
              window.location.reload();
            }}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reload Client Cache
          </button>
        </div>
      </section>

      {/* Section 5: Danger Zone (Owner Only Factory Deletion) */}
      {isOwner && (
        <section className="bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/60 rounded-lg p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
            <AlertTriangle className="w-5 h-5" />
            <h2 className="text-base font-semibold">Danger Zone — Factory Deletion</h2>
          </div>
          <p className="text-xs text-red-700 dark:text-red-300/90 leading-relaxed">
            As the designated <strong>Owner</strong> of{' '}
            <strong>"{activeFactory?.factoryName || 'Connected Factory'}"</strong>, you have the
            authority to permanently delete this factory. Deleting a factory will remove all associated
            production lines, machines, shifts, telemetry logs, and attendance records.
          </p>

          <div className="pt-2 flex items-center justify-between">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Target Factory ID: <code className="font-mono">{activeFactory?.factoryId}</code>
            </div>
            <button
              type="button"
              onClick={() => {
                setConfirmName('');
                setShowDeleteModal(true);
              }}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete This Factory</span>
            </button>
          </div>
        </section>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl w-full max-w-md p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-base text-red-600 dark:text-red-400 flex items-center gap-2">
                <Trash2 className="w-5 h-5" />
                Delete Factory Permanently
              </h3>
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
              <p>
                Are you sure you want to delete{' '}
                <strong className="text-slate-900 dark:text-white">
                  "{activeFactory?.factoryName}"
                </strong>
                ? This action <strong>cannot be undone</strong>.
              </p>
              <p className="p-2.5 rounded bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-[11px]">
                ⚠️ All production lines, machine telemetry, operator logs, and shift history associated with this factory will be permanently deleted from the database.
              </p>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Type <strong className="text-slate-900 dark:text-white">{activeFactory?.factoryName}</strong> to confirm:
                </label>
                <input
                  type="text"
                  value={confirmName}
                  onChange={(e) => setConfirmName(e.target.value)}
                  placeholder={activeFactory?.factoryName}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting || confirmName.trim() !== activeFactory?.factoryName?.trim()}
                onClick={handleDeleteFactory}
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

      {/* Modal: Provision User Account */}
      {showAddMemberModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl w-full max-w-md p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                Provision New User Account
              </h3>
              <button
                type="button"
                onClick={() => setShowAddMemberModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateMemberSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={memberName}
                  onChange={(e) => setMemberName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Email Address / System ID *
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. supervisor.ramesh@factory.com"
                  value={memberEmail}
                  onChange={(e) => setMemberEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  System Role *
                </label>
                <select
                  value={memberRole}
                  onChange={(e) => setMemberRole(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 font-medium"
                >
                  {isOwner && <option value="OWNER">Owner (Full Facility Control)</option>}
                  {isOwner && <option value="MANAGER">Manager (Shift Targets & Production)</option>}
                  <option value="SUPERVISOR">Supervisor (Shift Floor Oversight)</option>
                  <option value="OPERATOR">Belt Operator (Line Output Logging)</option>
                </select>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  {isOwner
                    ? '⚡ Owners can provision any system role.'
                    : '⚡ Managers can provision Supervisors and Belt Operators.'}
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-medium text-slate-700 dark:text-slate-300">
                    Initial Password *
                  </label>
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                  >
                    <Key className="w-3 h-3" />
                    Auto Generate
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="Set minimum 6 char password"
                    value={memberPassword}
                    onChange={(e) => setMemberPassword(e.target.value)}
                    className="w-full px-3 py-2 pr-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddMemberModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingMember}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                >
                  {isSubmittingMember ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Creating Account...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Create & Link User ID</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Created Credential Summary */}
      {createdCredential && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-base text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                <Check className="w-5 h-5" />
                User Account Created
              </h3>
              <button
                type="button"
                onClick={() => setCreatedCredential(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              Share these login credentials with <strong>{createdCredential.name}</strong> so they can sign in to FactoryOS:
            </p>

            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 font-mono text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Name:</span>
                <span className="font-bold text-slate-900 dark:text-white">{createdCredential.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Role:</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">
                  {createdCredential.role === 'OPERATOR' ? 'BELT OPERATOR' : createdCredential.role}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Email/ID:</span>
                <span className="font-bold text-slate-900 dark:text-white">{createdCredential.email}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-800">
                <span className="text-slate-500">Password:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                  {createdCredential.password}
                </span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  const text = `FactoryOS Credentials\nName: ${createdCredential.name}\nRole: ${createdCredential.role}\nEmail: ${createdCredential.email}\nPassword: ${createdCredential.password}`;
                  navigator.clipboard.writeText(text);
                  setCopiedSuccess(true);
                  setTimeout(() => setCopiedSuccess(false), 2000);
                }}
                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5"
              >
                {copiedSuccess ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                <span>{copiedSuccess ? 'Copied!' : 'Copy Credentials'}</span>
              </button>

              <button
                type="button"
                onClick={() => setCreatedCredential(null)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

