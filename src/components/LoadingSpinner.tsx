import React from 'react';

interface LoadingSpinnerProps {
  progress?: { current: number; total: number } | null;
}

export function LoadingSpinner({ progress }: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center h-64 space-y-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      {progress && (
        <div className="text-gray-600">
          Loading sites: {progress.current} of {progress.total}
        </div>
      )}
    </div>
  );
}