import React from 'react';
import { Download, SlidersHorizontal, Search, Tag, Plus, Trash2, Upload, RefreshCcw, Droplets, Settings, X, Check } from 'lucide-react';
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
  setBulkMode: (mode: 'pair' | 'unpair') => void;
  setHydrophobicBulkValue: (value: boolean) => void;
  selectedRow: SuperTag | null;
  setShowGeotabModal: (show: boolean) => void;
  handleUnpairGeotab: () => Promise<void>;
  setShowHydrophobicModal: (show: boolean) => void;
  downloadCSV: () => void;
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
  setBulkMode,
  setHydrophobicBulkValue,
  selectedRow,
  setShowGeotabModal,
  handleUnpairGeotab,
  setShowHydrophobicModal,
  downloadCSV
}: TableFiltersProps) {
  return (
    <div className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div className="w-full sm:w-auto flex items-center gap-2">
        <div className="relative w-full sm:w-64">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Filter data..."
            className="form-input pl-9 py-2 text-sm"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
          />
          {filterText && (
            <button 
              onClick={() => setFilterText('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        
        <button
          onClick={() => setShowSuperTagsOnly(!showSuperTagsOnly)}
          className={`flex items-center gap-1 px-3 py-2 text-sm rounded-lg transition-colors ${
            showSuperTagsOnly 
              ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
              : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
          }`}
          title={showSuperTagsOnly ? "Showing SuperTags only" : "Show all tags"}
        >
          <Tag className="h-4 w-4" />
          <span className="hidden sm:inline">SuperTags only</span>
          {showSuperTagsOnly && <Check className="h-3 w-3 ml-1" />}
        </button>

        <button
          onClick={() => setShowColumnSelector(true)}
          className="flex items-center gap-1 px-3 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200 text-gray-700"
          title="Configure columns"
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span className="hidden sm:inline">Columns</span>
        </button>
      </div>

      <div className="flex flex-wrap sm:flex-nowrap w-full sm:w-auto justify-end gap-2">
        <button
          onClick={handleRefreshData}
          className={`btn btn-secondary flex items-center gap-1 text-sm py-2 ${isRefreshing ? 'opacity-70' : ''}`}
          disabled={isRefreshing}
        >
          <RefreshCcw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setBulkMode('pair');
              setShowBulkModal(true);
            }}
            className="btn btn-success flex items-center gap-1 text-sm py-2"
          >
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline">Bulk Pair</span>
          </button>
          <button
            onClick={() => {
              setBulkMode('unpair');
              setShowBulkModal(true);
            }}
            className="btn btn-danger flex items-center gap-1 text-sm py-2"
          >
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline">Bulk Unpair</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setHydrophobicBulkValue(true);
              setShowHydrophobicBulkModal(true);
            }}
            className="btn btn-primary flex items-center gap-1 text-sm py-2"
          >
            <Droplets className="h-4 w-4" />
            <span className="hidden sm:inline">Bulk Hydrophobic</span>
          </button>
        </div>

        {selectedRow && (
          <>
            {!selectedRow.geotabSerialNumber ? (
              <button
                onClick={() => setShowGeotabModal(true)}
                className="btn btn-success flex items-center gap-1 text-sm py-2"
              >
                <Plus className="h-4 w-4" />
                <span>Pair Geotab</span>
              </button>
            ) : (
              <button
                onClick={handleUnpairGeotab}
                className="btn btn-danger flex items-center gap-1 text-sm py-2"
              >
                <Trash2 className="h-4 w-4" />
                <span>Unpair Geotab</span>
              </button>
            )}

            {selectedRow.nodeAddress && (
              <button
                onClick={() => setShowHydrophobicModal(true)}
                className="btn btn-primary flex items-center gap-1 text-sm py-2"
              >
                <Settings className="h-4 w-4" />
                <span>Hydrophobic</span>
              </button>
            )}
          </>
        )}

        <button
          onClick={downloadCSV}
          className="btn btn-primary flex items-center gap-1 text-sm py-2"
        >
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">Export CSV</span>
        </button>
      </div>
    </div>
  );
}