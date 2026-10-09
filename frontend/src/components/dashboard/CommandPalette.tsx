import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  LayoutDashboard,
  Factory,
  Wrench,
  Users,
  FileText,
  Settings as SettingsIcon,
  Building2,
  ArrowRight,
  Command,
  X,
} from 'lucide-react';
import { useUiStore } from '../../store/ui.store';
import { useAuthStore } from '../../store/auth.store';
import { useFactories, useMachines, useShiftWorkers } from '../../hooks/useFactoryData';

export const CommandPalette = () => {
  const navigate = useNavigate();
  const { isCommandPaletteOpen, setCommandPaletteOpen } = useUiStore();
  const { setActiveFactory } = useAuthStore();
  const { data: serverFactories } = useFactories();
  const { data: serverMachines } = useMachines();
  const { data: serverWorkers } = useShiftWorkers();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isCommandPaletteOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
        setQuery('');
        setSelectedIndex(0);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isCommandPaletteOpen]);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(!isCommandPaletteOpen);
      }
      if (e.key === 'Escape' && isCommandPaletteOpen) {
        setCommandPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandPaletteOpen, setCommandPaletteOpen]);

  if (!isCommandPaletteOpen) return null;

  const pages = [
    { id: 'page-dash', label: 'Dashboard', path: '/dashboard', category: 'Pages', icon: LayoutDashboard },
    { id: 'page-prod', label: 'Production Dispatch', path: '/production', category: 'Pages', icon: Factory },
    { id: 'page-mach', label: 'Machines Fleet', path: '/machines', category: 'Pages', icon: Wrench },
    { id: 'page-att', label: 'Shift Attendance', path: '/attendance', category: 'Pages', icon: Users },
    { id: 'page-rep', label: 'Operational Reports', path: '/reports', category: 'Pages', icon: FileText },
    { id: 'page-set', label: 'User Settings', path: '/settings', category: 'Pages', icon: SettingsIcon },
    { id: 'page-fac', label: 'All Facilities', path: '/factories', category: 'Pages', icon: Building2 },
  ];

  const facilities = (serverFactories || []).map((f) => ({
    id: `fac-${f.id}`,
    label: `${f.name} (${f.location})`,
    category: 'Facilities',
    icon: Building2,
    action: () => {
      setActiveFactory({ factoryId: f.id, factoryName: f.name, role: 'OWNER' });
      navigate('/dashboard');
    },
  }));

  const machines = (serverMachines || []).map((m) => ({
    id: `mach-${m.id}`,
    label: `${m.name} (${m.type}) - ${m.status}`,
    category: 'Machines',
    icon: Wrench,
    action: () => navigate('/machines'),
  }));

  const workers = (serverWorkers || []).map((w) => ({
    id: `work-${w.id}`,
    label: `${w.name} - ${w.role} (${w.status})`,
    category: 'Workers',
    icon: Users,
    action: () => navigate('/attendance'),
  }));

  const allItems = [
    ...pages.map((p) => ({
      ...p,
      action: () => navigate(p.path),
    })),
    ...facilities,
    ...machines,
    ...workers,
  ];

  const filtered = allItems.filter((item) =>
    item.label.toLowerCase().includes(query.toLowerCase()) ||
    item.category.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (item: typeof allItems[0]) => {
    item.action();
    setCommandPaletteOpen(false);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filtered.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % (filtered.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        handleSelect(filtered[selectedIndex]);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 sm:pt-28 px-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div
        className="fixed inset-0"
        onClick={() => setCommandPaletteOpen(false)}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[70vh]">
        {/* Search Header */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 dark:border-slate-800">
          <Search className="w-5 h-5 text-slate-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleInputKeyDown}
            placeholder="Type a command, page, machine, facility, or worker..."
            className="flex-1 bg-transparent text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none font-medium"
          />
          <div className="flex items-center gap-1">
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-500">
              ESC
            </kbd>
            <button
              onClick={() => setCommandPaletteOpen(false)}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded"
              aria-label="Close command palette"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 font-mono">
              No matching commands or factory assets found for &quot;{query}&quot;.
            </div>
          ) : (
            filtered.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;

              return (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs text-left transition-colors ${
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-600/15 text-blue-600 dark:text-blue-300 font-semibold'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3 truncate">
                    <Icon className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    <span className="text-[10px] font-mono uppercase text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded">
                      {item.category}
                    </span>
                    {isSelected && <ArrowRight className="w-3.5 h-3.5 text-blue-500" />}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <div className="flex items-center gap-3">
            <span>↑↓ to navigate</span>
            <span>↵ to select</span>
          </div>
          <div className="flex items-center gap-1 text-slate-400">
            <Command className="w-3 h-3" />
            <span>Command Palette</span>
          </div>
        </div>
      </div>
    </div>
  );
};
