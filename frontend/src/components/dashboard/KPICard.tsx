import type { ElementType } from 'react';
import clsx from 'clsx';

interface KPICardProps {
  title: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
  trend?: string;
  trendType?: 'positive' | 'warning' | 'negative' | 'neutral';
  icon: ElementType;
  accent?: 'blue' | 'emerald' | 'amber' | 'red' | 'indigo';
}

export const KPICard = ({
  title,
  value,
  unit,
  subtitle,
  trend,
  trendType = 'positive',
  icon: Icon,
}: KPICardProps) => {
  const getTrendColor = () => {
    switch (trendType) {
      case 'positive':
        return 'text-emerald-600 dark:text-emerald-400';
      case 'warning':
        return 'text-amber-600 dark:text-amber-400';
      case 'negative':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-slate-500 dark:text-slate-400';
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          {title}
        </span>
        <div className="p-2 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div className="mt-4 flex items-baseline gap-2">
        <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          {value}
        </span>
        {unit && (
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {unit}
          </span>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between text-xs">
        {trend && (
          <span className={clsx('font-medium', getTrendColor())}>
            {trend}
          </span>
        )}
        {subtitle && (
          <span className="text-slate-500 dark:text-slate-400 truncate text-xs">
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
};

