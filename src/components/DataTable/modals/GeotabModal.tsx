import React from 'react';
import { SuperTag } from '../../../types';

interface GeotabModalProps {
  showModal: boolean;
  selectedRow: SuperTag | null;
  newGeotabSerial: string;
  setNewGeotabSerial: (value: string) => void;
  setShowModal: (show: boolean) => void;
  handlePairGeotab: () => Promise<void>;
}

export function GeotabModal({
  showModal,
  selectedRow,
  newGeotabSerial,
  setNewGeotabSerial,
  setShowModal,
  handlePairGeotab
}: GeotabModalProps) {
  if (!showModal || !selectedRow) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-96 max-w-full mx-4">
        <h3 className="text-lg font-semibold mb-4">Pair Geotab Serial Number</h3>
        <p className="text-sm text-gray-600 mb-4">
          Enter the Geotab serial number to pair with 
          <span className="font-medium text-gray-900 ml-1">{selectedRow.nodeName}</span>
        </p>
        <input
          type="text"
          value={newGeotabSerial}
          onChange={(e) => setNewGeotabSerial(e.target.value)}
          placeholder="Enter Geotab serial number"
          className="form-input mb-4"
        />
        <div className="flex justify-end space-x-2">
          <button
            onClick={() => {
              setShowModal(false);
              setNewGeotabSerial('');
            }}
            className="btn btn-secondary"
          >
            Cancel
          </button>
          <button
            onClick={handlePairGeotab}
            disabled={!newGeotabSerial}
            className={`btn btn-primary ${!newGeotabSerial ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Pair
          </button>
        </div>
      </div>
    </div>
  );
}