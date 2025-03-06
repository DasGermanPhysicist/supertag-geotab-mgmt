import React from 'react';

interface LoadingSpinnerProps {
  progress?: { current: number; total: number } | null;
  className?: string;
}

export function LoadingSpinner({ progress, className = '' }: LoadingSpinnerProps) {
  return (
    <div className={`flex flex-col items-center justify-center space-y-4 ${className}`}>
      <div className="relative h-12 w-12">
        <div className="absolute animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
        <div className="absolute top-0 left-0 right-0 bottom-0 flex items-center justify-center">
          <div className="h-8 w-8 rounded-full bg-white"></div>
        </div>
      </div>
      
      {progress && (
        <div className="text-center">
          <div className="text-sm text-gray-600 mb-1">
            Loading sites: {progress.current} of {progress.total}
          </div>
          <div className="w-48 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-600 transition-all duration-200"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            ></div>
          </div>
        </div>
      )}
    </div>
  );
}