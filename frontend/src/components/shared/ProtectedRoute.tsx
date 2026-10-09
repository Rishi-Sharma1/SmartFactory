import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import type { Role, UserFactory } from '../../types/index';

interface Props {
  requireFactory?: boolean;
  allowedRoles?: Role[];
}

export const ProtectedRoute = ({ requireFactory = false, allowedRoles }: Props) => {
  const { token, activeFactory, factories } = useAuthStore();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Check role restrictions (e.g. only OWNER can access /factories)
  if (allowedRoles && allowedRoles.length > 0) {
    const currentRole = activeFactory?.role || factories[0]?.role;
    if (!currentRole || !allowedRoles.includes(currentRole)) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  if (requireFactory && !activeFactory) {
    const isOwner = (factories as UserFactory[]).some((f: UserFactory) => f.role === 'OWNER');
    return <Navigate to={isOwner ? '/factories' : '/login'} replace />;
  }

  return <Outlet />;
};