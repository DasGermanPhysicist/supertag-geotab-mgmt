import React from 'react';
import { Search, GripVertical, X } from 'lucide-react';

interface EventColumnSelectorProps {
  showColumnSelector: boolean;
  setShowColumnSelector: (visible: boolean) => void;
  columnSearchTerm: string;
  setColumnSearchTerm: (term: string) => void;
  groupedColumns: {
    core: string[];
    metadata: string[];
    value: string[];
  };
  visibleColumns: string[];
  setVisibleColumns: (columns: string[]) => void;
  handleSelectAll: () => void;
  handleDeselectAll: () => void;
  handleDragStart: (column: string) => void;
  handleDragOver: (e: React.DragEvent, targetColumn: string) => void;
}

export function EventColumnSelector({
  showColumnSelector,
  setShowColumnSelector,
  columnSearchTerm,
  setColumnSearchTerm,
  groupedColumns,
  visibleColumns,
  setVisibleColumns,
  handleSelectAll,
  handleDeselectAll,
  handleDragStart,
  handleDragOver
}: EventColumnSelectorProps) {
  if (!showColumnSelector) return null;

  // Helper function to get display name for column
  const getDisplayName = (column: string) => {
    // For metadata.props or value columns, show only the last part
    if (column.startsWith('metadata.props.')) {
      return column.replace('metadata.props.', '');
    }
    if (column.startsWith('value.')) {
      return column.replace('value.', '');
    }
    return column;
  };

  // Helper function to toggle a column or a group of related columns
  const toggleColumn = (column: string) => {
    if (visibleColumns.includes(column)) {
      setVisibleColumns(visibleColumns.filter(col => col !== column));
    } else {
      setVisibleColumns([...visibleColumns, column]);
    }
  };

  // Helper to toggle a group of location-related columns
  const toggleLocationColumns = () => {
    // Get all location-related columns
    const locationColumns = [
      ...groupedColumns.metadata.filter(col => 
        col.toLowerCase().includes('lat') || 
        col.toLowerCase().includes('lon') || 
        col.toLowerCase().includes('lng') ||
        col.toLowerCase().includes('accuracy') ||
        col.toLowerCase().includes('altitude')
      ),
      ...groupedColumns.value.filter(col => 
        col.toLowerCase().includes('lat') || 
        col.toLowerCase().includes('lon') || 
        col.toLowerCase().includes('lng') ||
        col.toLowerCase().includes('accuracy') ||
        col.toLowerCase().includes('altitude')
      )
    ];

    const allLocationSelected = locationColumns.every(col => visibleColumns.includes(col));

    if (allLocationSelected) {
      // If all are selected, deselect them
      setVisibleColumns(visibleColumns.filter(col => 
        !locationColumns.includes(col)
      ));
    } else {
      // If not all are selected, select all
      const newVisibleColumns = [...visibleColumns];
      locationColumns.forEach(col => {
        if (!newVisibleColumns.includes(col)) {
          newVisibleColumns.push(col);
        }
      });
      setVisibleColumns(newVisibleColumns);
    }
  };

  // Check if there are location columns available
  const hasLocationColumns = [...groupedColumns.metadata, ...groupedColumns.value].some(col => 
    col.toLowerCase().includes('lat') || 
    col.toLowerCase().includes('lon') || 
    col.toLowerCase().includes('lng')
  );

  return (
    <div className="bg-white border rounded-lg shadow-lg p-4 mb-4">
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
            {hasLocationColumns && (
              <button
                onClick={toggleLocationColumns}
                className="px-3 py-1 text-sm bg-green-50 text-green-600 rounded hover:bg-green-100 transition-colors duration-150"
              >
                Toggle Location Columns
              </button>
            )}
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
          {columnSearchTerm && (
            <button
              onClick={() => setColumnSearchTerm('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="mt-4 space-y-6">
          {/* Core columns section */}
          {groupedColumns.core.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-800 mb-2 border-b pb-1">Core Properties</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-32 overflow-y-auto">
                {groupedColumns.core.map((column) => (
                  <div
                    key={column}
                    draggable={column !== 'time' && column !== 'uuid'}
                    onDragStart={() => handleDragStart(column)}
                    onDragOver={(e) => handleDragOver(e, column)}
                    className={`flex items-center p-2 rounded transition-colors ${
                      column === 'time' || column === 'uuid'
                        ? 'bg-blue-50 border border-blue-100'
                        : 'bg-gray-50 border border-gray-100 cursor-move hover:bg-gray-100'
                    }`}
                  >
                    <GripVertical className="h-4 w-4 text-gray-400 mr-2" />
                    <label className="flex items-center space-x-2 flex-1 truncate">
                      <input
                        type="checkbox"
                        checked={visibleColumns.includes(column)}
                        disabled={column === 'time'}
                        onChange={() => toggleColumn(column)}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span className={`truncate ${(column === 'time' || column === 'uuid') ? 'font-medium text-blue-700' : ''}`}>
                        {getDisplayName(column)}
                      </span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Metadata columns section */}
          {groupedColumns.metadata.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-800 mb-2 border-b pb-1">Metadata Properties</h4>
              
              {/* Group location-related metadata columns */}
              {groupedColumns.metadata.some(col => 
                col.toLowerCase().includes('lat') || 
                col.toLowerCase().includes('lon') || 
                col.toLowerCase().includes('lng') ||
                col.toLowerCase().includes('accuracy')
              ) && (
                <div className="mb-2">
                  <h5 className="text-sm font-medium text-gray-700 mb-1">Location Data</h5>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {groupedColumns.metadata
                      .filter(col => 
                        col.toLowerCase().includes('lat') || 
                        col.toLowerCase().includes('lon') || 
                        col.toLowerCase().includes('lng') ||
                        col.toLowerCase().includes('accuracy') ||
                        col.toLowerCase().includes('altitude')
                      )
                      .map((column) => (
                        <div
                          key={column}
                          draggable
                          onDragStart={() => handleDragStart(column)}
                          onDragOver={(e) => handleDragOver(e, column)}
                          className="flex items-center p-2 rounded transition-colors bg-green-50 border border-green-100 cursor-move hover:bg-green-100"
                        >
                          <GripVertical className="h-4 w-4 text-gray-400 mr-2" />
                          <label className="flex items-center space-x-2 flex-1 truncate">
                            <input
                              type="checkbox"
                              checked={visibleColumns.includes(column)}
                              onChange={() => toggleColumn(column)}
                              className="rounded text-blue-600 focus:ring-blue-500"
                            />
                            <span className="truncate font-medium text-green-700">
                              {getDisplayName(column)}
                            </span>
                          </label>
                        </div>
                      ))
                    }
                  </div>
                </div>
              )}
              
              {/* Other metadata properties */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-64 overflow-y-auto">
                {groupedColumns.metadata
                  .filter(col => 
                    !col.toLowerCase().includes('lat') && 
                    !col.toLowerCase().includes('lon') && 
                    !col.toLowerCase().includes('lng') &&
                    !col.toLowerCase().includes('accuracy') &&
                    !col.toLowerCase().includes('altitude') &&
                    col !== 'metadata.props.msgType'
                  )
                  .map((column) => (
                    <div
                      key={column}
                      draggable
                      onDragStart={() => handleDragStart(column)}
                      onDragOver={(e) => handleDragOver(e, column)}
                      className={`flex items-center p-2 rounded transition-colors ${
                        column === 'metadata.props.msgType'
                          ? 'bg-blue-50 border border-blue-100'
                          : 'bg-gray-50 border border-gray-100 cursor-move hover:bg-gray-100'
                      }`}
                    >
                      <GripVertical className="h-4 w-4 text-gray-400 mr-2" />
                      <label className="flex items-center space-x-2 flex-1 truncate">
                        <input
                          type="checkbox"
                          checked={visibleColumns.includes(column)}
                          disabled={column === 'metadata.props.msgType'}
                          onChange={() => toggleColumn(column)}
                          className="rounded text-blue-600 focus:ring-blue-500"
                        />
                        <span className={`truncate ${column === 'metadata.props.msgType' ? 'font-medium text-blue-700' : ''}`}>
                          {getDisplayName(column)}
                        </span>
                      </label>
                    </div>
                  ))
                }
              </div>
            </div>
          )}

          {/* Value columns section */}
          {groupedColumns.value.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-800 mb-2 border-b pb-1">Value Properties</h4>
              
              {/* Group location-related value columns */}
              {groupedColumns.value.some(col => 
                col.toLowerCase().includes('lat') || 
                col.toLowerCase().includes('lon') || 
                col.toLowerCase().includes('lng') ||
                col.toLowerCase().includes('accuracy')
              ) && (
                <div className="mb-2">
                  <h5 className="text-sm font-medium text-gray-700 mb-1">Location Data</h5>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {groupedColumns.value
                      .filter(col => 
                        col.toLowerCase().includes('lat') || 
                        col.toLowerCase().includes('lon') || 
                        col.toLowerCase().includes('lng') ||
                        col.toLowerCase().includes('accuracy') ||
                        col.toLowerCase().includes('altitude')
                      )
                      .map((column) => (
                        <div
                          key={column}
                          draggable
                          onDragStart={() => handleDragStart(column)}
                          onDragOver={(e) => handleDragOver(e, column)}
                          className="flex items-center p-2 rounded transition-colors bg-green-50 border border-green-100 cursor-move hover:bg-green-100"
                        >
                          <GripVertical className="h-4 w-4 text-gray-400 mr-2" />
                          <label className="flex items-center space-x-2 flex-1 truncate">
                            <input
                              type="checkbox"
                              checked={visibleColumns.includes(column)}
                              onChange={() => toggleColumn(column)}
                              className="rounded text-blue-600 focus:ring-blue-500"
                            />
                            <span className="truncate font-medium text-green-700">
                              {getDisplayName(column)}
                            </span>
                          </label>
                        </div>
                      ))
                    }
                  </div>
                </div>
              )}
              
              {/* Other value properties */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-64 overflow-y-auto">
                {groupedColumns.value
                  .filter(col => 
                    !col.toLowerCase().includes('lat') && 
                    !col.toLowerCase().includes('lon') && 
                    !col.toLowerCase().includes('lng') &&
                    !col.toLowerCase().includes('accuracy') &&
                    !col.toLowerCase().includes('altitude')
                  )
                  .map((column) => (
                    <div
                      key={column}
                      draggable
                      onDragStart={() => handleDragStart(column)}
                      onDragOver={(e) => handleDragOver(e, column)}
                      className="flex items-center p-2 rounded transition-colors bg-gray-50 border border-gray-100 cursor-move hover:bg-gray-100"
                    >
                      <GripVertical className="h-4 w-4 text-gray-400 mr-2" />
                      <label className="flex items-center space-x-2 flex-1 truncate">
                        <input
                          type="checkbox"
                          checked={visibleColumns.includes(column)}
                          onChange={() => toggleColumn(column)}
                          className="rounded text-blue-600 focus:ring-blue-500"
                        />
                        <span className="truncate">
                          {getDisplayName(column)}
                        </span>
                      </label>
                    </div>
                  ))
                }
              </div>
            </div>
          )}
        </div>
        
        <div className="pt-2 border-t border-gray-200 mt-4">
          <button
            onClick={() => setShowColumnSelector(false)}
            className="w-full btn btn-primary"
          >
            Apply Changes
          </button>
        </div>
      </div>
    </div>
  );
}