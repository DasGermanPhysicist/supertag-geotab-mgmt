import React, { useState, useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ErrorBannerProps {
  message: string;
  className?: string;
}

export function ErrorBanner({ message, className = '' }: ErrorBannerProps) {
  const [isVisible, setIsVisible] = useState(true);
  
  useEffect(() => {
    if (message) {
      setIsVisible(true);
      // Auto-dismiss after 5 seconds
      const timer = setTimeout(() => setIsVisible(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);
  
  if (!message || !isVisible) return null;
  
  return (
    <div className={`bg-red-50 border-l-4 border-red-500 p-4 rounded-md shadow-md ${className}`} role="alert">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <AlertTriangle className="h-5 w-5 text-red-500" />
        </div>
        <div className="ml-3 flex-1">
          <p className="text-sm text-red-700">{message}</p>
        </div>
        <button 
          type="button" 
          className="ml-auto -mx-1.5 -my-1.5 bg-red-50 text-red-500 rounded-lg p-1.5 hover:bg-red-100 focus:ring-2 focus:ring-red-400"
          onClick={() => setIsVisible(false)}
        >
          <span className="sr-only">Dismiss</span>
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}