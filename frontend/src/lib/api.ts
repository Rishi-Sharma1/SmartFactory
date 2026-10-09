import axios, { type AxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/auth.store';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 12000,
});

// Request interceptor: attach Bearer token and X-Factory-ID
api.interceptors.request.use((config) => {
  const { token, activeFactory } = useAuthStore.getState();
  if (token && !token.startsWith('jwt-offline-')) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const factoryId =
    activeFactory?.factoryId && activeFactory.factoryId !== 'f-1'
      ? activeFactory.factoryId
      : '7666d9c1-95f5-4fa5-a471-47f7ad2fac74';
  config.headers['X-Factory-ID'] = factoryId;
  return config;
});

// Response interceptor: handle 401 and refresh token retry
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    // If 401 on login or refresh, or already retried, clear session
    const isAuthEndpoint = originalRequest.url?.includes('/auth/login') || originalRequest.url?.includes('/auth/refresh');
    if (error.response?.status === 401 && !isAuthEndpoint && !originalRequest._retry) {
      const { refreshToken, setToken, logout } = useAuthStore.getState();

      if (!refreshToken) {
        logout();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => api(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshResponse = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        });
        const newAccessToken = refreshResponse.data.accessToken;
        setToken(newAccessToken);
        processQueue(null);
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }
        return api(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr);
        logout();
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// Modular API functions matching backend routes
export const factoryApi = {
  getFactories: () => api.get('/factories'),
  createFactory: (data: { name: string; location?: string; lines?: any[] }) => api.post('/factories', data),
  deleteFactory: (factoryId: string) => api.delete(`/factories/${factoryId}`),
  getMembers: (factoryId: string) => api.get(`/factories/${factoryId}/members`),
  createMember: (factoryId: string, data: { name: string; email: string; password: string; role: string }) =>
    api.post(`/factories/${factoryId}/members`, data),
  updateMemberRole: (factoryId: string, userId: string, role: string) =>
    api.put(`/factories/${factoryId}/members/${userId}`, { role }),
  removeMember: (factoryId: string, userId: string) =>
    api.delete(`/factories/${factoryId}/members/${userId}`),
};



export const productionApi = {
  getSummary: () => api.get('/production/summary'),
  getLogs: () => api.get('/production'),
  getLines: () => api.get('/production/lines'),
  createLine: (data: { name: string }) => api.post('/production/lines', data),
  updateProduction: (data: {
    shiftId?: string;
    lineId: string;
    producedUnits: number;
    rejectedUnits: number;
    delayReason?: string;
  }) => api.post('/production/update', data),
  setTarget: (data: { lineId: string; targetUnits: number; shiftId?: string; shiftType?: string }) =>
    api.post('/production/target', data),
};

export const machineApi = {
  getMachines: () => api.get('/machines'),
  createMachine: (data: { name: string; type: string; installDate?: string }) => api.post('/machines', data),
  logFault: (
    machineId: string,
    data: { faultDescription?: string; description?: string; severity?: string; priority?: string }
  ) => api.post(`/machines/${machineId}/fault`, data),
  resolveFault: (machineId: string, data?: { notes?: string }) =>
    api.post(`/machines/${machineId}/resolve`, data || {}),
  getLogs: (machineId: string) => api.get(`/machines/${machineId}/logs`),
};


export const shiftApi = {
  getShifts: () => api.get('/shifts'),
  openShift: (data: { type?: 'MORNING' | 'AFTERNOON' | 'NIGHT' }) => api.post('/shifts', data),
  closeShift: (shiftId: string) => api.put(`/shifts/${shiftId}/close`),
};

export const attendanceApi = {
  getDailyRegisters: () => api.get('/attendance/registers'),
  getShiftAttendance: (shiftId: string) => api.get(`/attendance/shift/${shiftId}`),
  selfCheckIn: (shiftId: string) => api.post('/attendance/checkin', { shiftId }),
  selfCheckOut: (attendanceId: string) => api.put(`/attendance/${attendanceId}/checkout`, {}),
  markAttendance: (
    attendanceId: string,
    data: { status: 'PRESENT' | 'LATE' | 'ABSENT'; notes?: string }
  ) => api.put(`/attendance/${attendanceId}/mark`, data),
  addLabour: (data: { name: string; email?: string; initialStatus?: string; shiftId?: string }) =>
    api.post('/attendance/labour', data),
  saveDailySheet: (data: { date?: string; records: Array<{ userId: string; status: 'PRESENT' | 'ABSENT' | 'LATE' }> }) =>
    api.post('/attendance/record-sheet', data),
};

export const notificationApi = {
  getNotifications: () => api.get('/notifications'),
  markAsRead: (id: string) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
  getConfig: () => api.get('/notifications/config'),
  updateConfig: (data: {
    productionThresholdPct?: number;
    rejectionThresholdPct?: number;
    machineIdleMinutes?: number;
  }) => api.put('/notifications/config', data),
};

export const reportApi = {
  getDaily: (date?: string) => api.get('/reports/daily', { params: { date } }),
  getWeekly: (week?: string) => api.get('/reports/weekly', { params: { week } }),
  getShift: (shiftId: string) => api.get(`/reports/shift/${shiftId}`),
  exportReport: (format: 'pdf' | 'excel', date?: string) =>
    api.post('/reports/export', { format, date }, { responseType: 'blob' }),
};

export const queryApi = {
  ask: (question: string) => api.post('/query/ask', { question }),
};

export default api;
