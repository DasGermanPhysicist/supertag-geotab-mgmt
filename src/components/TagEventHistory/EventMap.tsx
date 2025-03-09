import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import { Map, MapPin, Layers, Navigation, CornerUpLeft, ZoomIn, Route, RefreshCcw, ExternalLink } from 'lucide-react';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import { ToggleButton } from 'primereact/togglebutton';
import { getMessageTypeName } from '../../constants/messageTypes';

// Import Leaflet CSS - we need to include this for the map to render properly
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default marker icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// Type definition for location data extracted from events
interface LocationPoint {
  lat: number;
  lng: number;
  time: string;
  eventId: string;
  msgType?: string;
  msgTypeDescription?: string;
  accuracy?: number | string;
  altitude?: number | string;
  speed?: number | string;
  batteryLevel?: number | string;
  formattedTime?: string;
  source: string; // The property path where this location was found
}

interface EventMapProps {
  events: any[];
  selectedEventId?: string | null;
  onEventSelect?: (eventId: string) => void;
  mapHeight?: string | number;
}

// Custom hook to extract location data from events
function useLocationData(events: any[]) {
  return useMemo(() => {
    const locationPoints: LocationPoint[] = [];
    
    events.forEach(event => {
      // Extract all possible location data from the event
      const collectLocationPoint = (lat: number | string, lng: number | string, source: string) => {
        // Convert to numbers if they're strings
        const latitude = typeof lat === 'string' ? parseFloat(lat) : lat;
        const longitude = typeof lng === 'string' ? parseFloat(lng) : lng;
        
        // Skip if values can't be parsed or are invalid
        if (isNaN(latitude) || isNaN(longitude)) return;
        if (latitude === 0 && longitude === 0) return;
        if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return;
        
        // Format the timestamp for display
        const formattedTime = new Date(event.time).toLocaleString();
        
        // Create a location point object
        locationPoints.push({
          lat: latitude,
          lng: longitude,
          time: event.time,
          eventId: event.uuid,
          msgType: event.metadata?.props?.msgType,
          msgTypeDescription: event.metadata?.props?.msgTypeDescription,
          accuracy: event.metadata?.props?.accuracy || event.value?.accuracy,
          altitude: event.metadata?.props?.altitude || event.value?.altitude,
          speed: event.metadata?.props?.speed || event.value?.speed,
          batteryLevel: event.metadata?.props?.batteryLevel || event.value?.batteryLevel,
          formattedTime,
          source
        });
      };
      
      // Check all the common places where latitude/longitude might be found
      if (event.metadata?.props?.latitude && event.metadata?.props?.longitude) {
        collectLocationPoint(
          event.metadata.props.latitude, 
          event.metadata.props.longitude,
          'metadata.props'
        );
      }
      
      if (event.value?.latitude && event.value?.longitude) {
        collectLocationPoint(
          event.value.latitude, 
          event.value.longitude,
          'value'
        );
      }
      
      // Check for alternate naming patterns
      if (event.metadata?.props?.lat && (event.metadata?.props?.lng || event.metadata?.props?.lon)) {
        collectLocationPoint(
          event.metadata.props.lat, 
          event.metadata.props.lng || event.metadata.props.lon,
          'metadata.props (lat/lng)'
        );
      }
      
      if (event.value?.lat && (event.value?.lng || event.value?.lon)) {
        collectLocationPoint(
          event.value.lat, 
          event.value.lng || event.value.lon,
          'value (lat/lng)'
        );
      }
      
      // Check for deeply nested location data
      if (event.value?.position?.coordinates) {
        const coords = event.value.position.coordinates;
        if (Array.isArray(coords) && coords.length >= 2) {
          // GeoJSON format has [longitude, latitude]
          collectLocationPoint(coords[1], coords[0], 'value.position.coordinates');
        }
      }
      
      if (event.metadata?.props?.position?.coordinates) {
        const coords = event.metadata.props.position.coordinates;
        if (Array.isArray(coords) && coords.length >= 2) {
          collectLocationPoint(coords[1], coords[0], 'metadata.props.position.coordinates');
        }
      }
      
      // Check for location object
      if (event.value?.location) {
        const loc = event.value.location;
        if (loc.latitude && loc.longitude) {
          collectLocationPoint(loc.latitude, loc.longitude, 'value.location');
        } else if (loc.lat && (loc.lng || loc.lon)) {
          collectLocationPoint(loc.lat, loc.lng || loc.lon, 'value.location (lat/lng)');
        }
      }
      
      if (event.metadata?.props?.location) {
        const loc = event.metadata.props.location;
        if (loc.latitude && loc.longitude) {
          collectLocationPoint(loc.latitude, loc.longitude, 'metadata.props.location');
        } else if (loc.lat && (loc.lng || loc.lon)) {
          collectLocationPoint(loc.lat, loc.lng || loc.lon, 'metadata.props.location (lat/lng)');
        }
      }
    });
    
    // Sort by time to ensure proper path drawing
    return locationPoints.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
  }, [events]);
}

