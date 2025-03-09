import React from 'react';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { ChevronLeft, Download, Filter, FilterX, Search, X, SlidersHorizontal } from 'lucide-react';

interface EventTableToolbarProps {
  onNavigateBack: () => void;
  globalFilter: string;
  setGlobalFilter: (value: string) => void;
  filters: Record<string, any>;
  clearAllFilters: () => void;
  columnFilterMenuVisible: boolean;
  setColumnFilterMenuVisible: (visible: boolean) => void;
  showColumnSelector: boolean;
  setShowColumnSelector: (visible: boolean) => void;
  exportCSV: () => void;
  eventsCount: number;
}

export function EventTableToolbar({
  onNavigateBack,
  globalFilter,
  setGlobalFilter,
  filters,
  clearAllFilters,
  columnFilterMenuVisible,
  setColumnFilterMenuVisible,
  showColumnSelector,
  setShowColumnSelector,
  exportCSV,
  eventsCount
}: EventTableToolbarProps) {
  return (
    <div className="flex flex-wrap justify-between gap-2 mb-2 p-3 bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          icon={<ChevronLeft className="h-4 w-4 mr-1" />}
          label="Back to Tags"
          onClick={onNavigateBack}
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
      
      <div className="flex flex-wrap gap-2">
        <Button
          icon={<SlidersHorizontal className="h-4 w-4 mr-1" />}
          label="Columns"
          onClick={() => setShowColumnSelector(!showColumnSelector)}
          className="p-button-outlined p-button-sm"
        />
        
        <Button
          label="Export"
          icon={<Download className="h-4 w-4 mr-1" />}
          onClick={exportCSV}
          className="p-button-primary p-button-sm"
          disabled={!eventsCount}
        />
      </div>
    </div>
  );
}