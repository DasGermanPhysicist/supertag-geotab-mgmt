import React, { useState } from 'react';
import { Check, Plus, Trash2, Droplets, Search, X, Filter, MapPin } from 'lucide-react';
import { SuperTag, ColumnVisibility } from '../../types';

interface TableRowsProps {
  isMobile: boolean;
  data: SuperTag[];
  selectedRow: SuperTag | null;
  setSelectedRow: (row: SuperTag | null) => void;
  formatCellValue: (value: any, column: string) => React.ReactNode;
  setShowGeotabModal?: (show: boolean) => void;
  handleUnpairGeotab?: () => Promise<void>;
  setShowHydrophobicModal?: (show: boolean) => void;
  columnOrder?: string[];
  columnVisibility?: ColumnVisibility;
  handleSort?: (key: string) => void;
  sortConfig?: { key: string; direction: 'asc' | 'desc' } | null;
  // New props for column filtering
  columnFilters?: Record<string, string>;
  updateColumnFilter?: (column: string, value: string) => void;
  clearColumnFilters?: () => void;
  hasActiveColumnFilters?: boolean;
}

export function TableRows({
  isMobile,
  data,
  selectedRow,
  setSelectedRow,
  formatCellValue,
  setShowGeotabModal,
  handleUnpairGeotab,
  setShowHydrophobicModal,
  columnOrder,
  columnVisibility,
  handleSort,
  sortConfig,
  // Initialize new props
  columnFilters = {},
  updateColumnFilter = () => {},
  clearColumnFilters = () => {},
  hasActiveColumnFilters = false
}: TableRowsProps) {
  // State to manage which column filter is expanded
  const [expandedFilterColumn, setExpandedFilterColumn] = useState<string | null>(null);

  // Toggle filter expansion for a column
  const toggleColumnFilter = (column: string) => {
    setExpandedFilterColumn(prev => prev === column ? null : column);
  };

  if (isMobile) {
    return (
      <div className="lg:hidden space-y-4">
        {data.length > 0 ? (
          data.map((row, index) => (
            <div 
              key={index}
              className={`card p-4 border-l-4 cursor-pointer transition-all ${
                selectedRow?.macAddress === row.macAddress 
                  ? 'border-l-blue-600 bg-blue-50' 
                  : row.geotabSerialNumber 
                    ? 'border-l-green-500' 
                    : 'border-l-gray-300'
              }`}
              onClick={() => setSelectedRow(row === selectedRow ? null : row)}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-medium text-gray-900">
                  {row.nodeName || 'Unnamed Device'}
                </h3>
                {row.geotabSerialNumber && (
                  <span className="badge badge-success flex items-center space-x-1">
                    <Check className="h-3 w-3" />
                    <span>Paired</span>
                  </span>
                )}
                {row.hydrophobic === 'true' && (
                  <span className="badge badge-primary flex items-center space-x-1 ml-2">
                    <Droplets className="h-3 w-3" />
                    <span>Hydrophobic</span>
                  </span>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                {/* Always show these key fields */}
                {row.macAddress && (
                  <div>
                    <p className="text-xs text-gray-500">MAC Address</p>
                    <p className="font-mono text-gray-900">{row.macAddress}</p>
                  </div>
                )}
                
                {row.geotabSerialNumber && (
                  <div>
                    <p className="text-xs text-gray-500">Geotab Serial</p>
                    <p className="font-medium text-gray-900">{row.geotabSerialNumber}</p>
                  </div>
                )}
                
                {row.nodeAddress && (
                  <div>
                    <p className="text-xs text-gray-500">Node Address</p>
                    <p className="font-mono text-xs text-gray-700">{row.nodeAddress}</p>
                  </div>
                )}
                
                {row.areaName && (
                  <div>
                    <p className="text-xs text-gray-500">Area</p>
                    <div>{formatCellValue(row.areaName, 'areaName')}</div>
                  </div>
                )}
                
                {row.formattedAddress && (
                  <div className="col-span-2">
                    <p className="text-xs text-gray-500">Address</p>
                    <div className="flex items-start">
                      <MapPin className="h-4 w-4 mr-1 text-gray-400 flex-shrink-0 mt-0.5" />
                      <p className="text-gray-900 text-sm">{row.formattedAddress}</p>
                    </div>
                  </div>
                )}
                
                {row.lastEventTime && (
                  <div>
                    <p className="text-xs text-gray-500">Last Event</p>
                    <p className="text-gray-900">{formatCellValue(row.lastEventTime, 'lastEventTime')}</p>
                  </div>
                )}
                
                {row.batteryStatus !== undefined && (
                  <div>
                    <p className="text-xs text-gray-500">Battery</p>
                    <div>{formatCellValue(row.batteryStatus, 'batteryStatus')}</div>
                  </div>
                )}
                
                {row.isLost !== undefined && (
                  <div>
                    <p className="text-xs text-gray-500">Status</p>
                    <div>{formatCellValue(row.isLost, 'isLost')}</div>
                  </div>
                )}
              </div>
              
              {row === selectedRow && (
                <div className="mt-4 pt-3 border-t border-gray-200 flex justify-between flex-wrap gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedRow(null);
                    }}
                    className="text-sm text-gray-600 hover:text-gray-900"
                  >
                    Deselect
                  </button>
                  
                  <div className="flex gap-2">
                    {row.nodeAddress && setShowHydrophobicModal && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowHydrophobicModal(true);
                        }}
                        className="text-sm text-blue-600 font-medium hover:text-blue-800 flex items-center"
                      >
                        <Droplets className="h-4 w-4 mr-1" />
                        Hydrophobic
                      </button>
                    )}
                    
                    {!row.geotabSerialNumber && setShowGeotabModal ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowGeotabModal(true);
                        }}
                        className="text-sm text-green-600 font-medium hover:text-green-800 flex items-center"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Pair Geotab
                      </button>
                    ) : row.geotabSerialNumber && handleUnpairGeotab ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUnpairGeotab();
                        }}
                        className="text-sm text-red-600 font-medium hover:text-red-800 flex items-center"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Unpair Geotab
                      </button>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-8 bg-white rounded-lg border border-gray-200">
            <p className="text-gray-500">No matching records found.</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="hidden lg:block responsive-table">
      {/* Column filters info banner */}
      {hasActiveColumnFilters && (
        <div className="mb-2 px-4 py-2 bg-blue-50 border border-blue-100 rounded-lg text-blue-700 flex items-center justify-between">
          <div className="flex items-center">
            <Filter className="h-4 w-4 mr-2" />
            <span className="text-sm">
              {Object.keys(columnFilters).length} column {Object.keys(columnFilters).length === 1 ? 'filter' : 'filters'} active
            </span>
          </div>
          <button 
            onClick={clearColumnFilters}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            Clear all filters
          </button>
        </div>
      )}

      <div className="responsive-table-inner">
        <div className="responsive-table-container">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-50">
              <tr>
                {columnOrder?.map(column => columnVisibility?.[column] && (
                  <th
                    key={column}
                    scope="col"
                    className={`px-3 py-2 text-left text-sm font-semibold text-gray-900 ${
                      column === 'nodeName' || column === 'geotabSerialNumber' || column === 'macAddress' ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div 
                        onClick={() => handleSort && handleSort(column)}
                        className="flex items-center cursor-pointer hover:text-blue-700"
                      >
                        <span>{column}</span>
                        {sortConfig?.key === column && (
                          <span className="ml-1">
                            {sortConfig.direction === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                      
                      <button 
                        onClick={() => toggleColumnFilter(column)}
                        className={`flex items-center justify-center p-1.5 border rounded ml-1 ${
                          columnFilters[column] 
                            ? 'text-blue-600 bg-blue-50 border-blue-300 hover:bg-blue-100' 
                            : 'text-gray-600 border-gray-300 hover:bg-gray-100'
                        }`}
                        title={columnFilters[column] ? `Filter: ${columnFilters[column]}` : "Filter this column"}
                      >
                        <Filter className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Column filter input - shows when expanded */}
                    {expandedFilterColumn === column && (
                      <div className="pt-1 pb-2 relative">
                        <div className="relative">
                          <input
                            type="text"
                            value={columnFilters[column] || ''}
                            onChange={(e) => updateColumnFilter(column, e.target.value)}
                            placeholder={`Filter ${column}...`}
                            className="w-full text-xs py-1.5 pl-7 pr-7 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                          />
                          <Search className="absolute left-2 top-1.5 h-4 w-4 text-gray-400" />
                          {columnFilters[column] && (
                            <button
                              onClick={() => {
                                updateColumnFilter(column, '');
                                setExpandedFilterColumn(null);
                              }}
                              className="absolute right-2 top-1.5 text-gray-400 hover:text-gray-600"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {data.length > 0 ? (
                data.map((row, index) => (
                  <tr 
                    key={index} 
                    className={`hover:bg-gray-50 transition-colors ${
                      selectedRow?.macAddress === row.macAddress ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => setSelectedRow(row === selectedRow ? null : row)}
                  >
                    {columnOrder?.map(column => columnVisibility?.[column] && (
                      <td key={column} className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {formatCellValue(row[column], column)}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td 
                    colSpan={columnOrder?.filter(col => columnVisibility?.[col]).length}
                    className="px-3 py-8 text-sm text-gray-500 text-center"
                  >
                    No matching records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}