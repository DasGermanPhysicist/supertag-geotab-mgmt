import React from 'react';
import { Search, GripVertical } from 'lucide-react';
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
  if (!showColumnSelector) {
    return null;
  }

  return (
    <div className="bg-white border rounded-lg shadow-lg p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Configure Table Columns</h3>
          <div className="space-x-2">
            <button
              onClick={handleSelectAll}
              className="px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors duration-150"
            >
              Select All
            </button>
            <button
              onClick={handleDeselectAll}
              className="px-3 py-1 text-sm bg-gray-50 text-gray-600 rounded hover:bg-gray-100 transition-colors duration-150"
            >
              Deselect All
            </button>
          </div>
        </div>
        
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search columns..."
            value={columnSearchTerm}
            onChange={(e) => setColumnSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 mt-4 max-h-64 overflow-y-auto">
          {filteredColumns.map(column => (
            <div
              key={column}
              draggable={!MANDATORY_COLUMNS.includes(column)}
              onDragStart={() => handleDragStart(column)}
              onDragOver={(e) => handleDragOver(e, column)}
              className={`flex items-center p-2 rounded transition-colors ${
                MANDATORY_COLUMNS.includes(column)
                  ? 'bg-blue-50 border border-blue-100'
                  : 'bg-gray-50 border border-gray-100 cursor-move hover:bg-gray-100'
              }`}
            >
              <GripVertical className="h-4 w-4 text-gray-400 mr-2" />
              <label className="flex items-center space-x-2 flex-1 truncate">
                <input
                  type="checkbox"
                  checked={columnVisibility[column]}
                  disabled={MANDATORY_COLUMNS.includes(column)}
                  onChange={() => setColumnVisibility({
                    ...columnVisibility,
                    [column]: !columnVisibility[column]
                  })}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span className={`truncate ${MANDATORY_COLUMNS.includes(column) ? 'font-medium text-blue-700' : ''}`}>
                  {column}
                </span>
              </label>
            </div>
          ))}
        </div>
        
        <div className="pt-2 border-t border-gray-200 mt-4">
          <button
            onClick={() => {
              setShowColumnSelector(false);
              // Slight delay to allow table to update before scrolling
              setTimeout(scrollToTable, 100);
            }}
            className="w-full btn btn-primary"
          >
            Apply Changes
          </button>
        </div>
      </div>
    </div>
  );
}