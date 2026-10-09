import { CheckCircle2, AlertTriangle, AlertOctagon, Info, X } from 'lucide-react';
import { useUiStore } from '../../store/ui.store';
import type { Toast } from '../../types/index';

export const ToastContainer = () => {
  const { toasts, dismissToast } = useUiStore();

  if (toasts.length === 0) return null;

  const getToastIcon = (type: Toast['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />;
      case 'error':
        return <AlertOctagon className="w-4 h-4 text-red-400 flex-shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />;
      default:
        return <Info className="w-4 h-4 text-blue-400 flex-shrink-0" />;
    }
  };

  const getToastClasses = (type: Toast['type']) => {
    switch (type) {
      case 'success':
        return 'bg-slate-900 border-emerald-800/80 text-emerald-200 shadow-glow-emerald';
      case 'error':
        return 'bg-slate-900 border-red-800/80 text-red-200 shadow-glow-red';
      case 'warning':
        return 'bg-slate-900 border-amber-800/80 text-amber-200 shadow-glow-amber';
      default:
        return 'bg-slate-900 border-blue-800/80 text-blue-200 shadow-glow';
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-center justify-between gap-3 p-3.5 rounded-xl border text-xs font-medium shadow-2xl transition-all duration-300 animate-slideUp ${getToastClasses(
            toast.type
          )}`}
        >
          <div className="flex items-center gap-2.5 overflow-hidden">
            {getToastIcon(toast.type)}
            <span className="truncate">{toast.message}</span>
          </div>

          <button
            onClick={() => dismissToast(toast.id)}
            className="text-slate-400 hover:text-white p-1 rounded transition-colors flex-shrink-0"
            aria-label="Dismiss notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
