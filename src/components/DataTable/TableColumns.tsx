import React from 'react';
import { Search, GripVertical, X, MapPin } from 'lucide-react';
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

// Helper function to format column names for display
const formatColumnName = (column: string): string => {
  // Remove any prefix paths (like metadata.props. or value.)
  let displayName = column;
  
  if (column.startsWith('metadata.props.')) {
    displayName = column.replace('metadata.props.', '');
  } else if (column.startsWith('value.')) {
    displayName = column.replace('value.', '');
  } else if (column.startsWith('address_')) {
    displayName = column.replace('address_', '');
  }
  
  // Convert camelCase to spaced words with capital first letters
  displayName = displayName
    .replace(/([A-Z])/g, ' $1') // Add space before capital letters
    .replace(/^./, str => str.toUpperCase()); // Capitalize first letter
  
  // Handle special cases and common abbreviations
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
  
  // Clean up any double spaces
  displayName = displayName.replace(/\s+/g, ' ').trim();
  
  return displayName;
};

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

  // Group columns by category for better organization
  const groupedColumns = {
    address: filteredColumns.filter(col => col.startsWith('address_') || col === 'formattedAddress'),
    location: filteredColumns.filter(col => ['latitude', 'longitude'].includes(col)),
    other: filteredColumns.filter(col => 
      !col.startsWith('address_') && 
      col !== 'formattedAddress' && 
      !['latitude', 'longitude'].includes(col)
    )
  };

  // Helper function to toggle all address-related columns
  const toggleAddressColumns = () => {
    const addressColumns = [...groupedColumns.address, ...groupedColumns.location];
    const allSelected = addressColumns.every(col => columnVisibility[col]);
    
    const newVisibility = { ...columnVisibility };
    addressColumns.forEach(col => {
      newVisibility[col] = !allSelected;
    });
    
    setColumnVisibility(newVisibility);
  };

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
            {(groupedColumns.address.length > 0 || groupedColumns.location.length > 0) && (
              <button
                onClick={toggleAddressColumns}
                className="px-3 py-1 text-sm bg-green-50 text-green-600 rounded hover:bg-green-100 transition-colors duration-150"
              >
                Toggle Address
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
          {/* Address columns section */}
          {groupedColumns.address.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-800 mb-2 border-b pb-1 flex items-center">
                <MapPin className="h-4 w-4 mr-2 text-green-600" />
                Address Information
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-64 overflow-y-auto">
                {groupedColumns.address.map(column => (
                  <div
                    key={column}
                    draggable={!MANDATORY_COLUMNS.includes(column)}
                    onDragStart={() => handleDragStart(column)}
                    onDragOver={(e) => handleDragOver(e, column)}
                    className={`flex items-center p-2 rounded transition-colors ${
                      MANDATORY_COLUMNS.includes(column)
                        ? 'bg-blue-50 border border-blue-100'
                        : 'bg-green-50 border border-green-100 cursor-move hover:bg-green-100'
                    }`}
                  >
                    <GripVertical className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
                    <label className="flex items-center space-x-2 w-full min-w-0">
                      <input
                        type="checkbox"
                        checked={columnVisibility[column]}
                        disabled={MANDATORY_COLUMNS.includes(column)}
                        onChange={() => setColumnVisibility({
                          ...columnVisibility,
                          [column]: !columnVisibility[column]
                        })}
                        className="rounded text-blue-600 focus:ring-blue-500 flex-shrink-0"
                      />
                      <span className={`break-words ${MANDATORY_COLUMNS.includes(column) ? 'font-medium text-blue-700' : 'text-green-800'}`}>
                        {column === 'formattedAddress' ? 'Full Address' : formatColumnName(column)}
                      </span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Location columns section */}
          {groupedColumns.location.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-800 mb-2 border-b pb-1">Geographic Coordinates</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-64 overflow-y-auto">
                {groupedColumns.location.map(column => (
                  <div
                    key={column}
                    draggable={!MANDATORY_COLUMNS.includes(column)}
                    onDragStart={() => handleDragStart(column)}
                    onDragOver={(e) => handleDragOver(e, column)}
                    className={`flex items-center p-2 rounded transition-colors ${
                      MANDATORY_COLUMNS.includes(column)
                        ? 'bg-blue-50 border border-blue-100'
                        : 'bg-green-50 border border-green-100 cursor-move hover:bg-green-100'
                    }`}
                  >
                    <GripVertical className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
                    <label className="flex items-center space-x-2 w-full min-w-0">
                      <input
                        type="checkbox"
                        checked={columnVisibility[column]}
                        disabled={MANDATORY_COLUMNS.includes(column)}
                        onChange={() => setColumnVisibility({
                          ...columnVisibility,
                          [column]: !columnVisibility[column]
                        })}
                        className="rounded text-blue-600 focus:ring-blue-500 flex-shrink-0"
                      />
                      <span className={`break-words ${MANDATORY_COLUMNS.includes(column) ? 'font-medium text-blue-700' : 'text-green-800'}`}>
                        {formatColumnName(column)}
                      </span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Other columns section */}
          {groupedColumns.other.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-800 mb-2 border-b pb-1">Tag Properties</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-64 overflow-y-auto">
                {groupedColumns.other.map(column => (
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
                    <GripVertical className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
                    <label className="flex items-center space-x-2 w-full min-w-0">
                      <input
                        type="checkbox"
                        checked={columnVisibility[column]}
                        disabled={MANDATORY_COLUMNS.includes(column)}
                        onChange={() => setColumnVisibility({
                          ...columnVisibility,
                          [column]: !columnVisibility[column]
                        })}
                        className="rounded text-blue-600 focus:ring-blue-500 flex-shrink-0"
                      />
                      <span className={`break-words ${MANDATORY_COLUMNS.includes(column) ? 'font-medium text-blue-700' : ''}`}>
                        {formatColumnName(column)}
                      </span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}
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