import React, { useState, useEffect, useRef, useMemo } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { FilterMatchMode, FilterOperator } from 'primereact/api';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import { Dialog } from 'primereact/dialog';
import { MultiSelect } from 'primereact/multiselect';
import { ProgressSpinner } from 'primereact/progressspinner';
import { OverlayPanel } from 'primereact/overlaypanel';
import { SuperTag } from '../../types';
import { ColumnFilterModal } from './ColumnFilterModal';
import { 
  Download, RefreshCcw, Upload, Plus, Trash2, Settings, Droplets, 
  FileText, Settings2, Filter, X, Check, List, FileSpreadsheet, 
  File as FilePdf, MapPin, Layers, AlertTriangle, Battery, Signal, 
  MapPinned, QrCode, Calendar as CalendarIcon, Clock3, Network, 
  ChevronDown, LayoutList, LayoutGrid, Save, Info, ExternalLink, 
  Keyboard, Eye, EyeOff, Building2, Copy, Map, MoveHorizontal
} from 'lucide-react';
import { BulkOperationsModal } from '../BulkOperationsModal';
import { HydrophobicBulkModal } from '../HydrophobicBulkModal';
import { TableFilters } from './TableFilters';

// For Excel export
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface PrimeDataTableProps {
  data: SuperTag[];
  auth: { token?: string; username?: string };
  onDataChange: () => void;
  onPairGeotab: (macAddress: string, geotabSerialNumber: string) => Promise<{ success: boolean; error?: Error }>;
  onUnpairGeotab: (macAddress: string) => Promise<{ success: boolean; error?: Error }>;
  onSetHydrophobic: (nodeAddress: string, value: boolean) => Promise<{ success: boolean; error?: Error }>;
}

// Column definition interface
interface ColumnItem {
  label: string;
  value: string;
}

// Column group interface
interface ColumnGroup {
  label: string;
  items: ColumnItem[];
}

const SUPERTAG_REGISTRATION_TOKEN = 'D29B3BE8F2CC9A1A7051';

