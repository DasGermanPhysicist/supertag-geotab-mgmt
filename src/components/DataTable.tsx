import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Download, SlidersHorizontal, GripVertical, Search, Tag, Plus, Trash2, Upload, RefreshCcw, Filter, X, Check, ExternalLink, Info, Droplets, Settings } from 'lucide-react';
import { SuperTag, ColumnVisibility } from '../types';
import { BulkOperationsModal } from './BulkOperationsModal';
import { HydrophobicBulkModal } from './HydrophobicBulkModal';
import { usePersistedState } from '../hooks/usePersistedState';
import { formatTimestampForDisplay } from '../utils/dateUtils';

const MANDATORY_COLUMNS = ['nodeName', 'geotabSerialNumber', 'macAddress'];
const SUPERTAG_REGISTRATION_TOKEN = 'D29B3BE8F2CC9A1A7051';

interface DataTableProps {
  data: SuperTag[];
  auth: { token?: string; username?: string };
  onDataChange: () => void;
  onPairGeotab: (macAddress: string, geotabSerialNumber: string) => Promise<{ success: boolean; error?: Error }>;
  onUnpairGeotab: (macAddress: string) => Promise<{ success: boolean; error?: Error }>;
  onSetHydrophobic: (nodeAddress: string, value: boolean) => Promise<{ success: boolean; error?: Error }>;
}

