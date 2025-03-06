import React, { useState, useRef, useCallback } from 'react';
import { Upload, Download, X, AlertCircle, CheckCircle2, FileText, Loader2 } from 'lucide-react';
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
  const [dragActive, setDragActive] = useState(false);
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

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        setFile(file);
      }
    }
  }, []);

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

  const successCount = results.filter(r => r.success).length;
  const failureCount = results.filter(r => !r.success).length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center py-4 px-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            Bulk {mode === 'pair' ? 'Pair' : 'Unpair'} Geotab Serial Numbers
          </h3>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="flex items-start">
            <div className="bg-blue-50 text-blue-800 rounded-full p-2 mr-3 flex-shrink-0">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-2">
                Upload a CSV file with the following columns:
                {mode === 'pair' ? (
                  <span className="font-mono block mt-1 bg-gray-50 p-1 rounded text-xs">macAddress, geotabSerialNumber</span>
                ) : (
                  <span className="font-mono block mt-1 bg-gray-50 p-1 rounded text-xs">macAddress</span>
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

          {!file && !isProcessing ? (
            <div 
              className={`border-2 border-dashed rounded-lg p-8 text-center ${
                dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
              }`}
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
            >
              <input
                type="file"
                ref={fileInputRef}
                accept=".csv"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-600 mb-2">
                Drag and drop your CSV file here, or
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="btn btn-primary"
              >
                Browse Files
              </button>
            </div>
          ) : (
            <div className="bg-gray-50 border rounded-lg p-4">
              {file && (
                <div className="flex items-center mb-4">
                  <FileText className="h-5 w-5 text-gray-500 mr-2" />
                  <span className="text-sm text-gray-700 font-medium">{file.name}</span>
                  {!isProcessing && (
                    <button
                      onClick={() => setFile(null)}
                      className="ml-auto text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              )}
              
              {!isProcessing && file && (
                <button
                  onClick={processFile}
                  className="w-full btn btn-primary"
                >
                  Process File
                </button>
              )}
            </div>
          )}

          {isProcessing && progress && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                <span>Processing file...</span>
                <span>{progress.current} of {progress.total}</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-600 transition-all duration-200"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
              <div className="text-center">
                <Loader2 className="h-5 w-5 mx-auto animate-spin text-blue-600 mt-2" />
              </div>
            </div>
          )}

          {results.length > 0 && (
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900">Results</h4>
                <div className="flex items-center gap-3 text-sm">
                  <span className="flex items-center text-green-600">
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    {successCount} successful
                  </span>
                  {failureCount > 0 && (
                    <span className="flex items-center text-red-600">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {failureCount} failed
                    </span>
                  )}
                </div>
              </div>
              
              <div className="max-h-60 overflow-y-auto border rounded-lg divide-y divide-gray-200">
                {results.map((result, index) => (
                  <div
                    key={index}
                    className={`p-2 flex items-center gap-2 text-sm ${
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
                      <span className="text-xs ml-auto text-red-500 truncate max-w-[200px]" title={result.error}>
                        {result.error}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div className="px-6 py-4 bg-gray-50 border-t flex justify-end">
          <button
            onClick={onClose}
            className="btn btn-secondary"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}