// Map controller component for handling interactions
function MapController({ onViewReset, onLocate }: { onViewReset: () => void, onLocate: () => void }) {
  const map = useMapEvents({
    // Add event listeners if needed
    click: () => {
      // Handle map click
    },
  });
  
  return null;
}

export function EventMap({ events, selectedEventId, onEventSelect, mapHeight = 500 }: EventMapProps) {
  const [mapRef, setMapRef] = useState<L.Map | null>(null);
  const locationPoints = useLocationData(events);
  const [showPath, setShowPath] = useState(true);
  const [selectedPoint, setSelectedPoint] = useState<string | null>(selectedEventId || null);
  const [mapType, setMapType] = useState<'streets' | 'satellite'>('streets');

  // Set up the center point for the map
  const mapCenter = useMemo(() => {
    if (locationPoints.length === 0) {
      // Default center if no points available
      return [35.0, -95.0] as [number, number];
    }
    
    // If there's a selected point, center on that
    if (selectedPoint) {
      const point = locationPoints.find(p => p.eventId === selectedPoint);
      if (point) {
        return [point.lat, point.lng] as [number, number];
      }
    }
    
    // Otherwise center on the average of all points
    const sumLat = locationPoints.reduce((sum, point) => sum + point.lat, 0);
    const sumLng = locationPoints.reduce((sum, point) => sum + point.lng, 0);
    return [sumLat / locationPoints.length, sumLng / locationPoints.length] as [number, number];
  }, [locationPoints, selectedPoint]);

  // Create path coordinates for the polyline
  const pathCoordinates = useMemo(() => {
    return locationPoints.map(point => [point.lat, point.lng] as [number, number]);
  }, [locationPoints]);

  // Effect to handle external selectedEventId changes
  useEffect(() => {
    if (selectedEventId && selectedEventId !== selectedPoint) {
      setSelectedPoint(selectedEventId);
      
      // Center map on the selected point
      const point = locationPoints.find(p => p.eventId === selectedEventId);
      if (point && mapRef) {
        mapRef.setView([point.lat, point.lng], mapRef.getZoom());
      }
    }
  }, [selectedEventId, locationPoints, mapRef]);

  // Handle marker click
  const handleMarkerClick = useCallback((eventId: string) => {
    setSelectedPoint(eventId);
    if (onEventSelect) {
      onEventSelect(eventId);
    }
  }, [onEventSelect]);

  // Reset map view to fit all points
  const resetView = useCallback(() => {
    if (mapRef && locationPoints.length > 0) {
      const bounds = L.latLngBounds(locationPoints.map(point => [point.lat, point.lng]));
      mapRef.fitBounds(bounds, { padding: [30, 30] });
    }
  }, [mapRef, locationPoints]);

  // Locate and center on the selected marker
  const locateSelectedMarker = useCallback(() => {
    if (mapRef && selectedPoint) {
      const point = locationPoints.find(p => p.eventId === selectedPoint);
      if (point) {
        mapRef.setView([point.lat, point.lng], Math.max(15, mapRef.getZoom()));
      }
    }
  }, [mapRef, selectedPoint, locationPoints]);

  // Automatically fit bounds when the map or locations change
  useEffect(() => {
    if (mapRef && locationPoints.length > 0) {
      resetView();
    }
  }, [mapRef, locationPoints.length]);

  // Custom marker creation
  const createMarkerIcon = useCallback((isSelected: boolean, isLatest: boolean) => {
    let className = 'event-marker-default';
    
    if (isSelected) {
      className += ' event-marker-selected';
    }
    
    if (isLatest) {
      className += ' event-marker-pulse';
    }
    
    return L.divIcon({
      className: className,
      iconSize: [12, 12]
    });
  }, []);

  // Helper function to safely convert values to numbers for display
  const safeNumberDisplay = (value: number | string | undefined, digits: number = 1): string => {
    if (value === undefined || value === null) return '';
    
    // Try to parse as number if it's a string
    const num = typeof value === 'string' ? parseFloat(value) : value;
    
    // Check if it's a valid number
    if (typeof num === 'number' && !isNaN(num)) {
      return num.toFixed(digits);
    }
    
    // Return as is if parsing failed
    return String(value);
  };

  if (locationPoints.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-6 text-center flex flex-col items-center justify-center" style={{ height: mapHeight }}>
        <MapPin className="h-12 w-12 text-gray-300 mb-3" />
        <h3 className="font-medium text-gray-600 mb-1">No Location Data Available</h3>
        <p className="text-sm text-gray-500">None of the selected events contain geographic coordinates.</p>
      </div>
    );
  }

  // Get the tile layer URL based on map type
  const getTileLayer = () => {
    if (mapType === 'satellite') {
      return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
    }
    return 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  };

  return (
    <div className="event-map-container" style={{ height: mapHeight }}>
      <MapContainer 
        center={mapCenter} 
        zoom={12} 
        style={{ height: '100%' }}
        whenCreated={setMapRef}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url={getTileLayer()}
        />
        <ZoomControl position="bottomright" />
        <MapController onViewReset={resetView} onLocate={locateSelectedMarker} />
        
        {/* Draw the path between points if enabled */}
        {showPath && pathCoordinates.length > 1 && (
          <Polyline 
            positions={pathCoordinates} 
            color="#3b82f6" 
            weight={3} 
            opacity={0.7}
            dashArray={showPath ? undefined : "5, 10"}
          />
        )}
        
        {/* Render markers for each location point */}
        {locationPoints.map((point, index) => {
          const isLatest = index === locationPoints.length - 1;
          const isSelected = point.eventId === selectedPoint;
          
          return (
            <Marker 
              key={`${point.eventId}-${index}`}
              position={[point.lat, point.lng]}
              icon={createMarkerIcon(isSelected, isLatest)}
              eventHandlers={{
                click: () => handleMarkerClick(point.eventId)
              }}
            >
              <Popup className="event-popup">
                <div className="event-popup-content">
                  <h4 className="font-medium text-gray-900 mb-1">
                    Event {index + 1} of {locationPoints.length}
                  </h4>
                  
                  <div className="mb-2">
                    {point.msgType && (
                      <Tag 
                        value={getMessageTypeName(point.msgType)} 
                        severity={point.msgType === '20' ? 'info' : point.msgType === '8' ? 'success' : 'primary'}
                        className="mr-1"
                      />
                    )}
                    {isLatest && <Tag value="Latest" severity="warning" />}
                  </div>
                  
                  <div className="text-xs grid grid-cols-2 gap-x-2 gap-y-1 mb-2">
                    <div>
                      <span className="text-gray-500">Latitude:</span>
                      <span className="font-mono ml-1">{point.lat.toFixed(6)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Longitude:</span>
                      <span className="font-mono ml-1">{point.lng.toFixed(6)}</span>
                    </div>
                    {point.accuracy !== undefined && (
                      <div>
                        <span className="text-gray-500">Accuracy:</span>
                        <span className="ml-1">±{safeNumberDisplay(point.accuracy)}m</span>
                      </div>
                    )}
                    {point.altitude !== undefined && (
                      <div>
                        <span className="text-gray-500">Altitude:</span>
                        <span className="ml-1">{safeNumberDisplay(point.altitude)}m</span>
                      </div>
                    )}
                    {point.speed !== undefined && (
                      <div>
                        <span className="text-gray-500">Speed:</span>
                        <span className="ml-1">{safeNumberDisplay(point.speed)} m/s</span>
                      </div>
                    )}
                    {point.batteryLevel !== undefined && (
                      <div>
                        <span className="text-gray-500">Battery:</span>
                        <span className="ml-1">
                          {typeof point.batteryLevel === 'number' && point.batteryLevel <= 1 
                            ? `${(point.batteryLevel * 100).toFixed(0)}%`
                            : typeof point.batteryLevel === 'string' && parseFloat(point.batteryLevel) <= 1
                              ? `${(parseFloat(point.batteryLevel) * 100).toFixed(0)}%`
                              : `${point.batteryLevel}%`}
                        </span>
                      </div>
                    )}
                    <div className="col-span-2">
                      <span className="text-gray-500">Time:</span>
                      <span className="ml-1">{point.formattedTime}</span>
                    </div>
                    <div className="col-span-2 text-xs text-gray-500 mt-1">
                      Source: {point.source}
                    </div>
                  </div>
                  
                  <a 
                    href={`https://www.google.com/maps?q=${point.lat},${point.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    View on Google Maps
                  </a>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
      
      {/* Map controls */}
      <div className="map-controls">
        <button 
          title="Reset View" 
          onClick={resetView}
          className="text-center flex items-center justify-center"
        >
          <Navigation className="h-4 w-4" />
        </button>
        <button 
          title="Center on Selected" 
          onClick={locateSelectedMarker} 
          disabled={!selectedPoint}
          className={`text-center flex items-center justify-center ${!selectedPoint ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <button 
          title="Toggle Path" 
          onClick={() => setShowPath(!showPath)}
          className={`text-center flex items-center justify-center ${showPath ? 'bg-blue-100 border-blue-300' : ''}`}
        >
          <Route className="h-4 w-4" />
        </button>
        <button 
          title={mapType === 'streets' ? 'Switch to Satellite' : 'Switch to Streets'} 
          onClick={() => setMapType(mapType === 'streets' ? 'satellite' : 'streets')}
          className="text-center flex items-center justify-center"
        >
          <Layers className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}