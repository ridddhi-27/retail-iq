import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({ message, onRetry }) => {
  return (
    <div className="p-4 rounded-xl pastel-badge-danger border border-[var(--danger)]/30 flex items-center justify-between gap-3 text-sm my-4 shadow-xs">
      <div className="flex items-center gap-3">
        <AlertCircle className="w-5 h-5 text-[var(--danger)] shrink-0" />
        <span className="font-semibold">{message}</span>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--surface)] hover:opacity-90 text-[var(--danger)] text-xs font-bold transition-opacity shrink-0 shadow-xs cursor-pointer border border-[var(--border)]"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry</span>
        </button>
      )}
    </div>
  );
};
