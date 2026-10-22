import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  accentColor?: 'primary' | 'mint' | 'cyan' | 'blue' | 'amber' | 'danger';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  accentColor = 'primary',
}) => {
  const colorMap = {
    primary: 'bg-[var(--accent-lavender)] text-[var(--accent-lavender-text)]',
    mint: 'bg-[var(--accent-mint)] text-[var(--accent-mint-text)]',
    cyan: 'bg-[var(--accent-cyan)] text-[var(--accent-cyan-text)]',
    blue: 'bg-[var(--accent-blue)] text-[var(--accent-blue-text)]',
    amber: 'pastel-badge-warning',
    danger: 'pastel-badge-danger',
  };

  const badgeClass = colorMap[accentColor] || colorMap.primary;

  return (
    <div className="pastel-card pastel-card-hover p-5.5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
            {title}
          </p>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
            {value}
          </h3>
          {subtitle && (
            <p className="text-xs text-[var(--text-secondary)] mt-1 font-medium">{subtitle}</p>
          )}
        </div>
        <div className={`p-3 rounded-2xl ${badgeClass} shrink-0 shadow-xs`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {trend && (
        <div className="mt-3 pt-3 border-t border-[var(--border)] flex items-center gap-1.5 text-xs">
          <span
            className={`font-semibold ${
              trend.isPositive ? 'text-[var(--success)]' : 'text-[var(--danger)]'
            }`}
          >
            {trend.value}
          </span>
          <span className="text-[var(--text-secondary)]">vs historical period</span>
        </div>
      )}
    </div>
  );
};
