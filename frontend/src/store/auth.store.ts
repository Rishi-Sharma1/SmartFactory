import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';
import type { User, UserFactory, Role } from '../types/index';
import { API_BASE_URL } from '../lib/api';

export interface RegisterMachineInput {
  name: string;
  type: string;
  status?: string;
  efficiencyPct?: number;
}

export interface RegisterLineInput {
  name: string;
  machines: RegisterMachineInput[];
}

export interface RegisterFactoryInput {
  name: string;
  location?: string;
  lines: RegisterLineInput[];
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  role?: Role;
  factories: RegisterFactoryInput[];
}


interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: User | null;
  factories: UserFactory[];
  activeFactory: UserFactory | null;
  setToken: (token: string) => void;
  setActiveFactory: (factory: UserFactory) => void;
  switchRole: (role: Role) => void;
  login: (
    email: string,
    password?: string,
    customRole?: Role
  ) => Promise<{ success: boolean; isOfflineFallback?: boolean; message?: string }>;
  register: (
    data: RegisterInput
  ) => Promise<{ success: boolean; isOfflineFallback?: boolean; message?: string }>;
  removeFactoryFromStore: (factoryId: string) => void;
  logout: () => void;
}



const defaultFactories: UserFactory[] = [
  { factoryId: '7666d9c1-95f5-4fa5-a471-47f7ad2fac74', factoryName: 'Apex Manufacturing Facility', role: 'OWNER' },
  { factoryId: '02f1af7c-4507-4b6e-bb58-2c2b13b18894', factoryName: 'Detroit Stamping & Assembly Plant', role: 'MANAGER' },
];

const deriveNameFromEmail = (email: string): string => {
  const localPart = email.split('@')[0] || 'Operator';
  return (
    localPart
      .split(/[._-]/)
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ') || 'SCADA Operator'
  );
};