export function DataTable({ data, auth, onDataChange, onPairGeotab, onUnpairGeotab, onSetHydrophobic }: DataTableProps) {
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const [columnVisibility, setColumnVisibility] = usePersistedState<ColumnVisibility>('columnVisibility', {});
  const [sortConfig, setSortConfig] = usePersistedState<{ key: string; direction: 'asc' | 'desc' } | null>('sortConfig', null);
  const [filterText, setFilterText] = usePersistedState('dataTable.filterText', '');
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [columnOrder, setColumnOrder] = usePersistedState<string[]>('columnOrder', []);
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [columnSearchTerm, setColumnSearchTerm] = useState('');
  const [showSuperTagsOnly, setShowSuperTagsOnly] = usePersistedState<boolean>('showSuperTagsOnly', false);
  const [selectedRow, setSelectedRow] = useState<SuperTag | null>(null);
  const [showGeotabModal, setShowGeotabModal] = useState(false);
  const [showHydrophobicModal, setShowHydrophobicModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showHydrophobicBulkModal, setShowHydrophobicBulkModal] = useState(false);
  const [bulkMode, setBulkMode] = useState<'pair' | 'unpair'>('pair');
  const [hydrophobicBulkValue, setHydrophobicBulkValue] = useState<boolean>(true);
  const [newGeotabSerial, setNewGeotabSerial] = useState('');
  const [actionStatus, setActionStatus] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);

  // Enhanced columns
  const PREFERRED_COLUMNS = [
    'nodeName', 
    'geotabSerialNumber', 
    'macAddress', 
    'areaName', 
    'lastEventTime', 
    'batteryStatus', 
    'motionState', 
    'locationName',
    'hydrophobic',
    'nodeAddress'
  ];

  // Handle column initialization
  useEffect(() => {
    if (data.length > 0) {
      const allColumns = new Set([...MANDATORY_COLUMNS]);
      data.forEach(item => {
        Object.keys(item).forEach(key => {
          allColumns.add(key);
        });
      });
      
      // Sort columns to put preferred columns first
      const columnsArray = Array.from(allColumns);
      const orderedColumns = [
        ...PREFERRED_COLUMNS.filter(col => columnsArray.includes(col)),
        ...columnsArray.filter(col => !PREFERRED_COLUMNS.includes(col))
      ];
      
      setAvailableColumns(orderedColumns);
      
      if (columnOrder.length === 0 || !columnsArray.every(col => columnOrder.includes(col))) {
        setColumnOrder(orderedColumns);
      }
      
      const newVisibility = { ...columnVisibility };
      columnsArray.forEach(col => {
        if (newVisibility[col] === undefined) {
          // By default, only show preferred columns
          newVisibility[col] = MANDATORY_COLUMNS.includes(col) || PREFERRED_COLUMNS.includes(col);
        }
      });
      setColumnVisibility(newVisibility);
    }
  }, [data]);

  const handlePairGeotab = async () => {
    if (!selectedRow || !newGeotabSerial) return;

    try {
      const result = await onPairGeotab(selectedRow.macAddress, newGeotabSerial);
      if (result.success) {
        setShowGeotabModal(false);
        setNewGeotabSerial('');
        setSelectedRow(null);
        setActionStatus({
          message: `Successfully paired device ${selectedRow.nodeName} with Geotab ${newGeotabSerial}`,
          type: 'success'
        });
        
        // Clear success message after 3 seconds
        setTimeout(() => setActionStatus(null), 3000);
      } else {
        throw result.error;
      }
    } catch (error) {
      console.error('Error pairing Geotab:', error);
      setActionStatus({
        message: `Failed to pair: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'error'
      });
    }
  };

  const handleUnpairGeotab = async () => {
    if (!selectedRow) return;

    try {
      const result = await onUnpairGeotab(selectedRow.macAddress);
      if (result.success) {
        setActionStatus({
          message: `Successfully unpaired Geotab from device ${selectedRow.nodeName}`,
          type: 'success'
        });
        setSelectedRow(null);
        
        // Clear success message after 3 seconds
        setTimeout(() => setActionStatus(null), 3000);
      } else {
        throw result.error;
      }
    } catch (error) {
      console.error('Error unpairing Geotab:', error);
      setActionStatus({
        message: `Failed to unpair: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'error'
      });
    }
  };

  const handleSetHydrophobic = async (value: boolean) => {
    if (!selectedRow || !selectedRow.nodeAddress) return;

    try {
      const result = await onSetHydrophobic(selectedRow.nodeAddress, value);
      if (result.success) {
        setShowHydrophobicModal(false);
        setActionStatus({
          message: `Successfully set hydrophobic property to ${value ? 'true' : 'false'} for device ${selectedRow.nodeName}`,
          type: 'success'
        });
        setSelectedRow(null);
        
        // Clear success message after 3 seconds
        setTimeout(() => setActionStatus(null), 3000);

        // Refresh data to show updated property
        onDataChange();
      } else {
        throw result.error;
      }
    } catch (error) {
      console.error('Error setting hydrophobic property:', error);
      setActionStatus({
        message: `Failed to set hydrophobic property: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'error'
      });
    }
  };

  const handleSort = (key: string) => {
    setSortConfig(current => {
      if (!current || current.key !== key) {
        return { key, direction: 'asc' };
      }
      if (current.direction === 'asc') {
        return { key, direction: 'desc' };
      }
      return null;
    });
  };

  const handleDragStart = (column: string) => {
    setDraggedColumn(column);
  };

  const handleDragOver = (e: React.DragEvent, targetColumn: string) => {
    e.preventDefault();
    if (!draggedColumn || draggedColumn === targetColumn) return;

    const newOrder = [...columnOrder];
    const draggedIdx = newOrder.indexOf(draggedColumn);
    const targetIdx = newOrder.indexOf(targetColumn);

    newOrder.splice(draggedIdx, 1);
    newOrder.splice(targetIdx, 0, draggedColumn);

    setColumnOrder(newOrder);
  };

  const handleSelectAll = () => {
    setColumnVisibility(prev => {
      const newVisibility = { ...prev };
      filteredColumns.forEach(column => {
        if (!MANDATORY_COLUMNS.includes(column)) {
          newVisibility[column] = true;
        }
      });
      return newVisibility;
    });
  };

  const handleDeselectAll = () => {
    setColumnVisibility(prev => {
      const newVisibility = { ...prev };
      filteredColumns.forEach(column => {
        if (!MANDATORY_COLUMNS.includes(column)) {
          newVisibility[column] = false;
        }
      });
      return newVisibility;
    });
  };

  const handleRefreshData = async () => {
    setIsRefreshing(true);
    await onDataChange();
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000); // Ensure the animation plays for at least 1 second
  };

  const downloadCSV = () => {
    const visibleColumns = columnOrder.filter(col => columnVisibility[col]);
    const csvContent = [
      visibleColumns.join(','),
      ...sortedAndFilteredData.map(row =>
        visibleColumns.map(col => {
          const value = row[col];
          if (value === null || value === undefined) return '""';
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return String(value);
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'supertags-data.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const filteredColumns = useMemo(() => {
    return columnOrder.filter(column => 
      column.toLowerCase().includes(columnSearchTerm.toLowerCase())
    );
  }, [columnOrder, columnSearchTerm]);

  const sortedAndFilteredData = useMemo(() => {
    let processedData = [...data];

    if (showSuperTagsOnly) {
      processedData = processedData.filter(item => {
        // Check both direct property and nested property for the registration token
        // Make comparison case-insensitive
        if (item.registrationToken && 
            typeof item.registrationToken === 'string' && 
            item.registrationToken.toUpperCase() === SUPERTAG_REGISTRATION_TOKEN) {
          return true;
        }
        return false;
      });
    }

    if (filterText) {
      processedData = processedData.filter(item =>
        Object.entries(item).some(([key, value]) =>
          String(value).toLowerCase().includes(filterText.toLowerCase())
        )
      );
    }

    // Always prioritize devices with Geotab pairing
    processedData.sort((a, b) => {
      const aHasGeotab = 'geotabSerialNumber' in a && a.geotabSerialNumber !== null && a.geotabSerialNumber !== '';
      const bHasGeotab = 'geotabSerialNumber' in b && b.geotabSerialNumber !== null && b.geotabSerialNumber !== '';
      
      if (aHasGeotab !== bHasGeotab) {
        return aHasGeotab ? -1 : 1;
      }
      return 0;
    });

    if (sortConfig) {
      processedData.sort((a, b) => {
        if (sortConfig.key === 'geotabSerialNumber') {
          const aHasGeotab = 'geotabSerialNumber' in a && a.geotabSerialNumber !== null && a.geotabSerialNumber !== '';
          const bHasGeotab = 'geotabSerialNumber' in b && b.geotabSerialNumber !== null && b.geotabSerialNumber !== '';
          
          if (aHasGeotab === bHasGeotab) {
            if (!aHasGeotab) return 0;
            return sortConfig.direction === 'asc'
              ? String(a.geotabSerialNumber).localeCompare(String(b.geotabSerialNumber))
              : String(b.geotabSerialNumber).localeCompare(String(a.geotabSerialNumber));
          }
          return aHasGeotab ? -1 : 1;
        }
        
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return processedData;
  }, [data, filterText, sortConfig, showSuperTagsOnly]);

  // Format cells based on type
  const formatCellValue = (value: any, column: string) => {
    if (value === null || value === undefined) return '';
    
    // Format based on column name
    if (column === 'batteryStatus') {
      const status = String(value);
      if (status === '1') {
        return (
          <span className="flex items-center space-x-1">
            <span className="h-2.5 w-2.5 rounded-full bg-green-500"></span>
            <span>Good</span>
          </span>
        );
      } else if (status === '0') {
        return (
          <span className="flex items-center space-x-1">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500"></span>
            <span>Low</span>
          </span>
        );
      }
    }
    
    if (column === 'motionState') {
      const isMoving = String(value).toLowerCase() === 'true';
      return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
          isMoving ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
        }`}>
          {isMoving ? 'Moving' : 'Stationary'}
        </span>
      );
    }
    
    if (column === 'isLost') {
      const isLost = String(value).toLowerCase() === 'true';
      return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
          isLost ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
        }`}>
          {isLost ? 'Lost' : 'Connected'}
        </span>
      );
    }
    
    if (column === 'hydrophobic') {
      const isHydrophobic = String(value).toLowerCase() === 'true';
      return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
          isHydrophobic ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
        }`}>
          {isHydrophobic ? 'Hydrophobic' : 'Not Hydrophobic'}
        </span>
      );
    }
    
    if (column === 'areaName' && value) {
      return (
        <span className="badge badge-primary">{value}</span>
      );
    }
    
    if (column === 'zoneName' && value) {
      return (
        <span className="badge badge-secondary">{value}</span>
      );
    }
    
    if (column === 'lastEventTime' && value) {
      try {
        // Use the centralized timestamp formatting function
        const isoString = typeof value === 'string' ? value : String(value);
        return formatTimestampForDisplay(isoString);
      } catch (e) {
        return value;
      }
    }
    
    return String(value);
  };

  const scrollToTable = () => {
    if (tableRef.current) {
      tableRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="space-y-4" ref={tableRef}>
      {/* Filter Bar */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="w-full sm:w-auto flex items-center gap-2">
            <div className="relative w-full sm:w-64">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Filter data..."
                className="form-input pl-9 py-2 text-sm"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
              />
              {filterText && (
                <button 
                  onClick={() => setFilterText('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            
            <button
              onClick={() => setShowSuperTagsOnly(!showSuperTagsOnly)}
              className={`flex items-center gap-1 px-3 py-2 text-sm rounded-lg transition-colors ${
                showSuperTagsOnly 
                  ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
              title={showSuperTagsOnly ? "Showing SuperTags only" : "Show all tags"}
            >
              <Tag className="h-4 w-4" />
              <span className="hidden sm:inline">SuperTags only</span>
              {showSuperTagsOnly && <Check className="h-3 w-3 ml-1" />}
            </button>

            <button
              onClick={() => setShowColumnSelector(!showColumnSelector)}
              className="flex items-center gap-1 px-3 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200 text-gray-700"
              title="Configure columns"
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span className="hidden sm:inline">Columns</span>
            </button>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap w-full sm:w-auto justify-end gap-2">
            <button
              onClick={handleRefreshData}
              className={`btn btn-secondary flex items-center gap-1 text-sm py-2 ${isRefreshing ? 'opacity-70' : ''}`}
              disabled={isRefreshing}
            >
              <RefreshCcw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setBulkMode('pair');
                  setShowBulkModal(true);
                }}
                className="btn btn-success flex items-center gap-1 text-sm py-2"
              >
                <Upload className="h-4 w-4" />
                <span className="hidden sm:inline">Bulk Pair</span>
              </button>
              <button
                onClick={() => {
                  setBulkMode('unpair');
                  setShowBulkModal(true);
                }}
                className="btn btn-danger flex items-center gap-1 text-sm py-2"
              >
                <Upload className="h-4 w-4" />
                <span className="hidden sm:inline">Bulk Unpair</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setHydrophobicBulkValue(true);
                  setShowHydrophobicBulkModal(true);
                }}
                className="btn btn-primary flex items-center gap-1 text-sm py-2"
              >
                <Droplets className="h-4 w-4" />
                <span className="hidden sm:inline">Bulk Hydrophobic</span>
              </button>
            </div>

            {selectedRow && (
              <>
                {!selectedRow.geotabSerialNumber ? (
                  <button
                    onClick={() => setShowGeotabModal(true)}
                    className="btn btn-success flex items-center gap-1 text-sm py-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Pair Geotab</span>
                  </button>
                ) : (
                  <button
                    onClick={handleUnpairGeotab}
                    className="btn btn-danger flex items-center gap-1 text-sm py-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Unpair Geotab</span>
                  </button>
                )}

                {selectedRow.nodeAddress && (
                  <button
                    onClick={() => setShowHydrophobicModal(true)}
                    className="btn btn-primary flex items-center gap-1 text-sm py-2"
                  >
                    <Settings className="h-4 w-4" />
                    <span>Hydrophobic</span>
                  </button>
                )}
              </>
            )}

            <button
              onClick={downloadCSV}
              className="btn btn-primary flex items-center gap-1 text-sm py-2"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
          </div>
        </div>
        
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
      </div>

      {showGeotabModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96 max-w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Pair Geotab Serial Number</h3>
            <p className="text-sm text-gray-600 mb-4">
              Enter the Geotab serial number to pair with 
              <span className="font-medium text-gray-900 ml-1">{selectedRow?.nodeName}</span>
            </p>
            <input
              type="text"
              value={newGeotabSerial}
              onChange={(e) => setNewGeotabSerial(e.target.value)}
              placeholder="Enter Geotab serial number"
              className="form-input mb-4"
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowGeotabModal(false);
                  setNewGeotabSerial('');
                }}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handlePairGeotab}
                disabled={!newGeotabSerial}
                className={`btn btn-primary ${!newGeotabSerial ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Pair
              </button>
            </div>
          </div>
        </div>
      )}

      {showHydrophobicModal && selectedRow && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96 max-w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Set Hydrophobic Property</h3>
            <p className="text-sm text-gray-600 mb-4">
              Set the hydrophobic property for 
              <span className="font-medium text-gray-900 ml-1">{selectedRow?.nodeName}</span>
            </p>
            <div className="flex flex-col space-y-3 mb-6">
              <p className="text-sm text-gray-500">Current value: {selectedRow.hydrophobic === 'true' ? 'Hydrophobic' : 'Not Hydrophobic'}</p>
              <div className="flex items-center space-x-4">
                <button 
                  onClick={() => handleSetHydrophobic(true)}
                  className={`btn ${selectedRow.hydrophobic === 'true' ? 'btn-secondary' : 'btn-primary'} flex-1`}
                >
                  <Droplets className="h-4 w-4 mr-2" />
                  Hydrophobic
                </button>
                <button 
                  onClick={() => handleSetHydrophobic(false)}
                  className={`btn ${selectedRow.hydrophobic === 'false' ? 'btn-secondary' : 'btn-primary'} flex-1`}
                >
                  <X className="h-4 w-4 mr-2" />
                  Not Hydrophobic
                </button>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setShowHydrophobicModal(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <BulkOperationsModal
        isOpen={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        onComplete={onDataChange}
        auth={auth}
        mode={bulkMode}
      />

      <HydrophobicBulkModal
        isOpen={showHydrophobicBulkModal}
        onClose={() => setShowHydrophobicBulkModal(false)}
        onComplete={onDataChange}
        auth={auth}
        value={hydrophobicBulkValue}
        onValueChange={setHydrophobicBulkValue}
      />

      {showColumnSelector && (
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
                      onChange={() => setColumnVisibility(prev => ({
                        ...prev,
                        [column]: !prev[column]
                      }))}
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
      )}

      {/* Mobile data cards view for small screens */}
      <div className="lg:hidden space-y-4">
        {sortedAndFilteredData.length > 0 ? (
          sortedAndFilteredData.map((row, index) => (
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
                    {row.nodeAddress && (
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
                    
                    {!row.geotabSerialNumber ? (
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
                    ) : (
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
                    )}
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

      {/* Desktop table view */}
      <div className="hidden lg:block responsive-table">
        <div className="responsive-table-inner">
          <div className="responsive-table-container">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  {columnOrder.map(column => columnVisibility[column] && (
                    <th
                      key={column}
                      scope="col"
                      onClick={() => handleSort(column)}
                      className={`px-3 py-3.5 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 ${
                        MANDATORY_COLUMNS.includes(column) ? 'bg-blue-50' : ''
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
                {sortedAndFilteredData.length > 0 ? (
                  sortedAndFilteredData.map((row, index) => (
                    <tr 
                      key={index} 
                      className={`hover:bg-gray-50 transition-colors ${
                        selectedRow?.macAddress === row.macAddress ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => setSelectedRow(row === selectedRow ? null : row)}
                    >
                      {columnOrder.map(column => columnVisibility[column] && (
                        <td key={column} className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {formatCellValue(row[column], column)}
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td 
                      colSpan={columnOrder.filter(col => columnVisibility[col]).length}
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
      
      {/* Pagination or results counter */}
      <div className="bg-white px-4 py-3 flex items-center justify-between border rounded-lg sm:px-6">
        <div className="flex-1 flex justify-between sm:hidden">
          <button
            onClick={downloadCSV}
            className="btn btn-primary flex items-center"
          >
            <Download className="h-4 w-4 mr-1" />
            Export
          </button>
        </div>
        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              Showing <span className="font-medium">{sortedAndFilteredData.length}</span> of{' '}
              <span className="font-medium">{data.length}</span> records
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}