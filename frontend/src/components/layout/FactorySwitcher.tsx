import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, ChevronDown, Check, ExternalLink } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { useFactories } from '../../hooks/useFactoryData';
import type { UserFactory } from '../../types/index';

export const FactorySwitcher = () => {
  const navigate = useNavigate();
  const { activeFactory, setActiveFactory, factories } = useAuthStore();
  const { data: serverFactories } = useFactories();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const availableList: UserFactory[] = (serverFactories && serverFactories.length > 0
    ? serverFactories.map((sf) => ({
        factoryId: sf.id,
        factoryName: sf.name,
        role: activeFactory?.role || 'OPERATOR',
      }))
    : factories.length > 0
    ? factories
    : [
        { factoryId: 'f-1', factoryName: 'Berlin Gigafactory', role: 'OWNER' },
        { factoryId: 'f-2', factoryName: 'Detroit Stamping Facility', role: 'SUPERVISOR' },
        { factoryId: 'f-3', factoryName: 'Portland Assembly Plant', role: 'OPERATOR' },
        { factoryId: 'f-4', factoryName: 'Austin Tech Hub', role: 'VIEWER' },
      ]);

  const currentFactory = activeFactory || availableList[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (factory: UserFactory) => {
    setActiveFactory(factory);
    setIsOpen(false);
  };

  const isOwner = activeFactory?.role === 'OWNER';

  // If not an Owner, show static non-switchable badge
  if (!isOwner || availableList.length <= 1) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs font-medium shadow-sm select-none">
        <Building2 className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
        <span className="max-w-[130px] sm:max-w-[180px] truncate font-medium">
          {currentFactory?.factoryName || 'Assigned Facility'}
        </span>
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 transition-all text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
        aria-label="Switch Facility"
      >
        <Building2 className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
        <span className="max-w-[130px] sm:max-w-[180px] truncate font-medium">
          {currentFactory?.factoryName || 'Select Facility'}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl py-1 z-50 divide-y divide-slate-800">
          <div className="px-3.5 py-2 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between bg-slate-950/40">
            <span>Select Operational Site</span>
            <span className="text-emerald-400 text-[10px] font-mono">SCADA Connected</span>
          </div>

          <div className="py-1 max-h-60 overflow-y-auto">
            {availableList.map((facility) => {
              const isSelected = activeFactory?.factoryId === facility.factoryId;
              return (
                <button
                  key={facility.factoryId}
                  onClick={() => handleSelect(facility)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs text-left transition-colors ${
                    isSelected
                      ? 'bg-blue-600/15 text-blue-300 font-bold'
                      : 'text-slate-300 hover:bg-slate-800/80'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <span
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        isSelected ? 'bg-blue-400 animate-pulse' : 'bg-slate-600'
                      }`}
                    ></span>
                    <span className="truncate">{facility.factoryName}</span>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-blue-400 flex-shrink-0 ml-2" />}
                </button>
              );
            })}
          </div>

          <div className="p-2 bg-slate-950/40">
            <button
              onClick={() => {
                setIsOpen(false);
                navigate('/factories');
              }}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors font-medium"
            >
              <span>Manage All Facilities</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