const SEED_USERS: Record<string, { email: string; password: string }> = {
  OWNER: { email: 'owner@factory.com', password: 'password123' },
  MANAGER: { email: 'manager@factory.com', password: 'password123' },
  SUPERVISOR: { email: 'supervisor@factory.com', password: 'password123' },
  OPERATOR: { email: 'operator@factory.com', password: 'password123' },
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      refreshToken: null,
      user: null,
      factories: [],
      activeFactory: null,

      setToken: (token: string) => {
        set({ token });
      },

      setActiveFactory: (activeFactory) => {
        set({ activeFactory });
      },

      switchRole: (newRole: Role) => {
        const state = get();
        const fallbackFactory: UserFactory = defaultFactories[0];
        const currentActive =
          state.activeFactory && state.activeFactory.factoryId !== 'f-1'
            ? state.activeFactory
            : fallbackFactory;

        const roleNames: Record<Role, string> = {
          OWNER: 'Alice Owner',
          MANAGER: 'Bob Manager',
          SUPERVISOR: 'Charlie Supervisor',
          OPERATOR: 'Dave Operator',
          VIEWER: 'Guest Viewer',
        };

        const updatedActive: UserFactory = {
          ...currentActive,
          role: newRole,
        };

        const updatedFactories = state.factories.length > 0
          ? state.factories.map((f) =>
              f.factoryId === updatedActive.factoryId ? { ...f, role: newRole } : f
            )
          : [{ ...updatedActive }];

        set({
          activeFactory: updatedActive,
          factories: updatedFactories,
          user: state.user
            ? { ...state.user, name: roleNames[newRole] || state.user.name }
            : {
                id: `usr-${newRole.toLowerCase()}`,
                name: roleNames[newRole],
                email: `${newRole.toLowerCase()}@factory.com`,
              },
        });

        // Silently authenticate with real backend matching the selected role for end-to-end RBAC
        const seedCred = SEED_USERS[newRole];
        if (seedCred) {
          axios
            .post(`${API_BASE_URL}/auth/login`, seedCred)
            .then((res) => {
              const { accessToken, refreshToken, user } = res.data;
              const userFactories: UserFactory[] = (user.factories || []).map(
                (uf: { factoryId: string; factoryName: string; role: Role }) => ({
                  factoryId: uf.factoryId,
                  factoryName: uf.factoryName,
                  role: uf.role,
                })
              );
              const matchingFactory =
                userFactories.find((f) => f.factoryId === updatedActive.factoryId) ||
                userFactories[0] ||
                updatedActive;

              set({
                token: accessToken,
                refreshToken,
                user: {
                  id: user.id,
                  name: user.name,
                  email: user.email,
                },
                factories: userFactories,
                activeFactory: matchingFactory,
              });
            })
            .catch(() => {
              // Silently ignore if network issue
            });
        }
      },

      login: async (email: string, password: string = 'password123', customRole?: Role) => {
        try {
          // Attempt real authentication against backend API
          const response = await axios.post(`${API_BASE_URL}/auth/login`, {
            email,
            password,
          });

          const { accessToken, refreshToken, user } = response.data;
          const userFactories: UserFactory[] = (user.factories || []).map(
            (uf: { factoryId: string; factoryName: string; role: Role }) => ({
              factoryId: uf.factoryId,
              factoryName: uf.factoryName,
              role: uf.role,
            })
          );

          const active = userFactories.length > 0 ? userFactories[0] : null;

          set({
            token: accessToken,
            refreshToken,
            user: {
              id: user.id,
              name: user.name,
              email: user.email,
            },
            factories: userFactories,
            activeFactory: active,
          });

          return { success: true, isOfflineFallback: false };
        } catch (error: any) {
          const isNetworkOrDbUnavailable =
            !error.response || error.response.status === 503 || error.code === 'ERR_NETWORK';

          // If backend server or database is not yet ready, use resilient offline fallback
          if (isNetworkOrDbUnavailable) {
            const name = deriveNameFromEmail(email);
            const assignedRole: Role = customRole || 'OWNER';

            const user: User = {
              id: `usr-${Date.now().toString(36)}`,
              name,
              email,
            };

            const userFactories: UserFactory[] = defaultFactories.map((f) => ({
              ...f,
              role: customRole || f.role,
            }));

            const active = { ...userFactories[0], role: assignedRole };

            set({
              token: `jwt-offline-${btoa(email)}-${Date.now()}`,
              refreshToken: `refresh-offline-${Date.now()}`,
              user,
              factories: userFactories,
              activeFactory: active,
            });

            return {
              success: true,
              isOfflineFallback: true,
              message:
                error.response?.data?.message ||
                'Backend offline or database initializing. Connected in resilient fallback mode.',
            };
          }

          // If 401 or invalid credentials from real backend
          const errorMsg = error.response?.data?.error || error.response?.data?.message || 'Login failed';
          return {
            success: false,
            message: errorMsg,
          };
        }
      },

      register: async (data: RegisterInput) => {
        try {
          const response = await axios.post(`${API_BASE_URL}/auth/register`, data);
          const { accessToken, refreshToken, user } = response.data;

          const userFactories: UserFactory[] = (user.factories || []).map(
            (uf: { factoryId: string; factoryName: string; role: Role }) => ({
              factoryId: uf.factoryId,
              factoryName: uf.factoryName,
              role: uf.role,
            })
          );

          const active = userFactories.length > 0 ? userFactories[0] : null;

          set({
            token: accessToken,
            refreshToken,
            user: {
              id: user.id,
              name: user.name,
              email: user.email,
            },
            factories: userFactories,
            activeFactory: active,
          });

          return { success: true };
        } catch (error: any) {
          const isNetworkOrDbUnavailable =
            !error.response || error.response.status === 503 || error.code === 'ERR_NETWORK';

          if (isNetworkOrDbUnavailable) {
            const user: User = {
              id: `usr-${Date.now().toString(36)}`,
              name: data.name,
              email: data.email,
            };

            const userFactories: UserFactory[] = (data.factories || []).map((f, idx) => ({
              factoryId: `fac-${idx + 1}-${Date.now().toString(36)}`,
              factoryName: f.name,
              role: data.role || 'OWNER',
            }));

            const active =
              userFactories.length > 0
                ? userFactories[0]
                : { factoryId: 'fac-1', factoryName: 'Primary Plant', role: data.role || 'OWNER' };

            set({
              token: `jwt-offline-${btoa(data.email)}-${Date.now()}`,
              refreshToken: `refresh-offline-${Date.now()}`,
              user,
              factories: userFactories,
              activeFactory: active,
            });

            return {
              success: true,
              isOfflineFallback: true,
              message: 'Account registered in offline mode.',
            };
          }

          const errorMsg =
            error.response?.data?.error || error.response?.data?.message || 'Registration failed';
          return {
            success: false,
            message: errorMsg,
          };
        }
      },

      removeFactoryFromStore: (factoryId: string) => {
        const state = get();
        const updatedFactories = state.factories.filter((f) => f.factoryId !== factoryId);
        const nextActive = updatedFactories.length > 0 ? updatedFactories[0] : null;
        set({
          factories: updatedFactories,
          activeFactory: nextActive,
        });
      },

      logout: () => {


        set({
          token: null,
          refreshToken: null,
          user: null,
          factories: [],
          activeFactory: null,
        });
      },
    }),
    {
      name: 'factoryos-auth-session',
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        // Sanitize legacy or invalid factoryId
        if (!state.activeFactory || state.activeFactory.factoryId === 'f-1') {
          state.setActiveFactory(defaultFactories[0]);
        }
        // If token is missing or offline fallback, auto-authenticate against real backend
        if (!state.token || state.token.startsWith('jwt-offline-')) {
          const currentRole = state.activeFactory?.role || 'OWNER';
          const cred = SEED_USERS[currentRole] || SEED_USERS.OWNER;
          axios
            .post(`${API_BASE_URL}/auth/login`, cred)
            .then((res) => {
              const { accessToken, refreshToken, user } = res.data;
              const userFactories: UserFactory[] = (user.factories || []).map(
                (uf: { factoryId: string; factoryName: string; role: Role }) => ({
                  factoryId: uf.factoryId,
                  factoryName: uf.factoryName,
                  role: uf.role,
                })
              );
              useAuthStore.setState({
                token: accessToken,
                refreshToken,
                user: { id: user.id, name: user.name, email: user.email },
                factories: userFactories,
                activeFactory: userFactories[0] || defaultFactories[0],
              });
            })
            .catch(() => {});
        }
      },
    }
  )
);
