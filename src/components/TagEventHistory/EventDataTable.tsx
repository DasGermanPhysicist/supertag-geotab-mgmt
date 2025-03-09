import React from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import { GripVertical } from 'lucide-react';
import { InputText } from 'primereact/inputtext';
import { Calendar } from 'primereact/calendar';
import { Dropdown } from 'primereact/dropdown';
import { TagEvent } from '../../types';
import { getMessageTypeName } from '../../constants/messageTypes';

interface EventDataTableProps {
  events: TagEvent[];
  loading: boolean;
  filters: Record<string, any>;
  columnFilterMenuVisible: boolean;
  globalFilter: string;
  safeFilterCallback: (field: string, value: any, index: number) => void;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  visibleColumns: string[];
  columnOrder: string[];
  handleDragStart: (column: string) => void;
  handleDragOver: (e: React.DragEvent, targetColumn: string) => void;
  nestedPropertyTemplate: (rowData: any, field: { field: string }) => React.ReactNode;
  dtRef: React.RefObject<DataTable<TagEvent[]>>;
  msgTypeOptions: Array<{ label: string; value: string }>;
  actionTemplate?: (rowData: any) => React.ReactNode;
  selectedEventId?: string | null;
  onEventSelect?: (eventId: string) => void;
}

// Helper function to format column names for display
const formatColumnName = (column: string): string => {
  // Remove any prefix paths (like metadata.props. or value.)
  let displayName = column;
  
  if (column.startsWith('metadata.props.')) {
    displayName = column.replace('metadata.props.', '');
  } else if (column.startsWith('value.')) {
    displayName = column.replace('value.', '');
  } else if (column.startsWith('metadata.')) {
    displayName = column.replace('metadata.', '');
  } else if (column.startsWith('address_')) {
    displayName = column.replace('address_', '');
  }
  
  // Convert camelCase to spaced words with capital first letters
  displayName = displayName
    .replace(/([A-Z])/g, ' $1') // Add space before capital letters
    .replace(/^./, str => str.toUpperCase()); // Capitalize first letter
  
  // Handle special cases and common abbreviations
  displayName = displayName
    .replace(/\bId\b/g, 'ID')
    .replace(/\bUuid\b/g, 'UUID')
    .replace(/\bMac\b/g, 'MAC')
    .replace(/\bLat\b/g, 'Latitude')
    .replace(/\bLon\b/g, 'Longitude')
    .replace(/\bLng\b/g, 'Longitude')
    .replace(/\bAlt\b/g, 'Altitude')
    .replace(/\bTemp\b/g, 'Temperature')
    .replace(/\bMsg\b/g, 'Message')
    .replace(/\bAddr\b/g, 'Address')
    .replace(/\bProps\b/g, 'Properties');
  
  // Clean up any double spaces
  displayName = displayName.replace(/\s+/g, ' ').trim();
  
  return displayName;
};

export function EventDataTable({
  events,
  loading,
  filters,
  columnFilterMenuVisible,
  globalFilter,
  safeFilterCallback,
  hasMore,
  loadMore,
  visibleColumns,
  columnOrder,
  handleDragStart,
  handleDragOver,
  nestedPropertyTemplate,
  dtRef,
  msgTypeOptions,
  actionTemplate,
  selectedEventId,
  onEventSelect
}: EventDataTableProps) {
  
  // Text filter element template
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
  
  // Message type template
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
  
  // Handle row selection (for map sync)
  const handleRowSelection = (e: any) => {
    if (onEventSelect && e.data && e.data.uuid) {
      onEventSelect(e.data.uuid);
    }
  };
  
  return (
    <div className="card">
      <DataTable
        ref={dtRef}
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
        onRowClick={handleRowSelection}
        selectionMode="single"
        selection={events.find(e => e.uuid === selectedEventId)}
        dataKey="uuid"
        rowClassName={(data) => data.uuid === selectedEventId ? 'bg-blue-50' : ''}
      >
        {/* Action column for row-to-map sync if provided */}
        {actionTemplate && (
          <Column
            body={actionTemplate}
            header="Actions"
            style={{ width: '130px' }}
            exportable={false}
          />
        )}
        
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
                  <span>{formatColumnName(col)}</span>
                </div>
              }
              sortable
              body={(rowData, options) => nestedPropertyTemplate(rowData, options)}
              filter
              filterPlaceholder={`Search ${formatColumnName(col)}`}
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
  );
}