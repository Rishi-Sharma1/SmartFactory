import { useLocation } from 'react-router-dom';
import { Menu, Search, Command } from 'lucide-react';
import { useUiStore } from '../../store/ui.store';
import { useAuthStore } from '../../store/auth.store';
import { FactorySwitcher } from './FactorySwitcher';
import { ThemeToggle } from './ThemeToggle';
import { NotificationCenter } from './NotificationCenter';

export const Navbar = () => {
  const location = useLocation();
  const { toggleMobileDrawer, setCommandPaletteOpen } = useUiStore();
  const { activeFactory } = useAuthStore();
  const currentRole = activeFactory?.role || 'OWNER';
  const canViewNotifications = ['OWNER', 'MANAGER', 'SUPERVISOR'].includes(currentRole);

  const getRouteDetails = () => {
    const path = location.pathname;
    if (path.startsWith('/production')) {
      return {
        title: 'Production Dispatch',
        subtitle: 'Shift output recording, scrap metrics, and line dispatch',
      };
    }
    if (path.startsWith('/machines')) {
      return {
        title: 'Fleet & Maintenance',
        subtitle: 'Predictive health telemetry, vibration spectrum, and fault resolution',
      };
    }
    if (path.startsWith('/attendance')) {
      return {
        title: 'Shift Roster',
        subtitle: 'Biometric headcount, shift attendance, and supervisor overrides',
      };
    }
    if (path.startsWith('/reports')) {
      return {
        title: 'Operational Analytics',
        subtitle: 'Aggregated SCADA OEE, quality yield, and audit reporting',
      };
    }
    if (path.startsWith('/settings')) {
      return {
        title: 'User Settings',
        subtitle: 'Personal preferences, density scaling, and notification filters',
      };
    }
    return {
      title: 'Control Room Dashboard',
      subtitle: 'Live line throughput, shift targets, and telemetry intelligence',
    };
  };

  const { title, subtitle } = getRouteDetails();

  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between z-10 select-none transition-colors duration-200">
      {/* Left: Mobile Toggle & Page Route Title */}
      <div className="flex items-center gap-3.5">
        <button
          onClick={toggleMobileDrawer}
          className="md:hidden p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
          aria-label="Toggle navigation drawer"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:block">
          <h1 className="text-base font-bold font-display tracking-wide text-slate-900 dark:text-white leading-tight">
            {title}
          </h1>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate max-w-sm lg:max-w-md">
            {subtitle}
          </p>
        </div>
      </div>

      {/* Center: Command Palette Trigger Button */}
      <button
        onClick={() => setCommandPaletteOpen(true)}
        className="hidden md:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 text-xs transition-colors"
        title="Open command palette (⌘K)"
      >
        <Search className="w-3.5 h-3.5 text-slate-400" />
        <span className="font-medium">Quick search...</span>
        <kbd className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-500 font-semibold shadow-xs">
          <Command className="w-2.5 h-2.5" /> K
        </kbd>
      </button>

      {/* Right: Live Pulse, Facility Switcher, Theme Toggle & Notification Center */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Live Pulse Indicator (Minimal, Clean) */}
        <div className="flex items-center gap-2 px-2.5 py-1 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[11px] font-mono hidden lg:inline">
            Systems Operational
          </span>
        </div>

        {/* Facility Switcher */}
        <FactorySwitcher />

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Notification Center (Owner, Manager, Supervisor Only) */}
        {canViewNotifications && <NotificationCenter />}
      </div>
    </header>
  );
};
