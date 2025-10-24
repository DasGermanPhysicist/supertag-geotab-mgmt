import { useState, useMemo, useEffect } from 'react';
import { SuperTag, ColumnVisibility } from '../../../types';
import { usePersistedState } from '../../../hooks/usePersistedState';
import { formatTimestampForDisplay } from '../../../utils/dateUtils';

// Define preferred columns for the table
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
  'nodeAddress',
  'formattedAddress'
];

// Add address columns to preferred columns
const ADDRESS_COLUMNS = [
  'address_road',
  'address_city',
  'address_county',
  'address_state',
  'address_postcode',
  'address_country',
  'latitude',
  'longitude'
];

// Combine all preferred columns
const ALL_PREFERRED_COLUMNS = [...PREFERRED_COLUMNS, ...ADDRESS_COLUMNS];

const MANDATORY_COLUMNS = ['nodeName', 'geotabSerialNumber', 'macAddress'];

export function useTableState({ 
  data, 
  onDataChange, 
  onPairGeotab, 
  onUnpairGeotab, 
  onSetHydrophobic,
  onGetCellIdProcessing,
  onSetCellIdProcessing,
  SUPERTAG_REGISTRATION_TOKEN
}) {
  // Column state
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const [columnVisibility, setColumnVisibility] = usePersistedState<ColumnVisibility>('columnVisibility', {});
  const [columnOrder, setColumnOrder] = usePersistedState<string[]>('columnOrder', []);
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [columnSearchTerm, setColumnSearchTerm] = useState('');

  // Filters and sorting
  const [sortConfig, setSortConfig] = usePersistedState<{ key: string; direction: 'asc' | 'desc' } | null>('sortConfig', null);
  const [filterText, setFilterText] = useState('');
  const [showSuperTagsOnly, setShowSuperTagsOnly] = usePersistedState<boolean>('showSuperTagsOnly', false);
  
  // Column-specific filters
  const [columnFilters, setColumnFilters] = usePersistedState<Record<string, string>>('columnFilters', {});

  // UI state
  const [selectedRow, setSelectedRow] = useState<SuperTag | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionStatus, setActionStatus] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  // Modal states
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [showGeotabModal, setShowGeotabModal] = useState(false);
  const [showHydrophobicModal, setShowHydrophobicModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showHydrophobicBulkModal, setShowHydrophobicBulkModal] = useState(false);

  // Form values
  const [bulkMode, setBulkMode] = useState<'pair' | 'unpair'>('pair');
  const [hydrophobicBulkValue, setHydrophobicBulkValue] = useState<boolean>(true);
  const [newGeotabSerial, setNewGeotabSerial] = useState('');

  // Handle column initialization
  useEffect(() => {
    if (data.length > 0) {
      // Collect all column keys from the data, including address fields
      const allColumns = new Set([...MANDATORY_COLUMNS]);
      data.forEach(item => {
        Object.keys(item).forEach(key => {
          allColumns.add(key);
        });
      });
      
      // Sort columns to put preferred columns first
      const columnsArray = Array.from(allColumns);
      const orderedColumns = [
        ...ALL_PREFERRED_COLUMNS.filter(col => columnsArray.includes(col)),
        ...columnsArray.filter(col => !ALL_PREFERRED_COLUMNS.includes(col))
      ];
      
      setAvailableColumns(orderedColumns);
      
      if (columnOrder.length === 0 || !columnsArray.every(col => columnOrder.includes(col))) {
        setColumnOrder(orderedColumns);
      }
      
      const newVisibility = { ...columnVisibility };
      columnsArray.forEach(col => {
        if (newVisibility[col] === undefined) {
          // By default, show mandatory columns, preferred columns, and address columns
          newVisibility[col] = MANDATORY_COLUMNS.includes(col) || 
                              PREFERRED_COLUMNS.includes(col) || 
                              ADDRESS_COLUMNS.includes(col) ||
                              col === 'formattedAddress';
        }
      });
      setColumnVisibility(newVisibility);
    }
  }, [data]);

  // Filtered columns based on search
  const filteredColumns = useMemo(() => {
    return columnOrder.filter(column => 
      column.toLowerCase().includes(columnSearchTerm.toLowerCase())
    );
  }, [columnOrder, columnSearchTerm]);

  // Handle column filter update
  const updateColumnFilter = (column: string, value: string) => {
    setColumnFilters(prev => {
      if (value === '') {
        // Remove the filter if value is empty
        const newFilters = { ...prev };
        delete newFilters[column];
        return newFilters;
      }
      return { ...prev, [column]: value };
    });
  };

  // Clear all column filters
  const clearColumnFilters = () => {
    setColumnFilters({});
  };

  // Check if any column filters are active
  const hasActiveColumnFilters = useMemo(() => {
    return Object.keys(columnFilters).length > 0;
  }, [columnFilters]);

  // Filtered and sorted data
  const sortedAndFilteredData = useMemo(() => {
    let processedData = [...data];

    // Apply SuperTag filter if enabled
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

    // Apply global filter if set
    if (filterText) {
      processedData = processedData.filter(item =>
        Object.entries(item).some(([key, value]) =>
          String(value).toLowerCase().includes(filterText.toLowerCase())
        )
      );
    }

    // Apply column-specific filters
    if (hasActiveColumnFilters) {
      processedData = processedData.filter(item => {
        // Item passes if it meets all column filter criteria
        return Object.entries(columnFilters).every(([column, filterValue]) => {
          const value = item[column];
          if (value === undefined || value === null) return false;
          return String(value).toLowerCase().includes(filterValue.toLowerCase());
        });
      });
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
  }, [data, filterText, sortConfig, showSuperTagsOnly, SUPERTAG_REGISTRATION_TOKEN, columnFilters]);

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
    
    if (column === 'formattedAddress' && value) {
      return (
        <div className="max-w-xs truncate" title={value}>
          {value}
        </div>
      );
    }
    
    // Handle address-specific columns
    if (column.startsWith('address_') && value) {
      return (
        <span className="font-medium">{value}</span>
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

  // Handle pairing Geotab
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

  // Handle unpairing Geotab
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

  // Handle setting hydrophobic property
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

  // Handle sorting
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

  // Handle column dragging
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

  // Column visibility functions
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

  // Refresh data function
  const handleRefreshData = async () => {
    setIsRefreshing(true);
    await onDataChange();
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000); // Ensure the animation plays for at least 1 second
  };

  // CSV export function
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

  return {
    state: {
      availableColumns,
      columnVisibility,
      columnOrder,
      sortConfig,
      filterText,
      showSuperTagsOnly,
      selectedRow,
      isRefreshing,
      actionStatus,
      bulkMode,
      hydrophobicBulkValue,
      newGeotabSerial,
      filteredColumns,
      sortedAndFilteredData,
      MANDATORY_COLUMNS,
      PREFERRED_COLUMNS,
      ADDRESS_COLUMNS,
      columnSearchTerm,
      // Column filters state
      columnFilters,
      hasActiveColumnFilters
    },
    actions: {
      setColumnVisibility,
      setColumnOrder,
      setSortConfig,
      setFilterText,
      setShowSuperTagsOnly,
      setSelectedRow,
      setShowColumnSelector,
      setShowGeotabModal,
      setShowHydrophobicModal,
      setShowBulkModal,
      setShowHydrophobicBulkModal,
      setBulkMode,
      setHydrophobicBulkValue,
      setNewGeotabSerial,
      setActionStatus,
      setColumnSearchTerm,
      handlePairGeotab,
      handleUnpairGeotab,
      handleSetHydrophobic,
      handleSort,
      handleDragStart,
      handleDragOver,
      handleSelectAll,
      handleDeselectAll,
      handleRefreshData,
      downloadCSV,
      formatCellValue,
      // Column filters actions
      updateColumnFilter,
      clearColumnFilters
    },
    modals: {
      showColumnSelector,
      showGeotabModal,
      showHydrophobicModal,
      showBulkModal,
      showHydrophobicBulkModal,
    }
  };
}