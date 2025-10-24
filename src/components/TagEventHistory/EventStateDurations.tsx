import React, { useState, useEffect, useMemo } from 'react';
import { Chart } from 'primereact/chart';
import { Dropdown } from 'primereact/dropdown';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';
import { Panel } from 'primereact/panel';
import { Clock, PieChart, BarChart2, Filter } from 'lucide-react';
import { TagEvent } from '../../types';
import { formatDuration, formatTimestampForDisplay, normalizeIsoAssumeUtc } from '../../utils/dateUtils';
import { usePersistedState } from '../../hooks/usePersistedState';

interface EventStateDurationsProps {
  events: TagEvent[];
  dateRange: Date[];
}

interface StateParameter {
  id: string;
  name: string;
  path: string;
  description: string;
  type: 'boolean' | 'string' | 'number';
}

interface StateDuration {
  value: string;
  totalDuration: number; // in milliseconds
  percentage: number;
  occurrences: number;
  firstSeen: Date;
  lastSeen: Date;
  color?: string;
}

export function EventStateDurations({ events, dateRange }: EventStateDurationsProps) {
  const [selectedParameter, setSelectedParameter] = usePersistedState<StateParameter | null>('eventStateDurations.selectedParameter', null);
  const [chartType, setChartType] = usePersistedState<'pie' | 'bar'>('eventStateDurations.chartType', 'pie');

  // State duration data
  const [durations, setDurations] = useState<StateDuration[]>([]);
  
  // Define parameters that can be analyzed for state durations
  const availableParameters = useMemo(() => {
    // Start with a set of known parameters to analyze
    const knownParameters: StateParameter[] = [
      { 
        id: 'batteryStatus', 
        name: 'Battery Status', 
        path: 'metadata.props.lowVoltageFlag', 
        description: 'Battery level status',
        type: 'boolean'
      },
      { 
        id: 'motionState', 
        name: 'Motion State', 
        path: 'metadata.props.motionState', 
        description: 'Whether the tag is in motion',
        type: 'boolean'
      },
      { 
        id: 'chargeState', 
        name: 'Charge State', 
        path: 'metadata.props.chargeState', 
        description: 'Battery charging status',
        type: 'string'
      },
      { 
        id: 'msgType', 
        name: 'Message Type', 
        path: 'metadata.props.msgType', 
        description: 'Type of message event',
        type: 'string'
      },
      {
        id: 'hydrophobic',
        name: 'Hydrophobic Status',
        path: 'metadata.props.hydrophobic',
        description: 'Whether the tag is hydrophobic',
        type: 'boolean'
      }
    ];

    // Discover additional parameters from the events data
    if (events.length > 0) {
      // Look for boolean or enum-like parameters in the events
      const discoveredParams = new Map<string, StateParameter>();
      
      // Function to check if a field has multiple possible values but not too many
      const isEnumLike = (values: Set<any>) => {
        return values.size > 1 && values.size <= 10;
      };
      
      // Look through events to find potential parameters
      events.forEach(event => {
        // Check metadata.props for potential parameters
        if (event.metadata?.props) {
          Object.entries(event.metadata.props).forEach(([key, value]) => {
            // Skip known parameters and ignore complex objects
            if (knownParameters.some(p => p.path === `metadata.props.${key}`)) return;
            if (typeof value === 'object') return;
            
            // For potential new parameters, track their possible values
            const paramId = `metadata.props.${key}`;
            if (!discoveredParams.has(paramId)) {
              discoveredParams.set(paramId, {
                id: paramId,
                name: key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase()),
                path: paramId,
                description: `Values from metadata.props.${key}`,
                type: typeof value === 'boolean' ? 'boolean' : typeof value === 'number' ? 'number' : 'string'
              });
            }
          });
        }
        
        // Also check value object for potential parameters
        if (event.value) {
          Object.entries(event.value).forEach(([key, value]) => {
            // Skip known parameters and ignore complex objects
            if (knownParameters.some(p => p.path === `value.${key}`)) return;
            if (typeof value === 'object') return;
            
            // For potential new parameters, track their possible values
            const paramId = `value.${key}`;
            if (!discoveredParams.has(paramId)) {
              discoveredParams.set(paramId, {
                id: paramId,
                name: key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase()),
                path: paramId,
                description: `Values from value.${key}`,
                type: typeof value === 'boolean' ? 'boolean' : typeof value === 'number' ? 'number' : 'string'
              });
            }
          });
        }
      });

      // Filter discovered parameters to keep only those with enum-like values
      const validDiscoveredParams: StateParameter[] = [];
      const paramValues = new Map<string, Set<any>>();
      
      // First pass: collect all values for each parameter
      events.forEach(event => {
        discoveredParams.forEach((param, paramId) => {
          const pathParts = param.path.split('.');
          let value = event;
          
          // Navigate the path to get the value
          for (const part of pathParts) {
            if (value && typeof value === 'object') {
              value = value[part];
            } else {
              value = undefined;
              break;
            }
          }
          
          // If we found a value, add it to the set of values for this parameter
          if (value !== undefined) {
            if (!paramValues.has(paramId)) {
              paramValues.set(paramId, new Set());
            }
            paramValues.get(paramId)?.add(String(value));
          }
        });
      });
      
      // Second pass: add parameters with enum-like values to the valid list
      paramValues.forEach((values, paramId) => {
        if (isEnumLike(values)) {
          const param = discoveredParams.get(paramId);
          if (param) {
            validDiscoveredParams.push(param);
          }
        }
      });
      
      // Combine known and discovered parameters
      return [...knownParameters, ...validDiscoveredParams];
    }
    
    return knownParameters;
  }, [events]);
  
  // Set default parameter when available parameters change
  useEffect(() => {
    if (availableParameters.length > 0 && !selectedParameter) {
      // Try to find a high-value parameter like battery status or motion state first
      const priorityParams = ['batteryStatus', 'motionState', 'chargeState', 'msgType'];
      const defaultParam = availableParameters.find(p => 
        priorityParams.includes(p.id)
      ) || availableParameters[0];
      
      setSelectedParameter(defaultParam);
    }
  }, [availableParameters, selectedParameter]);

  // Calculate durations for the selected parameter
  useEffect(() => {
    if (!selectedParameter || events.length === 0) {
      setDurations([]);
      return;
    }
    
    // Sort events by time for accurate duration calculation
    const sortedEvents = [...events].sort(
      (a, b) => new Date(normalizeIsoAssumeUtc(a.time)).getTime() - new Date(normalizeIsoAssumeUtc(b.time)).getTime()
    );
    
    // Helper function to get a value from an event using the path
    const getValueFromPath = (event: TagEvent, path: string): string => {
      const parts = path.split('.');
      let value = event as any;
      
      for (const part of parts) {
        if (value && typeof value === 'object') {
          value = value[part];
        } else {
          return 'unknown';
        }
      }
      
      // Convert to string for consistent handling
      return value !== undefined && value !== null ? String(value) : 'unknown';
    };
    
    // Track state changes and durations
    const stateDurations: Map<string, {
      totalMs: number;
      occurrences: number;
      firstSeen: Date;
      lastSeen: Date;
    }> = new Map();
    
    // Start and end times from the date range or fall back to events
    const startTime = dateRange[0] 
      ? dateRange[0].getTime()
      : new Date(normalizeIsoAssumeUtc(sortedEvents[0].time)).getTime();
      
    const endTime = dateRange[1] 
      ? dateRange[1].getTime() 
      : new Date(normalizeIsoAssumeUtc(sortedEvents[sortedEvents.length - 1].time)).getTime();
    
    // Total duration in ms of the analyzed period
    const totalDuration = endTime - startTime;
    
    // Initialize with first event's state
    let currentState = getValueFromPath(sortedEvents[0], selectedParameter.path);
    let currentStateStartTime = new Date(normalizeIsoAssumeUtc(sortedEvents[0].time)).getTime();
    
    // Initialize the first state's tracking
    if (!stateDurations.has(currentState)) {
      stateDurations.set(currentState, {
        totalMs: 0,
        occurrences: 1,
        firstSeen: new Date(normalizeIsoAssumeUtc(sortedEvents[0].time)),
        lastSeen: new Date(normalizeIsoAssumeUtc(sortedEvents[0].time))
      });
    }
    
    // Process all events
    for (let i = 1; i < sortedEvents.length; i++) {
      const event = sortedEvents[i];
      const eventTime = new Date(normalizeIsoAssumeUtc(event.time)).getTime();
      const eventState = getValueFromPath(event, selectedParameter.path);
      
      // If state changed, update durations
      if (eventState !== currentState) {
        // Calculate duration of the previous state
        const stateDuration = eventTime - currentStateStartTime;
        
        // Update previous state's total duration
        const prevStateStats = stateDurations.get(currentState);
        if (prevStateStats) {
          stateDurations.set(currentState, {
            totalMs: prevStateStats.totalMs + stateDuration,
            occurrences: prevStateStats.occurrences,
            firstSeen: prevStateStats.firstSeen,
            lastSeen: new Date(normalizeIsoAssumeUtc(event.time))
          });
        }
        
        // Start tracking new state
        if (!stateDurations.has(eventState)) {
          stateDurations.set(eventState, {
            totalMs: 0,
            occurrences: 1,
            firstSeen: new Date(normalizeIsoAssumeUtc(event.time)),
            lastSeen: new Date(normalizeIsoAssumeUtc(event.time))
          });
        } else {
          // Update occurrences for existing state
          const stats = stateDurations.get(eventState)!;
          stateDurations.set(eventState, {
            ...stats,
            occurrences: stats.occurrences + 1,
            lastSeen: new Date(normalizeIsoAssumeUtc(event.time))
          });
        }
        
        // Update current state tracking
        currentState = eventState;
        currentStateStartTime = eventTime;
      }
    }
    
    // Handle the final state's duration (from last state change to end time)
    const finalStateDuration = endTime - currentStateStartTime;
    const finalStateStats = stateDurations.get(currentState);
    if (finalStateStats) {
      stateDurations.set(currentState, {
        totalMs: finalStateStats.totalMs + finalStateDuration,
        occurrences: finalStateStats.occurrences,
        firstSeen: finalStateStats.firstSeen,
        lastSeen: new Date(endTime)
      });
    }
    
    // Convert Map to array and calculate percentages
    const durationArray: StateDuration[] = Array.from(stateDurations.entries()).map(([value, stats]) => {
      return {
        value: value,
        totalDuration: stats.totalMs,
        percentage: (stats.totalMs / totalDuration) * 100,
        occurrences: stats.occurrences,
        firstSeen: stats.firstSeen,
        lastSeen: stats.lastSeen
      };
    });
    
    // Sort by duration (highest first)
    durationArray.sort((a, b) => b.totalDuration - a.totalDuration);
    
    // Generate consistent colors for the states
    const colorPalette = [
      '#3b82f6', // blue-500
      '#10b981', // green-500
      '#f59e0b', // amber-500
      '#ef4444', // red-500
      '#8b5cf6', // violet-500
      '#ec4899', // pink-500
      '#06b6d4', // cyan-500
      '#f97316', // orange-500
      '#14b8a6', // teal-500
      '#a855f7', // purple-500
    ];
    
    // Map known states to specific colors for consistency
    const colorMap: Record<string, string> = {
      'true': '#10b981', // green-500
      'false': '#6b7280', // gray-500
      '0': '#ef4444', // red-500
      '1': '#10b981', // green-500
      'charging': '#10b981', // green-500
      'discharging': '#f59e0b', // amber-500
      'low': '#ef4444', // red-500
      'unknown': '#6b7280', // gray-500
    };
    
    // Assign colors to each state
    const coloredDurations = durationArray.map((duration, index) => ({
      ...duration,
      color: colorMap[duration.value] || colorPalette[index % colorPalette.length]
    }));
    
    setDurations(coloredDurations);
  }, [selectedParameter, events, dateRange]);

  // Generate chart data
  const chartData = useMemo(() => {
    if (durations.length === 0) return null;
    
    if (chartType === 'pie') {
      return {
        labels: durations.map(d => {
          // Format label based on selected parameter
          if (selectedParameter?.id === 'batteryStatus') {
            return d.value === 'true' ? 'Low Battery' : d.value === 'false' ? 'Normal Battery' : d.value;
          }
          if (selectedParameter?.id === 'motionState') {
            return d.value === 'true' ? 'Moving' : d.value === 'false' ? 'Stationary' : d.value;
          }
          if (selectedParameter?.id === 'chargeState') {
            // Capitalize charge state
            return d.value.charAt(0).toUpperCase() + d.value.slice(1);
          }
          return d.value;
        }),
        datasets: [
          {
            data: durations.map(d => d.percentage.toFixed(1)),
            backgroundColor: durations.map(d => d.color),
            hoverBackgroundColor: durations.map(d => d.color)
          }
        ]
      };
    } else {
      return {
        labels: durations.map(d => {
          // Format label based on selected parameter
          if (selectedParameter?.id === 'batteryStatus') {
            return d.value === 'true' ? 'Low Battery' : d.value === 'false' ? 'Normal Battery' : d.value;
          }
          if (selectedParameter?.id === 'motionState') {
            return d.value === 'true' ? 'Moving' : d.value === 'false' ? 'Stationary' : d.value;
          }
          if (selectedParameter?.id === 'chargeState') {
            // Capitalize charge state
            return d.value.charAt(0).toUpperCase() + d.value.slice(1);
          }
          return d.value;
        }),
        datasets: [
          {
            label: 'Duration (hours)',
            data: durations.map(d => (d.totalDuration / (1000 * 60 * 60)).toFixed(2)),
            backgroundColor: durations.map(d => d.color),
            borderColor: durations.map(d => d.color),
            borderWidth: 1
          }
        ]
      };
    }
  }, [durations, chartType, selectedParameter]);
  
  // Chart options
  const chartOptions = useMemo(() => {
    if (chartType === 'pie') {
      return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              boxWidth: 15,
              padding: 10
            }
          },
          tooltip: {
            callbacks: {
              label: (context: any) => {
                const label = context.label || '';
                const value = context.raw || 0;
                return `${label}: ${value}% (${formatDuration(durations[context.dataIndex]?.totalDuration)})`;
              }
            }
          }
        }
      };
    } else {
      return {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Duration (hours)'
            }
          },
          x: {
            title: {
              display: true,
              text: selectedParameter?.name || 'State'
            },
            ticks: {
              maxRotation: 45,
              minRotation: 45
            }
          }
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: (context: any) => {
                const index = context.dataIndex;
                const hours = parseFloat(context.raw).toFixed(2);
                return `Duration: ${hours} hours (${formatDuration(durations[index]?.totalDuration)})`;
              }
            }
          }
        },
        indexAxis: 'x'
      };
    }
  }, [chartType, durations, selectedParameter]);

  // Format cell values for state display
  const formatStateValue = (value: string) => {
    if (selectedParameter?.id === 'batteryStatus') {
      const isBatteryLow = value === 'true';
      return (
        <Tag 
          severity={isBatteryLow ? 'danger' : 'success'}
          value={isBatteryLow ? 'Low Battery' : 'Normal Battery'}
        />
      );
    }
    
    if (selectedParameter?.id === 'motionState') {
      const isMoving = value === 'true';
      return (
        <Tag 
          severity={isMoving ? 'success' : 'info'}
          value={isMoving ? 'Moving' : 'Stationary'}
        />
      );
    }
    
    if (selectedParameter?.id === 'chargeState') {
      let severity = 'info';
      if (value === 'charging') severity = 'success';
      if (value === 'discharging') severity = 'warning';
      if (value === 'low') severity = 'danger';
      
      return (
        <Tag 
          severity={severity}
          value={value.charAt(0).toUpperCase() + value.slice(1)}
        />
      );
    }
    
    if (selectedParameter?.id === 'msgType') {
      // Message type severity based on message type
      let severity = 'info';
      if (value === '4') severity = 'warning'; // LB-Only Location
      if (value === '5') severity = 'success'; // GPS Location
      if (value === '6') severity = 'info';    // WiFi Location
      if (value === '7') severity = 'warning'; // Cell ID Location
      if (value === '8') severity = 'success'; // Event Count
      if (value === '20') severity = 'info';   // SSF Sensor Data
      
      // Map message type IDs to human-readable names
      const msgTypeMap: Record<string, string> = {
        '1': 'Heartbeat',
        '4': 'LB-Only Location',
        '5': 'GPS Location',
        '6': 'WiFi Location',
        '7': 'Cell ID Location',
        '8': 'Event Count',
        '20': 'SSF Sensor Data',
        '23': 'Accel and Shock Data'
      };
      
      return (
        <Tag 
          severity={severity}
          value={msgTypeMap[value] || `Type ${value}`}
        />
      );
    }
    
    // Default case: just show the value
    return value === 'unknown' ? <i className="text-gray-400">Unknown</i> : value;
  };

  if (events.length === 0) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-center">
        <p className="text-gray-500">No events available for duration analysis.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="mb-4 flex flex-col sm:flex-row justify-between gap-4">
        <div className="space-y-2">
          <h3 className="font-medium flex items-center">
            <Clock className="h-5 w-5 mr-2 text-blue-500" />
            State Duration Analysis
          </h3>
          <p className="text-sm text-gray-600">
            Analyze how long different states were active during the selected time period.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 mt-2 sm:mt-0">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Parameter</label>
            <Dropdown
              value={selectedParameter}
              options={availableParameters}
              onChange={(e) => setSelectedParameter(e.value)}
              optionLabel="name"
              placeholder="Select Parameter"
              className="w-full sm:w-56"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Chart Type</label>
            <div className="flex border rounded-md overflow-hidden">
              <button
                className={`flex items-center px-3 py-1.5 ${
                  chartType === 'pie' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
                onClick={() => setChartType('pie')}
              >
                <PieChart className="h-4 w-4 mr-1" />
                <span className="text-sm">Pie</span>
              </button>
              <button
                className={`flex items-center px-3 py-1.5 ${
                  chartType === 'bar' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
                onClick={() => setChartType('bar')}
              >
                <BarChart2 className="h-4 w-4 mr-1" />
                <span className="text-sm">Bar</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart View */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="h-80">
            {chartData && (
              chartType === 'pie' 
                ? <Chart type="pie" data={chartData} options={chartOptions} style={{ height: '100%' }} />
                : <Chart type="bar" data={chartData} options={chartOptions} style={{ height: '100%' }} />
            )}
          </div>
        </div>

        {/* Data Table */}
        <Panel 
          header={
            <div className="flex items-center">
              <Filter className="h-4 w-4 mr-2" />
              <span>Duration Details</span>
            </div>
          }
          className="shadow-sm"
        >
          <DataTable
            value={durations}
            responsiveLayout="stack"
            breakpoint="960px"
            stripedRows
            className="p-datatable-sm"
            emptyMessage="No data available for this parameter"
          >
            <Column
              header="State"
              body={(rowData) => formatStateValue(rowData.value)}
              style={{ width: '120px' }}
              sortable
            />
            <Column
              field="percentage"
              header="Percentage"
              body={(rowData) => (
                <div className="flex items-center space-x-2">
                  <div className="w-full max-w-[100px] bg-gray-200 rounded-full h-2.5">
                    <div 
                      className="h-2.5 rounded-full" 
                      style={{ 
                        width: `${Math.min(100, Math.max(1, rowData.percentage))}%`,
                        backgroundColor: rowData.color 
                      }}
                    ></div>
                  </div>
                  <span>{rowData.percentage.toFixed(1)}%</span>
                </div>
              )}
              sortable
            />
            <Column
              header="Duration"
              body={(rowData) => formatDuration(rowData.totalDuration)}
              sortable
              sortField="totalDuration"
            />
            <Column
              field="occurrences"
              header="Changes"
              sortable
            />
            <Column
              header="First Seen"
              body={(rowData) => formatTimestampForDisplay(rowData.firstSeen)}
              sortable
              sortField="firstSeen"
            />
            <Column
              header="Last Seen"
              body={(rowData) => formatTimestampForDisplay(rowData.lastSeen)}
              sortable
              sortField="lastSeen"
            />
          </DataTable>
        </Panel>
      </div>
    </div>
  );
}