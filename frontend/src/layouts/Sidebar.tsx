import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  LineChart,
  TrendingUp,
  Boxes,
  Database,
  Settings,
  Info,
  X,
} from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navItems = [
  { path: '/app', label: 'Overview', icon: LayoutDashboard },
  { path: '/app/analytics', label: 'Sales Analytics', icon: LineChart },
  { path: '/app/forecasting', label: 'Demand Forecasting', icon: TrendingUp },
  { path: '/app/inventory', label: 'Inventory Intelligence', icon: Boxes },
  { path: '/app/data', label: 'Data Management', icon: Database },
  { path: '/app/settings', label: 'Settings', icon: Settings },
  { path: '/app/about', label: 'About RetailIQ', icon: Info },
];

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { workspace } = useWorkspace();

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-[var(--surface-sidebar)] border-r border-[var(--border)] flex flex-col transition-all duration-200 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo / Header */}
        <div className="h-16 px-6 flex items-center justify-between border-b border-[var(--border)]">
          <NavLink to="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[var(--primary)] flex items-center justify-center text-white shadow-sm shadow-[var(--primary)]/25">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight text-[var(--text-primary)]">
                RetailIQ
              </span>
              <span className="block text-[10px] font-semibold tracking-wider text-[var(--primary)] uppercase">
                Demand Intelligence
              </span>
            </div>
          </NavLink>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] lg:hidden cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/app'}
                onClick={() => onClose()}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-[var(--accent-lavender)] text-[var(--accent-lavender-text)] font-semibold shadow-xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)]'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Workspace Telemetry Card */}
        <div className="p-4 m-3 rounded-2xl bg-[var(--surface-secondary)] border border-[var(--border)] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
              Workspace
            </span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                workspace?.is_sample
                  ? 'bg-[var(--accent-lavender)] text-[var(--accent-lavender-text)]'
                  : workspace?.has_data
                  ? 'bg-[var(--accent-mint)] text-[var(--accent-mint-text)]'
                  : 'bg-[var(--surface)] text-[var(--text-muted)] border border-[var(--border)]'
              }`}
            >
              {workspace?.is_sample ? 'Sample Store' : workspace?.has_data ? 'Active Data' : 'Empty'}
            </span>
          </div>
          <div className="text-xs font-semibold text-[var(--text-primary)] truncate">
            {workspace?.name || 'My Store'}
          </div>
          <div className="text-[11px] text-[var(--text-secondary)] flex items-center justify-between pt-1">
            <span>{workspace?.products_count ?? 0} SKUs</span>
            <span>{workspace?.sales_count ?? 0} sales</span>
          </div>
        </div>
      </aside>
    </>
  );
};
