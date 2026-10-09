import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Lock,
  Mail,
  ArrowRight,
  Eye,
  EyeOff,
  Factory,
  Check,
  AlertCircle,
  Loader2,
  Plus,
  Trash2,
  Building2,
  Cpu,
  Layers,
  User,
  ChevronRight,
  ChevronLeft,
  AlertTriangle,
} from 'lucide-react';
import {
  useAuthStore,
  type RegisterFactoryInput,
  type RegisterMachineInput,
} from '../store/auth.store';
import type { Role } from '../types/index';
import clsx from 'clsx';
import { FactoryOSLogo } from '../components/shared/FactoryOSLogo';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, register } = useAuthStore();

  // Mode: 'login' | 'register'
  const [mode, setMode] = useState<'login' | 'register'>('login');

  // Sign In states
  const [email, setEmail] = useState('owner@factory.com');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role>('OWNER');

  // Register Owner states
  const [regStep, setRegStep] = useState<number>(1);
  const [ownerName, setOwnerName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [numFactories, setNumFactories] = useState<number>(1);

  // Nested Structure: Factory -> Lines -> Machines
  const [factories, setFactories] = useState<RegisterFactoryInput[]>([
    {
      name: 'Primary Manufacturing Facility',
      location: 'Austin, TX',
      lines: [
        {
          name: 'Line 1: High Precision Assembly',
          machines: [
            { name: 'CNC Milling Unit A-1', type: 'CNC Milling' },
            { name: 'Robotic Arm B-4', type: 'Robotic Assembly' },
          ],
        },
        {
          name: 'Line 2: Stamping & Press',
          machines: [{ name: 'Hydraulic Press D-2', type: 'Stamping Press' }],
        },
      ],
    },
  ]);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [offlineNotice, setOfflineNotice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const demoPersonas: { role: Role; name: string; email: string; title: string }[] = [
    {
      role: 'OWNER',
      name: 'Alice Owner',
      email: 'owner@factory.com',
      title: 'Factory Owner (Full Control)',
    },
    {
      role: 'MANAGER',
      name: 'Bob Manager',
      email: 'manager@factory.com',
      title: 'Plant Manager (Operations)',
    },
    {
      role: 'SUPERVISOR',
      name: 'Charlie Supervisor',
      email: 'supervisor@factory.com',
      title: 'Shift Supervisor (Override Access)',
    },
    {
      role: 'OPERATOR',
      name: 'Dave Operator',
      email: 'operator@factory.com',
      title: 'Machinery Operator (Run Logging)',
    },
  ];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setOfflineNotice(null);

    try {
      const result = await login(email, password, selectedRole);
      if (result.success) {
        const { activeFactory, factories: userFacs } = useAuthStore.getState();
        const userRole = activeFactory?.role || userFacs[0]?.role;
        const targetPath = userRole === 'OWNER' ? '/factories' : '/dashboard';

        if (result.isOfflineFallback && result.message) {
          setOfflineNotice(result.message);
          setTimeout(() => navigate(targetPath), 1000);
        } else {
          navigate(targetPath);
        }
      } else {
        setErrorMessage(result.message || 'Invalid email or password');
      }
    } catch {
      setErrorMessage('Unable to connect to authentication gateway.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNumFactoriesChange = (val: number) => {
    const count = Math.max(1, Math.min(10, val));
    setNumFactories(count);

    setFactories((prev) => {
      const updated = [...prev];
      if (count > updated.length) {
        for (let i = updated.length; i < count; i++) {
          updated.push({
            name: `Factory ${i + 1}`,
            location: '',
            lines: [
              {
                name: 'Line 1',
                machines: [{ name: 'Machine 1', type: 'General Equipment' }],
              },
            ],
          });
        }
      } else if (count < updated.length) {
        updated.splice(count);
      }
      return updated;
    });
  };

  const updateFactoryField = (fIndex: number, field: keyof RegisterFactoryInput, value: any) => {
    setFactories((prev) => {
      const copy = [...prev];
      copy[fIndex] = { ...copy[fIndex], [field]: value };
      return copy;
    });
  };

  // Add a production line to a factory (must initialize with at least 1 machine!)
  const addLineToFactory = (fIndex: number) => {
    setFactories((prev) => {
      const copy = [...prev];
      const currentLines = copy[fIndex].lines;
      const newLineNum = currentLines.length + 1;
      copy[fIndex].lines = [
        ...currentLines,
        {
          name: `Line ${newLineNum}`,
          machines: [{ name: `Machine 1`, type: `General Equipment` }],
        },
      ];
      return copy;
    });
  };

  const removeLineFromFactory = (fIndex: number, lIndex: number) => {
    setFactories((prev) => {
      const copy = [...prev];
      copy[fIndex].lines = copy[fIndex].lines.filter((_, idx) => idx !== lIndex);
      return copy;
    });
  };

  const updateLineName = (fIndex: number, lIndex: number, name: string) => {
    setFactories((prev) => {
      const copy = [...prev];
      copy[fIndex].lines[lIndex].name = name;
      return copy;
    });
  };

  // Add machine to a SPECIFIC production line
  const addMachineToLine = (fIndex: number, lIndex: number) => {
    setFactories((prev) => {
      const copy = [...prev];
      const lineMachines = copy[fIndex].lines[lIndex].machines;
      copy[fIndex].lines[lIndex].machines = [
        ...lineMachines,
        { name: `Machine ${lineMachines.length + 1}`, type: 'General Equipment' },
      ];
      return copy;
    });
  };

  const removeMachineFromLine = (fIndex: number, lIndex: number, mIndex: number) => {
    setFactories((prev) => {
      const copy = [...prev];
      copy[fIndex].lines[lIndex].machines = copy[fIndex].lines[lIndex].machines.filter(
        (_, idx) => idx !== mIndex
      );
      return copy;
    });
  };

  const updateMachineField = (
    fIndex: number,
    lIndex: number,
    mIndex: number,
    field: keyof RegisterMachineInput,
    value: string
  ) => {
    setFactories((prev) => {
      const copy = [...prev];
      copy[fIndex].lines[lIndex].machines[mIndex] = {
        ...copy[fIndex].lines[lIndex].machines[mIndex],
        [field]: value,
      };
      return copy;
    });
  };

  // Validation Rules:
  // 1. Every factory must have >= 1 line
  // 2. Every line must have >= 1 machine
  // 3. Names must not be empty
  const getValidationErrors = (): string[] => {
    const errors: string[] = [];
    factories.forEach((fac, fIdx) => {
      if (!fac.name.trim()) {
        errors.push(`Factory #${fIdx + 1} name cannot be empty.`);
      }
      if (fac.lines.length === 0) {
        errors.push(`Factory "${fac.name || `#${fIdx + 1}`}" must have at least 1 production line.`);
      }
      fac.lines.forEach((line, lIdx) => {
        if (!line.name.trim()) {
          errors.push(`Line #${lIdx + 1} in Factory "${fac.name}" name cannot be empty.`);
        }
        if (line.machines.length === 0) {
          errors.push(
            `Production line "${line.name || `#${lIdx + 1}`}" in Factory "${fac.name}" must have at least 1 machine.`
          );
        }
        line.machines.forEach((mac, mIdx) => {
          if (!mac.name.trim()) {
            errors.push(
              `Machine #${mIdx + 1} in Line "${line.name}" must have a valid name.`
            );
          }
        });
      });
    });
    return errors;
  };

  const validationErrors = getValidationErrors();
  const isValidConfig = validationErrors.length === 0;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidConfig) return;

    setIsLoading(true);
    setErrorMessage(null);
    setOfflineNotice(null);

    try {
      const result = await register({
        name: ownerName,
        email: regEmail,
        password: regPassword,
        role: 'OWNER',
        factories,
      });

      if (result.success) {
        if (result.isOfflineFallback && result.message) {
          setOfflineNotice(result.message);
          setTimeout(() => navigate('/factories'), 1000);
        } else {
          navigate('/factories');
        }
      } else {
        setErrorMessage(result.message || 'Owner registration failed.');
      }
    } catch {
      setErrorMessage('Failed to connect to authentication gateway.');
    } finally {
      setIsLoading(false);
    }
  };

  const selectPersona = (p: (typeof demoPersonas)[0]) => {
    setEmail(p.email);
    setSelectedRole(p.role);
    setPassword('password123');
    setErrorMessage(null);
    setMode('login');
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="sm:mx-auto sm:w-full sm:max-w-2xl text-center flex flex-col items-center">
        <div className="mb-4">
          <FactoryOSLogo size="lg" showWordmark={true} showTagline={true} />
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Smart Factory Operations & Multi-Plant Control Network
        </p>

        {/* Tab Switcher */}
        <div className="mt-6 flex justify-center">
          <div className="bg-slate-200 dark:bg-slate-800 p-1 rounded-xl flex gap-1 border border-slate-300 dark:border-slate-700">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMessage(null);
              }}
              className={clsx(
                'px-5 py-2 rounded-lg text-xs font-semibold transition-all',
                mode === 'login'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              )}
            >
              Sign In to Account
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setErrorMessage(null);
              }}
              className={clsx(
                'px-5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5',
                mode === 'register'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              )}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Create Owner Account</span>
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-2xl">
        <div className="bg-white dark:bg-slate-900 py-8 px-4 shadow-sm sm:rounded-xl sm:px-10 border border-slate-200 dark:border-slate-800 space-y-6">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 flex items-center gap-2 text-xs text-red-700 dark:text-red-300">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {offlineNotice && (
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900 flex items-center gap-2 text-xs text-amber-700 dark:text-amber-300">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{offlineNotice}</span>
            </div>
          )}

          {/* SIGN IN FORM */}
          {mode === 'login' && (
            <form className="space-y-4" onSubmit={handleLogin}>
              <div>
                <label
                  htmlFor="email"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                >
                  Work Email Address
                </label>
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                    placeholder="operator@factory.com"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                >
                  Access Password
                </label>
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-9 pr-10 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                    placeholder="••••••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 flex justify-center items-center gap-2 py-2.5 px-4 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 transition-colors shadow-sm"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Terminal</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* REGISTER OWNER FORM */}
          {mode === 'register' && (
            <div className="space-y-6">
              {/* Wizard Steps indicator */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 text-xs">
                <span className="font-semibold text-slate-900 dark:text-white">
                  Owner Setup (Step {regStep} of 3)
                </span>
                <div className="flex gap-1.5">
                  <span
                    className={clsx(
                      'w-2 h-2 rounded-full',
                      regStep >= 1 ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                    )}
                  />
                  <span
                    className={clsx(
                      'w-2 h-2 rounded-full',
                      regStep >= 2 ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                    )}
                  />
                  <span
                    className={clsx(
                      'w-2 h-2 rounded-full',
                      regStep >= 3 ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                    )}
                  />
                </div>
              </div>

              {/* Step 1: Owner Details & Number of Factories */}
              {regStep === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Owner Full Name
                    </label>
                    <div className="relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <User className="h-4 w-4" />
                      </div>
                      <input
                        type="text"
                        required
                        value={ownerName}
                        onChange={(e) => setOwnerName(e.target.value)}
                        placeholder="e.g. Sarah Jenkins"
                        className="block w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Work Email Address
                    </label>
                    <div className="relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Mail className="h-4 w-4" />
                      </div>
                      <input
                        type="email"
                        required
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="owner@mycompany.com"
                        className="block w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Set Password
                    </label>
                    <div className="relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Lock className="h-4 w-4" />
                      </div>
                      <input
                        type={showRegPassword ? 'text' : 'password'}
                        required
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="At least 6 characters"
                        className="block w-full pl-9 pr-10 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPassword(!showRegPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        {showRegPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      How many factories are under your ownership?
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={numFactories}
                        onChange={(e) => handleNumFactoriesChange(parseInt(e.target.value) || 1)}
                        className="w-24 px-3 py-2 text-sm font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        (Each factory will have its own production lines & machines)
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={!ownerName || !regEmail || regPassword.length < 6}
                    onClick={() => setRegStep(2)}
                    className="w-full mt-4 flex justify-center items-center gap-2 py-2.5 px-4 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
                  >
                    <span>Proceed to Factory & Production Line Setup</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Step 2: Custom Factory, Lines & Line-Specific Machine Setup */}
              {regStep === 2 && (
                <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-1">
                  {!isValidConfig && (
                    <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-200 space-y-1">
                      <div className="flex items-center gap-1.5 font-semibold">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        <span>Factory Hierarchy Requirements:</span>
                      </div>
                      <ul className="list-disc pl-5 text-[11px] space-y-0.5 text-amber-700 dark:text-amber-300">
                        {validationErrors.map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {factories.map((fac, fIdx) => (
                    <div
                      key={fIdx}
                      className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-4"
                    >
                      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                        <span className="font-bold text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                          <Building2 className="w-4 h-4" />
                          Factory #{fIdx + 1} Configuration
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {fac.lines.length} Production Line(s)
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                            Factory Name *
                          </label>
                          <input
                            type="text"
                            required
                            value={fac.name}
                            onChange={(e) => updateFactoryField(fIdx, 'name', e.target.value)}
                            placeholder="e.g. Austin Stamping Facility"
                            className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                            Location (Optional)
                          </label>
                          <input
                            type="text"
                            value={fac.location || ''}
                            onChange={(e) => updateFactoryField(fIdx, 'location', e.target.value)}
                            placeholder="e.g. Austin, TX"
                            className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      {/* Production Lines & Embedded Machines List */}
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                            <Layers className="w-3.5 h-3.5 text-blue-500" />
                            Production Lines (At least 1 required)
                          </span>
                          <button
                            type="button"
                            onClick={() => addLineToFactory(fIdx)}
                            className="text-[11px] px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md flex items-center gap-1 font-semibold shadow-sm"
                          >
                            <Plus className="w-3 h-3" /> Add Production Line
                          </button>
                        </div>

                        {fac.lines.length === 0 ? (
                          <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 rounded-lg text-xs text-red-600 dark:text-red-400">
                            ⚠️ Factory must have at least 1 production line. Click "Add Production Line" above.
                          </div>
                        ) : (
                          fac.lines.map((line, lIdx) => (
                            <div
                              key={lIdx}
                              className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg space-y-3 shadow-xs"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex-1 flex items-center gap-2">
                                  <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                                    Line #{lIdx + 1}
                                  </span>
                                  <input
                                    type="text"
                                    required
                                    value={line.name}
                                    onChange={(e) => updateLineName(fIdx, lIdx, e.target.value)}
                                    placeholder="Production Line Name"
                                    className="flex-1 px-2.5 py-1 text-xs font-semibold rounded-md border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                                  />
                                </div>
                                {fac.lines.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => removeLineFromFactory(fIdx, lIdx)}
                                    className="text-red-500 hover:text-red-700 p-1"
                                    title="Remove Production Line"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>

                              {/* Machines within THIS line */}
                              <div className="pl-3 border-l-2 border-emerald-500/50 space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1">
                                    <Cpu className="w-3 h-3 text-emerald-500" />
                                    Machines on Line #{lIdx + 1} ({line.machines.length})
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => addMachineToLine(fIdx, lIdx)}
                                    className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5 font-semibold"
                                  >
                                    <Plus className="w-3 h-3" /> Add Machine to Line
                                  </button>
                                </div>

                                {line.machines.length === 0 ? (
                                  <div className="p-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded text-[11px] text-amber-700 dark:text-amber-300">
                                    ⚠️ Line must have at least 1 machine. Click "Add Machine to Line".
                                  </div>
                                ) : (
                                  line.machines.map((mac, mIdx) => (
                                    <div key={mIdx} className="flex items-center gap-2">
                                      <input
                                        type="text"
                                        required
                                        value={mac.name}
                                        onChange={(e) =>
                                          updateMachineField(fIdx, lIdx, mIdx, 'name', e.target.value)
                                        }
                                        placeholder="Machine Name (e.g. CNC Arm 01)"
                                        className="flex-1 px-2.5 py-1 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                                      />
                                      <input
                                        type="text"
                                        required
                                        value={mac.type}
                                        onChange={(e) =>
                                          updateMachineField(fIdx, lIdx, mIdx, 'type', e.target.value)
                                        }
                                        placeholder="Type (e.g. CNC Milling)"
                                        className="w-1/3 px-2.5 py-1 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                                      />
                                      {line.machines.length > 1 && (
                                        <button
                                          type="button"
                                          onClick={() => removeMachineFromLine(fIdx, lIdx, mIdx)}
                                          className="text-red-500 hover:text-red-700 p-1"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ))}

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setRegStep(1)}
                      className="flex-1 flex justify-center items-center gap-1 py-2 px-3 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Back</span>
                    </button>
                    <button
                      type="button"
                      disabled={!isValidConfig}
                      onClick={() => setRegStep(3)}
                      className="flex-1 flex justify-center items-center gap-1 py-2 px-3 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                    >
                      <span>Review & Confirm</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Review & Submit */}
              {regStep === 3 && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 space-y-3 text-xs text-blue-900 dark:text-blue-200">
                    <p className="font-semibold text-sm">Account Summary</p>
                    <p>
                      <strong>Owner:</strong> {ownerName} ({regEmail})
                    </p>
                    <p>
                      <strong>Registered Factories ({factories.length}):</strong>
                    </p>
                    <div className="space-y-2">
                      {factories.map((f, fIdx) => (
                        <div
                          key={fIdx}
                          className="p-2.5 rounded bg-white dark:bg-slate-900 border border-blue-200 dark:border-slate-800 text-[11px] text-slate-800 dark:text-slate-200 space-y-1"
                        >
                          <div className="font-bold text-blue-700 dark:text-blue-300">
                            🏭 {f.name} ({f.location || 'Location Not Specified'})
                          </div>
                          <div className="pl-2 space-y-1">
                            {f.lines.map((l, lIdx) => (
                              <div key={lIdx} className="text-slate-600 dark:text-slate-400">
                                • <strong>Line:</strong> {l.name} ({l.machines.length} Machines:{' '}
                                {l.machines.map((m) => m.name).join(', ')})
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setRegStep(2)}
                      className="flex-1 flex justify-center items-center gap-1 py-2 px-3 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Edit Configuration</span>
                    </button>
                    <button
                      type="button"
                      disabled={isLoading || !isValidConfig}
                      onClick={handleRegister}
                      className="flex-1 flex justify-center items-center gap-2 py-2.5 px-4 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 shadow-sm"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Creating Account...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Complete Owner Setup</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Quick Switch IAM Persona */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <span className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
              Select Demo Role Profile:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {demoPersonas.map((p) => {
                const isSelected = email === p.email && mode === 'login';
                return (
                  <button
                    key={p.email}
                    type="button"
                    onClick={() => selectPersona(p)}
                    className={clsx(
                      'text-left p-2.5 rounded-lg border text-xs transition-colors flex flex-col justify-between',
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-600 dark:border-blue-500 text-blue-900 dark:text-blue-100'
                        : 'bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    )}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-semibold text-slate-900 dark:text-white text-xs truncate">
                        {p.name}
                      </span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
                    </div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 truncate">
                      {p.title}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Status badges below card */}
        <div className="mt-6 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
          <span>Encrypted Session (TLS 1.3)</span>
          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            <span>Backend Gateway: Port 4000</span>
          </div>
        </div>
      </div>
    </div>
  );
};
