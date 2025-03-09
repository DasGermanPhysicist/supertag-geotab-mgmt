import React from 'react';
import { Tag } from 'primereact/tag';
import { Button } from 'primereact/button';
import { Map, ArrowRight } from 'lucide-react';

interface EventRowMapSyncProps {
  eventId: string;
  time: string;
  locationAvailable: boolean;
  selectedEventId?: string | null;
  onEventSelect: (eventId: string) => void;
  setCurrentView: (view: 'map') => void;
}

/**
 * A component that provides synchronization between table rows and map pins.
 * This can be added to row template of the data table to allow quick navigation.
 */
export function EventRowMapSync({
  eventId,
  time,
  locationAvailable,
  selectedEventId,
  onEventSelect,
  setCurrentView
}: EventRowMapSyncProps) {
  // Skip rendering for events without location data
  if (!locationAvailable) {
    return null;
  }
  
  const isSelected = selectedEventId === eventId;
  
  const handleSync = () => {
    // First, select the event
    onEventSelect(eventId);
    // Then, switch to map view
    setCurrentView('map');
  };
  
  return (
    <Button
      icon={<Map className="h-4 w-4 mr-1" />}
      label="Show on Map"
      className={`p-button-sm ${isSelected ? 'p-button-info' : 'p-button-outlined'}`}
      onClick={(e) => {
        e.stopPropagation();
        handleSync();
      }}
      tooltip="View this event on the map"
      tooltipOptions={{ position: 'top' }}
    />
  );
}