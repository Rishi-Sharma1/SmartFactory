import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Layers,
  Activity,
  CheckCircle2,
  AlertOctagon,
  TrendingUp,
  RefreshCw,
  Zap,
  ChevronDown,
  ChevronUp,
  User,
  Clock,
  Gauge,
  Send,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { KPICard } from '../components/dashboard/KPICard';
import { FactoryChat } from '../components/dashboard/FactoryChat';
import { AlertFeed } from '../components/dashboard/AlertFeed';
import { ShiftCard } from '../components/dashboard/ShiftCard';
import { ShiftHandoverLog } from '../components/dashboard/ShiftHandoverLog';
import { OperatorStationCard } from '../components/dashboard/OperatorStationCard';
import {
  useProductionLines,
  useFactoryKPIs,
  use24hEfficiencyTrend,
} from '../hooks/useFactoryData';
import { useAuthStore } from '../store/auth.store';
import type { Role } from '../types/index';
import clsx from 'clsx';

export const Dashboard = () => {
  const { activeFactory } = useAuthStore();
  const currentRole: Role = activeFactory?.role || 'OWNER';

  const { data: lines, refetch: refetchLines, isFetching: linesFetching } = useProductionLines();
  const { data: kpis, refetch: refetchKpis, isFetching: kpisFetching } = useFactoryKPIs();
  const { data: trend24h, refetch: refetchTrend, isFetching: trendFetching } = use24hEfficiencyTrend();

  const [expandedLineId, setExpandedLineId] = useState<string | null>('L-101');

  const handleRefresh = () => {
    refetchLines();
    refetchKpis();
    refetchTrend();
  };

  const isRefreshing = linesFetching || kpisFetching || trendFetching;
  const lineList = lines || [];

  const toggleExpand = (id: string) => {
    setExpandedLineId(expandedLineId === id ? null : id);
  };

  // Role Capability Flags strictly adhering to Smart_Factory_Implementation_Plan_v2.md RBAC Matrix
  const canUseAiChat = ['OWNER', 'MANAGER'].includes(currentRole);
  const canViewAlerts = ['OWNER', 'MANAGER', 'SUPERVISOR'].includes(currentRole);
  const canManageShifts = ['OWNER', 'MANAGER', 'SUPERVISOR'].includes(currentRole);
  const canLogProduction = currentRole === 'SUPERVISOR';
  const canAssignTargets = ['OWNER', 'MANAGER'].includes(currentRole);
  const isOperator = currentRole === 'OPERATOR';

  const roleMeta: Record<Role, { title: string; desc: string; badgeColor: string }> = {
    OWNER: {
      title: 'Factory Owner',
      desc: 'Full governance, target setting, Gemini AI chat, multi-factory access & reports',
      badgeColor: 'bg-purple-100 text-purple-700 dark:bg-purple-950/70 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    },
    MANAGER: {
      title: 'Plant Operations Manager',
      desc: 'Plant telemetry, target setting, Gemini AI chat, fault resolution & reports',
      badgeColor: 'bg-blue-100 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    },
    SUPERVISOR: {
      title: 'Floor Shift Supervisor',
      desc: 'Shift operational metrics, production logging, shift open/close & roster management',
      badgeColor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    },
    OPERATOR: {
      title: 'Machinery Station Operator',
      desc: 'Station telemetry, self check-in/out & machinery fault reporting (AI chat & executive alerts hidden)',
      badgeColor: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
    },
    VIEWER: {
      title: 'Auditor / Viewer',
      desc: 'Read-only operational telemetry dashboard',
      badgeColor: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
    },
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Telemetry Header & Dynamic RBAC Role Switcher */}
      <div className="space-y-3 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {isOperator ? 'Workstation Operator Console' : 'Operations Floor Overview'}
              </h1>
              <span
                className={clsx(
                  'text-xs font-semibold px-2.5 py-0.5 rounded-full border',
                  roleMeta[currentRole]?.badgeColor
                )}
              >
                {roleMeta[currentRole]?.title}
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Plant: <span className="font-semibold text-slate-800 dark:text-slate-200">{activeFactory?.factoryName || 'Berlin Gigafactory'}</span> • {roleMeta[currentRole]?.desc}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
            >
              <RefreshCw className={clsx('w-3.5 h-3.5 text-blue-600 dark:text-blue-400', isRefreshing && 'animate-spin')} />
              <span>Sync Telemetry</span>
            </button>
          </div>
        </div>
      </div>

      {/* Top 4 KPI Metrics - Tailored per Role */}
      {isOperator ? (
        /* Operator-Tailored Workstation Metrics */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Assigned Cell"
            value="Line 1 / Stamping"
            unit=""
            trend="Active Station"
            trendType="positive"
            subtitle="Workstation #04"
            icon={Zap}
          />
          <KPICard
            title="Shift Status"
            value="Clocked In"
            trend="Morning Shift (06:00 - 14:00)"
            trendType="positive"
            subtitle="Biometric verified"
            icon={CheckCircle2}
          />
          <KPICard
            title="Station Machinery"
            value="3 / 3 Active"
            trend="All telemetry nominal"
            trendType="positive"
            subtitle="CNC-101, Press-201, Drill-04"
            icon={Activity}
          />
          <KPICard
            title="Station Rejects"
            value="4 units"
            trend="Yield: 99.4%"
            trendType="positive"
            subtitle="Within tolerance threshold"
            icon={AlertOctagon}
          />
        </div>
      ) : (
        /* Executive / Supervisory Metrics */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Total Shift Output"
            value={(kpis?.totalOutput ?? 0).toLocaleString()}
            unit="units"
            trend={kpis?.outputDelta || 'Target: 0 units'}
            trendType={kpis?.outputPositive ? 'positive' : 'warning'}
            subtitle="Floor production today"
            icon={Layers}
          />

          <KPICard
            title="Overall Floor OEE"
            value={`${kpis?.efficiency ?? 0}%`}
            trend={`Target: ${kpis?.efficiencyTarget || 90.0}%`}
            trendType={kpis && kpis.efficiency >= kpis.efficiencyTarget ? 'positive' : 'warning'}
            subtitle="Network availability"
            icon={Activity}
          />

          <KPICard
            title="Shift Staffing"
            value={kpis?.activeShiftsRatio || 'No Active Shift'}
            trend={kpis?.activeShift ? `${kpis.activeShift.type} Shift` : 'No Active Shift'}
            trendType="neutral"
            subtitle={`${kpis?.activeStaff ?? 0}/${kpis?.totalStaff ?? 0} roster present`}
            icon={CheckCircle2}
          />

          <KPICard
            title="Active Faults"
            value={kpis?.criticalAlerts ?? 0}
            trend={kpis && kpis.criticalAlerts > 0 ? 'Requires attention' : 'All lines nominal'}
            trendType={kpis && kpis.criticalAlerts > 0 ? 'negative' : 'positive'}
            subtitle={kpis && kpis.criticalAlerts > 0 ? `${kpis.criticalAlerts} machine stopped` : 'Zero line trips'}
            icon={AlertOctagon}
          />
        </div>
      )}


      {/* Main Grid: Left Column (Telemetry & Logs) + Right Column (Role Specific Sidebar Cards) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Columns */}
        <div className="lg:col-span-2 space-y-8">
          {/* 24h Efficiency Area Chart (Visible to Owner, Manager, Supervisor; Hidden for Operator) */}
          {!isOperator && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
                <div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                      24-Hour Efficiency Trajectory
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Hourly OEE performance curve against the 90.0% operational target threshold.
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
                    <span className="w-2.5 h-2.5 rounded-sm bg-blue-600 inline-block" /> OEE Trend (%)
                  </span>
                  <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                    <span className="w-3 h-0.5 border-t border-dashed border-red-500 inline-block" /> 90% SLA
                  </span>
                </div>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trend24h || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="efficiencyGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-800" />
                    <XAxis
                      dataKey="hour"
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      interval={2}
                    />
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={11}
                      domain={[75, 100]}
                      tickLine={false}
                      unit="%"
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '8px',
                        color: '#f8fafc',
                        fontSize: '12px',
                      }}
                      formatter={(val: any) => [`${val}%`, 'Efficiency']}
                      labelFormatter={(label) => `Time: ${label}`}
                    />
                    <ReferenceLine
                      y={90}
                      stroke="#ef4444"
                      strokeDasharray="4 4"
                      strokeWidth={1.5}
                    />
                    <Area
                      type="monotone"
                      dataKey="efficiency"
                      stroke="#2563eb"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#efficiencyGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Live Production Line Status with Role Actions */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                  {isOperator ? 'Workstation Line Status' : 'Line Telemetry Status'}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                {canLogProduction && (
                  <Link
                    to="/production"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs"
                  >
                    <Send className="w-3 h-3" />
                    <span>Log Shift Production</span>
                  </Link>
                )}
                {canAssignTargets && (
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                    Target Setting Enabled
                  </span>
                )}
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {lineList.length} Connected Cells
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {lineList.map((line) => {
                const isExpanded = expandedLineId === line.id;
                const percent = Math.min(100, Math.round((line.produced / line.target) * 100));

                return (
                  <div
                    key={line.id}
                    className={clsx(
                      'rounded-lg border transition-all overflow-hidden',
                      isExpanded
                        ? 'border-blue-500/80 bg-slate-50/50 dark:bg-slate-950/40'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                    )}
                  >
                    {/* Summary Row */}
                    <div
                      onClick={() => toggleExpand(line.id)}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                          aria-label={isExpanded ? 'Collapse line details' : 'Expand line details'}
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                              {line.name}
                            </h3>
                            <span
                              className={clsx(
                                'text-xs font-medium px-2 py-0.5 rounded',
                                line.status === 'Optimal'
                                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                  : line.status === 'Degraded'
                                  ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                  : 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 shadow-glow-red'
                              )}
                            >
                              {line.status}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Produced: <span className="font-semibold text-slate-800 dark:text-slate-200">{line.produced.toLocaleString()}</span> / {line.target.toLocaleString()} units
                            <span className="text-slate-400 dark:text-slate-500 ml-1.5 font-normal">({percent}%)</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6 sm:justify-end pl-7 sm:pl-0">
                        <div className="text-right">
                          <p className="text-xs text-slate-500 dark:text-slate-400">Rejects</p>
                          <p
                            className={clsx(
                              'text-sm font-semibold',
                              line.rejects > 20 ? 'text-red-600 dark:text-red-400 font-bold' : 'text-slate-700 dark:text-slate-300'
                            )}
                          >
                            {line.rejects}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-500 dark:text-slate-400">Efficiency</p>
                          <p
                            className={clsx(
                              'text-sm font-semibold',
                              line.efficiency >= 90 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                            )}
                          >
                            {line.efficiency}%
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="px-4 pb-3">
                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={clsx(
                            'h-1.5 rounded-full transition-all duration-500',
                            line.efficiency >= 90 ? 'bg-emerald-500' : 'bg-amber-500'
                          )}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>

                    {/* Expanded Detail Panel */}
                    {isExpanded && (
                      <div className="px-4 py-3 bg-slate-100/50 dark:bg-slate-950/50 border-t border-slate-200 dark:border-slate-800 text-xs grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                          <span className="text-slate-500 dark:text-slate-400">Operator:</span>
                          <span className="text-slate-800 dark:text-slate-200 font-medium">{line.operator || 'Rajesh Kumar'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                          <span className="text-slate-500 dark:text-slate-400">Shift:</span>
                          <span className="text-slate-700 dark:text-slate-300">{line.shift || 'Morning Shift'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Gauge className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                          <span className="text-slate-500 dark:text-slate-400">Yield Rate:</span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{line.yieldRate || 99.2}%</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Shift Handover Log (Visible to Owner, Manager, Supervisor; Hidden for Operator) */}
          {!isOperator && <ShiftHandoverLog />}
        </div>

        {/* Right 1 Column: Role-gated Cards */}
        <div className="space-y-8">
          {/* OPERATOR VIEW: Show Operator Station Card (Check-in & Machine Fault Reporter) */}
          {isOperator ? (
            <OperatorStationCard />
          ) : (
            /* NON-OPERATOR VIEW: Shift Card, Alert Feed & AI Chat */
            <>
              {/* Shift Card (Summary + Role-gated Open/Close Shift + Gemini AI Digest) */}
              {canManageShifts && <ShiftCard />}

              {/* Alert Feed (Visible to Owner, Manager, Supervisor) */}
              {canViewAlerts && <AlertFeed />}

              {/* Gemini AI Chat Widget (Strictly Owner & Manager Only) */}
              {canUseAiChat && <FactoryChat />}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
