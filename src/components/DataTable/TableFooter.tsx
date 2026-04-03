import { SuperTag } from '../../types';

interface TableFooterProps {
  sortedAndFilteredData: SuperTag[];
  totalData: number;
  downloadCSV: () => void;
}

export function TableFooter({
  sortedAndFilteredData,
  totalData,
}: TableFooterProps) {
  const filtered = sortedAndFilteredData.length !== totalData;

  return (
    <div className="px-3 py-2 border-t border-gray-100 bg-gray-50/50">
      <p className="text-xs text-gray-500">
        {filtered ? (
          <>
            Showing <span className="font-semibold text-gray-700">{sortedAndFilteredData.length.toLocaleString()}</span> of{' '}
            <span className="font-semibold text-gray-700">{totalData.toLocaleString()}</span> records
          </>
        ) : (
          <>
            <span className="font-semibold text-gray-700">{totalData.toLocaleString()}</span> records
          </>
        )}
      </p>
    </div>
  );
}