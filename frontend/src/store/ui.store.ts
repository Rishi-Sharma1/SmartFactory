import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Toast, AppNotification, DashboardDensity } from '../types/index';

interface UiState {
  isSidebarCollapsed: boolean;
  isMobileDrawerOpen: boolean;
  toasts: Toast[];
  notifications: AppNotification[];
  isCommandPaletteOpen: boolean;
  isShortcutsModalOpen: boolean;
  dashboardDensity: DashboardDensity;
  notificationPreferences: {
    faults: boolean;
    attendance: boolean;
    production: boolean;
    handover: boolean;
  };

  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setMobileDrawerOpen: (open: boolean) => void;
  toggleMobileDrawer: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setShortcutsModalOpen: (open: boolean) => void;
  setDashboardDensity: (density: DashboardDensity) => void;
  toggleNotificationPreference: (category: 'faults' | 'attendance' | 'production' | 'handover') => void;

  pushToast: (message: string, type?: Toast['type'], duration?: number) => void;
  dismissToast: (id: string) => void;

  pushNotification: (data: { title: string; message: string; type: AppNotification['type']; link?: string }) => void;
  markAllNotificationsRead: () => void;
  clearNotifications: () => void;
}

const initialNotifications: AppNotification[] = [
  {
    id: 'notif-1',
    title: 'Critical Vibration Trip',
    message: 'Machine M-04 Spindle Vibration tripped tolerance limit (> 7.0 mm/s) on Line 1.',
    type: 'fault',
    timestamp: '10:42 AM',
    read: false,
    link: '/machines',
  },
  {
    id: 'notif-2',
    title: 'Attendance Shift Audit',
    message: 'Late check-in recorded for Sarah Jenkins (Safety Inspector) at 07:32 AM.',
    type: 'attendance',
    timestamp: '07:35 AM',
    read: false,
    link: '/attendance',
  },
  {
    id: 'notif-3',
    title: 'Batch Output Verified',
    message: 'Line Alpha logged 620 units of SKU-TURBINE-X (4 rejections).',
    type: 'production',
    timestamp: '06:15 AM',
    read: true,
    link: '/production',
  },
];

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      isSidebarCollapsed: false,
      isMobileDrawerOpen: false,
      toasts: [],
      notifications: initialNotifications,
      isCommandPaletteOpen: false,
      isShortcutsModalOpen: false,
      dashboardDensity: 'comfortable',
      notificationPreferences: {
        faults: true,
        attendance: true,
        production: true,
        handover: true,
      },

      toggleSidebar: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ isSidebarCollapsed: collapsed }),

      setMobileDrawerOpen: (open) => set({ isMobileDrawerOpen: open }),
      toggleMobileDrawer: () => set((state) => ({ isMobileDrawerOpen: !state.isMobileDrawerOpen })),

      setCommandPaletteOpen: (open) => set({ isCommandPaletteOpen: open }),
      setShortcutsModalOpen: (open) => set({ isShortcutsModalOpen: open }),

      setDashboardDensity: (dashboardDensity) => set({ dashboardDensity }),

      toggleNotificationPreference: (category) =>
        set((state) => ({
          notificationPreferences: {
            ...state.notificationPreferences,
            [category]: !state.notificationPreferences[category],
          },
        })),

      pushToast: (message, type = 'info', duration = 4000) => {
        const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const newToast: Toast = { id, message, type, duration };

        set((state) => ({ toasts: [...state.toasts, newToast] }));

        if (duration > 0) {
          setTimeout(() => {
            set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
          }, duration);
        }
      },

      dismissToast: (id) => {
        set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
      },

      pushNotification: (data) => {
        const id = `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const newNotif: AppNotification = {
          ...data,
          id,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          read: false,
        };

        set((state) => ({
          notifications: [newNotif, ...state.notifications],
        }));
      },

      markAllNotificationsRead: () => {
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
        }));
      },

      clearNotifications: () => {
        set({ notifications: [] });
      },
    }),
    {
      name: 'factoryos-ui-storage',
      partialize: (state) => ({
        dashboardDensity: state.dashboardDensity,
        notificationPreferences: state.notificationPreferences,
        notifications: state.notifications,
        isSidebarCollapsed: state.isSidebarCollapsed,
      }),
    }
  )
);
