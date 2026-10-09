import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/shared/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';

import { Login } from './pages/Login';
import { FactorySelect } from './pages/FactorySelect';
import { Dashboard } from './pages/Dashboard';
import { Production } from './pages/Production';
import { Machines } from './pages/Machines';
import { Attendance } from './pages/Attendance';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute allowedRoles={['OWNER']} />}>
        <Route path="/factories" element={<FactorySelect />} />
      </Route>

      <Route element={<ProtectedRoute requireFactory />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/production" element={<Production />} />
          <Route path="/machines" element={<Machines />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route element={<ProtectedRoute allowedRoles={['OWNER', 'MANAGER']} />}>
            <Route path="/reports" element={<Reports />} />
          </Route>
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
