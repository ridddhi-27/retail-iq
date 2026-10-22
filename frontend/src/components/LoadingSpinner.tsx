import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = 'Loading data...',
  size = 'md',
}) => {
  const sizeMap = {
    sm: 'w-5 h-5',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className="flex flex-col items-center justify-center p-12 space-y-3">
      <div className="relative">
        <Loader2 className={`${sizeMap[size]} text-[var(--primary)] animate-spin`} />
      </div>
      {message && (
        <p className="text-sm font-medium text-[var(--text-secondary)] animate-pulse">{message}</p>
      )}
    </div>
  );
};
