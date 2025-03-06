import React from 'react';
import { Droplets, X } from 'lucide-react';
import { SuperTag } from '../../../types';

interface HydrophobicModalProps {
  showModal: boolean;
  selectedRow: SuperTag | null;
  setShowModal: (show: boolean) => void;
  handleSetHydrophobic: (value: boolean) => Promise<void>;
}

export function HydrophobicModal({
  showModal,
  selectedRow,
  setShowModal,
  handleSetHydrophobic
}: HydrophobicModalProps) {
  if (!showModal || !selectedRow) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-96 max-w-full mx-4">
        <h3 className="text-lg font-semibold mb-4">Set Hydrophobic Property</h3>
        <p className="text-sm text-gray-600 mb-4">
          Set the hydrophobic property for 
          <span className="font-medium text-gray-900 ml-1">{selectedRow.nodeName}</span>
        </p>
        <div className="flex flex-col space-y-3 mb-6">
          <p className="text-sm text-gray-500">Current value: {selectedRow.hydrophobic === 'true' ? 'Hydrophobic' : 'Not Hydrophobic'}</p>
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => handleSetHydrophobic(true)}
              className={`btn ${selectedRow.hydrophobic === 'true' ? 'btn-secondary' : 'btn-primary'} flex-1`}
            >
              <Droplets className="h-4 w-4 mr-2" />
              Hydrophobic
            </button>
            <button 
              onClick={() => handleSetHydrophobic(false)}
              className={`btn ${selectedRow.hydrophobic === 'false' ? 'btn-secondary' : 'btn-primary'} flex-1`}
            >
              <X className="h-4 w-4 mr-2" />
              Not Hydrophobic
            </button>
          </div>
        </div>
        <div className="flex justify-end">
          <button
            onClick={() => setShowModal(false)}
            className="btn btn-secondary"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}