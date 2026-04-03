import React, { useState, useRef, useEffect } from 'react';
import { Download, SlidersHorizontal, Search, Tag, Plus, Trash2, Upload, RefreshCcw, Droplets, Settings, X, Check, Filter, Cpu, ChevronDown, CheckSquare } from 'lucide-react';
import { SuperTag } from '../../types';

interface TableFiltersProps {
  filterText: string;
  setFilterText: (text: string) => void;
  showSuperTagsOnly: boolean;
  setShowSuperTagsOnly: (show: boolean) => void;
  handleRefreshData: () => void;
  isRefreshing: boolean;
  setShowColumnSelector: (show: boolean) => void;
  setShowBulkModal: (show: boolean) => void;
  setShowHydrophobicBulkModal: (show: boolean) => void;
  setShowCellIdBulkModal: (show: boolean) => void;
  setBulkMode: (mode: 'pair' | 'unpair') => void;
  setHydrophobicBulkValue: (value: boolean) => void;
  setCellIdBulkValue: (value: boolean) => void;
  selectedRow: SuperTag | null;
  setShowGeotabModal: (show: boolean) => void;
  handleUnpairGeotab: () => Promise<void>;
  setShowHydrophobicModal: (show: boolean) => void;
  downloadCSV: () => void;
  columnFilters: Record<string, string>;
  showColumnFilterModal: boolean;
  setShowColumnFilterModal: (show: boolean) => void;
  selectedRows: SuperTag[];
  setSelectedRows: (rows: SuperTag[]) => void;
}

