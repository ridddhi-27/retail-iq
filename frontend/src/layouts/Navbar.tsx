import React from 'react';
import { useLocation } from 'react-router-dom';
import { Menu, RefreshCw, Sparkles } from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import { ThemeToggle } from '../components/ThemeToggle';
import type { HealthResponse } from '../types';

interface NavbarProps {
  onToggleSidebar: () => void;
  health: HealthResponse | null;
  onRefresh?: () => void;
  lastUpdated?: string;
}

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/app': { title: 'Executive Overview', subtitle: 'Store performance, revenue telemetry & reorder alerts' },
  '/app/analytics': { title: 'Sales Analytics', subtitle: 'Revenue, volume distributions & day-of-week trends' },
  '/app/forecasting': { title: 'Demand Forecasting', subtitle: 'Predictive sales forecasts powered by machine learning' },
  '/app/inventory': { title: 'Inventory Intelligence', subtitle: 'Lead time calculations & proactive reorder suggestions' },
  '/app/data': { title: 'Data Management', subtitle: 'Upload CSV or multi-sheet Excel files & inspect records' },
  '/app/settings': { title: 'Settings', subtitle: 'Workspace controls, currency preferences & retention policies' },
  '/app/about': { title: 'About RetailIQ', subtitle: 'System architecture, predictive models & methodology' },
};

export const Navbar: React.FC<NavbarProps> = ({
  onToggleSidebar,
  onRefresh,
}) => {
  const location = useLocation();
  const { workspace, currency, createSampleWorkspace } = useWorkspace();

  const current = pageTitles[location.pathname] || {
    title: 'RetailIQ Dashboard',
    subtitle: 'Retail demand forecasting & inventory intelligence',
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-[var(--surface-header)]/90 backdrop-blur-md border-b border-[var(--border)] px-4 sm:px-8 flex items-center justify-between transition-colors duration-200">
      {/* Left: Mobile Toggle & Page Title */}
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] lg:hidden focus:outline-none cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-base sm:text-lg font-bold text-[var(--text-primary)] tracking-tight">
            {current.title}
          </h1>
          <p className="hidden sm:block text-xs text-[var(--text-secondary)]">
            {current.subtitle}
          </p>
        </div>
      </div>

      {/* Right: Badges & Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Workspace status badge */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--surface-secondary)] border border-[var(--border)] text-xs font-medium text-[var(--text-primary)]">
          <span
            className={`w-2 h-2 rounded-full ${
              workspace?.has_data ? 'bg-[var(--success)]' : 'bg-[var(--warning)]'
            }`}
          />
          <span>
            {workspace?.is_sample
              ? 'Sample Store'
              : workspace?.has_data
              ? `${workspace.products_count} Products Loaded`
              : 'Empty Workspace'}
          </span>
        </div>

        {/* Currency Pill */}
        <div className="hidden md:flex items-center px-2.5 py-1 rounded-full bg-[var(--surface-secondary)] border border-[var(--border)] text-xs font-semibold text-[var(--text-secondary)]">
          <span>Currency: {currency}</span>
        </div>

        {/* Load sample data shortcut if workspace is empty */}
        {workspace && !workspace.has_data && (
          <button
            onClick={() => createSampleWorkspace()}
            className="hidden lg:flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-xl bg-[var(--accent-lavender)] hover:opacity-90 text-[var(--accent-lavender-text)] transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Load Demo Data</span>
          </button>
        )}

        {/* 3-Option Adaptive Theme Toggle: Light / Dark / System */}
        <ThemeToggle compact />

        {/* Refresh button */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            title="Refresh Data"
            className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--primary)] hover:bg-[var(--surface-secondary)] transition-colors cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}
      </div>
    </header>
  );
};
