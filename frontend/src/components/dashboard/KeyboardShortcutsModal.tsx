import { X, Keyboard } from 'lucide-react';
import { useUiStore } from '../../store/ui.store';

export const KeyboardShortcutsModal = () => {
  const { isShortcutsModalOpen, setShortcutsModalOpen } = useUiStore();

  if (!isShortcutsModalOpen) return null;

  const shortcuts = [
    { key: '⌘ K / Ctrl+K', description: 'Open command palette to search pages, assets, or workers' },
    { key: '?', description: 'Toggle this keyboard shortcuts cheat-sheet' },
    { key: 'g then d', description: 'Go to Control Room Dashboard' },
    { key: 'g then p', description: 'Go to Production Floor Logging' },
    { key: 'g then m', description: 'Go to Fleet & Machines' },
    { key: 'g then a', description: 'Go to Shift Roster & Attendance' },
    { key: 'g then r', description: 'Go to Operational Reports' },
    { key: 'g then s', description: 'Go to User Settings' },
    { key: 'g then f', description: 'Go to Facilities Switcher' },
    { key: 'Esc', description: 'Close open dialogs and command palette' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div
        className="fixed inset-0"
        onClick={() => setShortcutsModalOpen(false)}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-10 p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-600/15 text-blue-600 dark:text-blue-400">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base font-display text-slate-900 dark:text-white">
                Keyboard Shortcuts
              </h3>
              <p className="text-xs text-slate-500 font-mono">SCADA Quick Navigation</p>
            </div>
          </div>

          <button
            onClick={() => setShortcutsModalOpen(false)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg"
            aria-label="Close shortcuts dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
          {shortcuts.map((sc) => (
            <div
              key={sc.key}
              className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 text-xs"
            >
              <span className="text-slate-600 dark:text-slate-300 font-medium">{sc.description}</span>
              <kbd className="px-2 py-1 font-mono text-[11px] font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 shadow-sm ml-3 flex-shrink-0">
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-right">
          <button
            onClick={() => setShortcutsModalOpen(false)}
            className="px-4 py-2 text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition-colors"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
