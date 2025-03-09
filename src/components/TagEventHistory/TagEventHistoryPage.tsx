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
import { apiService } from '../../services/api';
import { useSuperTags } from '../../hooks/useSuperTags';

// Import split components
import { TagInfoCard } from './TagInfoCard';
import { EventDateRangeSelector } from './EventDateRangeSelector';
import { EventTableToolbar } from './EventTableToolbar';
import { EventColumnSelector } from './EventColumnSelector';
import { EventDataTable } from './EventDataTable';
import { EventLocationInfo } from './EventLocationInfo';
import { EventMap } from './EventMap';
import { EventViewSelector } from './EventViewSelector';
import { EventRowMapSync } from './EventRowMapSync';

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
  const [selectedMsgTypes, setSelectedMsgTypes] = useState<string[]>([]);
  const [filters, setFilters] = useState<Record<string, any>>({});
  
  // Set the current view mode (table or map)
  const [currentView, setCurrentView] = useState<'table' | 'map'>('table');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  
  // Define initial visible columns - prioritize metadata.props over value when they both exist
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'time', 
    'metadata.props.msgType', 
    'metadata.props.msgTypeDescription',
    'sourceSupertagName', // Add the new column
    'formattedAddress',
    'metadata.props.lowVoltageFlag',
    'metadata.props.batteryVoltage',
    'metadata.props.batteryConsumed_mAh',
    'metadata.props.batteryCapacity_mAh',
    'metadata.props.evCount-LTEmSuccess',
    'metadata.props.evCount-LTEmFailure',
    'metadata.props.chargeState',
    'metadata.props.fahrenheit',
    'metadata.props.sourceSupertagId',
    'address_road',
    'address_city',
    'address_state',
    'address_postcode',
    'address_country',
    'latitude',
    'longitude',
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
  
  // Fetch available tags for mapping source SuperTag IDs to names
  const { data: allTags } = useSuperTags(auth.token, null, []);
  
  // Create a map of nodeAddress to nodeName for quick lookups
  const tagMap = useMemo(() => {
    const map = new Map<string, string>();
    
    // Log the tags we're trying to map
    console.log("Building tag map with", allTags.length, "tags");
    
    allTags.forEach(tag => {
      if (tag.nodeAddress && tag.nodeName) {
        // Use nodeAddress as key and nodeName as value
        map.set(tag.nodeAddress, tag.nodeName);
      }
    });
    
    // Log some sample mappings for debugging
    if (map.size > 0) {
      console.log(`Created tag map with ${map.size} entries`);
    }
    
    return map;
  }, [allTags]);
  
  // Fetch event history
  const {
    loading,
    error,
    eventHistory,
    events,
    hasMore,
    loadMore,
    refresh,
    allColumns,
    setEvents
  } = useTagEventHistory(
    nodeAddress || null,
    auth.token,
    startTime,
    endTime
  );

  // Helper function to map sourceSupertagId to a SuperTag name
  const getSourceSupertagName = (sourceSupertagId: string | null | undefined) => {
    if (!sourceSupertagId) return '';
    
    // Look up the actual SuperTag name
    const name = tagMap.get(sourceSupertagId);
    
    // Return the name if found, otherwise just return the ID
    return name || sourceSupertagId;
  };

  // Enhance events with address data and source SuperTag names
  useEffect(() => {
    if (events.length > 0) {
      // Process events to add address data and source SuperTag names
      const enhanceEvents = async () => {
        const enhancedEvents = [...events];
        let updated = false;

        for (let i = 0; i < enhancedEvents.length; i++) {
          const event = enhancedEvents[i];
          let eventUpdated = false;
          
          // Add source SuperTag name if not already present
          const sourceSupertagId = event.metadata?.props?.sourceSupertagId;
          if (sourceSupertagId && !event.sourceSupertagName) {
            const supertagName = getSourceSupertagName(sourceSupertagId);
            enhancedEvents[i] = {
              ...enhancedEvents[i],
              sourceSupertagName: supertagName
            };
            eventUpdated = true;
          }
          
          // Skip address lookup if already has address data
          if (!event.formattedAddress) {
            // Find latitude and longitude from event data
            let latitude = null;
            let longitude = null;

            // Check various places for coordinates
            if (event.metadata?.props?.latitude && event.metadata?.props?.longitude) {
              latitude = event.metadata.props.latitude;
              longitude = event.metadata.props.longitude;
            } else if (event.value?.latitude && event.value?.longitude) {
              latitude = event.value.latitude;
              longitude = event.value.longitude;
            } else if (event.metadata?.props?.lat && (event.metadata?.props?.lng || event.metadata?.props?.lon)) {
              latitude = event.metadata.props.lat;
              longitude = event.metadata.props.lng || event.metadata.props.lon;
            } else if (event.value?.lat && (event.value?.lng || event.value?.lon)) {
              latitude = event.value.lat;
              longitude = event.value.lng || event.value.lon;
            }

            // If we found coordinates, fetch address
            if (latitude && longitude) {
              try {
                // Convert to numbers if they're strings
                const lat = typeof latitude === 'string' ? parseFloat(latitude) : latitude;
                const lon = typeof longitude === 'string' ? parseFloat(longitude) : longitude;
                
                // Skip if values can't be parsed
                if (isNaN(lat) || isNaN(lon)) continue;
                
                // Fetch address data
                const addressData = await apiService.fetchAddressFromCoordinates(lat, lon);
                
                // Add address data to the event
                enhancedEvents[i] = {
                  ...enhancedEvents[i],
                  addressData: addressData,
                  formattedAddress: addressData.display_name,
                  // Add individual address components
                  ...Object.keys(addressData.address || {}).reduce((obj, key) => {
                    obj[`address_${key}`] = addressData.address[key];
                    return obj;
                  }, {} as Record<string, string>),
                  // Ensure these are always available and not overridden
                  latitude: lat,
                  longitude: lon
                };
                eventUpdated = true;
              } catch (err) {
                console.error(`Error fetching address for event:`, err);
              }
            }
          }

          updated = updated || eventUpdated;
        }

        // Only update if we actually modified events
        if (updated) {
          setEvents(enhancedEvents);
        }
      };

      enhanceEvents();
    }
  }, [events, setEvents, tagMap]);
  
  // Update column order when allColumns changes
  useEffect(() => {
    if (allColumns.length > 0) {
      // Set column order if it's empty or if new columns are found
      if (columnOrder.length === 0 || !allColumns.every(col => columnOrder.includes(col))) {
        // Make sure our custom column is included
        const newColumnOrder = ['sourceSupertagName', ...allColumns];
        setColumnOrder(newColumnOrder);
        
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
  
  // Count events with location data and prepare a lookup map
  const locationDataInfo = useMemo(() => {
    const count = {
      total: 0,
      gps: 0,
      wifi: 0,
      cellId: 0,
      lbOnly: 0,
      unknown: 0
    };
    
    // Map to track which events have location data
    const eventHasLocation = new Map<string, boolean>();
    
    events.forEach(event => {
      let hasLocation = false;
      let locationType = 'unknown';
      
      // Check various location properties
      if ((event.metadata?.props?.latitude && event.metadata?.props?.longitude) ||
          (event.value?.latitude && event.value?.longitude) ||
          (event.metadata?.props?.lat && (event.metadata?.props?.lng || event.metadata?.props?.lon)) ||
          (event.value?.lat && (event.value?.lng || event.value?.lon)) ||
          (event.latitude && event.longitude)) {
        
        hasLocation = true;
        count.total++;
        
        // Try to determine the location type
        if (event.metadata?.props?.msgType) {
          const msgType = event.metadata.props.msgType;
          switch (msgType) {
            case '4':
              locationType = 'lbOnly';
              count.lbOnly++;
              break;
            case '5':
              locationType = 'gps';
              count.gps++;
              break;
            case '6':
              locationType = 'wifi';
              count.wifi++;
              break;
            case '7':
              locationType = 'cellId';
              count.cellId++;
              break;
            default:
              count.unknown++;
          }
        } else {
          count.unknown++;
        }
      }
      
      // Store in the map
      eventHasLocation.set(event.uuid, hasLocation);
    });
    
    return { count, eventHasLocation };
  }, [events]);
  
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
    setSelectedMsgTypes([]);
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
    // Special handling for our custom source SuperTag name column
    if (field.field === 'sourceSupertagName') {
      const sourceSupertagId = rowData.metadata?.props?.sourceSupertagId;
      if (!sourceSupertagId) return '';
      
      // Use the already calculated name if available, otherwise calculate it
      if (rowData.sourceSupertagName) {
        return rowData.sourceSupertagName;
      }
      
      return getSourceSupertagName(sourceSupertagId);
    }

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
      // If this is the top-level latitude field
      else if (field.field === 'latitude') {
        longitude = rowData.longitude;
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
    
    // Format temperature (including fahrenheit)
    if (fieldName.includes('temp') || fieldName.includes('temperature') || fieldName.includes('fahrenheit')) {
      const num = parseFloat(value);
      if (!isNaN(num)) {
        return fieldName.includes('fahrenheit') ? `${num.toFixed(1)}°F` : `${num.toFixed(1)}°C`;
      }
    }
    
    // Format battery voltage (not a percentage, but a voltage value)
    if (fieldName.includes('batteryVoltage')) {
      const num = parseFloat(value);
      if (!isNaN(num)) {
        return `${num.toFixed(2)}V`;
      }
    }
    
    // Format battery consumption and capacity (could be percentage, but keep as raw value)
    if (fieldName.includes('batteryconsumed_mah')) {
      const num = parseFloat(value);
      if (!isNaN(num)) {
        return `${num.toFixed(2)} mAh`;
      }
    }

    if (fieldName.includes('batterycapacity_mah')) {
      const num = parseFloat(value);
      if (!isNaN(num)) {
        return `${num.toFixed(2)} mAh`;
      }
    }
    
    // Format other percentage values
    if (fieldName.includes('percent') || fieldName.includes('level')) {
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
    
    // Format boolean values specifically for lowVoltageFlag
    if (fieldName.includes('lowvoltageflag')) {
      const isLowVoltage = value === true || value === 'true';
      return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
          isLowVoltage ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
        }`}>
          {isLowVoltage ? 'Low' : 'OK'}
        </span>
      );
    }
    
    // Format chargeState
    if (fieldName.includes('chargestate')) {
      let state = String(value).toLowerCase();
      let color = 'gray';
      
      switch (state) {
        case 'charging':
          color = 'green';
          break;
        case 'discharging':
          color = 'yellow';
          break;
        case 'full':
          color = 'blue';
          break;
        case 'low':
          color = 'red';
          break;
      }
      
      return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-${color}-100 text-${color}-800`}>
          {state.charAt(0).toUpperCase() + state.slice(1)}
        </span>
      );
    }
    
    // Format event count values
    if (fieldName.includes('evcount')) {
      const num = parseInt(value, 10);
      if (!isNaN(num)) {
        return num.toString();
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
  
  // Custom action template to add "Show on Map" button for events with location
  const actionTemplate = (rowData: any) => {
    // Check if this event has location data
    const hasLocation = locationDataInfo.eventHasLocation.get(rowData.uuid) || false;
    
    if (!hasLocation) return null;
    
    return (
      <EventRowMapSync
        eventId={rowData.uuid}
        time={rowData.time}
        locationAvailable={hasLocation}
        selectedEventId={selectedEventId}
        onEventSelect={(id) => handleEventSelect(id)}
        setCurrentView={setCurrentView}
      />
    );
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
      
      // Add sourceSupertagName if available
      if (event.sourceSupertagName) {
        flatEvent.sourceSupertagName = event.sourceSupertagName;
      } else if (event.metadata?.props?.sourceSupertagId) {
        flatEvent.sourceSupertagName = getSourceSupertagName(event.metadata.props.sourceSupertagId);
      }
      
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
      
      // Add top level properties like address
      Object.entries(event).forEach(([key, value]) => {
        if (!key.startsWith('metadata') && !key.startsWith('value') && 
            key !== 'uuid' && key !== 'time' && key !== 'type' && 
            key !== 'links' && key !== 'tags') {
          flatEvent[key] = value;
        }
      });
      
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
  
  // Handle message type filter - updated to work with multiple selections
  const handleMsgTypeFilterChange = (types: string[]) => {
    setSelectedMsgTypes(types);
    
    const newFilters = { ...filters };
    
    if (types && types.length > 0) {
      // Initialize the filter structure properly for multiple values
      newFilters['metadata.props.msgType'] = { 
        value: types, 
        matchMode: 'in' 
      };
    } else {
      // Remove filter if no types selected
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
    setVisibleColumns([...allColumns, 'sourceSupertagName']);
  };

  const handleDeselectAll = () => {
    // Keep mandatory columns like time and type
    setVisibleColumns(['time', 'metadata.props.msgType', 'sourceSupertagName']);
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

  // Handle event selection (for synchronizing between table and map)
  const handleEventSelect = (eventId: string) => {
    setSelectedEventId(eventId);
    
    // If in table view and the event has location, find and highlight the row
    if (currentView === 'table' && dt.current) {
      // Find the event in the data
      const event = events.find(e => e.uuid === eventId);
      if (event) {
        // Scroll to and select the row in the table
        dt.current.scrollToSelection();
      }
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
          selectedMsgTypes={selectedMsgTypes}
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
        
        {/* View selector for table/map */}
        <EventViewSelector
          currentView={currentView}
          setCurrentView={setCurrentView}
          locationCount={locationDataInfo.count.total}
          totalCount={events.length}
        />
        
        {/* Show the current view (table or map) */}
        {currentView === 'table' ? (
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
            actionTemplate={actionTemplate}
            selectedEventId={selectedEventId}
            onEventSelect={handleEventSelect}
          />
        ) : (
          <EventMap
            events={events}
            selectedEventId={selectedEventId}
            onEventSelect={handleEventSelect}
            mapHeight={500}
          />
        )}
        
        {/* Load more button for both views */}
        {currentView === 'map' && hasMore && (
          <div className="flex justify-center mt-2 mb-2">
            <button
              onClick={loadMore}
              disabled={loading}
              className="btn btn-secondary"
            >
              {loading ? 'Loading...' : 'Load More Events'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}