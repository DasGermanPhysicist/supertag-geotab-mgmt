import React from 'react';
import { Download } from 'lucide-react';
import { SuperTag } from '../../types';

interface TableFooterProps {
  sortedAndFilteredData: SuperTag[];
  totalData: number;
  downloadCSV: () => void;
}

export function TableFooter({
  sortedAndFilteredData,
  totalData,
  downloadCSV
}: TableFooterProps) {
  return (
    <div className="bg-white px-4 py-3 flex items-center justify-between border rounded-lg sm:px-6">
      <div className="flex-1 flex justify-between sm:hidden">
        <button
          onClick={downloadCSV}
          className="btn btn-primary flex items-center"
        >
          <Download className="h-4 w-4 mr-1" />
          Export
        </button>
      </div>
      <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-gray-700">
            Showing <span className="font-medium">{sortedAndFilteredData.length}</span> of{' '}
            <span className="font-medium">{totalData}</span> records
          </p>
        </div>
      </div>
    </div>
  );
}