export function PrimeDataTable({ 
  data, 
  auth, 
  onDataChange, 
  onPairGeotab, 
  onUnpairGeotab, 
  onSetHydrophobic 
}: PrimeDataTableProps) {
  // Core state
  const [selectedRow, setSelectedRow] = useState<SuperTag | null>(null);
  const [filters, setFilters] = useState<any>(null);
  const [globalFilterValue, setGlobalFilterValue] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [showReorderHint, setShowReorderHint] = useState<boolean>(true);
  
  // Reference for the map overlay panel
  const mapOverlayRef = useRef<OverlayPanel>(null);
  const addressDetailsRef = useRef<OverlayPanel>(null);
  
  // Get all available columns from data
  const allColumns = useMemo(() => {
    if (!data || data.length === 0) {
      return [];
    }

    // Collect all unique keys from all objects
    const allKeys = new Set<string>();
    data.forEach(item => {
      Object.keys(item).forEach(key => {
        allKeys.add(key);
      });
    });

    // Convert to array and sort alphabetically
    return Array.from(allKeys).sort();
  }, [data]);

  // Define priority columns (ones we want to show first)
  const priorityColumns = [
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
    'formattedAddress',
    'latitude',
    'longitude',
    'siteName'
  ];

  // Group columns by category for better organization
  const columnGroups = useMemo(() => {
    return {
      main: ['nodeName', 'geotabSerialNumber', 'macAddress', 'nodeAddress', 'hydrophobic'],
      location: ['areaName', 'locationName', 'siteName', 'formattedAddress', 'latitude', 'longitude'],
      status: ['batteryStatus', 'motionState', 'lastEventTime'],
      address: allColumns.filter(col => col.startsWith('address_')),
      other: allColumns.filter(col => 
        !['nodeName', 'geotabSerialNumber', 'macAddress', 'nodeAddress', 'hydrophobic',
           'areaName', 'locationName', 'siteName', 'formattedAddress', 'latitude', 'longitude',
           'batteryStatus', 'motionState', 'lastEventTime'].includes(col) && 
        !col.startsWith('address_')
      )
    };
  }, [allColumns]);

  // Organize columns with priority ones first
  const organizedColumns = useMemo(() => {
    const result = [];
    
    // First add priority columns that exist in allColumns
    priorityColumns.forEach(col => {
      if (allColumns.includes(col)) {
        result.push(col);
      }
    });
    
    // Then add remaining columns
    allColumns.forEach(col => {
      if (!priorityColumns.includes(col)) {
        result.push(col);
      }
    });
    
    return result;
  }, [allColumns]);

  // Persistent state - using localStorage
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    try {
      const storedValue = localStorage.getItem('visibleColumns');
      if (storedValue) {
        return JSON.parse(storedValue);
      }
    } catch (error) {
      console.error('Error loading persisted state:', error);
    }
    // Default visible columns (first 10 priority columns that exist)
    return priorityColumns.filter(col => allColumns.includes(col)).slice(0, 10);
  });
  
  // Column order state
  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    try {
      const storedValue = localStorage.getItem('columnOrder');
      if (storedValue) {
        return JSON.parse(storedValue);
      }
    } catch (error) {
      console.error('Error loading persisted column order:', error);
    }
    // Default to visible columns order
    return visibleColumns;
  });
  
  // Update column order when visible columns change (only for initial setup)
  useEffect(() => {
    if (columnOrder.length === 0 && visibleColumns.length > 0) {
      setColumnOrder([...visibleColumns]);
    }
  }, [visibleColumns, columnOrder]);
  
  // Save column order to localStorage when it changes
  useEffect(() => {
    if (columnOrder.length > 0) {
      localStorage.setItem('columnOrder', JSON.stringify(columnOrder));
    }
  }, [columnOrder]);
  
  // Update column order after reordering
  const onColReorder = (e: any) => {
    const newOrder = e.columns.map((col: any) => col.props.field);
    setColumnOrder(newOrder);
    
    // Show toast notification
    toast.current?.show({
      severity: 'success',
      summary: 'Columns Reordered',
      detail: 'Column order has been updated and saved',
      life: 2000
    });
    
    // Hide the reorder hint after first use
    if (showReorderHint) {
      setShowReorderHint(false);
      localStorage.setItem('showReorderHint', 'false');
    }
  };
  
  useEffect(() => {
    // When allColumns changes, update visibleColumns to ensure they exist in data
    if (allColumns.length > 0) {
      setVisibleColumns(prev => {
        // Keep only columns that actually exist in the data
        const validColumns = prev.filter(col => allColumns.includes(col));
        
        // If we don't have any visible columns, add defaults
        if (validColumns.length === 0) {
          return priorityColumns.filter(col => allColumns.includes(col)).slice(0, 10);
        }
        
        return validColumns;
      });
    }
    
    // Check if we should show the reorder hint
    const reorderHintSetting = localStorage.getItem('showReorderHint');
    if (reorderHintSetting === 'false') {
      setShowReorderHint(false);
    }
  }, [allColumns]);

  // Save visible columns to localStorage when they change
  useEffect(() => {
    localStorage.setItem('visibleColumns', JSON.stringify(visibleColumns));
    
    // Add newly visible columns to the columnOrder if they're not already there
    setColumnOrder(prevOrder => {
      const newColumns = visibleColumns.filter(col => !prevOrder.includes(col));
      if (newColumns.length > 0) {
        return [...prevOrder, ...newColumns];
      }
      return prevOrder;
    });
  }, [visibleColumns]);
  
  const [showSuperTagsOnly, setShowSuperTagsOnly] = useState<boolean>(() => {
    try {
      const storedValue = localStorage.getItem('showSuperTagsOnly');
      return storedValue ? JSON.parse(storedValue) : false;
    } catch (error) {
      console.error('Error loading persisted state:', error);
      return false;
    }
  });
  
  useEffect(() => {
    localStorage.setItem('showSuperTagsOnly', JSON.stringify(showSuperTagsOnly));
  }, [showSuperTagsOnly]);
  
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>(() => {
    try {
      const storedValue = localStorage.getItem('columnFilters');
      return storedValue ? JSON.parse(storedValue) : {};
    } catch (error) {
      console.error('Error loading persisted state:', error);
      return {};
    }
  });
  
  useEffect(() => {
    localStorage.setItem('columnFilters', JSON.stringify(columnFilters));
  }, [columnFilters]);
  
  // Modal states
  const [showGeotabModal, setShowGeotabModal] = useState<boolean>(false);
  const [showHydrophobicModal, setShowHydrophobicModal] = useState<boolean>(false);
  const [showColumnSelector, setShowColumnSelector] = useState<boolean>(false);
  const [showBulkModal, setShowBulkModal] = useState<boolean>(false);
  const [showHydrophobicBulkModal, setShowHydrophobicBulkModal] = useState<boolean>(false);
  const [showColumnFilterModal, setShowColumnFilterModal] = useState<boolean>(false);
  const [showKeyboardShortcutsModal, setShowKeyboardShortcutsModal] = useState<boolean>(false);
  
  // Form values
  const [newGeotabSerial, setNewGeotabSerial] = useState<string>('');
  const [bulkMode, setBulkMode] = useState<'pair' | 'unpair'>('pair');
  const [hydrophobicBulkValue, setHydrophobicBulkValue] = useState<boolean>(true);
  
  // Refs
  const dt = useRef<DataTable<SuperTag[]>>(null);
  const toast = useRef<Toast>(null);
  
  // Initialize filters
  useEffect(() => {
    initFilters();
  }, []);
  
  // Update filters when globalFilterValue changes
  useEffect(() => {
    if (filters) {
      const updatedFilters = { ...filters };
      updatedFilters.global = { value: globalFilterValue, matchMode: FilterMatchMode.CONTAINS };
      setFilters(updatedFilters);
    }
  }, [globalFilterValue]);
  
  // Add keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent handling key events when in input fields
      if (e.target instanceof HTMLInputElement || 
          e.target instanceof HTMLTextAreaElement || 
          e.target instanceof HTMLSelectElement) {
        return;
      }
      
      // Shortcut: Ctrl+F for search
      if (e.ctrlKey && e.key === 'f') {
        e.preventDefault();
        document.querySelector<HTMLInputElement>('input[placeholder="Filter data..."]')?.focus();
      }
      
      // Shortcut: Ctrl+E for export
      if (e.ctrlKey && e.key === 'e') {
        e.preventDefault();
        exportExcel();
      }
      
      // Shortcut: Ctrl+R for refresh
      if (e.ctrlKey && e.key === 'r') {
        e.preventDefault();
        refreshData();
      }
      
      // Shortcut: ? for keyboard shortcuts
      if (e.key === '?') {
        setShowKeyboardShortcutsModal(true);
      }
      
      // Shortcut: Escape to clear selected row
      if (e.key === 'Escape' && selectedRow) {
        setSelectedRow(null);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedRow]);
  
  const initFilters = () => {
    setFilters({
      global: { value: globalFilterValue, matchMode: FilterMatchMode.CONTAINS },
      ...allColumns.reduce((acc, colName) => {
        acc[colName] = {
          operator: FilterOperator.AND,
          constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }]
        };
        return acc;
      }, {} as Record<string, any>)
    });
  };
  
  // Format cell values for display
  const formatValue = (value: any, field: string) => {
    if (value === undefined || value === null) {
      return '';
    }
    
    // Handle object values - convert to string representation
    if (typeof value === 'object' && value !== null) {
      // For address data, format it nicely
      if (field === 'addressData' && value.display_name) {
        return (
          <div className="flex items-center gap-2">
            <span className="truncate max-w-xs" title={value.display_name}>{value.display_name}</span>
            <button className="p-1 rounded-full hover:bg-gray-100" onClick={(e) => {
              addressDetailsRef.current?.toggle(e);
            }}>
              <Info className="h-4 w-4 text-blue-500" />
            </button>
          </div>
        );
      }
      
      try {
        return (
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-gray-600 truncate max-w-xs" title={JSON.stringify(value)}>
              {JSON.stringify(value).substring(0, 50)}{JSON.stringify(value).length > 50 ? '...' : ''}
            </span>
            <button 
              className="p-1 rounded-full hover:bg-gray-100"
              onClick={() => {
                navigator.clipboard.writeText(JSON.stringify(value, null, 2));
                toast.current?.show({ severity: 'success', summary: 'Copied', detail: 'Object data copied to clipboard', life: 3000 });
              }}
            >
              <Copy className="h-3 w-3 text-gray-500" />
            </button>
          </div>
        );
      } catch (e) {
        return '[Complex Object]';
      }
    }
    
    switch (field) {
      case 'batteryStatus':
        return value === '1' ? (
          <Tag severity="success" value="Good"></Tag>
        ) : value === '0' ? (
          <Tag severity="danger" value="Low"></Tag>
        ) : (
          value
        );
        
      case 'motionState':
        return value === 'true' ? (
          <Tag severity="success" value="Moving"></Tag>
        ) : (
          <Tag severity="info" value="Stationary"></Tag>
        );
        
      case 'hydrophobic':
        return value === 'true' ? (
          <Tag severity="info" value="Hydrophobic"></Tag>
        ) : (
          <Tag severity="secondary" value="Not Hydrophobic"></Tag>
        );
        
      case 'lastEventTime':
        if (typeof value === 'string') {
          try {
            const date = new Date(value);
            return date.toLocaleString();
          } catch (e) {
            return value;
          }
        }
        return value;
        
      case 'areaName':
        return value ? <Tag severity="primary" value={value}></Tag> : '';
        
      case 'formattedAddress':
        if (value) {
          return (
            <div className="flex items-center gap-2">
              <span className="truncate max-w-xs" title={value}>{value}</span>
            </div>
          );
        }
        return '';
      
      case 'latitude':
      case 'longitude':
        if (value) {
          // Format with 6 decimal places
          return (
            <div className="font-mono">{Number(value).toFixed(6)}</div>
          );
        }
        return '';
        
      default:
        return value;
    }
  };
  
  // Create a map link for locations with coordinates
  const getMapLink = (rowData: SuperTag) => {
    if (rowData.latitude && rowData.longitude) {
      const lat = typeof rowData.latitude === 'string' ? parseFloat(rowData.latitude) : rowData.latitude;
      const lng = typeof rowData.longitude === 'string' ? parseFloat(rowData.longitude) : rowData.longitude;
      
      const googleMapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
      
      return (
        <a 
          href={googleMapsUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 ml-1"
          title="View on Google Maps"
        >
          <MapPin className="h-4 w-4" />
        </a>
      );
    }
    return null;
  };
  
  // Column body template
  const bodyTemplate = (rowData: SuperTag, column: { field: string }) => {
    // Special case for location columns to add map link
    if (column.field === 'formattedAddress' || column.field === 'locationName' || column.field === 'areaName') {
      return (
        <div className="flex items-center">
          {formatValue(rowData[column.field], column.field)}
          {rowData.latitude && rowData.longitude && (
            <span className="ml-2">
              {getMapLink(rowData)}
            </span>
          )}
        </div>
      );
    }
    
    return formatValue(rowData[column.field], column.field);
  };
  
  // Format date for display
  const formatDate = (value: string) => {
    try {
      const date = new Date(value);
      return new Intl.DateTimeFormat(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      }).format(date);
    } catch (e) {
      return value;
    }
  };
  
  // Copy data to clipboard
  const copyToClipboard = (text: string, message: string = 'Copied to clipboard') => {
    navigator.clipboard.writeText(text);
    toast.current?.show({
      severity: 'success',
      summary: 'Copied',
      detail: message,
      life: 2000
    });
  };
  
  // Create action template for row operations
  const rowActionsTemplate = (rowData: SuperTag) => {
    return (
      <div className="flex items-center justify-center gap-1">
        {/* Copy MAC Address */}
        {rowData.macAddress && (
          <button
            type="button"
            className="p-button p-button-icon-only p-button-rounded p-button-text p-button-sm"
            onClick={() => copyToClipboard(rowData.macAddress, 'MAC address copied to clipboard')}
            title="Copy MAC Address"
          >
            <Copy className="h-4 w-4" />
          </button>
        )}
        
        {/* View on map if has coordinates */}
        {rowData.latitude && rowData.longitude && (
          <button
            type="button"
            className="p-button p-button-icon-only p-button-rounded p-button-text p-button-sm"
            onClick={(e) => {
              // Set selected row for map overlay
              setSelectedRow(rowData);
              mapOverlayRef.current?.toggle(e);
            }}
            title="View on Map"
          >
            <Map className="h-4 w-4" />
          </button>
        )}
        
        {/* Pair/Unpair Geotab */}
        {!rowData.geotabSerialNumber ? (
          <button
            type="button"
            className="p-button p-button-icon-only p-button-rounded p-button-text p-button-success p-button-sm"
            onClick={() => {
              setSelectedRow(rowData);
              setShowGeotabModal(true);
            }}
            title="Pair Geotab"
          >
            <Plus className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            className="p-button p-button-icon-only p-button-rounded p-button-text p-button-danger p-button-sm"
            onClick={() => {
              setSelectedRow(rowData);
              handleUnpairGeotab();
            }}
            title="Unpair Geotab"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
        
        {/* Hydrophobic setting */}
        {rowData.nodeAddress && (
          <button
            type="button"
            className="p-button p-button-icon-only p-button-rounded p-button-text p-button-info p-button-sm"
            onClick={() => {
              setSelectedRow(rowData);
              setShowHydrophobicModal(true);
            }}
            title="Set Hydrophobic Property"
          >
            <Droplets className="h-4 w-4" />
          </button>
        )}
      </div>
    );
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
        toast.current?.show({
          severity: 'success',
          summary: 'Success',
          detail: `Successfully paired device ${selectedRow.nodeName} with Geotab ${newGeotabSerial}`,
          life: 3000
        });
      } else {
        throw result.error;
      }
    } catch (error) {
      console.error('Error pairing Geotab:', error);
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: `Failed to pair: ${error instanceof Error ? error.message : 'Unknown error'}`,
        life: 5000
      });
    }
  };
  
  // Handle unpairing Geotab
  const handleUnpairGeotab = async () => {
    if (!selectedRow) return;
    
    try {
      const result = await onUnpairGeotab(selectedRow.macAddress);
      if (result.success) {
        toast.current?.show({
          severity: 'success',
          summary: 'Success',
          detail: `Successfully unpaired Geotab from device ${selectedRow.nodeName}`,
          life: 3000
        });
        setSelectedRow(null);
      } else {
        throw result.error;
      }
    } catch (error) {
      console.error('Error unpairing Geotab:', error);
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: `Failed to unpair: ${error instanceof Error ? error.message : 'Unknown error'}`,
        life: 5000
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
        toast.current?.show({
          severity: 'success',
          summary: 'Success',
          detail: `Successfully set hydrophobic property to ${value ? 'true' : 'false'} for device ${selectedRow.nodeName}`,
          life: 3000
        });
        setSelectedRow(null);
        
        // Refresh data to show updated property
        onDataChange();
      } else {
        throw result.error;
      }
    } catch (error) {
      console.error('Error setting hydrophobic property:', error);
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: `Failed to set hydrophobic property: ${error instanceof Error ? error.message : 'Unknown error'}`,
        life: 5000
      });
    }
  };
  
  // Filter data based on SuperTag selection
  const filteredData = useMemo(() => {
    if (!showSuperTagsOnly) {
      return data;
    }
    
    return data.filter(item => {
      // Check for SuperTag registration token
      if (item.registrationToken && 
          typeof item.registrationToken === 'string' && 
          item.registrationToken.toUpperCase() === SUPERTAG_REGISTRATION_TOKEN) {
        return true;
      }
      return false;
    });
  }, [data, showSuperTagsOnly]);
  
  // Update column filter
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
    
    // Apply the filter to DataTable
    if (filters) {
      const _filters = { ...filters };
      if (_filters[column] && _filters[column].constraints) {
        _filters[column].constraints[0].value = value || null;
        setFilters(_filters);
      }
    }
  };
  
  // Clear all column filters
  const clearColumnFilters = () => {
    setColumnFilters({});
    initFilters();
  };
  
  // Export CSV
  const exportCSV = () => {
    dt.current?.exportCSV();
  };
  
  // Export Excel
  const exportExcel = () => {
    if (!dt.current) return;
    
    const visibleData = filteredData.map(item => {
      // Create a new object with only visible columns
      const row: Record<string, any> = {};
      visibleColumns.forEach(col => {
        // Format special values
        if (col === 'batteryStatus') {
          row[col] = item[col] === '1' ? 'Good' : item[col] === '0' ? 'Low' : item[col];
        } else if (col === 'motionState') {
          row[col] = item[col] === 'true' ? 'Moving' : 'Stationary';
        } else if (col === 'hydrophobic') {
          row[col] = item[col] === 'true' ? 'Hydrophobic' : 'Not Hydrophobic';
        } else if (col === 'lastEventTime') {
          row[col] = item[col] ? formatDate(item[col]) : '';
        } else if (typeof item[col] === 'object' && item[col] !== null) {
          // Handle objects by converting to string
          try {
            row[col] = JSON.stringify(item[col]);
          } catch (e) {
            row[col] = '[Complex Object]';
          }
        } else {
          row[col] = item[col] || '';
        }
      });
      return row;
    });
    
    // Create column headers with nicer names
    const headers = visibleColumns.map(col => {
      return col.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    });
    
    // Create a worksheet
    const worksheet = XLSX.utils.json_to_sheet(visibleData, { header: visibleColumns });
    
    // Add header row with nicer names
    XLSX.utils.sheet_add_aoa(worksheet, [headers], { origin: 'A1' });
    
    // Create a workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Tags');
    
    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    // Save the file
    const fileName = `link_labs_tags_${new Date().toISOString().split('T')[0]}.xlsx`;
    saveAs(data, fileName);
    
    toast.current?.show({ severity: 'success', summary: 'Exported', detail: 'Data exported to Excel', life: 3000 });
  };
  
  // Export PDF
  const exportPDF = () => {
    if (!dt.current) return;
    
    const doc = new jsPDF('l', 'pt', 'a3');
    
    // @ts-ignore - Using jspdf-autotable which extends jsPDF
    const exportColumns = visibleColumns.map(col => {
      const header = col.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
      return { title: header, dataKey: col };
    });
    
    const visibleData = filteredData.map(item => {
      // Create a new object with only visible columns and formatted values
      const row: Record<string, any> = {};
      visibleColumns.forEach(col => {
        // Format special values
        if (col === 'batteryStatus') {
          row[col] = item[col] === '1' ? 'Good' : item[col] === '0' ? 'Low' : item[col];
        } else if (col === 'motionState') {
          row[col] = item[col] === 'true' ? 'Moving' : 'Stationary';
        } else if (col === 'hydrophobic') {
          row[col] = item[col] === 'true' ? 'Hydrophobic' : 'Not Hydrophobic';
        } else if (col === 'lastEventTime') {
          row[col] = item[col] ? formatDate(item[col]) : '';
        } else if (typeof item[col] === 'object' && item[col] !== null) {
          // Handle objects by converting to string
          try {
            row[col] = JSON.stringify(item[col]);
          } catch (e) {
            row[col] = '[Complex Object]';
          }
        } else {
          row[col] = item[col] || '';
        }
      });
      return row;
    });
    
    // Add title and timestamp to PDF
    const timestamp = new Date().toLocaleString();
    doc.setFontSize(16);
    doc.text('Link Labs Tags', 40, 40);
    doc.setFontSize(10);
    doc.text(`Generated: ${timestamp}`, 40, 60);
    
    if (globalFilterValue || Object.keys(columnFilters).length > 0 || showSuperTagsOnly) {
      let filterText = 'Applied Filters: ';
      
      if (showSuperTagsOnly) {
        filterText += 'SuperTags only, ';
      }
      
      if (globalFilterValue) {
        filterText += `Global search: "${globalFilterValue}", `;
      }
      
      Object.entries(columnFilters).forEach(([column, value]) => {
        filterText += `${column}: "${value}", `;
      });
      
      // Remove trailing comma and space
      filterText = filterText.slice(0, -2);
      
      doc.setFontSize(9);
      doc.text(filterText, 40, 75);
    }
    
    // @ts-ignore - Using jspdf-autotable
    doc.autoTable({
      columns: exportColumns,
      body: visibleData,
      margin: { top: 85 },
      styles: { overflow: 'linebreak' },
      columnStyles: { text: { cellWidth: 'auto' } },
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 250, 254] }
    });
    
    // Save the PDF
    const fileName = `link_labs_tags_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
    
    toast.current?.show({ severity: 'success', summary: 'Exported', detail: 'Data exported to PDF', life: 3000 });
  };
  
  // Refresh data
  const refreshData = async () => {
    setRefreshing(true);
    await onDataChange();
    setTimeout(() => {
      setRefreshing(false);
      toast.current?.show({ severity: 'success', summary: 'Refreshed', detail: 'Data has been refreshed', life: 1500 });
    }, 1000);
  };
  
  // Toggle view mode between table and grid
  const toggleViewMode = () => {
    setViewMode(prev => prev === 'table' ? 'grid' : 'table');
  };
  
  // Create properly formatted options for MultiSelect
  const columnOptions = useMemo(() => {
    // Group columns by category
    return [
      {
        label: 'Main Information',
        items: columnGroups.main.map(col => ({
          label: col.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
          value: col
        }))
      },
      {
        label: 'Location Information',
        items: columnGroups.location.map(col => ({
          label: col.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
          value: col
        }))
      },
      {
        label: 'Status Information',
        items: columnGroups.status.map(col => ({
          label: col.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
          value: col
        }))
      },
      {
        label: 'Address Details',
        items: columnGroups.address.map(col => ({
          label: col.replace(/address_/, '').replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
          value: col
        }))
      },
      {
        label: 'Other Information',
        items: columnGroups.other.map(col => ({
          label: col.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
          value: col
        }))
      }
    ];
  }, [columnGroups]);
  
  // Get an icon based on column name
  const getColumnIcon = (columnName?: string) => {
    // If columnName is undefined or empty, return a default icon
    if (!columnName) {
      return <Settings className="w-4 h-4 mr-2" />;
    }
    
    if (columnName.includes('Name') || columnName === 'nodeName') return <List className="w-4 h-4 mr-2" />;
    if (columnName.includes('Serial') || columnName.includes('Token')) return <QrCode className="w-4 h-4 mr-2" />;
    if (columnName.includes('MAC') || columnName.includes('Address') || columnName === 'nodeAddress') return <Network className="w-4 h-4 mr-2" />;
    if (columnName.includes('Area') || columnName.includes('Location')) return <MapPin className="w-4 h-4 mr-2" />;
    if (columnName.includes('Time') || columnName.includes('Date')) return <Clock3 className="w-4 h-4 mr-2" />;
    if (columnName.includes('Battery')) return <Battery className="w-4 h-4 mr-2" />;
    if (columnName.includes('Motion') || columnName.includes('State')) return <Signal className="w-4 h-4 mr-2" />;
    if (columnName.includes('Hydrophobic')) return <Droplets className="w-4 h-4 mr-2" />;
    if (columnName.includes('lat') || columnName.includes('lon') || columnName.includes('Lat') || columnName.includes('Lon')) return <MapPin className="w-4 h-4 mr-2" />;
    if (columnName.includes('Site')) return <Building2 className="w-4 h-4 mr-2" />;
    return <Settings className="w-4 h-4 mr-2" />; // Default icon
  };

  // Selected column template for MultiSelect
  const selectedColumnTemplate = (option: any) => {
    // Handle case when option is not defined
    if (!option) {
      return "Select Columns";
    }
    
    return (
      <div className="flex align-items-center">
        {getColumnIcon(typeof option === 'object' ? option.value : option)}
        <span>{typeof option === 'object' ? option.label : option}</span>
      </div>
    );
  };

  // Column option template for MultiSelect
  const columnOptionTemplate = (option: any) => {
    if (!option) {
      return null;
    }
    
    return (
      <div className="flex align-items-center">
        {getColumnIcon(option.value)}
        <span>{option.label}</span>
      </div>
    );
  };
  
  // Render grid card view
  const renderGridView = () => {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-2">
        {filteredData.length > 0 ? (
          filteredData.map((item, index) => (
            <div 
              key={index} 
              className={`bg-white p-4 rounded-lg border shadow-sm hover:shadow-md transition-all cursor-pointer ${
                selectedRow?.macAddress === item.macAddress ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'
              }`}
              onClick={() => setSelectedRow(selectedRow?.macAddress === item.macAddress ? null : item)}
            >
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-semibold text-gray-900 truncate">
                  {item.nodeName || 'Unnamed Device'}
                </h3>
                <div className="flex gap-1">
                  {item.geotabSerialNumber && (
                    <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full flex items-center">
                      <Check className="h-3 w-3 mr-1" />
                      Paired
                    </span>
                  )}
                  {item.hydrophobic === 'true' && (
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full flex items-center">
                      <Droplets className="h-3 w-3 mr-1" />
                      Hydrophobic
                    </span>
                  )}
                </div>
              </div>
              
              <div className="space-y-2 mb-4">
                {item.macAddress && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">MAC Address:</span>
                    <span className="font-mono text-gray-700 flex items-center">
                      {item.macAddress}
                      <button 
                        className="ml-1 text-gray-400 hover:text-gray-600" 
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(item.macAddress);
                        }}
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    </span>
                  </div>
                )}
                
                {item.geotabSerialNumber && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">Geotab Serial:</span>
                    <span className="font-medium text-gray-900">{item.geotabSerialNumber}</span>
                  </div>
                )}
                
                {item.batteryStatus !== undefined && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">Battery:</span>
                    <div>
                      {item.batteryStatus === '1' ? (
                        <span className="inline-flex items-center space-x-1 text-green-600">
                          <span className="h-2 w-2 rounded-full bg-green-500"></span>
                          <span>Good</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 text-red-600">
                          <span className="h-2 w-2 rounded-full bg-red-500"></span>
                          <span>Low</span>
                        </span>
                      )}
                    </div>
                  </div>
                )}
                
                {item.areaName && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">Area:</span>
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs">
                      {item.areaName}
                    </span>
                  </div>
                )}
                
                {item.formattedAddress && (
                  <div className="flex flex-col text-sm">
                    <span className="text-gray-500">Address:</span>
                    <span className="text-gray-700 text-xs truncate" title={item.formattedAddress}>
                      {item.formattedAddress}
                    </span>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end gap-1 mt-auto border-t pt-3">
                {item.latitude && item.longitude && (
                  <button
                    type="button"
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedRow(item);
                      mapOverlayRef.current?.toggle(e);
                    }}
                    title="View on Map"
                  >
                    <Map className="h-4 w-4" />
                  </button>
                )}
                
                {/* Pair/Unpair Geotab */}
                {!item.geotabSerialNumber ? (
                  <button
                    type="button"
                    className="p-2 text-green-600 hover:bg-green-50 rounded-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedRow(item);
                      setShowGeotabModal(true);
                    }}
                    title="Pair Geotab"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    className="p-2 text-red-600 hover:bg-red-50 rounded-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedRow(item);
                      handleUnpairGeotab();
                    }}
                    title="Unpair Geotab"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
                
                {/* Hydrophobic setting */}
                {item.nodeAddress && (
                  <button
                    type="button"
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedRow(item);
                      setShowHydrophobicModal(true);
                    }}
                    title="Set Hydrophobic Property"
                  >
                    <Droplets className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-8 bg-white rounded-lg border border-gray-200">
            <p className="text-gray-500">No matching records found.</p>
          </div>
        )}
      </div>
    );
  };
  
  // Get the ordered visible columns
  const orderedVisibleColumns = useMemo(() => {
    // First filter columnOrder to only include visible columns
    const filteredOrder = columnOrder.filter(col => visibleColumns.includes(col));
    
    // Then add any visible columns that might not be in columnOrder yet
    const missingColumns = visibleColumns.filter(col => !filteredOrder.includes(col));
    
    return [...filteredOrder, ...missingColumns];
  }, [columnOrder, visibleColumns]);

  return (
    <div className="card">
      <Toast ref={toast} />
      
      {/* Table Filters */}
      <div className="flex justify-between items-center mb-2">
        <TableFilters
          filterText={globalFilterValue}
          setFilterText={setGlobalFilterValue}
          showSuperTagsOnly={showSuperTagsOnly}
          setShowSuperTagsOnly={setShowSuperTagsOnly}
          handleRefreshData={refreshData}
          isRefreshing={refreshing}
          setShowColumnSelector={setShowColumnSelector}
          setShowBulkModal={setShowBulkModal}
          setShowHydrophobicBulkModal={setShowHydrophobicBulkModal}
          setBulkMode={setBulkMode}
          setHydrophobicBulkValue={setHydrophobicBulkValue}
          selectedRow={selectedRow}
          setShowGeotabModal={setShowGeotabModal}
          handleUnpairGeotab={handleUnpairGeotab}
          setShowHydrophobicModal={setShowHydrophobicModal}
          downloadCSV={exportCSV}
          columnFilters={columnFilters}
          showColumnFilterModal={showColumnFilterModal}
          setShowColumnFilterModal={setShowColumnFilterModal}
        />
        
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="p-button p-button-text p-button-sm"
            onClick={() => setShowKeyboardShortcutsModal(true)}
            title="Keyboard Shortcuts"
          >
            <Keyboard className="h-4 w-4" />
          </button>
          
          <button
            type="button"
            className="p-button p-button-text p-button-sm"
            onClick={toggleViewMode}
            title={viewMode === 'table' ? 'Switch to Grid View' : 'Switch to Table View'}
          >
            {viewMode === 'table' ? (
              <LayoutGrid className="h-4 w-4" />
            ) : (
              <LayoutList className="h-4 w-4" />
            )}
          </button>
          
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="p-button p-button-outlined p-button-sm"
              onClick={exportExcel}
              title="Export to Excel"
            >
              <FileSpreadsheet className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Excel</span>
            </button>
            
            <button
              type="button"
              className="p-button p-button-outlined p-button-sm"
              onClick={exportPDF}
              title="Export to PDF"
            >
              <FilePdf className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">PDF</span>
            </button>
          </div>
        </div>
      </div>
      
      {/* Status messages and filter information */}
      {Object.keys(columnFilters).length > 0 && (
        <div className="px-4 py-2 mb-3 border-t border-gray-100 bg-blue-50 text-xs text-blue-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-3 w-3" />
            <span className="font-medium">Active Column Filters:</span>
            <div className="flex flex-wrap gap-1">
              {Object.entries(columnFilters).map(([column, value]) => (
                <span key={column} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-100">
                  {column}: "{value}"
                  <button
                    className="ml-1 text-blue-700 hover:text-blue-900"
                    onClick={() => updateColumnFilter(column, '')}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
          <button 
            onClick={clearColumnFilters}
            className="text-blue-600 hover:text-blue-800"
          >
            Clear filters
          </button>
        </div>
      )}
      
      {/* Reordering Hint */}
      {showReorderHint && viewMode === 'table' && (
        <div className="px-4 py-2 mb-3 border border-blue-100 bg-blue-50 text-xs text-blue-700 rounded-md flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MoveHorizontal className="h-4 w-4 text-blue-500" />
            <span>
              <span className="font-medium">Pro Tip:</span> You can drag and drop column headers to reorder them. Your column order will be saved automatically.
            </span>
          </div>
          <button 
            onClick={() => {
              setShowReorderHint(false);
              localStorage.setItem('showReorderHint', 'false');
            }}
            className="text-blue-600 hover:text-blue-800"
          >
            Got it
          </button>
        </div>
      )}
      
      {/* Data View - Table or Grid */}
      {viewMode === 'table' ? (
        <DataTable 
          ref={dt}
          value={filteredData}
          selection={selectedRow}
          onSelectionChange={e => setSelectedRow(e.value as SuperTag)}
          dataKey="macAddress"
          paginator
          rows={10}
          rowsPerPageOptions={[5, 10, 25, 50]}
          paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
          currentPageReportTemplate="Showing {first} to {last} of {totalRecords} entries"
          globalFilter={globalFilterValue}
          filters={filters}
          filterDisplay="menu"
          loading={loading}
          responsiveLayout="scroll"
          emptyMessage="No tags found"
          className="p-datatable-sm"
          showGridlines
          stripedRows
          resizableColumns
          reorderableColumns
          onColReorder={onColReorder}
          columnResizeMode="fit"
          exportFilename="link_labs_tags"
        >
          {/* Actions column */}
          <Column
            header="Actions"
            body={rowActionsTemplate}
            headerClassName="text-center"
            className="text-center"
            style={{ width: '100px' }}
            exportable={false}
            reorderable={false}
          />
          
          {/* Data columns */}
          {orderedVisibleColumns.map(field => (
            <Column 
              key={field}
              field={field}
              header={field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
              sortable
              filter={field !== 'areaName'} // Some columns might not need filters
              filterPlaceholder={`Search by ${field}`}
              body={rowData => bodyTemplate(rowData, { field })}
              headerClassName="text-sm font-semibold"
              bodyClassName="text-sm"
              reorderable={true}
            />
          ))}
        </DataTable>
      ) : (
        renderGridView()
      )}
      
      {/* Map Overlay */}
      <OverlayPanel ref={mapOverlayRef} showCloseIcon dismissable>
        {selectedRow && selectedRow.latitude && selectedRow.longitude && (
          <div className="w-96 p-2">
            <h3 className="font-medium text-gray-900 mb-2">
              {selectedRow.nodeName || 'Location Map'}
            </h3>
            <div className="border rounded-lg overflow-hidden mb-3" style={{ height: '300px' }}>
              <iframe
                width="100%"
                height="100%"
                frameBorder="0"
                scrolling="no"
                marginHeight={0}
                marginWidth={0}
                src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyBGAhTgMYXlS_oJCWJO50oH0eJbxLPVkXk&q=${selectedRow.latitude},${selectedRow.longitude}&zoom=15`}
              />
            </div>
            <div className="text-sm text-gray-700">
              <div className="flex justify-between mb-1">
                <span className="font-medium">Coordinates:</span>
                <span className="font-mono">
                  {typeof selectedRow.latitude === 'string' ? parseFloat(selectedRow.latitude).toFixed(6) : selectedRow.latitude?.toFixed(6)},
                  {typeof selectedRow.longitude === 'string' ? parseFloat(selectedRow.longitude).toFixed(6) : selectedRow.longitude?.toFixed(6)}
                </span>
              </div>
              {selectedRow.formattedAddress && (
                <div className="mb-1">
                  <span className="font-medium">Address:</span>
                  <p className="text-gray-600">{selectedRow.formattedAddress}</p>
                </div>
              )}
              <div className="mt-2 flex justify-end">
                <a
                  href={`https://www.google.com/maps?q=${selectedRow.latitude},${selectedRow.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-button p-button-sm p-button-outlined"
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Open in Google Maps
                </a>
              </div>
            </div>
          </div>
        )}
      </OverlayPanel>
      
      {/* Address Details Overlay */}
      <OverlayPanel ref={addressDetailsRef} showCloseIcon dismissable>
        {selectedRow && selectedRow.addressData && (
          <div className="w-72 p-2">
            <h3 className="font-medium text-gray-900 mb-2">Address Details</h3>
            <div className="text-sm">
              {Object.entries(selectedRow.addressData.address || {}).map(([key, value]) => (
                <div key={key} className="flex justify-between mb-1 border-b pb-1">
                  <span className="font-medium">{key.replace(/_/g, ' ')}:</span>
                  <span className="text-gray-600">{String(value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </OverlayPanel>
      
      {/* Geotab Pairing Modal */}
      <Dialog 
        header="Pair Geotab Serial Number" 
        visible={showGeotabModal} 
        style={{ width: '450px' }} 
        modal
        footer={
          <>
            <Button label="Cancel" icon="pi pi-times" outlined onClick={() => setShowGeotabModal(false)} />
            <Button label="Pair" icon="pi pi-check" disabled={!newGeotabSerial} onClick={handlePairGeotab} />
          </>
        }
        onHide={() => setShowGeotabModal(false)}
      >
        <div className="flex flex-column gap-2">
          <p className="m-0 mb-3 text-gray-600">
            Enter the Geotab serial number to pair with 
            <span className="font-medium text-gray-900 ml-1">{selectedRow?.nodeName}</span>
          </p>
          <InputText 
            value={newGeotabSerial} 
            onChange={(e) => setNewGeotabSerial(e.target.value)}
            placeholder="Enter Geotab serial number"
            className="w-full"
          />
        </div>
      </Dialog>
      
      {/* Hydrophobic Modal */}
      <Dialog 
        header="Set Hydrophobic Property" 
        visible={showHydrophobicModal} 
        style={{ width: '450px' }} 
        modal
        footer={
          <Button label="Close" icon="pi pi-times" outlined onClick={() => setShowHydrophobicModal(false)} />
        }
        onHide={() => setShowHydrophobicModal(false)}
      >
        {selectedRow && (
          <div className="flex flex-column gap-3">
            <p className="m-0 mb-2 text-gray-600">
              Set the hydrophobic property for 
              <span className="font-medium text-gray-900 ml-1">{selectedRow.nodeName}</span>
            </p>
            <p className="text-sm text-gray-500">
              Current value: {selectedRow.hydrophobic === 'true' ? 'Hydrophobic' : 'Not Hydrophobic'}
            </p>
            <div className="flex gap-3">
              <Button 
                onClick={() => handleSetHydrophobic(true)}
                className={selectedRow.hydrophobic === 'true' ? 'p-button-secondary' : 'p-button-primary'}
                label="Hydrophobic"
                icon="pi pi-check"
              />
              <Button 
                onClick={() => handleSetHydrophobic(false)}
                className={selectedRow.hydrophobic === 'false' ? 'p-button-secondary' : 'p-button-primary'}
                label="Not Hydrophobic"
                icon="pi pi-times"
              />
            </div>
          </div>
        )}
      </Dialog>
      
      {/* Keyboard Shortcuts Modal */}
      <Dialog
        header="Keyboard Shortcuts"
        visible={showKeyboardShortcutsModal}
        style={{ width: '500px' }}
        modal
        footer={
          <Button label="Close" icon="pi pi-times" outlined onClick={() => setShowKeyboardShortcutsModal(false)} />
        }
        onHide={() => setShowKeyboardShortcutsModal(false)}
      >
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium mb-2">Navigation</h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center justify-between">
                <span>Search</span>
                <kbd className="p-keyboard-key">Ctrl + F</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span>Refresh Data</span>
                <kbd className="p-keyboard-key">Ctrl + R</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span>Export to Excel</span>
                <kbd className="p-keyboard-key">Ctrl + E</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span>Deselect Row</span>
                <kbd className="p-keyboard-key">Esc</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span>Show Shortcuts</span>
                <kbd className="p-keyboard-key">?</kbd>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-medium mb-2">Tips</h3>
            <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600">
              <li>Click on column headers to sort</li>
              <li>Use the filter button next to a column to filter by that column</li>
              <li>Drag column headers to rearrange columns</li>
              <li>Click on a row to select it</li>
              <li>Right-click on a row for additional options</li>
            </ul>
          </div>
        </div>
      </Dialog>
      
      {/* Column Selector Modal */}
      <Dialog
        header="Configure Table Columns"
        visible={showColumnSelector}
        style={{ width: '70vw', maxWidth: '900px' }}
        modal
        footer={
          <Button label="Close" icon="pi pi-times" outlined onClick={() => setShowColumnSelector(false)} />
        }
        onHide={() => setShowColumnSelector(false)}
      >
        <div className="mb-3">
          <p className="text-gray-600 mb-2">
            Select the columns you want to display in the table. Drag column headers to rearrange them.
          </p>
          
          <div className="mb-3 flex justify-content-between">
            <Button
              label="Select All"
              icon="pi pi-check"
              className="p-button-sm p-button-outlined"
              onClick={() => setVisibleColumns([...organizedColumns])}
            />
            <Button
              label="Clear All"
              icon="pi pi-times"
              className="p-button-sm p-button-outlined p-button-secondary"
              onClick={() => setVisibleColumns([])}
            />
          </div>
          
          <MultiSelect
            value={visibleColumns}
            options={columnOptions}
            optionGroupLabel="label"
            optionGroupChildren="items"
            onChange={(e) => setVisibleColumns(e.value)}
            optionLabel="label"
            optionValue="value"
            filter
            filterPlaceholder="Search columns..."
            display="chip"
            className="w-full"
            placeholder="Select columns"
            itemTemplate={columnOptionTemplate}
            selectedItemTemplate={selectedColumnTemplate}
          />
        </div>
        
        <div className="mt-4">
          <h4 className="text-lg font-medium mb-2">Column Preview</h4>
          <div className="border rounded-md overflow-auto max-h-64">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {orderedVisibleColumns.map(column => (
                    <th
                      key={column}
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                    >
                      {column.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <tr>
                  {orderedVisibleColumns.map(column => (
                    <td key={column} className="px-3 py-4 text-sm text-gray-500 whitespace-nowrap">
                      {column}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </Dialog>
      
      {/* Column Filter Modal */}
      <ColumnFilterModal
        isOpen={showColumnFilterModal}
        onClose={() => setShowColumnFilterModal(false)}
        columns={organizedColumns}
        columnFilters={columnFilters}
        updateColumnFilter={updateColumnFilter}
        clearColumnFilters={clearColumnFilters}
      />
      
      {/* Bulk Operations Modal */}
      <BulkOperationsModal
        isOpen={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        onComplete={onDataChange}
        auth={auth}
        mode={bulkMode}
      />
      
      {/* Hydrophobic Bulk Modal */}
      <HydrophobicBulkModal
        isOpen={showHydrophobicBulkModal}
        onClose={() => setShowHydrophobicBulkModal(false)}
        onComplete={onDataChange}
        auth={auth}
        value={hydrophobicBulkValue}
        onValueChange={setHydrophobicBulkValue}
      />
    </div>
  );
}