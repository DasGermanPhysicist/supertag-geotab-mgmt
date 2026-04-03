import React, { useMemo } from 'react';
import { Search, X, MapPin, Eye, EyeOff, Tag, Lock, ChevronDown, ChevronRight } from 'lucide-react';
import { ColumnVisibility } from '../../types';

interface TableColumnsProps {
  showColumnSelector: boolean;
  filteredColumns: string[];
  columnVisibility: ColumnVisibility;
  setColumnVisibility: (visibility: ColumnVisibility) => void;
  handleSelectAll: () => void;
  handleDeselectAll: () => void;
  handleDragStart: (column: string) => void;
  handleDragOver: (e: React.DragEvent, targetColumn: string) => void;
  MANDATORY_COLUMNS: string[];
  columnSearchTerm: string;
  setColumnSearchTerm: (term: string) => void;
  setShowColumnSelector: (show: boolean) => void;
  scrollToTable: () => void;
}

const formatColumnName = (column: string): string => {
  let displayName = column;
  if (column.startsWith('metadata.props.')) displayName = column.replace('metadata.props.', '');
  else if (column.startsWith('value.')) displayName = column.replace('value.', '');
  else if (column.startsWith('address_')) displayName = column.replace('address_', '📍 ');

  displayName = displayName
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase());

  displayName = displayName
    .replace(/\bId\b/g, 'ID')
    .replace(/\bUuid\b/g, 'UUID')
    .replace(/\bMac\b/g, 'MAC')
    .replace(/\bLat\b/g, 'Latitude')
    .replace(/\bLon\b/g, 'Longitude')
    .replace(/\bLng\b/g, 'Longitude')
    .replace(/\bAlt\b/g, 'Altitude')
    .replace(/\bTemp\b/g, 'Temperature')
    .replace(/\bMsg\b/g, 'Message')
    .replace(/\bAddr\b/g, 'Address');

  return displayName.replace(/\s+/g, ' ').trim();
};

interface ColumnGroup {
  label: string;
  icon: React.ReactNode;
  color: string;
  columns: string[];
}

