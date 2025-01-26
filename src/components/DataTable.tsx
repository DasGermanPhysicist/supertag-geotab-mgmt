import React, { useState, useMemo, useEffect } from 'react';
import { Download, SlidersHorizontal, GripVertical, Search, Tag, Plus, Trash2, Upload } from 'lucide-react';
import { SuperTag, ColumnVisibility } from '../types';
import { BulkOperationsModal } from './BulkOperationsModal';
import { sendNotification } from '../services/notifications';

const API_BASE_URL = 'https://networkasset-conductor.link-labs.com';
const MANDATORY_COLUMNS = ['name', 'geotabSerialNumber', 'macAddress'];
const SUPERTAG_REGISTRATION_TOKEN = 'D29B3BE8F2CC9A1A7051';

interface DataTableProps {
  data: SuperTag[];
  auth: { token?: string; username?: string };
  onDataChange: () => void;
}

export function DataTable({ data, auth, onDataChange }: DataTableProps) {
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>({});
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [filterText, setFilterText] = useState('');
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [columnOrder, setColumnOrder] = useState<string[]>([]);
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [columnSearchTerm, setColumnSearchTerm] = useState('');
  const [showSuperTagsOnly, setShowSuperTagsOnly] = useState(false);
  const [selectedRow, setSelectedRow] = useState<SuperTag | null>(null);
  const [showGeotabModal, setShowGeotabModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkMode, setBulkMode] = useState<'pair' | 'unpair'>('pair');
  const [newGeotabSerial, setNewGeotabSerial] = useState('');

  useEffect(() => {
    const allColumns = new Set([...MANDATORY_COLUMNS]);
    data.forEach(item => {
      Object.keys(item).forEach(key => {
        allColumns.add(key);
      });
    });
    
    const columnsArray = Array.from(allColumns);
    MANDATORY_COLUMNS.forEach((col, index) => {
      const currentIndex = columnsArray.indexOf(col);
      if (currentIndex !== -1) {
        columnsArray.splice(currentIndex, 1);
        columnsArray.splice(index, 0, col);
      }
    });
    
    setAvailableColumns(columnsArray);
    setColumnOrder(columnsArray);
    
    const initialVisibility = columnsArray.reduce((acc, col) => ({
      ...acc,
      [col]: MANDATORY_COLUMNS.includes(col) || true
    }), {});
    setColumnVisibility(initialVisibility);
  }, [data]);

  const handlePairGeotab = async () => {
    if (!selectedRow || !newGeotabSerial || !auth.token) return;

    try {
      const encodedMacId = encodeURIComponent(selectedRow.macAddress);
      const url = `${API_BASE_URL}/networkAsset/airfinder/supertags/addGeoTab?macID=${encodedMacId}&geoTabSerialNumber=${newGeotabSerial}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': auth.token
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to pair Geotab: ${errorText}`);
      }

      if (auth.username) {
        await sendNotification({
          email: auth.username,
          macAddress: selectedRow.macAddress,
          geotabSerialNumber: newGeotabSerial,
          type: 'pair'
        });
      }

      onDataChange();
      setShowGeotabModal(false);
      setNewGeotabSerial('');
      setSelectedRow(null);
    } catch (error) {
      console.error('Error pairing Geotab:', error);
      throw error;
    }
  };

  const handleUnpairGeotab = async () => {
    if (!selectedRow || !auth.token) return;

    try {
      const encodedMacId = encodeURIComponent(selectedRow.macAddress);
      const url = `${API_BASE_URL}/networkAsset/airfinder/supertags/deleteGeoTab/${encodedMacId}`;

      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': auth.token
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to unpair Geotab: ${errorText}`);
      }

      if (auth.username) {
        await sendNotification({
          email: auth.username,
          macAddress: selectedRow.macAddress,
          type: 'unpair'
        });
      }

      onDataChange();
      setSelectedRow(null);
    } catch (error) {
      console.error('Error unpairing Geotab:', error);
      throw error;
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
      processedData = processedData.filter(item => 
        item.registrationToken === SUPERTAG_REGISTRATION_TOKEN
      );
    }

    if (filterText) {
      processedData = processedData.filter(item =>
        Object.entries(item).some(([key, value]) =>
          String(value).toLowerCase().includes(filterText.toLowerCase())
        )
      );
    }

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

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <input
            type="text"
            placeholder="Filter data..."
            className="px-4 py-2 border rounded-lg"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
          />
          
          <button
            onClick={() => setShowSuperTagsOnly(!showSuperTagsOnly)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              showSuperTagsOnly 
                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            <Tag className="h-4 w-4" />
            <span>SuperTags only</span>
          </button>

          <button
            onClick={() => setShowColumnSelector(!showColumnSelector)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span>Columns</span>
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setBulkMode('pair');
                setShowBulkModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Upload className="h-4 w-4" />
              <span>Bulk Pair Geotab</span>
            </button>
            <button
              onClick={() => {
                setBulkMode('unpair');
                setShowBulkModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              <Upload className="h-4 w-4" />
              <span>Bulk Unpair Geotab</span>
            </button>
          </div>

          {selectedRow && (
            <>
              {!selectedRow.geotabSerialNumber ? (
                <button
                  onClick={() => setShowGeotabModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <Plus className="h-4 w-4" />
                  <span>Pair Geotab</span>
                </button>
              ) : (
                <button
                  onClick={handleUnpairGeotab}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Unpair Geotab</span>
                </button>
              )}
            </>
          )}

          <button
            onClick={downloadCSV}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {showGeotabModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96">
            <h3 className="text-lg font-semibold mb-4">Pair Geotab Serial Number</h3>
            <input
              type="text"
              value={newGeotabSerial}
              onChange={(e) => setNewGeotabSerial(e.target.value)}
              placeholder="Enter Geotab serial number"
              className="w-full px-3 py-2 border rounded-md mb-4"
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowGeotabModal(false);
                  setNewGeotabSerial('');
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handlePairGeotab}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Pair
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

      {showColumnSelector && (
        <div className="p-4 bg-white border rounded-lg shadow-lg">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Toggle and Reorder Columns</h3>
              <div className="space-x-2">
                <button
                  onClick={handleSelectAll}
                  className="px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                >
                  Select All
                </button>
                <button
                  onClick={handleDeselectAll}
                  className="px-3 py-1 text-sm bg-gray-50 text-gray-600 rounded hover:bg-gray-100"
                >
                  Deselect All
                </button>
              </div>
            </div>
            
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search columns..."
                value={columnSearchTerm}
                onChange={(e) => setColumnSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-4 gap-2">
              {filteredColumns.map(column => (
                <div
                  key={column}
                  draggable={!MANDATORY_COLUMNS.includes(column)}
                  onDragStart={() => handleDragStart(column)}
                  onDragOver={(e) => handleDragOver(e, column)}
                  className={`flex items-center space-x-2 p-2 rounded ${
                    MANDATORY_COLUMNS.includes(column)
                      ? 'bg-blue-50'
                      : 'bg-gray-50 cursor-move'
                  }`}
                >
                  <GripVertical className="h-4 w-4 text-gray-400" />
                  <label className="flex items-center space-x-2 flex-1">
                    <input
                      type="checkbox"
                      checked={columnVisibility[column]}
                      disabled={MANDATORY_COLUMNS.includes(column)}
                      onChange={() => setColumnVisibility(prev => ({
                        ...prev,
                        [column]: !prev[column]
                      }))}
                      className="rounded"
                    />
                    <span className={MANDATORY_COLUMNS.includes(column) ? 'font-medium text-blue-600' : ''}>
                      {column}
                    </span>
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border rounded-lg">
          <thead>
            <tr>
              {columnOrder.map(column => columnVisibility[column] && (
                <th
                  key={column}
                  onClick={() => handleSort(column)}
                  className={`px-4 py-2 text-left cursor-pointer hover:bg-gray-100 ${
                    MANDATORY_COLUMNS.includes(column) ? 'bg-blue-50' : 'bg-gray-50'
                  }`}
                >
                  {column}
                  {sortConfig?.key === column && (
                    <span className="ml-1">
                      {sortConfig.direction === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedAndFilteredData.map((row, index) => (
              <tr 
                key={index} 
                className={`border-t hover:bg-gray-50 ${
                  selectedRow?.macAddress === row.macAddress ? 'bg-blue-50' : ''
                }`}
                onClick={() => setSelectedRow(row)}
              >
                {columnOrder.map(column => columnVisibility[column] && (
                  <td key={column} className="px-4 py-2">
                    {row[column] !== undefined ? String(row[column]) : ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}