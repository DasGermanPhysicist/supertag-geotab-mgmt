import React from 'react';
import { Check, Plus, Trash2, Droplets } from 'lucide-react';
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
  sortConfig
}: TableRowsProps) {
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
      <div className="responsive-table-inner">
        <div className="responsive-table-container">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-50">
              <tr>
                {columnOrder?.map(column => columnVisibility?.[column] && (
                  <th
                    key={column}
                    scope="col"
                    onClick={() => handleSort && handleSort(column)}
                    className={`px-3 py-3.5 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 ${
                      column === 'nodeName' || column === 'geotabSerialNumber' || column === 'macAddress' ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-center">
                      <span>{column}</span>
                      {sortConfig?.key === column && (
                        <span className="ml-1">
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
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