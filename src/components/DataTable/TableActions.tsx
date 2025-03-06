import React from 'react';
import { X, Check, Info, Filter } from 'lucide-react';

interface TableActionsProps {
  actionStatus: { message: string; type: 'success' | 'error' } | null;
  setActionStatus: (status: { message: string; type: 'success' | 'error' } | null) => void;
  filterText: string;
  showSuperTagsOnly: boolean;
  setFilterText: (text: string) => void;
  setShowSuperTagsOnly: (show: boolean) => void;
}

export function TableActions({ 
  actionStatus, 
  setActionStatus,
  filterText,
  showSuperTagsOnly,
  setFilterText,
  setShowSuperTagsOnly
}: TableActionsProps) {
  return (
    <>
      {/* Status messages */}
      {actionStatus && (
        <div className={`px-4 py-3 border-t ${
          actionStatus.type === 'success' ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-700'
        }`}>
          <div className="flex items-center">
            {actionStatus.type === 'success' ? (
              <Check className="h-4 w-4 mr-2 flex-shrink-0" />
            ) : (
              <Info className="h-4 w-4 mr-2 flex-shrink-0" />
            )}
            <p className="text-sm">{actionStatus.message}</p>
            <button 
              onClick={() => setActionStatus(null)}
              className="ml-auto text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
      
      {/* Filter information */}
      {(filterText || showSuperTagsOnly) && (
        <div className="px-4 py-2 border-t border-gray-100 bg-gray-50 text-xs text-gray-500 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-3 w-3" />
            <span>
              Filters: 
              {filterText && <span className="ml-1 font-medium">Search "{filterText}"</span>}
              {showSuperTagsOnly && <span className="ml-1 font-medium">SuperTags only</span>}
            </span>
          </div>
          <button 
            onClick={() => {
              setFilterText('');
              setShowSuperTagsOnly(false);
            }}
            className="text-blue-600 hover:text-blue-800"
          >
            Clear all
          </button>
        </div>
      )}
    </>
  );
}