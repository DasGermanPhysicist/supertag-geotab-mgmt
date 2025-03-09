import { useState, useEffect } from 'react';
import { TagEventHistory, TagEvent } from '../types';
import { apiService } from '../services/api';
import { getLastDayTimeRange } from '../utils/dateUtils';

interface UseTagEventHistoryResult {
  loading: boolean;
  error: string | null;
  eventHistory: TagEventHistory | null;
  events: TagEvent[];
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: (startTime: string, endTime: string) => Promise<void>;
  allColumns: string[];
  setEvents: (events: TagEvent[]) => void; // Add setter for events to allow updating with address data
}

export function useTagEventHistory(
  nodeAddress: string | null,
  authToken: string | undefined,
  initialStartTime?: string,
  initialEndTime?: string
): UseTagEventHistoryResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [eventHistory, setEventHistory] = useState<TagEventHistory | null>(null);
  const [events, setEvents] = useState<TagEvent[]>([]);
  const [nextPageId, setNextPageId] = useState<string | null>(null);
  const [allColumns, setAllColumns] = useState<string[]>([]);
  
  // Fetch event history
  const fetchEventHistory = async (startTime: string, endTime: string, pageId?: string | null) => {
    if (!nodeAddress || !authToken) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Make sure we have valid start and end times
      if (!startTime || !endTime) {
        throw new Error("Start time and end time are required");
      }
      
      const data = await apiService.fetchTagEventHistory(
        nodeAddress,
        endTime,
        startTime,
        authToken,
        pageId || undefined
      );
      
      if (pageId) {
        // If loading more, append results but avoid duplicates based on UUID
        setEvents(prev => {
          // Create a map of existing UUIDs
          const existingUuids = new Map<string, boolean>();
          prev.forEach(event => {
            existingUuids.set(event.uuid, true);
          });
          
          // Filter out any results that already exist in the previous data
          const uniqueNewResults = data.results.filter(
            newEvent => !existingUuids.has(newEvent.uuid)
          );
          
          return [...prev, ...uniqueNewResults];
        });
      } else {
        // If new search, replace results
        setEvents(data.results);
      }
      
      setEventHistory(data);
      setNextPageId(data.nextPageId);
      
      // Extract all unique column names from events
      extractAllColumns(data.results);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tag event history');
    } finally {
      setLoading(false);
    }
  };
  
  // Enhanced recursive function to extract all possible columns, including deeply nested properties
  const extractAllColumns = (eventResults: TagEvent[]) => {
    // Initialize with basic event properties
    const columns = new Set<string>(['uuid', 'time', 'type']);
    
    // First, add all address-related columns to ensure they're included
    const addressColumns = [
      'formattedAddress', 
      'address_road', 
      'address_city', 
      'address_county',
      'address_state', 
      'address_postcode', 
      'address_country',
      'latitude',
      'longitude'
    ];
    
    addressColumns.forEach(col => columns.add(col));
    
    // Recursive function to extract all levels of nested properties
    const extractNestedProperties = (obj: any, prefix: string = '') => {
      if (!obj || typeof obj !== 'object') return;
      
      Object.entries(obj).forEach(([key, value]) => {
        const currentPath = prefix ? `${prefix}.${key}` : key;
        
        // Add the current property path to columns
        if (key !== 'links' && key !== 'tags') { // Skip certain system properties
          columns.add(currentPath);
        }
        
        // If the value is an object, recursively extract its properties
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          extractNestedProperties(value, currentPath);
        }
        
        // For arrays that contain objects, check the first item to get its structure
        if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
          extractNestedProperties(value[0], `${currentPath}[0]`);
        }
      });
    };
    
    // Process each event
    eventResults.forEach(event => {
      // Add top-level event properties
      Object.keys(event).forEach(key => {
        if (key !== 'metadata' && key !== 'value' && key !== 'links') {
          columns.add(key);
        }
      });
      
      // Extract all nested properties from metadata and value objects
      if (event.metadata) {
        extractNestedProperties(event.metadata, 'metadata');
      }
      
      if (event.value) {
        extractNestedProperties(event.value, 'value');
      }
      
      // Special handling for common but deeply nested properties
      const specialProperties = [
        'latitude', 'longitude', 'lat', 'lon', 'lng', 'accuracy', 
        'altitude', 'speed', 'heading', 'batteryLevel', 'batteryVoltage',
        'batteryConsumed', 'batteryCapacity', 'lowVoltageFlag', 'batteryConsumed_mAh',
        'batteryCapacity_mAh', 'evCount-LTEmSuccess', 'evCount-LTEmFailure',
        'chargeState', 'fahrenheit', 'sourceSupertagId'
      ];
      
      // Search for special properties in all nested objects
      const findSpecialProperties = (obj: any, prefix: string = '') => {
        if (!obj || typeof obj !== 'object') return;
        
        Object.entries(obj).forEach(([key, value]) => {
          const currentPath = prefix ? `${prefix}.${key}` : key;
          
          // Check if the current key is one of our special properties
          if (specialProperties.some(prop => key.toLowerCase().includes(prop.toLowerCase()))) {
            columns.add(currentPath);
          }
          
          // Recurse into nested objects
          if (value && typeof value === 'object' && !Array.isArray(value)) {
            findSpecialProperties(value, currentPath);
          }
        });
      };
      
      // Search for special properties in both metadata and value
      findSpecialProperties(event.metadata, 'metadata');
      findSpecialProperties(event.value, 'value');
    });
    
    // Convert the Set to an Array and sort it logically
    const columnsArray = Array.from(columns);
    
    // Define priority order for column groups
    const priorityOrder = [
      'time', 'uuid', 'type', 'metadata.props.msgType', 'metadata.props.msgTypeDescription',
      'formattedAddress', 'address_road', 'address_city', 'address_state', 'address_postcode', 'address_country',
      'latitude', 'longitude', 'metadata.props.latitude', 'metadata.props.longitude',
      'metadata.props.lowVoltageFlag', 'metadata.props.batteryVoltage', 'metadata.props.batteryConsumed_mAh', 
      'metadata.props.batteryCapacity_mAh', 'metadata.props.evCount-LTEmSuccess', 'metadata.props.evCount-LTEmFailure',
      'metadata.props.chargeState', 'metadata.props.fahrenheit', 'metadata.props.sourceSupertagId'
    ];
    
    // Sort columns with prioritized columns first, then by categories
    const sortedColumns = [
      // First, include priority columns in their defined order
      ...priorityOrder.filter(col => columnsArray.includes(col)),
      
      // Then include metadata.props columns (except those already included)
      ...columnsArray.filter(col => 
        col.startsWith('metadata.props.') && !priorityOrder.includes(col)
      ),
      
      // Then include location/position related columns not yet included
      ...columnsArray.filter(col => 
        (col.includes('lat') || col.includes('lon') || col.includes('lng') || 
         col.includes('accuracy') || col.includes('altitude') || col.includes('position')) &&
        !priorityOrder.includes(col) && !col.startsWith('metadata.props.')
      ),
      
      // Then include other metadata fields
      ...columnsArray.filter(col =>
        col.startsWith('metadata.') && 
        !col.startsWith('metadata.props.') &&
        !priorityOrder.includes(col)
      ),
      
      // Then include value properties
      ...columnsArray.filter(col =>
        col.startsWith('value.') && !priorityOrder.includes(col)
      ),
      
      // Finally include any remaining columns
      ...columnsArray.filter(col =>
        !col.startsWith('metadata.') && 
        !col.startsWith('value.') && 
        !priorityOrder.includes(col) &&
        !(col.includes('lat') || col.includes('lon') || col.includes('lng') || 
          col.includes('accuracy') || col.includes('altitude') || col.includes('position')) &&
        !addressColumns.includes(col)
      )
    ];
    
    setAllColumns(sortedColumns);
  };
  
  // Initial fetch on mount
  useEffect(() => {
    if (nodeAddress && authToken) {
      if (initialStartTime && initialEndTime) {
        fetchEventHistory(initialStartTime, initialEndTime);
      } else {
        // Default to last 24 hours if no dates provided
        const lastEventTime = new Date().toISOString();
        const { startTime, endTime } = getLastDayTimeRange(lastEventTime);
        fetchEventHistory(startTime, endTime);
      }
    }
  }, [nodeAddress, authToken]);
  
  // Load more data when available
  const loadMore = async () => {
    if (nextPageId && eventHistory) {
      const url = new URL(eventHistory.queryUrl.href);
      const pathParts = url.pathname.split('/');
      // Extract endTime and startTime from URL path
      const endTime = pathParts[pathParts.length - 2];
      const startTime = pathParts[pathParts.length - 1];
      
      await fetchEventHistory(startTime, endTime, nextPageId);
    }
  };
  
  // Refresh with new date range
  const refresh = async (startTime: string, endTime: string) => {
    await fetchEventHistory(startTime, endTime);
  };
  
  return {
    loading,
    error,
    eventHistory,
    events,
    hasMore: !!nextPageId,
    loadMore,
    refresh,
    allColumns,
    setEvents // Expose the setter to allow updating events with address data
  };
}