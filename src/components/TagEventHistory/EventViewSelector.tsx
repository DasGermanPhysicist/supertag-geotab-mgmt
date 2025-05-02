import React from 'react';
import { Button } from 'primereact/button';
import { Table2, Map, BarChart2 } from 'lucide-react';

interface EventViewSelectorProps {
  currentView: 'table' | 'map' | 'analysis';
  setCurrentView: (view: 'table' | 'map' | 'analysis') => void;
  locationCount: number;
  totalCount: number;
}

export function EventViewSelector({
  currentView,
  setCurrentView,
  locationCount,
  totalCount
}: EventViewSelectorProps) {
  return (
    <div className="flex items-center p-3 bg-white rounded-lg shadow-sm border border-gray-200 mb-2">
      <div className="hidden sm:flex items-center">
        <span className="text-sm text-gray-600 mr-3">View:</span>
      </div>
      
      <div className="flex items-center space-x-2">
        <Button
          icon={<Table2 className="h-4 w-4 mr-1" />}
          label="Table"
          className={`p-button-sm ${currentView === 'table' ? 'p-button-primary' : 'p-button-outlined'}`}
          onClick={() => setCurrentView('table')}
        />
        
        <Button
          icon={<Map className="h-4 w-4 mr-1" />}
          label="Map"
          className={`p-button-sm ${currentView === 'map' ? 'p-button-primary' : 'p-button-outlined'}`}
          onClick={() => setCurrentView('map')}
          badge={locationCount > 0 ? locationCount.toString() : undefined}
          badgeClassName="bg-green-500"
          disabled={locationCount === 0}
        />
        
        <Button
          icon={<BarChart2 className="h-4 w-4 mr-1" />}
          label="Analysis"
          className={`p-button-sm ${currentView === 'analysis' ? 'p-button-primary' : 'p-button-outlined'}`}
          onClick={() => setCurrentView('analysis')}
          disabled={totalCount === 0}
        />
      </div>
      
      {currentView === 'map' && locationCount > 0 && (
        <div className="ml-4 text-xs text-gray-500">
          {locationCount} of {totalCount} events have location data
        </div>
      )}
      
      <div className="flex-grow"></div>
    </div>
  );
}