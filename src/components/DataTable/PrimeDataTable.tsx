import React, { useState, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { Calendar } from 'primereact/calendar';
import { Dialog } from 'primereact/dialog';
import { Toast } from 'primereact/toast';
import { Toolbar } from 'primereact/toolbar';
import { useNavigate } from 'react-router-dom';
import { History, Plus, Trash2, Droplets, Check, GripVertical } from 'lucide-react';

import { SuperTag } from '../../types';
import { BulkOperationsModal } from '../BulkOperationsModal';
import { HydrophobicBulkModal } from '../HydrophobicBulkModal';
import { useTableState } from './hooks/useTableState';
import { TableFilters } from './TableFilters';
import { TableActions } from './TableActions';
import { TableColumns } from './TableColumns';
import { TableRows } from './TableRows';
import { TableFooter } from './TableFooter';
import { GeotabModal } from './modals/GeotabModal';
import { HydrophobicModal } from './modals/HydrophobicModal';
import { ColumnFilterModal } from './ColumnFilterModal';

// Import component styles
import './index.css';

// Registration token constant
const SUPERTAG_REGISTRATION_TOKEN = 'D29B3BE8F2CC9A1A7051';

interface PrimeDataTableProps {
  data: SuperTag[];
  auth: { token?: string; username?: string };
  onDataChange: () => void;
  onPairGeotab: (macAddress: string, geotabSerialNumber: string) => Promise<{ success: boolean; error?: Error }>;
  onUnpairGeotab: (macAddress: string) => Promise<{ success: boolean; error?: Error }>;
  onSetHydrophobic: (nodeAddress: string, value: boolean) => Promise<{ success: boolean; error?: Error }>;
}

// Helper function to format column names for display
const formatColumnName = (column: string): string => {
  // Remove any prefix paths (like metadata.props. or value.)
  let displayName = column;
  
  if (column.startsWith('metadata.props.')) {
    displayName = column.replace('metadata.props.', '');
  } else if (column.startsWith('value.')) {
    displayName = column.replace('value.', '');
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
    .replace(/\bAddr\b/g, 'Address');
  
  // Clean up any double spaces
  displayName = displayName.replace(/\s+/g, ' ').trim();
  
  return displayName;
};

export function PrimeDataTable({
  data,
  auth,
  onDataChange,
  onPairGeotab,
  onUnpairGeotab,
  onSetHydrophobic
}: PrimeDataTableProps) {
  const navigate = useNavigate();
  const toast = useRef<Toast>(null);
  const dt = useRef<DataTable<SuperTag[]>>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  
  // Load table state using custom hook
  const { 
    state, 
    actions, 
    modals 
  } = useTableState({ 
    data, 
    onDataChange, 
    onPairGeotab, 
    onUnpairGeotab, 
    onSetHydrophobic,
    SUPERTAG_REGISTRATION_TOKEN
  });

  // UI state for modals not managed by the hook
  const [columnFilterModalVisible, setColumnFilterModalVisible] = useState(false);
  const [bulkMenuVisible, setBulkMenuVisible] = useState(false);
  
  // Ref for bulk operations button
  const bulkButtonRef = useRef<HTMLButtonElement>(null);

  // Handle view event history button click
  const handleViewEventHistory = (row: SuperTag) => {
    if (row.nodeAddress) {
      // Navigate to event history page with tag information
      navigate(`/event-history/${encodeURIComponent(row.nodeAddress)}`, {
        state: { tag: row }
      });
    }
  };

  // Safe filter callback - ensures filters[field] is properly initialized
  const safeFilterCallback = (field: string, value: any, index: number) => {
    // Create a new filters object with the updated value
    const filters = {};
    
    // Initialize field in filters object if it doesn't exist
    if (!filters[field]) {
      filters[field] = {};
    }
    
    // Set the value and other required properties
    filters[field].value = value;
    filters[field].matchMode = filters[field].matchMode || 'contains';
    
    // Update filters state through DataTable reference
    dt.current?.filter(value, field, 'contains');
  };

  // Template for action buttons
  const actionBodyTemplate = (rowData: SuperTag) => {
    return (
      <div className="flex justify-content-center gap-2">
        {rowData.nodeAddress && (
          <Button 
            icon={<History className="h-4 w-4" />}
            className="p-button-rounded p-button-info p-button-text"
            onClick={() => handleViewEventHistory(rowData)}
            tooltip="View Event History"
            tooltipOptions={{ position: 'top' }}
          />
        )}
        
        {!rowData.geotabSerialNumber ? (
          <Button
            icon={<Plus className="h-4 w-4" />}
            className="p-button-rounded p-button-success p-button-text"
            onClick={() => {
              actions.setSelectedRow(rowData);
              actions.setShowGeotabModal(true);
            }}
            tooltip="Pair Geotab"
            tooltipOptions={{ position: 'top' }}
          />
        ) : (
          <Button
            icon={<Trash2 className="h-4 w-4" />}
            className="p-button-rounded p-button-danger p-button-text"
            onClick={() => {
              actions.setSelectedRow(rowData);
              actions.handleUnpairGeotab();
            }}
            tooltip="Unpair Geotab"
            tooltipOptions={{ position: 'top' }}
          />
        )}
        
        {rowData.nodeAddress && (
          <Button
            icon={<Droplets className="h-4 w-4" />}
            className="p-button-rounded p-button-primary p-button-text"
            onClick={() => {
              actions.setSelectedRow(rowData);
              actions.setShowHydrophobicModal(true);
            }}
            tooltip="Toggle Hydrophobic"
            tooltipOptions={{ position: 'top' }}
          />
        )}
      </div>
    );
  };

  // Scroll to table function
  const scrollToTable = () => {
    if (tableRef.current) {
      tableRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Hide bulk menu when clicking outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (bulkMenuVisible && bulkButtonRef.current && !bulkButtonRef.current.contains(event.target as Node)) {
        setBulkMenuVisible(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [bulkMenuVisible]);

  // Geotab modal footer for PrimeReact Dialog
  const geotabModalFooter = (
    <div>
      <Button 
        label="Cancel" 
        icon="pi pi-times" 
        onClick={() => actions.setShowGeotabModal(false)} 
        className="p-button-text" 
      />
      <Button 
        label="Pair" 
        icon="pi pi-check" 
        onClick={actions.handlePairGeotab} 
        disabled={!state.newGeotabSerial}
        autoFocus 
      />
    </div>
  );

  // Hydrophobic modal footer for PrimeReact Dialog
  const hydrophobicModalFooter = (
    <div>
      <Button 
        label="Cancel" 
        icon="pi pi-times" 
        onClick={() => actions.setShowHydrophobicModal(false)} 
        className="p-button-text" 
      />
    </div>
  );

  return (
    <div className="card" ref={tableRef}>
      <Toast ref={toast} />
      
      {/* Table Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <TableFilters
          filterText={state.filterText}
          setFilterText={actions.setFilterText}
          showSuperTagsOnly={state.showSuperTagsOnly}
          setShowSuperTagsOnly={actions.setShowSuperTagsOnly}
          handleRefreshData={actions.handleRefreshData}
          isRefreshing={state.isRefreshing}
          setShowColumnSelector={actions.setShowColumnSelector}
          setShowBulkModal={actions.setShowBulkModal}
          setShowHydrophobicBulkModal={actions.setShowHydrophobicBulkModal}
          setBulkMode={actions.setBulkMode}
          setHydrophobicBulkValue={actions.setHydrophobicBulkValue}
          selectedRow={state.selectedRow}
          setShowGeotabModal={actions.setShowGeotabModal}
          handleUnpairGeotab={actions.handleUnpairGeotab}
          setShowHydrophobicModal={actions.setShowHydrophobicModal}
          downloadCSV={actions.downloadCSV}
          columnFilters={state.columnFilters}
          showColumnFilterModal={columnFilterModalVisible}
          setShowColumnFilterModal={setColumnFilterModalVisible}
        />
        
        {/* Status and Filter Indicators */}
        <TableActions
          actionStatus={state.actionStatus}
          setActionStatus={actions.setActionStatus}
          filterText={state.filterText}
          showSuperTagsOnly={state.showSuperTagsOnly}
          setFilterText={actions.setFilterText}
          setShowSuperTagsOnly={actions.setShowSuperTagsOnly}
          columnFilters={state.columnFilters}
          clearColumnFilters={actions.clearColumnFilters}
          hasActiveColumnFilters={state.hasActiveColumnFilters}
        />
      </div>
      
      {/* Column Selector */}
      <TableColumns
        showColumnSelector={modals.showColumnSelector}
        filteredColumns={state.filteredColumns}
        columnVisibility={state.columnVisibility}
        setColumnVisibility={actions.setColumnVisibility}
        handleSelectAll={actions.handleSelectAll}
        handleDeselectAll={actions.handleDeselectAll}
        handleDragStart={actions.handleDragStart}
        handleDragOver={actions.handleDragOver}
        MANDATORY_COLUMNS={state.MANDATORY_COLUMNS}
        columnSearchTerm={state.columnSearchTerm}
        setColumnSearchTerm={actions.setColumnSearchTerm}
        setShowColumnSelector={actions.setShowColumnSelector}
        scrollToTable={scrollToTable}
      />
      
      {/* PrimeReact DataTable */}
      <DataTable
        ref={dt}
        value={state.sortedAndFilteredData}
        dataKey="macAddress"
        paginator
        rows={10}
        rowsPerPageOptions={[5, 10, 25, 50]}
        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
        currentPageReportTemplate="{first} to {last} of {totalRecords}"
        emptyMessage="No tags found"
        responsiveLayout="stack"
        breakpoint="960px"
        stripedRows
        resizableColumns
        columnResizeMode="fit"
        scrollable
        scrollHeight="flex"
        className="p-datatable-sm"
        onRowClick={(e) => actions.setSelectedRow(e.data)}
        selectionMode="single"
        selection={state.selectedRow}
      >
        {/* Actions column - moved to leftmost position */}
        <Column 
          body={actionBodyTemplate} 
          exportable={false} 
          header="Actions"
          style={{ width: '12rem', textAlign: 'center' }}
          frozen
        />
        
        {/* Dynamic columns based on columnOrder and visibility */}
        {state.columnOrder
          .filter(column => state.columnVisibility[column])
          .map(column => {
            // Special handling for specific column types
            if (column === 'lastEventTime') {
              return (
                <Column 
                  key={column}
                  field={column} 
                  header={(
                    <div 
                      className="flex items-center cursor-move"
                      draggable
                      onDragStart={() => actions.handleDragStart(column)}
                      onDragOver={(e) => actions.handleDragOver(e, column)}
                    >
                      <GripVertical className="h-4 w-4 mr-1 text-gray-400" />
                      <span>{formatColumnName(column)}</span>
                    </div>
                  )}
                  sortable
                  body={(rowData) => actions.formatCellValue(rowData[column], column)}
                  filter
                  filterField="lastEventTime"
                  dataType="date"
                  filterElement={(options) => (
                    <Calendar
                      value={options.value || undefined}
                      onChange={(e) => safeFilterCallback(options.field, e.value || '', options.index)}
                      dateFormat="mm/dd/yy"
                      placeholder="mm/dd/yyyy"
                      mask="99/99/9999"
                      showTime
                      hourFormat="24"
                    />
                  )}
                  showFilterMenu={false}
                />
              );
            }
            
            if (column === 'batteryStatus') {
              return (
                <Column 
                  key={column}
                  field={column} 
                  header={(
                    <div 
                      className="flex items-center cursor-move"
                      draggable
                      onDragStart={() => actions.handleDragStart(column)}
                      onDragOver={(e) => actions.handleDragOver(e, column)}
                    >
                      <GripVertical className="h-4 w-4 mr-1 text-gray-400" />
                      <span>{formatColumnName(column)}</span>
                    </div>
                  )}
                  sortable
                  body={(rowData) => actions.formatCellValue(rowData[column], column)}
                  filter
                  filterElement={(options) => (
                    <Dropdown
                      value={options.value || ''}
                      options={[
                        { label: 'All', value: '' },
                        { label: 'Good', value: '1' },
                        { label: 'Low', value: '0' }
                      ]}
                      onChange={(e) => safeFilterCallback(options.field, e.value, options.index)}
                      placeholder="Select"
                      className="p-column-filter w-full"
                    />
                  )}
                  showFilterMenu={false}
                />
              );
            }
            
            if (column === 'hydrophobic') {
              return (
                <Column 
                  key={column}
                  field={column} 
                  header={(
                    <div 
                      className="flex items-center cursor-move"
                      draggable
                      onDragStart={() => actions.handleDragStart(column)}
                      onDragOver={(e) => actions.handleDragOver(e, column)}
                    >
                      <GripVertical className="h-4 w-4 mr-1 text-gray-400" />
                      <span>{formatColumnName(column)}</span>
                    </div>
                  )}
                  sortable
                  body={(rowData) => actions.formatCellValue(rowData[column], column)}
                  filter
                  filterElement={(options) => (
                    <Dropdown
                      value={options.value || ''}
                      options={[
                        { label: 'All', value: '' },
                        { label: 'Yes', value: 'true' },
                        { label: 'No', value: 'false' }
                      ]}
                      onChange={(e) => safeFilterCallback(options.field, e.value, options.index)}
                      placeholder="Select"
                      className="p-column-filter w-full"
                    />
                  )}
                  showFilterMenu={false}
                />
              );
            }
            
            // Default column handling
            return (
              <Column 
                key={column}
                field={column} 
                header={(
                  <div 
                    className="flex items-center cursor-move"
                    draggable
                    onDragStart={() => actions.handleDragStart(column)}
                    onDragOver={(e) => actions.handleDragOver(e, column)}
                  >
                    <GripVertical className="h-4 w-4 mr-1 text-gray-400" />
                    <span>{formatColumnName(column)}</span>
                  </div>
                )}
                sortable
                filter
                filterPlaceholder={`Search ${formatColumnName(column)}`}
                filterElement={(options) => (
                  <InputText
                    value={options.value || ''}
                    onChange={(e) => safeFilterCallback(options.field, e.target.value, options.index)}
                    placeholder={`Search ${formatColumnName(column)}`}
                    className="p-column-filter w-full"
                  />
                )}
                showFilterMenu={false}
                body={(rowData) => actions.formatCellValue(rowData[column], column)}
              />
            );
          })
        }
      </DataTable>
      
      {/* Table Footer */}
      <TableFooter
        sortedAndFilteredData={state.sortedAndFilteredData}
        totalData={data.length}
        downloadCSV={actions.downloadCSV}
      />

      {/* Geotab Pairing Modal */}
      <GeotabModal
        showModal={modals.showGeotabModal}
        selectedRow={state.selectedRow}
        newGeotabSerial={state.newGeotabSerial}
        setNewGeotabSerial={actions.setNewGeotabSerial}
        setShowModal={actions.setShowGeotabModal}
        handlePairGeotab={actions.handlePairGeotab}
      />

      {/* Hydrophobic Setting Modal */}
      <HydrophobicModal
        showModal={modals.showHydrophobicModal}
        selectedRow={state.selectedRow}
        setShowModal={actions.setShowHydrophobicModal}
        handleSetHydrophobic={actions.handleSetHydrophobic}
      />

      {/* Column Filter Modal */}
      <ColumnFilterModal
        isOpen={columnFilterModalVisible}
        onClose={() => setColumnFilterModalVisible(false)}
        columns={state.columnOrder}
        columnFilters={state.columnFilters}
        updateColumnFilter={actions.updateColumnFilter}
        clearColumnFilters={actions.clearColumnFilters}
      />

      {/* Bulk Operations Modals */}
      <BulkOperationsModal
        isOpen={modals.showBulkModal}
        onClose={() => actions.setShowBulkModal(false)}
        onComplete={onDataChange}
        auth={auth}
        mode={state.bulkMode}
      />

      <HydrophobicBulkModal
        isOpen={modals.showHydrophobicBulkModal}
        onClose={() => actions.setShowHydrophobicBulkModal(false)}
        onComplete={onDataChange}
        auth={auth}
        value={state.hydrophobicBulkValue}
        onValueChange={actions.setHydrophobicBulkValue}
      />
    </div>
  );
}