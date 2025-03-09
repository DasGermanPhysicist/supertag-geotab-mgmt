import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Calendar } from 'primereact/calendar';
import { Button } from 'primereact/button';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { MultiSelect } from 'primereact/multiselect';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { Tag } from 'primereact/tag';
import { Skeleton } from 'primereact/skeleton';
import { Toast } from 'primereact/toast';
import { Toolbar } from 'primereact/toolbar';
import { ChevronLeft, Download, RefreshCw, Calendar as CalendarIcon, Filter, SlidersHorizontal, FilterX, Search, X, GripVertical, Check } from 'lucide-react';
import * as FileSaver from 'file-saver';
import * as XLSX from 'xlsx';
import { useTagEventHistory } from '../hooks/useTagEventHistory';
import { useAuth } from '../hooks/useAuth';
import { getMessageTypeName } from '../constants/messageTypes';
import { formatDateForAPI } from '../utils/dateUtils';

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
  
  // Date range for querying - initialize with actual dates, not null values
  const [dateRange, setDateRange] = useState<Date[]>([oneDayAgo, now]);
  const [customRange, setCustomRange] = useState(false);

  // Table state
  const [globalFilter, setGlobalFilter] = useState('');
  const [selectedMsgType, setSelectedMsgType] = useState<string | null>(null);
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'time', 
    'metadata.props.msgType', 
    'metadata.props.msgTypeDescription',
    'uuid'
  ]);
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [columnFilterMenuVisible, setColumnFilterMenuVisible] = useState(false);
  
  // Column search state
  const [columnSearchTerm, setColumnSearchTerm] = useState('');
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [columnOrder, setColumnOrder] = useState<string[]>([]);
  
  // Format dates for API
  const startTime = dateRange[0] ? formatDateForAPI(dateRange[0]) : formatDateForAPI(oneDayAgo);
  const endTime = dateRange[1] ? formatDateForAPI(dateRange[1]) : formatDateForAPI(now);
  
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
    if (allColumns.length > 0 && columnOrder.length === 0) {
      // Set initial column order
      setColumnOrder([...allColumns]);
    }
  }, [allColumns]);
  
  // Filtered columns based on search
  const filteredColumns = React.useMemo(() => {
    return columnOrder.filter(column => 
      column.toLowerCase().includes(columnSearchTerm.toLowerCase())
    );
  }, [columnOrder, columnSearchTerm]);
  
  // Column groups for better organization
  const groupedColumns = React.useMemo(() => {
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
  
  // Handle date range change
  const handleDateRangeChange = (e: any) => {
    if (e.value && Array.isArray(e.value) && e.value.length === 2) {
      // Ensure both dates are valid before updating state
      if (e.value[0] instanceof Date && e.value[1] instanceof Date) {
        setDateRange(e.value);
        setCustomRange(true);
      }
    }
  };
  
  // Refresh data with new date range
  const handleRefresh = async () => {
    if (dateRange[0] && dateRange[1]) {
      await refresh(
        formatDateForAPI(dateRange[0]),
        formatDateForAPI(dateRange[1])
      );
    }
  };
  
  // Format the msgType value with human-readable name
  const msgTypeTemplate = (rowData: any) => {
    const msgType = rowData.metadata?.props?.msgType;
    if (!msgType) return '';
    
    const typeName = getMessageTypeName(msgType);
    return (
      <Tag 
        value={typeName} 
        severity={msgType === '20' ? 'info' : msgType === '8' ? 'success' : 'primary'}
      />
    );
  };
  
  // General template for displaying nested properties
  const nestedPropertyTemplate = (rowData: any, field: { field: string }) => {
    const paths = field.field.split('.');
    let value = rowData;
    
    for (const path of paths) {
      if (value && typeof value === 'object') {
        value = value[path];
      } else {
        return '';
      }
    }
    
    if (value === null || value === undefined) return '';
    
    // Check if the value is an object
    if (typeof value === 'object') {
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
  
  // Export to CSV
  const exportCSV = () => {
    if (!events.length) return;
    
    const exportData = events.map(event => {
      const flatEvent: Record<string, any> = {
        uuid: event.uuid,
        time: event.time,
        type: event.type
      };
      
      // Flatten metadata props
      if (event.metadata && event.metadata.props) {
        Object.entries(event.metadata.props).forEach(([key, value]) => {
          flatEvent[`metadata.${key}`] = value;
        });
      }
      
      // Flatten value props
      if (event.value) {
        Object.entries(event.value).forEach(([key, value]) => {
          flatEvent[`value.${key}`] = value;
        });
      }
      
      return flatEvent;
    });
    
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Events');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const dataBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    FileSaver.saveAs(dataBlob, `events_${nodeAddress}.xlsx`);
  };
  
  // Message type filter options
  const msgTypeOptions = React.useMemo(() => {
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
  
  // Handle message type filter - fixed to properly initialize the filter structure
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

  // Text filter element template - fixed to never pass null values and use safe filtering
  const textFilterTemplate = (options: any) => {
    return (
      <InputText
        value={options.value || ''}
        onChange={(e) => safeFilterCallback(options.field, e.target.value, options.index)}
        placeholder="Search"
        className="p-column-filter w-full"
        style={{ minWidth: '12rem' }}
      />
    );
  };
  
  // Handle column selection actions
  const handleSelectAll = () => {
    setVisibleColumns([...allColumns]);
  };

  const handleDeselectAll = () => {
    // Keep mandatory columns like time and type
    setVisibleColumns(['time', 'metadata.props.msgType']);
  };

  // Handle column dragging functions
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

  // Define toolbar content
  const leftToolbarTemplate = () => {
    return (
      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          icon={<ChevronLeft className="h-4 w-4 mr-1" />}
          label="Back to Tags"
          onClick={() => navigate(-1)}
          className="p-button-text mb-2 sm:mb-0"
        />
        
        <div className="p-inputgroup flex-1 max-w-md">
          <span className="p-inputgroup-addon">
            <i className="pi pi-search" />
          </span>
          <InputText
            type="search"
            value={globalFilter || ''}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Search events..."
            className="w-full"
          />
          {globalFilter && (
            <Button
              icon={<X className="h-4 w-4" />}
              className="p-button-outlined"
              onClick={() => setGlobalFilter('')}
              tooltip="Clear search"
            />
          )}
        </div>

        <Button
          icon={<Filter className="h-4 w-4 mr-1" />}
          label={Object.keys(filters).length > 0 ? `Filters (${Object.keys(filters).length})` : "Filters"}
          onClick={() => setColumnFilterMenuVisible(!columnFilterMenuVisible)}
          className={`p-button-sm ${Object.keys(filters).length > 0 ? 'p-button-outlined p-button-warning' : 'p-button-outlined'}`}
        />
        
        {Object.keys(filters).length > 0 && (
          <Button
            icon={<FilterX className="h-4 w-4 mr-1" />}
            label="Clear Filters"
            onClick={clearAllFilters}
            className="p-button-sm p-button-outlined p-button-danger"
          />
        )}
      </div>
    );
  };
  
  const rightToolbarTemplate = () => {
    return (
      <div className="flex flex-wrap gap-2">
        <div className="relative" ref={columnSelectorRef}>
          <Button
            icon={<SlidersHorizontal className="h-4 w-4 mr-1" />}
            label="Columns"
            onClick={() => setShowColumnSelector(!showColumnSelector)}
            className="p-button-outlined p-button-sm"
          />
        </div>
        
        <Button
          label="Export"
          icon={<Download className="h-4 w-4 mr-1" />}
          onClick={exportCSV}
          className="p-button-primary p-button-sm"
          disabled={!events.length}
        />
      </div>
    );
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
        <div className="bg-blue-50 p-3 rounded border border-blue-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-blue-800 font-medium">Node Name</div>
              <div className="text-lg">{tag.nodeName || nodeAddress}</div>
            </div>
            {tag.macAddress && (
              <div>
                <div className="text-sm text-blue-800 font-medium">MAC Address</div>
                <div className="font-mono">{tag.macAddress}</div>
              </div>
            )}
            {tag.areaName && (
              <div>
                <div className="text-sm text-blue-800 font-medium">Area</div>
                <div>{tag.areaName}</div>
              </div>
            )}
          </div>
        </div>
        
        {/* Date Range Selection */}
        <div className="p-fluid grid formgrid">
          <div className="field col-12 md:col-6">
            <label htmlFor="dateRange" className="font-medium">Event Date Range</label>
            <div className="p-inputgroup">
              <span className="p-inputgroup-addon">
                <CalendarIcon className="h-4 w-4" />
              </span>
              <Calendar
                id="dateRange"
                value={dateRange}
                onChange={handleDateRangeChange}
                selectionMode="range"
                readOnlyInput
                showIcon
                showTime
                hourFormat="24"
                className="w-full"
              />
              <Button
                label="Refresh"
                icon={<RefreshCw className="h-4 w-4 mr-2" />}
                onClick={handleRefresh}
                loading={loading}
                className="p-button-primary"
              />
            </div>
          </div>
          
          <div className="field col-12 md:col-4">
            <label htmlFor="msgTypeFilter" className="font-medium">Filter by Message Type</label>
            <Dropdown
              id="msgTypeFilter"
              options={msgTypeOptions}
              value={selectedMsgType}
              onChange={(e) => handleMsgTypeFilterChange(e.value)}
              filter
              placeholder="Select Event Type"
              className="w-full"
            />
          </div>
        </div>
        
        {/* Data Table with Toolbar */}
        <Toolbar className="mb-2" left={leftToolbarTemplate} right={rightToolbarTemplate} />
        
        {/* Column Selector */}
        {showColumnSelector && (
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
                              onChange={() => {
                                if (visibleColumns.includes(column)) {
                                  setVisibleColumns(visibleColumns.filter(col => col !== column));
                                } else {
                                  setVisibleColumns([...visibleColumns, column]);
                                }
                              }}
                              className="rounded text-blue-600 focus:ring-blue-500"
                            />
                            <span className={`truncate ${(column === 'time' || column === 'uuid') ? 'font-medium text-blue-700' : ''}`}>
                              {column}
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
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-64 overflow-y-auto">
                      {groupedColumns.metadata.map((column) => (
                        <div
                          key={column}
                          draggable={column !== 'metadata.props.msgType'}
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
                              onChange={() => {
                                if (visibleColumns.includes(column)) {
                                  setVisibleColumns(visibleColumns.filter(col => col !== column));
                                } else {
                                  setVisibleColumns([...visibleColumns, column]);
                                }
                              }}
                              className="rounded text-blue-600 focus:ring-blue-500"
                            />
                            <span className={`truncate ${column === 'metadata.props.msgType' ? 'font-medium text-blue-700' : ''}`}>
                              {column.replace('metadata.props.', '')}
                            </span>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Value columns section */}
                {groupedColumns.value.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-800 mb-2 border-b pb-1">Value Properties</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-64 overflow-y-auto">
                      {groupedColumns.value.map((column) => (
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
                              onChange={() => {
                                if (visibleColumns.includes(column)) {
                                  setVisibleColumns(visibleColumns.filter(col => col !== column));
                                } else {
                                  setVisibleColumns([...visibleColumns, column]);
                                }
                              }}
                              className="rounded text-blue-600 focus:ring-blue-500"
                            />
                            <span className="truncate">
                              {column.replace('value.', '')}
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
                  onClick={() => setShowColumnSelector(false)}
                  className="w-full btn btn-primary"
                >
                  Apply Changes
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Events Table */}
        <div className="card">
          <DataTable
            ref={dt}
            value={events}
            paginator
            rows={10}
            rowsPerPageOptions={[5, 10, 25, 50]}
            tableStyle={{ minWidth: '50rem' }}
            loading={loading}
            filters={filters}
            filterDisplay={columnFilterMenuVisible ? "menu" : "row"}
            globalFilter={globalFilter}
            emptyMessage="No events found"
            resizableColumns
            columnResizeMode="fit"
            scrollable
            scrollHeight="400px"
            stripedRows
            className="p-datatable-sm"
          >
            {/* Always include time and msgType columns first */}
            <Column
              field="time"
              header={
                <div className="flex items-center cursor-move" 
                     draggable
                     onDragStart={() => handleDragStart('time')}
                     onDragOver={(e) => handleDragOver(e, 'time')}
                >
                  <GripVertical className="h-4 w-4 mr-1 text-gray-400" />
                  <span>Time</span>
                </div>
              }
              sortable
              body={(rowData) => new Date(rowData.time).toLocaleString()}
              style={{ width: '180px' }}
              filter
              filterPlaceholder="Search time"
              filterElement={(options) => textFilterTemplate({...options, field: "time"})}
              showFilterMenu={false}
            />
            
            <Column
              field="metadata.props.msgType"
              header={
                <div className="flex items-center cursor-move" 
                     draggable
                     onDragStart={() => handleDragStart('metadata.props.msgType')}
                     onDragOver={(e) => handleDragOver(e, 'metadata.props.msgType')}
                >
                  <GripVertical className="h-4 w-4 mr-1 text-gray-400" />
                  <span>Event Type</span>
                </div>
              }
              sortable
              body={msgTypeTemplate}
              style={{ width: '150px' }}
              filter
              filterField="metadata.props.msgType"
              showFilterMenu={false}
              filterElement={(options) => (
                <Dropdown
                  value={options.value || ''}
                  options={[
                    { label: 'All', value: '' },
                    ...msgTypeOptions
                  ]}
                  onChange={(e) => safeFilterCallback("metadata.props.msgType", e.value, options.index)}
                  placeholder="Select Type"
                  className="p-column-filter w-full"
                />
              )}
            />
            
            {/* Dynamically include selected columns */}
            {visibleColumns
              .filter(col => !['time', 'metadata.props.msgType'].includes(col))
              .map(col => (
                <Column
                  key={col}
                  field={col}
                  header={
                    <div className="flex items-center cursor-move" 
                         draggable
                         onDragStart={() => handleDragStart(col)}
                         onDragOver={(e) => handleDragOver(e, col)}
                    >
                      <GripVertical className="h-4 w-4 mr-1 text-gray-400" />
                      <span>{col.split('.').pop()}</span>
                    </div>
                  }
                  sortable
                  body={(rowData, options) => nestedPropertyTemplate(rowData, options)}
                  filter
                  filterPlaceholder={`Search ${col.split('.').pop()}`}
                  filterElement={(options) => textFilterTemplate({...options, field: col})}
                  showFilterMenu={false}
                />
              ))
            }
          </DataTable>
          
          {/* Load more button */}
          {hasMore && (
            <div className="flex justify-content-center mt-3">
              <Button
                label="Load More"
                icon="pi pi-plus"
                onClick={loadMore}
                loading={loading}
                className="p-button-outlined"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}