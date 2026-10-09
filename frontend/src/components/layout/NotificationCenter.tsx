import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  Trash2,
  AlertTriangle,
  Users,
  Factory,
  MessageSquare,
  Info,
  ExternalLink,
} from 'lucide-react';
import { useUiStore } from '../../store/ui.store';
import type { AppNotification } from '../../types/index';

export const NotificationCenter = () => {
  const { notifications, markAllNotificationsRead, clearNotifications } = useUiStore();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'fault':
        return <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />;
      case 'attendance':
        return <Users className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />;
      case 'production':
        return <Factory className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />;
      case 'handover':
        return <MessageSquare className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />;
      default:
        return <Info className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative focus:outline-none focus:ring-1 focus:ring-blue-500"
        title="SCADA Notifications"
        aria-label={`Notifications (${unreadCount} unread)`}
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 min-w-[14px] h-[14px] px-0.5 rounded-full bg-red-500 text-white font-mono text-[9px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-slate-900">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl py-2 z-50 divide-y divide-slate-100 dark:divide-slate-800 text-xs">
          {/* Header */}
          <div className="px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold font-display text-sm text-slate-900 dark:text-white">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllNotificationsRead}
                  className="flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline p-1"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Mark all read</span>
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={clearNotifications}
                  className="text-slate-400 hover:text-red-500 p-1 rounded transition-colors"
                  title="Clear all"
                  aria-label="Clear all notifications"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="py-1 max-h-80 overflow-y-auto divide-y divide-slate-50 dark:divide-slate-850">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 font-mono">
                No active SCADA notifications or telemetry incidents.
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-3.5 transition-colors flex items-start gap-3 ${
                    notif.read
                      ? 'opacity-70 hover:opacity-100'
                      : 'bg-blue-50/50 dark:bg-blue-950/20'
                  }`}
                >
                  <div className="mt-0.5">{getIcon(notif.type)}</div>
                  <div className="flex-1 overflow-hidden">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-semibold text-xs text-slate-900 dark:text-slate-100 truncate">
                        {notif.title}
                      </h4>
                      <span className="text-[10px] font-mono text-slate-400 flex-shrink-0">
                        {notif.timestamp}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 leading-snug">
                      {notif.message}
                    </p>

                    {notif.link && (
                      <Link
                        to={notif.link}
                        onClick={() => setIsOpen(false)}
                        className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:underline mt-1.5"
                      >
                        <span>View in {notif.type}</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </Link>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
