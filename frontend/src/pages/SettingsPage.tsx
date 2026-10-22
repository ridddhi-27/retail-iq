import React, { useState } from 'react';
import {
  Settings,
  Trash2,
  Plus,
  Sun,
  Moon,
  Coins,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';

export const SettingsPage: React.FC = () => {
  const {
    workspace,
    currency,
    setCurrency,
    themeMode,
    setTheme,
    initNewWorkspace,
    clearCurrentWorkspace,
    refreshWorkspace,
  } = useWorkspace();

  const [clearing, setClearing] = useState(false);
  const [creatingNew, setCreatingNew] = useState(false);
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const handleClear = async () => {
    try {
      setClearing(true);
      await clearCurrentWorkspace();
      setShowConfirmClear(false);
      setActionMessage('Workspace data cleared successfully.');
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err) {
      alert('Failed to clear workspace data');
    } finally {
      setClearing(false);
    }
  };

  const handleCreateNew = async () => {
    try {
      setCreatingNew(true);
      await initNewWorkspace();
      setActionMessage('Fresh private workspace created.');
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err) {
      alert('Failed to create new workspace');
    } finally {
      setCreatingNew(false);
    }
  };

  const currencyOptions = [
    { label: 'Indian Rupee (₹)', symbol: '₹' },
    { label: 'US Dollar ($)', symbol: '$' },
    { label: 'Euro (€)', symbol: '€' },
    { label: 'British Pound (£)', symbol: '£' },
    { label: 'Australian Dollar (A$)', symbol: 'A$' },
    { label: 'Canadian Dollar (C$)', symbol: 'C$' },
    { label: 'UAE Dirham (AED)', symbol: 'AED' },
  ];

  return (
    <div className="space-y-6 max-w-4xl pb-12">
      {/* Header */}
      <div className="pastel-card p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--accent-lavender)] text-[var(--accent-lavender-text)] flex items-center justify-center">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              Workspace Preferences &amp; Settings
            </h1>
            <p className="text-xs text-[var(--text-secondary)]">
              Manage currency formatting, UI appearance, and workspace lifecycle
            </p>
          </div>
        </div>
      </div>

      {actionMessage && (
        <div className="p-4 rounded-xl bg-[var(--accent-mint)] text-[var(--accent-mint-text)] text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Workspace Management Card */}
      <div className="pastel-card p-6 space-y-5">
        <h2 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">
          Active Workspace Session
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)] space-y-1">
            <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase">Workspace ID</span>
            <p className="text-sm font-mono font-bold text-[var(--text-primary)] truncate">
              {workspace?.workspace_id || 'Generating...'}
            </p>
            <p className="text-[11px] text-[var(--text-secondary)]">
              {workspace?.is_sample ? 'Sample Demo Workspace' : 'Private Multi-Tenant Workspace'}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)] space-y-1">
            <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase">Session Expiry</span>
            <p className="text-sm font-mono font-bold text-[var(--success)]">
              {workspace?.days_until_expiry ? `${workspace.days_until_expiry} Days Remaining` : '7 Days Rolling'}
            </p>
            <p className="text-[11px] text-[var(--text-secondary)]">
              Rolling 7-day inactivity retention. Resets upon each visit.
            </p>
          </div>
        </div>

        <div className="pt-2 flex flex-wrap items-center gap-3">
          <button
            onClick={handleCreateNew}
            disabled={creatingNew}
            className="px-4 py-2 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-semibold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{creatingNew ? 'Initializing...' : 'Start New Clean Workspace'}</span>
          </button>

          <button
            onClick={() => setShowConfirmClear(true)}
            disabled={clearing || !workspace?.has_data}
            className="px-4 py-2 rounded-xl bg-[var(--danger)]/20 hover:bg-[var(--danger)]/30 text-[var(--danger)] text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            <span>Clear Current Workspace Data</span>
          </button>
        </div>
      </div>

      {/* Confirmation Modal for Clearing Workspace */}
      {showConfirmClear && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="pastel-card p-6 max-w-md w-full bg-[var(--surface)] shadow-xl space-y-4">
            <div className="flex items-center gap-3 text-[var(--danger)]">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                Clear Workspace Records?
              </h3>
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              This will permanently delete all sales records, products, and forecast runs in your current workspace ({workspace?.workspace_id}). Other visitors' workspaces will remain unaffected.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowConfirmClear(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)]"
              >
                Cancel
              </button>
              <button
                onClick={handleClear}
                disabled={clearing}
                className="px-4 py-2 rounded-xl bg-[var(--danger)] hover:bg-[var(--danger)]/90 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                {clearing ? 'Clearing...' : 'Yes, Clear All Data'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Display & Currency Preferences */}
      <div className="pastel-card p-6 space-y-5">
        <h2 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">
          Display &amp; Regional Preferences
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Currency Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-[var(--text-secondary)] flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5 text-[var(--primary)]" />
              Default Currency Display
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)] text-xs font-semibold text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
            >
              {currencyOptions.map((opt) => (
                <option key={opt.symbol} value={opt.symbol}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Theme Mode */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-[var(--text-secondary)] flex items-center gap-1.5">
              <Sun className="w-3.5 h-3.5 text-[var(--primary)]" />
              Interface Theme
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  themeMode === 'light'
                    ? 'bg-[var(--accent-lavender)] text-[var(--accent-lavender-text)] border-[var(--primary)]'
                    : 'bg-[var(--surface-secondary)] text-[var(--text-secondary)] border-[var(--border)]'
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
                <span>Light Pastel</span>
              </button>
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  themeMode === 'dark'
                    ? 'bg-[var(--surface-elevated)] text-[var(--primary)] border-[var(--primary)]'
                    : 'bg-[var(--surface-secondary)] text-[var(--text-secondary)] border-[var(--border)]'
                }`}
              >
                <Moon className="w-3.5 h-3.5" />
                <span>Dark Theme</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