export function TableColumns({
  showColumnSelector,
  filteredColumns,
  columnVisibility,
  setColumnVisibility,
  handleSelectAll,
  handleDeselectAll,
  handleDragStart,
  handleDragOver,
  MANDATORY_COLUMNS,
  columnSearchTerm,
  setColumnSearchTerm,
  setShowColumnSelector,
  scrollToTable
}: TableColumnsProps) {
  const [collapsedGroups, setCollapsedGroups] = React.useState<Set<string>>(new Set());

  const groups: ColumnGroup[] = useMemo(() => {
    const address = filteredColumns.filter(col => col.startsWith('address_') || col === 'formattedAddress');
    const location = filteredColumns.filter(col => ['latitude', 'longitude'].includes(col));
    const core = filteredColumns.filter(col =>
      MANDATORY_COLUMNS.includes(col) &&
      !['latitude', 'longitude'].includes(col) &&
      !col.startsWith('address_') &&
      col !== 'formattedAddress'
    );
    const other = filteredColumns.filter(col =>
      !col.startsWith('address_') &&
      col !== 'formattedAddress' &&
      !['latitude', 'longitude'].includes(col) &&
      !MANDATORY_COLUMNS.includes(col)
    );

    const result: ColumnGroup[] = [];
    if (core.length > 0) result.push({ label: 'Required', icon: <Lock className="h-3.5 w-3.5" />, color: 'blue', columns: core });
    if (location.length > 0) result.push({ label: 'Coordinates', icon: <MapPin className="h-3.5 w-3.5" />, color: 'emerald', columns: location });
    if (address.length > 0) result.push({ label: 'Address', icon: <MapPin className="h-3.5 w-3.5" />, color: 'green', columns: address });
    if (other.length > 0) result.push({ label: 'Tag Properties', icon: <Tag className="h-3.5 w-3.5" />, color: 'gray', columns: other });
    return result;
  }, [filteredColumns, MANDATORY_COLUMNS]);

  const totalVisible = filteredColumns.filter(col => columnVisibility[col]).length;

  const toggleGroup = (label: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  const toggleGroupVisibility = (group: ColumnGroup, on: boolean) => {
    const newVis = { ...columnVisibility };
    group.columns.forEach(col => {
      if (!MANDATORY_COLUMNS.includes(col)) newVis[col] = on;
    });
    setColumnVisibility(newVis);
  };

  if (!showColumnSelector) return null;

  return (
    <div className="fixed inset-0 z-50" onClick={() => { setShowColumnSelector(false); setTimeout(scrollToTable, 100); }}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div
        className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl flex flex-col animate-slide-in-right"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-gray-50">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Configure Columns</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {totalVisible} of {filteredColumns.length} columns visible
            </p>
          </div>
          <button
            onClick={() => { setShowColumnSelector(false); setTimeout(scrollToTable, 100); }}
            className="rounded-lg p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search + quick actions */}
        <div className="px-5 py-3 border-b border-gray-100 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search columns..."
              value={columnSearchTerm}
              onChange={e => setColumnSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              autoFocus
            />
            {columnSearchTerm && (
              <button
                onClick={() => setColumnSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSelectAll}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
            >
              <Eye className="h-3.5 w-3.5" />
              Show All
            </button>
            <button
              onClick={handleDeselectAll}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
            >
              <EyeOff className="h-3.5 w-3.5" />
              Hide All
            </button>
          </div>
        </div>

        {/* Column list */}
        <div className="flex-1 overflow-y-auto">
          {groups.map(group => {
            const visibleInGroup = group.columns.filter(c => columnVisibility[c]).length;
            const isCollapsed = collapsedGroups.has(group.label);
            const colorMap: Record<string, { bg: string; text: string; border: string; badge: string }> = {
              blue: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-100', badge: 'bg-blue-100 text-blue-700' },
              emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100', badge: 'bg-emerald-100 text-emerald-700' },
              green: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-100', badge: 'bg-green-100 text-green-700' },
              gray: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-100', badge: 'bg-gray-200 text-gray-700' },
            };
            const c = colorMap[group.color] || colorMap.gray;

            return (
              <div key={group.label} className="border-b border-gray-100 last:border-b-0">
                {/* Group header */}
                <button
                  onClick={() => toggleGroup(group.label)}
                  className={`w-full flex items-center gap-2 px-5 py-2.5 text-left hover:bg-gray-50 transition-colors`}
                >
                  {isCollapsed ? <ChevronRight className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                  <span className={`${c.text}`}>{group.icon}</span>
                  <span className="text-sm font-medium text-gray-800 flex-1">{group.label}</span>
                  <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded-full ${c.badge}`}>
                    {visibleInGroup}/{group.columns.length}
                  </span>
                  {group.label !== 'Required' && (
                    <div className="flex gap-1 ml-1" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => toggleGroupVisibility(group, true)}
                        className="p-1 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Show all in group"
                      >
                        <Eye className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => toggleGroupVisibility(group, false)}
                        className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                        title="Hide all in group"
                      >
                        <EyeOff className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </button>

                {/* Group columns */}
                {!isCollapsed && (
                  <div className="px-3 pb-2">
                    {group.columns.map(column => {
                      const isMandatory = MANDATORY_COLUMNS.includes(column);
                      const isVisible = columnVisibility[column];
                      return (
                        <div
                          key={column}
                          draggable={!isMandatory}
                          onDragStart={() => handleDragStart(column)}
                          onDragOver={e => handleDragOver(e, column)}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg mb-0.5 transition-colors ${
                            isMandatory
                              ? 'bg-blue-50/50'
                              : isVisible
                                ? 'hover:bg-gray-50 cursor-move'
                                : 'opacity-60 hover:bg-gray-50 cursor-move'
                          }`}
                        >
                          <button
                            disabled={isMandatory}
                            onClick={() => {
                              if (!isMandatory) {
                                setColumnVisibility({ ...columnVisibility, [column]: !isVisible });
                              }
                            }}
                            className={`relative flex-shrink-0 h-4 w-7 rounded-full transition-colors ${
                              isMandatory
                                ? 'bg-blue-400 cursor-not-allowed'
                                : isVisible
                                  ? 'bg-blue-600 cursor-pointer'
                                  : 'bg-gray-300 cursor-pointer'
                            }`}
                          >
                            <span
                              className={`absolute top-0.5 left-0.5 h-3 w-3 rounded-full bg-white shadow transition-transform ${
                                isVisible || isMandatory ? 'translate-x-3' : 'translate-x-0'
                              }`}
                            />
                          </button>
                          <span className={`text-sm flex-1 break-words ${
                            isMandatory ? 'font-medium text-blue-700' : isVisible ? 'text-gray-900' : 'text-gray-500'
                          }`}>
                            {column === 'formattedAddress' ? 'Full Address' : formatColumnName(column)}
                          </span>
                          {isMandatory && (
                            <Lock className="h-3 w-3 text-blue-400 flex-shrink-0" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {filteredColumns.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <Search className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">No columns match your search.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-200 bg-gray-50">
          <button
            onClick={() => { setShowColumnSelector(false); setTimeout(scrollToTable, 100); }}
            className="w-full py-2 px-4 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}