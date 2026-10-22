import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useWorkspace, type ThemeMode } from '../context/WorkspaceContext';

interface ThemeToggleProps {
  compact?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ compact = false }) => {
  const { themeMode, setThemeMode } = useWorkspace();

  const options: Array<{ mode: ThemeMode; label: string; icon: typeof Sun }> = [
    { mode: 'light', label: 'Light', icon: Sun },
    { mode: 'dark', label: 'Dark', icon: Moon },
    { mode: 'system', label: 'System', icon: Monitor },
  ];

  if (compact) {
    return (
      <div
        className="inline-flex items-center p-0.5 rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] text-[var(--text-secondary)] shadow-xs"
        role="group"
        aria-label="Theme mode switcher"
      >
        {options.map(({ mode, label, icon: Icon }) => {
          const isActive = themeMode === mode;
          return (
            <button
              key={mode}
              onClick={() => setThemeMode(mode)}
              title={`${label} Mode`}
              aria-pressed={isActive}
              className={`p-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1 ${
                isActive
                  ? 'bg-[var(--surface)] text-[var(--primary)] shadow-xs'
                  : 'hover:text-[var(--text-primary)] hover:bg-[var(--surface)]/50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden xl:inline text-[11px] font-semibold">{label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      className="inline-flex items-center p-1 rounded-2xl border border-[var(--border)] bg-[var(--surface-secondary)] text-[var(--text-secondary)] shadow-xs"
      role="group"
      aria-label="Theme mode switcher"
    >
      {options.map(({ mode, label, icon: Icon }) => {
        const isActive = themeMode === mode;
        return (
          <button
            key={mode}
            onClick={() => setThemeMode(mode)}
            title={`Switch to ${label} Mode`}
            aria-pressed={isActive}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              isActive
                ? 'bg-[var(--surface)] text-[var(--primary)] shadow-xs'
                : 'hover:text-[var(--text-primary)] hover:bg-[var(--surface)]/50'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
};
