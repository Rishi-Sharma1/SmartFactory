import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Factory,
  Wrench,
  Users,
  FileText,
  Settings as SettingsIcon,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Building2,
} from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { useUiStore } from '../../store/ui.store';
import type { Role } from '../../types/index';
import { FactoryOSLogo, FactoryOSIcon } from '../shared/FactoryOSLogo';

interface SidebarProps {
  isMobile?: boolean;
}

export const Sidebar = ({ isMobile = false }: SidebarProps) => {
  const location = useLocation();
  const { logout, activeFactory, user } = useAuthStore();
  const { isSidebarCollapsed, toggleSidebar, setMobileDrawerOpen } = useUiStore();

  const currentRole = activeFactory?.role || 'OWNER';

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Production', path: '/production', icon: Factory },
    { label: 'Machines', path: '/machines', icon: Wrench },
    { label: 'Attendance', path: '/attendance', icon: Users },
    ...(['OWNER', 'MANAGER'].includes(currentRole)
      ? [{ label: 'Reports', path: '/reports', icon: FileText }]
      : []),
  ];

  const getRoleBadgeStyle = (role?: Role) => {
    switch (role) {
      case 'OWNER':
        return 'text-purple-600 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 border-purple-200 dark:border-purple-800/80';
      case 'MANAGER':
        return 'text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800/80';
      case 'SUPERVISOR':
        return 'text-emerald-600 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800/80';
      case 'OPERATOR':
        return 'text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800/80';
      case 'VIEWER':
      default:
        return 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700';
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'OP';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const isCollapsed = !isMobile && isSidebarCollapsed;

  const handleNavClick = () => {
    if (isMobile) {
      setMobileDrawerOpen(false);
    }
  };

  return (
    <aside
      className={`bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between h-full flex-shrink-0 select-none transition-all duration-300 relative z-20 ${
        isMobile ? 'w-64' : isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      <div>
        {/* Single Hazard Accent Stripe at Top of Sidebar */}
        <div className="hazard-bar" />

        {/* Branding */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <Link
            to="/dashboard"
            onClick={handleNavClick}
            className="flex items-center gap-3 overflow-hidden group"
          >
            {isCollapsed && !isMobile ? (
              <FactoryOSIcon size={36} className="group-hover:scale-105 transition-transform" />
            ) : (
              <FactoryOSLogo size="md" showWordmark={true} className="group-hover:scale-[1.02] transition-transform" />
            )}
          </Link>

          {!isMobile && (
            <button
              onClick={toggleSidebar}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          )}
        </div>

        {/* Active Facility Summary (Minimal, non-overloaded) */}
        {(!isCollapsed || isMobile) && (
          <div className="p-3 mx-3 mt-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/80 text-xs">
            <div className="flex items-center justify-between text-slate-400 font-mono text-[10px] mb-1">
              <span className="flex items-center gap-1">
                <Building2 className="w-3 h-3 text-blue-500" /> Active Facility
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block"></span>
            </div>
            <p className="font-semibold text-slate-900 dark:text-white truncate">
              {activeFactory?.factoryName || 'Berlin Gigafactory'}
            </p>
          </div>
        )}

        {/* Navigation Items */}
        <nav className="p-3 space-y-1 mt-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname.startsWith(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={handleNavClick}
                title={isCollapsed ? item.label : undefined}
                className={`group flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                  active
                    ? 'bg-blue-600 text-white shadow-sm font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white'
                } ${isCollapsed ? 'justify-center px-0' : ''}`}
              >
                <Icon
                  className={`w-4 h-4 flex-shrink-0 transition-transform group-hover:scale-110 ${
                    active ? 'text-white' : 'text-slate-400 dark:text-slate-400'
                  }`}
                />
                {(!isCollapsed || isMobile) && (
                  <span className="truncate">{item.label}</span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Profile Card with Settings Link */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60">
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} gap-2`}>
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div
              className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 flex items-center justify-center font-mono font-bold text-xs text-blue-700 dark:text-blue-300 flex-shrink-0"
              title={user?.name || 'Operator'}
            >
              {getInitials(user?.name)}
            </div>

            {(!isCollapsed || isMobile) && (
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {user?.name || 'SCADA Operator'}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className={`text-[9px] font-mono uppercase px-1.5 py-0.2 rounded border font-semibold ${getRoleBadgeStyle(
                      activeFactory?.role
                    )}`}
                  >
                    {activeFactory?.role || 'OPERATOR'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {(!isCollapsed || isMobile) && (
            <div className="flex items-center gap-0.5">
              <Link
                to="/settings"
                title="User Settings"
                aria-label="User Settings"
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <SettingsIcon className="w-4 h-4" />
              </Link>
              <button
                onClick={logout}
                title="Sign out"
                aria-label="Logout"
                className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
