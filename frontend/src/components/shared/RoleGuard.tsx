import type { ReactNode } from 'react';
import { useAuthStore } from '../../store/auth.store';
import type { Role } from '../../types/index';

interface RoleGuardProps {
  allowedRoles: Role[];
  children: ReactNode;
  fallback?: ReactNode;
}

export const RoleGuard = ({ allowedRoles, children, fallback = null }: RoleGuardProps) => {
  const { activeFactory } = useAuthStore();

  const userRole = activeFactory?.role || 'OPERATOR';

  if (!allowedRoles.includes(userRole)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