export function TableFilters({
  filterText,
  setFilterText,
  showSuperTagsOnly,
  setShowSuperTagsOnly,
  handleRefreshData,
  isRefreshing,
  setShowColumnSelector,
  setShowBulkModal,
  setShowHydrophobicBulkModal,
  setShowCellIdBulkModal,
  setBulkMode,
  setHydrophobicBulkValue,
  setCellIdBulkValue,
  selectedRow,
  setShowGeotabModal,
  handleUnpairGeotab,
  setShowHydrophobicModal,
  downloadCSV,
  columnFilters,
  setShowColumnFilterModal,
  selectedRows,
  setSelectedRows
}: TableFiltersProps) {
  const [bulkMenuOpen, setBulkMenuOpen] = useState(false);
  const bulkMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (bulkMenuRef.current && !bulkMenuRef.current.contains(event.target as Node)) {
        setBulkMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeFilterCount = Object.keys(columnFilters).length;

  return (
    <div className="p-3 space-y-3">
      {/* Top row: search + actions */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search all columns..."
            className="w-full pl-8 pr-8 py-1.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
          />
          {filterText && (
            <button
              onClick={() => setFilterText('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-gray-200 hidden sm:block" />

        {/* Filter toggles */}
        <button
          onClick={() => setShowSuperTagsOnly(!showSuperTagsOnly)}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
            showSuperTagsOnly
              ? 'bg-blue-50 text-blue-700 border-blue-200'
              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
          }`}
          title={showSuperTagsOnly ? "Showing SuperTags only" : "Show all tags"}
        >
          <Tag className="h-3.5 w-3.5" />
          <span className="hidden md:inline">SuperTags</span>
          {showSuperTagsOnly && <Check className="h-3 w-3" />}
        </button>

        <button
          onClick={() => setShowColumnFilterModal(true)}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
            activeFilterCount > 0
              ? 'bg-blue-50 text-blue-700 border-blue-200'
              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
          }`}
          title="Column filters"
        >
          <Filter className="h-3.5 w-3.5" />
          <span className="hidden md:inline">Filters</span>
          {activeFilterCount > 0 && (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
              {activeFilterCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setShowColumnSelector(true)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors"
          title="Configure columns"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          <span className="hidden md:inline">Columns</span>
        </button>

        {/* Divider */}
        <div className="h-6 w-px bg-gray-200 hidden sm:block" />

        {/* Bulk operations dropdown */}
        <div className="relative" ref={bulkMenuRef}>
          <button
            onClick={() => setBulkMenuOpen(!bulkMenuOpen)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              selectedRows.length > 0
                ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Upload className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Bulk Actions</span>
            {selectedRows.length > 0 && (
              <span className="flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white px-1">
                {selectedRows.length}
              </span>
            )}
            <ChevronDown className="h-3 w-3" />
          </button>

          {bulkMenuOpen && (
            <div className="absolute right-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
              {selectedRows.length > 0 && (
                <>
                  <div className="px-3 py-1.5 text-[11px] font-medium text-gray-400 uppercase tracking-wider">
                    {selectedRows.length} selected
                  </div>
                  <div className="border-t border-gray-100 my-1" />
                </>
              )}
              <button
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                onClick={() => { setBulkMode('pair'); setShowBulkModal(true); setBulkMenuOpen(false); }}
              >
                <Plus className="h-4 w-4 text-green-600" />
                Bulk Pair Geotab
              </button>
              <button
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                onClick={() => { setBulkMode('unpair'); setShowBulkModal(true); setBulkMenuOpen(false); }}
              >
                <Trash2 className="h-4 w-4 text-red-600" />
                Bulk Unpair Geotab
              </button>
              <div className="border-t border-gray-100 my-1" />
              <button
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                onClick={() => { setHydrophobicBulkValue(true); setShowHydrophobicBulkModal(true); setBulkMenuOpen(false); }}
              >
                <Droplets className="h-4 w-4 text-blue-600" />
                Bulk Hydrophobic
              </button>
              <button
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                onClick={() => { setCellIdBulkValue(true); setShowCellIdBulkModal(true); setBulkMenuOpen(false); }}
              >
                <Cpu className="h-4 w-4 text-purple-600" />
                Bulk CellID Processing
              </button>
            </div>
          )}
        </div>

        {/* Refresh */}
        <button
          onClick={handleRefreshData}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors ${isRefreshing ? 'opacity-60' : ''}`}
          disabled={isRefreshing}
          title="Refresh data"
        >
          <RefreshCcw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>

        {/* Export */}
        <button
          onClick={downloadCSV}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors"
          title="Export as CSV"
        >
          <Download className="h-3.5 w-3.5" />
          <span className="hidden md:inline">Export</span>
        </button>
      </div>

      {/* Selection info bar */}
      {selectedRows.length > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-lg">
          <CheckSquare className="h-3.5 w-3.5 text-indigo-600" />
          <span className="text-xs font-medium text-indigo-700">
            {selectedRows.length} device{selectedRows.length !== 1 ? 's' : ''} selected
          </span>
          <button
            onClick={() => setSelectedRows([])}
            className="text-xs text-indigo-500 hover:text-indigo-700 underline ml-1"
          >
            Clear selection
          </button>
        </div>
      )}

      {/* Selected row quick-actions bar */}
      {selectedRow && (
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
          <span className="text-xs font-medium text-blue-700 mr-1">
            Selected: <span className="font-mono">{selectedRow.nodeName || selectedRow.macAddress}</span>
          </span>
          <div className="h-4 w-px bg-blue-200" />
          {!selectedRow.geotabSerialNumber ? (
            <button
              onClick={() => setShowGeotabModal(true)}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded hover:bg-green-200 transition-colors"
            >
              <Plus className="h-3 w-3" />
              Pair Geotab
            </button>
          ) : (
            <button
              onClick={handleUnpairGeotab}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-700 bg-red-100 rounded hover:bg-red-200 transition-colors"
            >
              <Trash2 className="h-3 w-3" />
              Unpair
            </button>
          )}
          {selectedRow.nodeAddress && (
            <button
              onClick={() => setShowHydrophobicModal(true)}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded hover:bg-blue-200 transition-colors"
            >
              <Settings className="h-3 w-3" />
              Hydrophobic
            </button>
          )}
        </div>
      )}
    </div>
  );
}