import React, { useState, useEffect, useRef } from 'react';
import { X, Search, Filter, Plus, Trash2 } from 'lucide-react';

interface ColumnFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  columns: string[];
  columnFilters: Record<string, string>;
  updateColumnFilter: (column: string, value: string) => void;
  clearColumnFilters: () => void;
}

export function ColumnFilterModal({
  isOpen,
  onClose,
  columns,
  columnFilters,
  updateColumnFilter,
  clearColumnFilters
}: ColumnFilterModalProps) {
  const [activeFilters, setActiveFilters] = useState<Array<{ column: string; value: string }>>(
    Object.entries(columnFilters).map(([column, value]) => ({ column, value }))
  );
  const [tempColumn, setTempColumn] = useState<string>('');
  const [tempValue, setTempValue] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const modalRef = useRef<HTMLDivElement>(null);

  // Update active filters when columnFilters changes
  useEffect(() => {
    setActiveFilters(Object.entries(columnFilters).map(([column, value]) => ({ column, value })));
  }, [columnFilters]);

  // Handle click outside to close modal
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const filteredColumns = columns.filter(column => 
    column.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addFilter = () => {
    if (tempColumn && tempValue) {
      updateColumnFilter(tempColumn, tempValue);
      setTempColumn('');
      setTempValue('');
    }
  };

  const removeFilter = (column: string) => {
    updateColumnFilter(column, '');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-20 z-50">
      <div 
        ref={modalRef}
        className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Filter className="h-5 w-5 mr-2 text-blue-500" />
            Column Filters
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 focus:outline-none"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {/* Active filters section */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-700">Active Filters</h4>
              {activeFilters.length > 0 && (
                <button 
                  className="text-xs text-blue-600 hover:text-blue-800"
                  onClick={clearColumnFilters}
                >
                  Clear all
                </button>
              )}
            </div>
            
            {activeFilters.length > 0 ? (
              <div className="space-y-2">
                {activeFilters.map(filter => (
                  <div 
                    key={filter.column} 
                    className="flex items-center justify-between bg-blue-50 p-2 rounded-md border border-blue-100"
                  >
                    <div>
                      <span className="text-xs font-medium text-gray-500">Column:</span>
                      <span className="ml-1 text-sm font-medium text-gray-900">{filter.column}</span>
                      <span className="mx-2 text-gray-400">•</span>
                      <span className="text-xs font-medium text-gray-500">Value:</span>
                      <span className="ml-1 text-sm text-gray-900">"{filter.value}"</span>
                    </div>
                    <button 
                      onClick={() => removeFilter(filter.column)} 
                      className="text-gray-400 hover:text-red-500"
                      title="Remove filter"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-3 bg-gray-50 rounded-md">
                <p className="text-gray-500 text-sm">No active filters</p>
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 pt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Add New Filter</h4>
            
            {/* Column selector */}
            <div className="mb-3">
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Select Column
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search columns..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="form-input pl-9 text-sm py-2 mb-1"
                />
              </div>
              
              <div className="max-h-40 overflow-y-auto border rounded-md">
                {filteredColumns.length > 0 ? (
                  filteredColumns.map(column => (
                    <button
                      key={column}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 ${
                        tempColumn === column ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                      }`}
                      onClick={() => setTempColumn(column)}
                    >
                      {column}
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-2 text-sm text-gray-500 text-center">
                    No columns found
                  </div>
                )}
              </div>
            </div>
            
            {/* Filter value input */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Filter Value
              </label>
              <input
                type="text"
                placeholder="Enter value to filter..."
                value={tempValue}
                onChange={(e) => setTempValue(e.target.value)}
                className="form-input text-sm py-2"
              />
            </div>
            
            <button
              onClick={addFilter}
              disabled={!tempColumn || !tempValue}
              className={`w-full flex items-center justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                (!tempColumn || !tempValue) ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Filter
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}