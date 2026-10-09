import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { socket } from '../lib/socket';
import { useAuthStore } from '../store/auth.store';
import { useUiStore } from '../store/ui.store';

export const useSocket = (event?: string, callback?: (data: any) => void) => {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const token = useAuthStore((s) => s.token);
  const activeFactory = useAuthStore((s) => s.activeFactory);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!token) {
      if (socket.connected) {
        socket.disconnect();
      }
      return;
    }

    // Set credentials for handshake
    socket.auth = { token };

    if (!socket.connected) {
      socket.connect();
    }

    const onConnect = () => {
      setIsConnected(true);
      if (activeFactory?.factoryId) {
        socket.emit('join:factory', { factoryId: activeFactory.factoryId });
      }
    };

    const onDisconnect = () => setIsConnected(false);

    // Real-time Event Handlers with automatic React Query Cache invalidation
    const onProductionUpdated = () => {
      const factoryId = activeFactory?.factoryId;
      queryClient.invalidateQueries({ queryKey: ['kpis', factoryId] });
      queryClient.invalidateQueries({ queryKey: ['production-lines', factoryId] });
      queryClient.invalidateQueries({ queryKey: ['production-logs', factoryId] });
    };

    const onMachineFault = (data: any) => {
      const factoryId = activeFactory?.factoryId;
      queryClient.invalidateQueries({ queryKey: ['machines', factoryId] });
      queryClient.invalidateQueries({ queryKey: ['notifications', factoryId] });
      queryClient.invalidateQueries({ queryKey: ['kpis', factoryId] });
      useUiStore.getState().pushToast(
        `Machine Alert: ${data?.name || 'Machine'} reported fault: ${data?.description || ''}`,
        'error'
      );
    };

    const onMachineResolved = () => {
      const factoryId = activeFactory?.factoryId;
      queryClient.invalidateQueries({ queryKey: ['machines', factoryId] });
      queryClient.invalidateQueries({ queryKey: ['notifications', factoryId] });
      queryClient.invalidateQueries({ queryKey: ['kpis', factoryId] });
    };

    const onAlertFired = (data: any) => {
      const factoryId = activeFactory?.factoryId;
      queryClient.invalidateQueries({ queryKey: ['notifications', factoryId] });
      queryClient.invalidateQueries({ queryKey: ['machines', factoryId] });
      queryClient.invalidateQueries({ queryKey: ['kpis', factoryId] });
      useUiStore.getState().pushToast(
        data?.message || 'New system alert fired on factory floor',
        data?.severity === 'CRITICAL' ? 'error' : 'warning'
      );
    };

    const onAttendanceUpdated = () => {
      const factoryId = activeFactory?.factoryId;
      queryClient.invalidateQueries({ queryKey: ['shift-workers', factoryId] });
      queryClient.invalidateQueries({ queryKey: ['kpis', factoryId] });
    };

    const onShiftEvent = () => {
      const factoryId = activeFactory?.factoryId;
      queryClient.invalidateQueries({ queryKey: ['kpis', factoryId] });
      queryClient.invalidateQueries({ queryKey: ['production-summary'] });
      queryClient.invalidateQueries({ queryKey: ['shift-workers', factoryId] });
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('production:updated', onProductionUpdated);
    socket.on('machine:fault', onMachineFault);
    socket.on('machine:resolved', onMachineResolved);
    socket.on('alert:fired', onAlertFired);
    socket.on('attendance:updated', onAttendanceUpdated);
    socket.on('shift:started', onShiftEvent);
    socket.on('shift:ended', onShiftEvent);

    if (event && callback) {
      socket.on(event, callback);
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('production:updated', onProductionUpdated);
      socket.off('machine:fault', onMachineFault);
      socket.off('machine:resolved', onMachineResolved);
      socket.off('alert:fired', onAlertFired);
      socket.off('attendance:updated', onAttendanceUpdated);
      socket.off('shift:started', onShiftEvent);
      socket.off('shift:ended', onShiftEvent);

      if (event && callback) {
        socket.off(event, callback);
      }
    };
  }, [token, activeFactory?.factoryId, queryClient, event, callback]);

  return { socket, isConnected };
};
