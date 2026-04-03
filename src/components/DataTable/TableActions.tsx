import { X, Check, Info, Filter } from 'lucide-react';

interface TableActionsProps {
  actionStatus: { message: string; type: 'success' | 'error' } | null;
  setActionStatus: (status: { message: string; type: 'success' | 'error' } | null) => void;
  filterText: string;
  showSuperTagsOnly: boolean;
  setFilterText: (text: string) => void;
  setShowSuperTagsOnly: (show: boolean) => void;
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
  const activeFilterNames = Object.keys(columnFilters);
  const hasGlobalFilters = filterText || showSuperTagsOnly;

  if (!actionStatus && !hasGlobalFilters && !hasActiveColumnFilters) return null;

  return (
    <div className="space-y-0">
      {/* Status toast */}
      {actionStatus && (
        <div className={`mx-3 mt-2 px-3 py-2 rounded-lg flex items-center gap-2 text-xs ${
          actionStatus.type === 'success'
            ? 'bg-green-50 border border-green-200 text-green-700'
            : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {actionStatus.type === 'success' ? (
            <Check className="h-3.5 w-3.5 flex-shrink-0" />
          ) : (
            <Info className="h-3.5 w-3.5 flex-shrink-0" />
          )}
          <span className="flex-1">{actionStatus.message}</span>
          <button onClick={() => setActionStatus(null)} className="opacity-60 hover:opacity-100">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Active filter pills */}
      {(hasGlobalFilters || hasActiveColumnFilters) && (
        <div className="mx-3 mt-2 flex flex-wrap items-center gap-1.5">
          <Filter className="h-3 w-3 text-gray-400 mr-0.5" />

          {filterText && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-600">
              Search: "{filterText}"
              <button onClick={() => setFilterText('')} className="hover:text-gray-900"><X className="h-3 w-3" /></button>
            </span>
          )}

          {showSuperTagsOnly && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-100 text-blue-700">
              SuperTags only
              <button onClick={() => setShowSuperTagsOnly(false)} className="hover:text-blue-900"><X className="h-3 w-3" /></button>
            </span>
          )}

          {activeFilterNames.map(column => (
            <span key={column} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-indigo-100 text-indigo-700">
              {column}: "{columnFilters[column]}"
            </span>
          ))}

          {(hasGlobalFilters || hasActiveColumnFilters) && (
            <button
              onClick={() => {
                setFilterText('');
                setShowSuperTagsOnly(false);
                if (clearColumnFilters) clearColumnFilters();
              }}
              className="text-[11px] text-gray-500 hover:text-gray-700 underline ml-1"
            >
              Clear all
            </button>
          )}
        </div>
      )}
    </div>
  );
}