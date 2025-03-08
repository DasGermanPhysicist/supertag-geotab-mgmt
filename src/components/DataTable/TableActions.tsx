import React from 'react';
import { X, Check, Info, Filter } from 'lucide-react';

interface TableActionsProps {
  actionStatus: { message: string; type: 'success' | 'error' } | null;
  setActionStatus: (status: { message: string; type: 'success' | 'error' } | null) => void;
  filterText: string;
  showSuperTagsOnly: boolean;
  setFilterText: (text: string) => void;
  setShowSuperTagsOnly: (show: boolean) => void;
  // New props for column filters
  columnFilters?: Record<string, string>;
  clearColumnFilters?: () => void;
  hasActiveColumnFilters?: boolean;
}

export function TableActions({ 
  actionStatus, 
  setActionStatus,
  filterText,
  showSuperTagsOnly,
  setFilterText,
  setShowSuperTagsOnly,
  columnFilters = {},
  clearColumnFilters = () => {},
  hasActiveColumnFilters = false
}: TableActionsProps) {
  // Get active column filter names for display
  const activeFilterNames = Object.keys(columnFilters);

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
      
      {/* Filter information - Global filters */}
      {(filterText || showSuperTagsOnly) && (
        <div className="px-4 py-2 border-t border-gray-100 bg-gray-50 text-xs text-gray-500 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-3 w-3" />
            <span>
              Global Filters: 
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
            Clear global filters
          </button>
        </div>
      )}

      {/* Column Filters Information */}
      {hasActiveColumnFilters && (
        <div className="px-4 py-2 border-t border-gray-100 bg-blue-50 text-xs text-blue-700 flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1">
            <Filter className="h-3 w-3 flex-shrink-0" />
            <span className="flex-shrink-0">
              Column Filters: 
            </span>
            <div className="flex flex-wrap gap-1 max-w-[80%]">
              {activeFilterNames.map(column => (
                <span key={column} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-100">
                  {column}: "{columnFilters[column]}"
                </span>
              ))}
            </div>
          </div>
          <button 
            onClick={clearColumnFilters}
            className="text-blue-600 hover:text-blue-800 flex-shrink-0"
          >
            Clear column filters
          </button>
        </div>
      )}
    </>
  );
}