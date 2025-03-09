import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { DataTable } from 'primereact/datatable';
import { Toast } from 'primereact/toast';
import * as FileSaver from 'file-saver';
import * as XLSX from 'xlsx';

import { useTagEventHistory } from '../../hooks/useTagEventHistory';
import { useAuth } from '../../hooks/useAuth';
import { getMessageTypeName } from '../../constants/messageTypes';
import { formatDateForAPI } from '../../utils/dateUtils';

// Import split components
import { TagInfoCard } from './TagInfoCard';
import { EventDateRangeSelector } from './EventDateRangeSelector';
import { EventTableToolbar } from './EventTableToolbar';
import { EventColumnSelector } from './EventColumnSelector';
import { EventDataTable } from './EventDataTable';
import { EventLocationInfo } from './EventLocationInfo';

export function TagEventHistoryPage() {
  // Navigation and route parameters
  const { nodeAddress } = useParams<{ nodeAddress: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const tag = location.state?.tag || {};
  const { auth } = useAuth();
  const toastRef = useRef<Toast>(null);
  const dt = useRef<DataTable>(null);
  const columnSelectorRef = useRef<HTMLDivElement>(null);
  
  // Use lastEventTime as default end time if available
  const now = tag.lastEventTime ? new Date(tag.lastEventTime) : new Date();
  const oneDayAgo = new Date(now);
  oneDayAgo.setDate(now.getDate() - 1);
  
  // Initialize date range with default values
  const [dateRange, setDateRange] = useState<Date[]>([oneDayAgo, now]);

  // Table state
  const [globalFilter, setGlobalFilter] = useState('');
  const [selectedMsgType, setSelectedMsgType] = useState<string | null>(null);
  const [filters, setFilters] = useState<Record<string, any>>({});
  
  // Define initial visible columns, we'll expand this to include more columns by default
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'time', 
    'metadata.props.msgType', 
    'metadata.props.msgTypeDescription',
    'metadata.props.latitude',
    'metadata.props.longitude',
    'value.latitude',
    'value.longitude',
    'uuid'
  ]);
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [columnFilterMenuVisible, setColumnFilterMenuVisible] = useState(false);
  
  // Column search state
  const [columnSearchTerm, setColumnSearchTerm] = useState('');
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [columnOrder, setColumnOrder] = useState<string[]>([]);
  
  // Get formatted dates for API
  const getFormattedDates = () => {
    let start = oneDayAgo;
    let end = now;
    
    if (dateRange && dateRange.length > 0) {
      if (dateRange[0]) start = dateRange[0];
      
      // If there's a second date, use it; otherwise use the first date for both start and end
      if (dateRange.length > 1 && dateRange[1]) {
        end = dateRange[1];
      } else {
        end = start;
      }
    }
    
    return {
      startTime: formatDateForAPI(start),
      endTime: formatDateForAPI(end)
    };
  };
  
  // Get current date range values
  const { startTime, endTime } = getFormattedDates();
  
  // Fetch event history
  const {
    loading,
    error,
    eventHistory,
    events,
    hasMore,
    loadMore,
    refresh,
    allColumns
  } = useTagEventHistory(
    nodeAddress || null,
    auth.token,
    startTime,
    endTime
  );
  
  // Update column order when allColumns changes
  useEffect(() => {
    if (allColumns.length > 0) {
      // Set column order if it's empty or if new columns are found
      if (columnOrder.length === 0 || !allColumns.every(col => columnOrder.includes(col))) {
        setColumnOrder([...allColumns]);
        
        // Update visible columns to include location columns by default if they exist
        const locationColumns = allColumns.filter(col => 
          col.toLowerCase().includes('lat') || 
          col.toLowerCase().includes('lon') || 
          col.toLowerCase().includes('lng') ||
          col.toLowerCase().includes('accuracy') ||
          col.toLowerCase().includes('altitude')
        );
        
        if (locationColumns.length > 0) {
          const currentVisibleSet = new Set(visibleColumns);
          locationColumns.forEach(col => currentVisibleSet.add(col));
          setVisibleColumns(Array.from(currentVisibleSet));
        }
      }
    }
  }, [allColumns]);
  
  // Filtered columns based on search
  const filteredColumns = useMemo(() => {
    return columnOrder.filter(column => 
      column.toLowerCase().includes(columnSearchTerm.toLowerCase())
    );
  }, [columnOrder, columnSearchTerm]);
  
  // Column groups for better organization
  const groupedColumns = useMemo(() => {
    return {
      metadata: filteredColumns.filter(col => col.startsWith('metadata.')),
      value: filteredColumns.filter(col => col.startsWith('value.')),
      core: filteredColumns.filter(col => !col.startsWith('metadata.') && !col.startsWith('value.'))
    };
  }, [filteredColumns]);
  
  // Display error messages
  useEffect(() => {
    if (error && toastRef.current) {
      toastRef.current.show({
        severity: 'error',
        summary: 'Error',
        detail: error,
        life: 5000
      });
    }
  }, [error]);

  // Clear all filters
  const clearAllFilters = () => {
    dt.current?.reset();
    setGlobalFilter('');
    setFilters({});
    setSelectedMsgType(null);
  };
  
  // Handle date range change - improved to handle all cases
  const handleDateRangeChange = (e: { value: Date | Date[] | null, originalEvent: any }) => {
    if (!e.value) {
      // Reset to default if cleared
      setDateRange([oneDayAgo, now]);
      return;
    }
    
    if (Array.isArray(e.value)) {
      // Handle array of dates (range selection)
      if (e.value.length === 0) {
        // Empty array, reset to default
        setDateRange([oneDayAgo, now]);
      } else if (e.value.length === 1) {
        // Single date selected, use it for both start and end
        const selectedDate = e.value[0];
        setDateRange([selectedDate, selectedDate]);
      } else {
        // Two dates selected, use them as range
        setDateRange([e.value[0], e.value[1]]);
      }
    } else {
      // Handle single date object (should not happen with range mode, but just in case)
      const selectedDate = e.value as Date;
      setDateRange([selectedDate, selectedDate]);
    }
  };
  
  // Refresh data with new date range
  const handleRefresh = async () => {
    const { startTime, endTime } = getFormattedDates();
    await refresh(startTime, endTime);
    
    // Show success toast
    if (toastRef.current) {
      toastRef.current.show({
        severity: 'success',
        summary: 'Data Refreshed',
        detail: 'Event data has been updated with the selected date range',
        life: 3000
      });
    }
  };
  
  // Enhanced function to display nested properties, with better handling for special types
  const nestedPropertyTemplate = (rowData: any, field: { field: string }) => {
    const paths = field.field.split('.');
    let value = rowData;
    
    // Navigate through the nested path
    for (const path of paths) {
      // Handle array indexing if present (e.g., value.coordinates[0])
      if (path.includes('[') && path.includes(']')) {
        const arrayPath = path.split('[');
        const propName = arrayPath[0];
        const index = parseInt(arrayPath[1].replace(']', ''), 10);
        
        if (value && typeof value === 'object' && propName in value) {
          value = value[propName];
          if (Array.isArray(value) && index >= 0 && index < value.length) {
            value = value[index];
          } else {
            return '';
          }
        } else {
          return '';
        }
      } else if (value && typeof value === 'object') {
        value = value[path];
      } else {
        return '';
      }
    }
    
    if (value === null || value === undefined) return '';
    
    // Format based on the column name and value type
    const fieldName = field.field.toLowerCase();
    
    // Special handling for location data - return the location component
    if ((fieldName.includes('lat') && !fieldName.includes('latest')) || fieldName.includes('latitude')) {
      // Find the corresponding longitude value
      let longitude;
      
      // If this is a metadata.props.latitude field, look for metadata.props.longitude
      if (field.field === 'metadata.props.latitude') {
        longitude = rowData.metadata?.props?.longitude;
      } 
      // If this is a value.latitude field, look for value.longitude
      else if (field.field === 'value.latitude') {
        longitude = rowData.value?.longitude;
      }
      
      if (longitude !== undefined) {
        return <EventLocationInfo latitude={value} longitude={longitude} />;
      }
    }
    
    // Skip longitude columns since they're handled with latitude
    if ((fieldName.includes('lon') || fieldName.includes('lng')) && 
        !fieldName.includes('latest') && 
        (fieldName.includes('longitude'))) {
      // For longitude columns, just show the value
      const num = parseFloat(value);
      return isNaN(num) ? value : num.toFixed(6);
    }
    
    // Format temperature
    if (fieldName.includes('temp') || fieldName.includes('temperature')) {
      const num = parseFloat(value);
      if (!isNaN(num)) {
        return `${num.toFixed(1)}°`;
      }
    }
    
    // Format percentage values
    if (fieldName.includes('percent') || fieldName.includes('battery') || fieldName.includes('level')) {
      const num = parseFloat(value);
      if (!isNaN(num) && num <= 1) {
        return `${(num * 100).toFixed(0)}%`;
      } else if (!isNaN(num) && num <= 100) {
        return `${num.toFixed(0)}%`;
      }
    }
    
    // Format altitude, height, elevation
    if (fieldName.includes('altitude') || fieldName.includes('height') || fieldName.includes('elevation')) {
      const num = parseFloat(value);
      if (!isNaN(num)) {
        return `${num.toFixed(1)}m`;
      }
    }
    
    // Format speed
    if (fieldName.includes('speed') || fieldName.includes('velocity')) {
      const num = parseFloat(value);
      if (!isNaN(num)) {
        return `${num.toFixed(1)} m/s`;
      }
    }
    
    // Format accuracy
    if (fieldName.includes('accuracy') || fieldName.includes('precision')) {
      const num = parseFloat(value);
      if (!isNaN(num)) {
        return `±${num.toFixed(1)}m`;
      }
    }
    
    // Check if the value is an object
    if (typeof value === 'object' && value !== null) {
      try {
        return JSON.stringify(value);
      } catch (e) {
        return '[Complex Object]';
      }
    }
    
    // Format date fields if they appear to be ISO dates
    if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
      return new Date(value).toLocaleString();
    }
    
    return String(value);
  };
  
  // Export to Excel with all data
  const exportCSV = () => {
    if (!events.length) return;
    
    // Prepare a complete flattened dataset with all properties
    const exportData = events.map(event => {
      // Start with a flat object for basic properties
      const flatEvent: Record<string, any> = {
        uuid: event.uuid,
        time: new Date(event.time).toLocaleString(),
        type: event.type
      };
      
      // Helper function to flatten nested objects
      const flattenObject = (obj: any, prefix = '') => {
        if (!obj || typeof obj !== 'object') return;
        
        Object.entries(obj).forEach(([key, value]) => {
          const propKey = prefix ? `${prefix}.${key}` : key;
          
          // Skip certain internal properties
          if (key === 'links' || key === 'tags') return;
          
          // If value is an object but not an array, recursively flatten it
          if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
            flattenObject(value, propKey);
          } 
          // For arrays, we'll stringify them
          else if (Array.isArray(value)) {
            flatEvent[propKey] = JSON.stringify(value);
          }
          // Otherwise just add the value directly
          else {
            flatEvent[propKey] = value;
          }
        });
      };
      
      // Flatten metadata and value objects
      if (event.metadata) {
        flattenObject(event.metadata, 'metadata');
      }
      
      if (event.value) {
        flattenObject(event.value, 'value');
      }
      
      return flatEvent;
    });
    
    // Create the Excel worksheet
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Events');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const dataBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    // Generate a descriptive filename with tag info and timestamp
    const filename = `events_${tag.nodeName || nodeAddress}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    FileSaver.saveAs(dataBlob, filename);
    
    // Show success toast
    if (toastRef.current) {
      toastRef.current.show({
        severity: 'success',
        summary: 'Export Complete',
        detail: `Data exported to ${filename}`,
        life: 3000
      });
    }
  };
  
  // Message type filter options
  const msgTypeOptions = useMemo(() => {
    const types = new Set<string>();
    
    events.forEach(event => {
      const msgType = event.metadata?.props?.msgType;
      if (msgType) {
        types.add(msgType);
      }
    });
    
    return Array.from(types).map(type => ({
      label: `${type}: ${getMessageTypeName(type)}`,
      value: type
    }));
  }, [events]);
  
  // Handle message type filter
  const handleMsgTypeFilterChange = (type: string | null) => {
    setSelectedMsgType(type);
    
    const newFilters = { ...filters };
    
    if (type) {
      // Initialize the filter structure properly
      newFilters['metadata.props.msgType'] = { value: type, matchMode: 'equals' };
    } else {
      // Remove filter if no type selected
      delete newFilters['metadata.props.msgType'];
    }
    
    setFilters(newFilters);
  };

  // Safely handle filter callbacks to prevent "filters[field] is undefined" error
  const safeFilterCallback = (field: string, value: any, index: number) => {
    // Create a new filters object with the updated value
    const newFilters = { ...filters };
    
    // Initialize field in filters object if it doesn't exist
    if (!newFilters[field]) {
      newFilters[field] = {};
    }
    
    // Set the value and other required properties
    newFilters[field].value = value;
    newFilters[field].matchMode = newFilters[field].matchMode || 'contains';
    
    // If value is empty, consider removing the filter
    if (value === '' || value === null || value === undefined) {
      delete newFilters[field];
    }
    
    // Update filters state
    setFilters(newFilters);
  };

  // Column selection actions
  const handleSelectAll = () => {
    setVisibleColumns([...allColumns]);
  };

  const handleDeselectAll = () => {
    // Keep mandatory columns like time and type
    setVisibleColumns(['time', 'metadata.props.msgType']);
  };

  // Column dragging functions
  const handleDragStart = (column: string) => {
    setDraggedColumn(column);
  };

  const handleDragOver = (e: React.DragEvent, targetColumn: string) => {
    e.preventDefault();
    if (!draggedColumn || draggedColumn === targetColumn) return;

    const newOrder = [...columnOrder];
    const draggedIdx = newOrder.indexOf(draggedColumn);
    const targetIdx = newOrder.indexOf(targetColumn);

    if (draggedIdx !== -1 && targetIdx !== -1) {
      newOrder.splice(draggedIdx, 1);
      newOrder.splice(targetIdx, 0, draggedColumn);
      setColumnOrder(newOrder);
    }
  };

  // Handle click outside column selector dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (showColumnSelector && 
          columnSelectorRef.current && 
          !columnSelectorRef.current.contains(event.target as Node)) {
        setShowColumnSelector(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showColumnSelector]);
  
  return (
    <div className="card p-4">
      <Toast ref={toastRef} />
      
      <div className="flex flex-column gap-4">
        {/* Tag Info Card */}
        <TagInfoCard tag={tag} nodeAddress={nodeAddress} />
        
        {/* Date Range Selection */}
        <EventDateRangeSelector 
          dateRange={dateRange}
          onDateRangeChange={handleDateRangeChange}
          onRefresh={handleRefresh}
          loading={loading}
          selectedMsgType={selectedMsgType}
          onMsgTypeChange={handleMsgTypeFilterChange}
          msgTypeOptions={msgTypeOptions}
        />
        
        {/* Data Table with Toolbar */}
        <div ref={columnSelectorRef}>
          <EventTableToolbar
            onNavigateBack={() => navigate(-1)}
            globalFilter={globalFilter}
            setGlobalFilter={setGlobalFilter}
            filters={filters}
            clearAllFilters={clearAllFilters}
            columnFilterMenuVisible={columnFilterMenuVisible}
            setColumnFilterMenuVisible={setColumnFilterMenuVisible}
            showColumnSelector={showColumnSelector}
            setShowColumnSelector={setShowColumnSelector}
            exportCSV={exportCSV}
            eventsCount={events.length}
          />
          
          {/* Column Selector */}
          <EventColumnSelector
            showColumnSelector={showColumnSelector}
            setShowColumnSelector={setShowColumnSelector}
            columnSearchTerm={columnSearchTerm}
            setColumnSearchTerm={setColumnSearchTerm}
            groupedColumns={groupedColumns}
            visibleColumns={visibleColumns}
            setVisibleColumns={setVisibleColumns}
            handleSelectAll={handleSelectAll}
            handleDeselectAll={handleDeselectAll}
            handleDragStart={handleDragStart}
            handleDragOver={handleDragOver}
          />
        </div>
        
        {/* Event Data Table */}
        <EventDataTable
          events={events}
          loading={loading}
          filters={filters}
          columnFilterMenuVisible={columnFilterMenuVisible}
          globalFilter={globalFilter}
          safeFilterCallback={safeFilterCallback}
          hasMore={hasMore}
          loadMore={loadMore}
          visibleColumns={visibleColumns}
          columnOrder={columnOrder}
          handleDragStart={handleDragStart}
          handleDragOver={handleDragOver}
          nestedPropertyTemplate={nestedPropertyTemplate}
          dtRef={dt}
          msgTypeOptions={msgTypeOptions}
        />
      </div>
    </div>
  );
}