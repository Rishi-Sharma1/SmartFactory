import { useEffect, useRef } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { ToastContainer } from './ToastContainer';
import { CommandPalette } from '../dashboard/CommandPalette';
import { KeyboardShortcutsModal } from '../dashboard/KeyboardShortcutsModal';
import { useUiStore } from '../../store/ui.store';

export const AppLayout = () => {
  const navigate = useNavigate();
  const {
    isMobileDrawerOpen,
    setMobileDrawerOpen,
    isShortcutsModalOpen,
    setShortcutsModalOpen,
    dashboardDensity,
  } = useUiStore();

  const gKeyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const waitingForSecondKey = useRef(false);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip shortcuts if user is typing inside an input or textarea
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable) {
        return;
      }

      if (e.key === '?' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setShortcutsModalOpen(!isShortcutsModalOpen);
        return;
      }

      if (e.key.toLowerCase() === 'g' && !waitingForSecondKey.current) {
        waitingForSecondKey.current = true;
        if (gKeyTimer.current) clearTimeout(gKeyTimer.current);
        gKeyTimer.current = setTimeout(() => {
          waitingForSecondKey.current = false;
        }, 1000);
        return;
      }

      if (waitingForSecondKey.current) {
        waitingForSecondKey.current = false;
        if (gKeyTimer.current) clearTimeout(gKeyTimer.current);

        switch (e.key.toLowerCase()) {
          case 'd':
            navigate('/dashboard');
            break;
          case 'p':
            navigate('/production');
            break;
          case 'm':
            navigate('/machines');
            break;
          case 'a':
            navigate('/attendance');
            break;
          case 'r':
            navigate('/reports');
            break;
          case 's':
            navigate('/settings');
            break;
          case 'f':
            navigate('/factories');
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (gKeyTimer.current) clearTimeout(gKeyTimer.current);
    };
  }, [navigate, isShortcutsModalOpen, setShortcutsModalOpen]);

  return (
    <div className="flex h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] overflow-hidden font-sans transition-colors duration-200">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex flex-shrink-0 h-full">
        <Sidebar />
      </div>

      {/* Mobile Off-Canvas Drawer Overlay */}
      {isMobileDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex animate-fadeIn">
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm"
            onClick={() => setMobileDrawerOpen(false)}
            aria-hidden="true"
          />
          <div className="relative z-50 flex h-full shadow-2xl">
            <Sidebar isMobile />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar />
        <main
          className={`flex-1 overflow-y-auto ${
            dashboardDensity === 'compact' ? 'p-4 sm:p-5' : 'p-4 sm:p-6 lg:p-8'
          } bg-[var(--bg-primary)]`}
        >
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Overlays */}
      <CommandPalette />
      <KeyboardShortcutsModal />
      <ToastContainer />
    </div>
  );
};
