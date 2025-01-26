import React, { useState, useRef } from 'react';
import { Upload, Download, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { sendNotification } from '../services/notifications';

interface BulkOperationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  auth: { token?: string; username?: string };
  mode: 'pair' | 'unpair';
}

const API_BASE_URL = 'https://networkasset-conductor.link-labs.com';

interface OperationResult {
  macAddress: string;
  success: boolean;
  error?: string;
}

export function BulkOperationsModal({ isOpen, onClose, onComplete, auth, mode }: BulkOperationsModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [results, setResults] = useState<OperationResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadSampleCsv = () => {
    const csvContent = mode === 'pair' 
      ? 'macAddress,geotabSerialNumber\nF0:0E:98:34:6F:16,GT123456\nF0:0E:98:34:6F:17,GT123457'
      : 'macAddress\nF0:0E:98:34:6F:16\nF0:0E:98:34:6F:17';

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = mode === 'pair' ? 'sample-bulk-pair.csv' : 'sample-bulk-unpair.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const processFile = async () => {
    if (!file || !auth.token) return;

    setIsProcessing(true);
    setResults([]);
    
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim());
      
      if (mode === 'pair' && (!headers.includes('macAddress') || !headers.includes('geotabSerialNumber'))) {
        alert('CSV must have macAddress and geotabSerialNumber columns');
        setIsProcessing(false);
        return;
      }
      if (mode === 'unpair' && !headers.includes('macAddress')) {
        alert('CSV must have a macAddress column');
        setIsProcessing(false);
        return;
      }

      const data = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        return headers.reduce((obj, header, i) => ({ ...obj, [header]: values[i] }), {});
      });

      setProgress({ current: 0, total: data.length });

      const results: OperationResult[] = [];
      
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        try {
          const encodedMacId = encodeURIComponent(row.macAddress);
          
          if (mode === 'pair') {
            const url = `${API_BASE_URL}/networkAsset/airfinder/supertags/addGeoTab?macID=${encodedMacId}&geoTabSerialNumber=${row.geotabSerialNumber}`;
            const response = await fetch(url, {
              method: 'POST',
              headers: { 'Authorization': auth.token }
            });
            
            if (!response.ok) {
              throw new Error(`Failed to pair Geotab: ${response.status} ${response.statusText}`);
            }

            if (auth.username) {
              await sendNotification({
                email: auth.username,
                macAddress: row.macAddress,
                geotabSerialNumber: row.geotabSerialNumber,
                type: 'pair'
              });
            }
          } else {
            const url = `${API_BASE_URL}/networkAsset/airfinder/supertags/deleteGeoTab/${encodedMacId}`;
            const response = await fetch(url, {
              method: 'DELETE',
              headers: { 'Authorization': auth.token }
            });
            
            if (!response.ok) {
              throw new Error(`Failed to unpair Geotab: ${response.status} ${response.statusText}`);
            }

            if (auth.username) {
              await sendNotification({
                email: auth.username,
                macAddress: row.macAddress,
                type: 'unpair'
              });
            }
          }
          
          results.push({ macAddress: row.macAddress, success: true });
        } catch (error) {
          results.push({ 
            macAddress: row.macAddress, 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
        
        setProgress({ current: i + 1, total: data.length });
        setResults([...results]);
      }

      setIsProcessing(false);
      onComplete();
    };

    reader.readAsText(file);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-[600px] max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">
            Bulk {mode === 'pair' ? 'Pair' : 'Unpair'} Geotab Serial Numbers
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-2">
                Upload a CSV file with the following columns:
                {mode === 'pair' ? (
                  <span className="font-mono block mt-1">macAddress, geotabSerialNumber</span>
                ) : (
                  <span className="font-mono block mt-1">macAddress</span>
                )}
              </p>
              <button
                onClick={downloadSampleCsv}
                className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
              >
                <Download className="h-4 w-4" />
                Download sample CSV
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              Select CSV File
            </button>
            {file && (
              <span className="text-sm text-gray-600">
                Selected: {file.name}
              </span>
            )}
          </div>

          {file && !isProcessing && (
            <button
              onClick={processFile}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Process File
            </button>
          )}

          {isProcessing && progress && (
            <div className="space-y-2">
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-600 transition-all duration-200"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
              <p className="text-sm text-gray-600 text-center">
                Processing: {progress.current} of {progress.total}
              </p>
            </div>
          )}

          {results.length > 0 && (
            <div className="mt-4 space-y-2">
              <h4 className="font-medium">Results:</h4>
              <div className="max-h-60 overflow-y-auto border rounded-lg">
                {results.map((result, index) => (
                  <div
                    key={index}
                    className={`p-2 flex items-center gap-2 text-sm ${
                      index !== 0 ? 'border-t' : ''
                    } ${
                      result.success ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {result.success ? (
                      <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    )}
                    <span className="font-mono">{result.macAddress}</span>
                    {result.error && (
                      <span className="text-xs">- {result.error}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}