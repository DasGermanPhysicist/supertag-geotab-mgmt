import React, { useState, useEffect, useRef } from 'react';
import { SuperTag } from '../../types';
import { TableActions } from './TableActions';
import { TableColumns } from './TableColumns';
import { TableFilters } from './TableFilters';
import { TableRows } from './TableRows';
import { TableFooter } from './TableFooter';
import { GeotabModal } from './modals/GeotabModal';
import { HydrophobicModal } from './modals/HydrophobicModal';
import { BulkOperationsModal } from '../BulkOperationsModal';
import { HydrophobicBulkModal } from '../HydrophobicBulkModal';
import { useTableState } from './hooks/useTableState';
import { Locate as MapLocation } from 'lucide-react';

const SUPERTAG_REGISTRATION_TOKEN = 'D29B3BE8F2CC9A1A7051';

interface DataTableProps {
  data: SuperTag[];
  auth: { token?: string; username?: string };
  onDataChange: () => void;
  onPairGeotab: (macAddress: string, geotabSerialNumber: string) => Promise<{ success: boolean; error?: Error }>;
  onUnpairGeotab: (macAddress: string) => Promise<{ success: boolean; error?: Error }>;
  onSetHydrophobic: (nodeAddress: string, value: boolean) => Promise<{ success: boolean; error?: Error }>;
}

export function DataTable({ data, auth, onDataChange, onPairGeotab, onUnpairGeotab, onSetHydrophobic }: DataTableProps) {
  const tableRef = useRef<HTMLDivElement>(null);
  const {
    state,
    actions,
    modals,
  } = useTableState({
    data,
    onDataChange,
    onPairGeotab,
    onUnpairGeotab,
    onSetHydrophobic,
    SUPERTAG_REGISTRATION_TOKEN,
  });

  // Add a state for tracking address loading
  const [addressLoading, setAddressLoading] = useState(false);

  // Track when address data is being processed (based on loadingProgress)
  useEffect(() => {
    if (state.isRefreshing && !addressLoading) {
      setAddressLoading(true);
    } else if (!state.isRefreshing && addressLoading) {
      // Add delay to ensure smooth transition
      const timer = setTimeout(() => {
        setAddressLoading(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [state.isRefreshing, addressLoading]);

  // Scroll to table
  const scrollToTable = () => {
    if (tableRef.current) {
      tableRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Check if any address columns are visible
  const hasVisibleAddressColumns = [...state.ADDRESS_COLUMNS, 'formattedAddress'].some(col => 
    state.columnVisibility[col] && state.columnOrder.includes(col)
  );

  return (
    <div className="space-y-4" ref={tableRef}>
      {/* Filter Bar with Actions */}
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
        />
        
        {/* Status messages */}
        <TableActions 
          actionStatus={state.actionStatus} 
          setActionStatus={actions.setActionStatus}
          filterText={state.filterText}
          showSuperTagsOnly={state.showSuperTagsOnly}
          setFilterText={actions.setFilterText}
          setShowSuperTagsOnly={actions.setShowSuperTagsOnly}
        />

        {/* Address loading indicator */}
        {addressLoading && (
          <div className="px-4 py-3 border-t bg-blue-50 border-blue-100 text-blue-700">
            <div className="flex items-center">
              <MapLocation className="h-4 w-4 mr-2 animate-pulse" />
              <p className="text-sm">Loading address information for tags...</p>
            </div>
          </div>
        )}

        {/* Address columns info banner */}
        {hasVisibleAddressColumns && (
          <div className="px-4 py-3 border-t bg-gray-50 border-gray-100 text-gray-700">
            <div className="flex items-center">
              <MapLocation className="h-4 w-4 mr-2 flex-shrink-0" />
              <p className="text-sm">Address information is automatically resolved from latitude/longitude coordinates. Individual address components may vary based on location.</p>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <GeotabModal 
        showModal={modals.showGeotabModal}
        selectedRow={state.selectedRow}
        newGeotabSerial={state.newGeotabSerial}
        setNewGeotabSerial={actions.setNewGeotabSerial}
        setShowModal={actions.setShowGeotabModal}
        handlePairGeotab={actions.handlePairGeotab}
      />

      <HydrophobicModal 
        showModal={modals.showHydrophobicModal}
        selectedRow={state.selectedRow}
        setShowModal={actions.setShowHydrophobicModal}
        handleSetHydrophobic={actions.handleSetHydrophobic}
      />

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

      {/* Mobile and Desktop Rows */}
      <TableRows 
        isMobile={true}
        data={state.sortedAndFilteredData}
        selectedRow={state.selectedRow}
        setSelectedRow={actions.setSelectedRow}
        formatCellValue={actions.formatCellValue}
        setShowGeotabModal={actions.setShowGeotabModal}
        handleUnpairGeotab={actions.handleUnpairGeotab}
        setShowHydrophobicModal={actions.setShowHydrophobicModal}
      />

      <TableRows 
        isMobile={false}
        data={state.sortedAndFilteredData}
        columnOrder={state.columnOrder}
        columnVisibility={state.columnVisibility}
        selectedRow={state.selectedRow}
        setSelectedRow={actions.setSelectedRow}
        formatCellValue={actions.formatCellValue}
        handleSort={actions.handleSort}
        sortConfig={state.sortConfig}
      />
      
      {/* Pagination or results counter */}
      <TableFooter 
        sortedAndFilteredData={state.sortedAndFilteredData}
        totalData={data.length}
        downloadCSV={actions.downloadCSV}
      />
    </div>
  );
}