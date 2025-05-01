import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, ZoomControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Layers, Navigation, ZoomIn, Filter, X } from 'lucide-react';
import { SuperTag } from '../types';
import { Dropdown } from 'primereact/dropdown';
import { ColorPicker } from 'primereact/colorpicker';
import { Slider } from 'primereact/slider';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';

// Import Leaflet CSS
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default marker icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

interface TagMapViewProps {
  data: SuperTag[];
  selectedRow: SuperTag | null;
  setSelectedRow: (row: SuperTag | null) => void;
  loading: boolean;
}

interface MarkerStyleOption {
  property: string;
  label: string;
}

// Helper function to get unique values for a property
const getUniqueValues = (data: SuperTag[], property: string) => {
  const values = new Set<string>();
  data.forEach(item => {
    if (item[property] !== undefined && item[property] !== null) {
      values.add(String(item[property]));
    }
  });
  return Array.from(values);
};

// Map controller component for handling interactions
function MapController({ selectedRow, resetView }: { selectedRow: SuperTag | null; resetView: () => void }) {
  const map = useMap();

  // Center on selected marker when it changes
  useEffect(() => {
    if (selectedRow && selectedRow.latitude && selectedRow.longitude) {
      const lat = typeof selectedRow.latitude === 'string' ? parseFloat(selectedRow.latitude) : selectedRow.latitude;
      const lng = typeof selectedRow.longitude === 'string' ? parseFloat(selectedRow.longitude) : selectedRow.longitude;
      
      if (!isNaN(lat) && !isNaN(lng)) {
        map.setView([lat, lng], Math.max(14, map.getZoom()));
      }
    }
  }, [selectedRow, map]);
  
  // Initial setup
  useEffect(() => {
    // Wait a bit for the map to be fully initialized
    setTimeout(() => {
      resetView();
    }, 100);
  }, []);

  return null;
}

export function TagMapView({ data, selectedRow, setSelectedRow, loading }: TagMapViewProps) {
  const [mapType, setMapType] = useState<'streets' | 'satellite'>('streets');
  const [markerSize, setMarkerSize] = useState<number>(12);
  const [styleProperty, setStyleProperty] = useState<string>('areaName');
  const [colorMap, setColorMap] = useState<Record<string, string>>({});
  const mapRef = useRef<L.Map>(null);
  const [markersCount, setMarkersCount] = useState(0);

  // Generate property options for styling
  const propertyOptions: MarkerStyleOption[] = useMemo(() => {
    const properties = new Set<string>();
    
    // Always include these properties if they exist in any tag
    const defaultProperties = ['areaName', 'batteryStatus', 'motionState', 'isLost', 'hydrophobic', 'geotabSerialNumber'];
    
    defaultProperties.forEach(prop => {
      const exists = data.some(tag => tag[prop] !== undefined);
      if (exists) properties.add(prop);
    });
    
    // Add all other properties that might be useful for coloring
    data.forEach(tag => {
      Object.keys(tag).forEach(key => {
        // Skip complex objects, arrays, or very long string values
        if (
          typeof tag[key] !== 'object' && 
          !Array.isArray(tag[key]) &&
          (typeof tag[key] !== 'string' || tag[key].length < 50)
        ) {
          properties.add(key);
        }
      });
    });
    
    // Convert to array of options with formatted labels
    return Array.from(properties).map(prop => ({
      property: prop,
      label: prop
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .replace(/Id\b/g, 'ID')
        .trim()
    })).sort((a, b) => a.label.localeCompare(b.label));
  }, [data]);
  
  // Get valid coordinates from the data
  const validTags = useMemo(() => {
    return data.filter(tag => {
      if (!tag.latitude || !tag.longitude) return false;
      
      const lat = typeof tag.latitude === 'string' ? parseFloat(tag.latitude) : tag.latitude;
      const lng = typeof tag.longitude === 'string' ? parseFloat(tag.longitude) : tag.longitude;
      
      return !isNaN(lat) && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0);
    });
  }, [data]);

  // Calculate a sensible initial map center and bounds
  const mapSettings = useMemo(() => {
    // Get all valid coordinates from the data
    const validCoordinates = validTags.map(tag => ({
      lat: typeof tag.latitude === 'string' ? parseFloat(tag.latitude) : tag.latitude,
      lng: typeof tag.longitude === 'string' ? parseFloat(tag.longitude) : tag.longitude
    }));
    
    if (validCoordinates.length === 0) {
      // Default center if no valid coordinates
      return {
        center: [39.8283, -98.5795] as [number, number], // Center of the US
        zoom: 4,
        hasCoordinates: false
      };
    }
    
    // Calculate center
    const sumLat = validCoordinates.reduce((sum, coord) => sum + coord.lat, 0);
    const sumLng = validCoordinates.reduce((sum, coord) => sum + coord.lng, 0);
    const center: [number, number] = [
      sumLat / validCoordinates.length,
      sumLng / validCoordinates.length
    ];
    
    return {
      center,
      zoom: validCoordinates.length === 1 ? 15 : 12,
      hasCoordinates: true,
      validCoordinates
    };
  }, [validTags]);

  // Generate color map for the selected property
  useEffect(() => {
    if (!styleProperty) return;
    
    const uniqueValues = getUniqueValues(data, styleProperty);
    const newColorMap: Record<string, string> = {};
    
    // Use a set of predefined colors for common properties
    if (styleProperty === 'batteryStatus') {
      newColorMap['1'] = '#10b981'; // green-500 for good
      newColorMap['0'] = '#ef4444'; // red-500 for low
    } else if (styleProperty === 'motionState') {
      newColorMap['true'] = '#10b981'; // green-500 for moving
      newColorMap['false'] = '#6b7280'; // gray-500 for stationary
    } else if (styleProperty === 'isLost') {
      newColorMap['true'] = '#ef4444'; // red-500 for lost
      newColorMap['false'] = '#10b981'; // green-500 for connected
    } else if (styleProperty === 'hydrophobic') {
      newColorMap['true'] = '#3b82f6'; // blue-500 for hydrophobic
      newColorMap['false'] = '#6b7280'; // gray-500 for not hydrophobic
    } else {
      // Generate colors for other properties
      const colorPalette = [
        '#3b82f6', // blue-500
        '#10b981', // green-500
        '#f59e0b', // amber-500
        '#ef4444', // red-500
        '#8b5cf6', // violet-500
        '#ec4899', // pink-500
        '#06b6d4', // cyan-500
        '#f97316', // orange-500
        '#14b8a6', // teal-500
        '#a855f7', // purple-500
        '#64748b', // slate-500
        '#d946ef', // fuchsia-500
        '#84cc16', // lime-500
        '#0ea5e9', // sky-500
        '#f43f5e', // rose-500
      ];
      
      uniqueValues.forEach((value, index) => {
        newColorMap[value] = colorPalette[index % colorPalette.length];
      });
    }
    
    setColorMap(newColorMap);
  }, [styleProperty, data]);

  // Reset view to fit all markers
  const resetView = () => {
    if (mapRef.current && validTags.length > 0) {
      const validCoordinates = validTags.map(tag => {
        const lat = typeof tag.latitude === 'string' ? parseFloat(tag.latitude) : tag.latitude;
        const lng = typeof tag.longitude === 'string' ? parseFloat(tag.longitude) : tag.longitude;
        return L.latLng(lat, lng);
      });
      
      const bounds = L.latLngBounds(validCoordinates);
      mapRef.current.fitBounds(bounds, { padding: [40, 40] });
    }
  };

  // Center on selected marker
  const centerOnSelected = () => {
    if (mapRef.current && selectedRow && selectedRow.latitude && selectedRow.longitude) {
      const lat = typeof selectedRow.latitude === 'string' ? parseFloat(selectedRow.latitude) : selectedRow.latitude;
      const lng = typeof selectedRow.longitude === 'string' ? parseFloat(selectedRow.longitude) : selectedRow.longitude;
      
      if (!isNaN(lat) && !isNaN(lng)) {
        mapRef.current.setView([lat, lng], Math.max(15, mapRef.current.getZoom()));
      }
    }
  };

  // Handle color change for a specific value
  const handleColorChange = (value: string, newColor: string) => {
    setColorMap(prev => ({
      ...prev,
      [value]: `#${newColor}`
    }));
  };

  // Get the tile layer URL based on map type
  const getTileLayer = () => {
    if (mapType === 'satellite') {
      return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
    }
    return 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  };

  // Count valid coordinates
  const validCoordinatesCount = validTags.length;

  // Create markers
  const createMarkers = () => {
    let count = 0;
    
    const markers = validTags.map(tag => {
      try {
        const lat = typeof tag.latitude === 'string' ? parseFloat(tag.latitude) : tag.latitude;
        const lng = typeof tag.longitude === 'string' ? parseFloat(tag.longitude) : tag.longitude;
        
        // Get color for marker based on selected property
        let color = '#3b82f6'; // Default blue color
        if (styleProperty && tag[styleProperty] !== undefined) {
          const value = String(tag[styleProperty]);
          color = colorMap[value] || '#6b7280'; // Use gray if no mapping
        }
        
        // Create custom icon
        const icon = L.divIcon({
          html: `<div style="
            background-color: ${color};
            width: ${markerSize}px;
            height: ${markerSize}px;
            border-radius: 50%;
            border: 2px solid white;
            box-shadow: 0 0 4px rgba(0,0,0,0.4);
            ${selectedRow?.macAddress === tag.macAddress ? 'transform: scale(1.5); z-index: 1000;' : ''}
          "></div>`,
          className: '',
          iconSize: [markerSize, markerSize],
          iconAnchor: [markerSize/2, markerSize/2]
        });

        count++;
        
        return (
          <Marker 
            key={tag.macAddress || tag.nodeName + lat + lng} 
            position={[lat, lng]} 
            icon={icon}
            eventHandlers={{
              click: () => {
                setSelectedRow(tag);
              }
            }}
          >
            <Popup>
              <div className="min-w-[200px]">
                <div className="font-medium text-lg mb-2">
                  {tag.nodeName || 'Unnamed Tag'}
                </div>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-sm mb-3">
                  <div className="col-span-2">
                    <span className="text-gray-500 text-xs">MAC Address</span>
                    <div className="font-mono text-xs">{tag.macAddress}</div>
                  </div>
                  {tag.areaName && (
                    <div className="col-span-2">
                      <span className="text-gray-500 text-xs">Area</span>
                      <div>{tag.areaName}</div>
                    </div>
                  )}
                  <div className="col-span-2">
                    <span className="text-gray-500 text-xs">Battery</span>
                    <div>
                      {tag.batteryStatus === '1' ? 'Good' : tag.batteryStatus === '0' ? 'Low' : 'Unknown'}
                    </div>
                  </div>
                  {tag.geotabSerialNumber && (
                    <div className="col-span-2">
                      <span className="text-gray-500 text-xs">Geotab</span>
                      <div>{tag.geotabSerialNumber}</div>
                    </div>
                  )}
                  <div className="col-span-2">
                    <span className="text-gray-500 text-xs">Hydrophobic</span>
                    <div>
                      {tag.hydrophobic === 'true' ? 'Yes' : tag.hydrophobic === 'false' ? 'No' : 'Unknown'}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-500 text-xs">Coordinates</span>
                    <div className="font-mono text-xs">
                      {lat.toFixed(6)}, {lng.toFixed(6)}
                    </div>
                  </div>
                </div>
                
                {tag.formattedAddress && (
                  <div className="text-xs text-gray-700 mb-2">
                    <div className="text-gray-500">Address:</div>
                    <div className="mt-1">{tag.formattedAddress}</div>
                  </div>
                )}
                
                <Button 
                  label="Select Tag" 
                  className="p-button-sm w-full" 
                  onClick={() => setSelectedRow(tag)} 
                />
              </div>
            </Popup>
          </Marker>
        );
      } catch (error) {
        console.error('Error creating marker for tag:', tag, error);
        return null;
      }
    }).filter(Boolean);
    
    // Update marker count for display
    if (count !== markersCount) {
      setMarkersCount(count);
    }
    
    return markers;
  };

  // Prepare unique values for the legend
  const legendItems = useMemo(() => {
    if (!styleProperty) return [];
    
    return Object.entries(colorMap).map(([value, color]) => ({
      value,
      color,
      label: styleProperty === 'batteryStatus' 
        ? (value === '1' ? 'Good' : 'Low')
        : styleProperty === 'motionState' 
        ? (value === 'true' ? 'Moving' : 'Stationary')
        : styleProperty === 'isLost'
        ? (value === 'true' ? 'Lost' : 'Connected')
        : styleProperty === 'hydrophobic'
        ? (value === 'true' ? 'Hydrophobic' : 'Not Hydrophobic')
        : value
    }));
  }, [styleProperty, colorMap]);

  useEffect(() => {
    console.log(`Found ${validTags.length} tags with valid coordinates`);
  }, [validTags]);

  if (loading) {
    return (
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-6 flex items-center justify-center" style={{ height: "600px" }}>
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-gray-600">Loading map data...</p>
        </div>
      </div>
    );
  }

  if (validCoordinatesCount === 0) {
    return (
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-6 text-center flex flex-col items-center justify-center" style={{ height: "400px" }}>
        <MapPin className="h-12 w-12 text-gray-300 mb-3" />
        <h3 className="font-medium text-gray-600 mb-1">No Location Data Available</h3>
        <p className="text-sm text-gray-500">None of the currently displayed tags contain valid geographic coordinates.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div className="space-y-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Color Tags By
              </label>
              <Dropdown
                value={styleProperty}
                options={propertyOptions}
                onChange={(e) => setStyleProperty(e.value)}
                optionLabel="label"
                optionValue="property"
                placeholder="Select Property"
                className="w-full md:w-64"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Marker Size
              </label>
              <Slider 
                value={markerSize} 
                onChange={(e) => setMarkerSize(e.value as number)} 
                min={6} 
                max={16}
                step={2}
                className="w-full"
              />
            </div>
          </div>
          
          <div>
            <div className="text-sm text-gray-600 mb-1">
              {validCoordinatesCount} of {data.length} tags have location data
            </div>
            {styleProperty && legendItems.length > 0 && (
              <div className="bg-gray-50 p-2 rounded border border-gray-200 max-w-md">
                <div className="text-xs font-medium text-gray-700 mb-1 flex items-center">
                  <Filter className="h-3 w-3 mr-1" />
                  Legend: {propertyOptions.find(opt => opt.property === styleProperty)?.label}
                </div>
                <div className="flex flex-wrap gap-1">
                  {legendItems.map((item) => (
                    <Tag
                      key={item.value}
                      value={item.label}
                      style={{ backgroundColor: item.color, color: '#fff' }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="relative" style={{ height: "600px" }}>
        <MapContainer 
          center={mapSettings.center} 
          zoom={mapSettings.zoom} 
          style={{ height: '100%', width: '100%', borderRadius: '0.5rem' }}
          ref={mapRef}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url={getTileLayer()}
          />
          <ZoomControl position="bottomright" />
          <MapController selectedRow={selectedRow} resetView={resetView} />
          
          {/* Render markers directly without clustering */}
          {createMarkers()}
        </MapContainer>
        
        {/* Map controls */}
        <div className="absolute top-4 right-4 z-[1000] bg-white shadow rounded-lg flex flex-col p-1">
          <button 
            onClick={resetView}
            className="p-2 hover:bg-gray-100 rounded-md" 
            title="Reset View"
          >
            <Navigation className="h-5 w-5 text-gray-600" />
          </button>
          <button 
            onClick={centerOnSelected}
            className={`p-2 hover:bg-gray-100 rounded-md ${selectedRow ? '' : 'opacity-50 cursor-not-allowed'}`} 
            title="Center on Selected Tag"
            disabled={!selectedRow}
          >
            <ZoomIn className="h-5 w-5 text-gray-600" />
          </button>
          <button 
            onClick={() => setMapType(mapType === 'streets' ? 'satellite' : 'streets')}
            className="p-2 hover:bg-gray-100 rounded-md" 
            title={mapType === 'streets' ? 'Switch to Satellite' : 'Switch to Streets'}
          >
            <Layers className="h-5 w-5 text-gray-600" />
          </button>
        </div>
        
        {/* Selected tag info card */}
        {selectedRow && (
          <div className="absolute left-4 bottom-4 z-[1000] max-w-md">
            <Card title={selectedRow.nodeName || "Selected Tag"} className="shadow-lg">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-500">MAC Address:</span>
                  <div className="font-mono">{selectedRow.macAddress}</div>
                </div>
                {selectedRow.geotabSerialNumber && (
                  <div>
                    <span className="text-gray-500">Geotab:</span>
                    <div>{selectedRow.geotabSerialNumber}</div>
                  </div>
                )}
                <div>
                  <span className="text-gray-500">Coordinates:</span>
                  <div className="font-mono">
                    {typeof selectedRow.latitude === 'string' 
                      ? parseFloat(selectedRow.latitude).toFixed(6) 
                      : selectedRow.latitude?.toFixed(6)}, 
                    {typeof selectedRow.longitude === 'string' 
                      ? parseFloat(selectedRow.longitude).toFixed(6)
                      : selectedRow.longitude?.toFixed(6)}
                  </div>
                </div>
                {selectedRow.formattedAddress && (
                  <div className="col-span-2">
                    <span className="text-gray-500">Address:</span>
                    <div>{selectedRow.formattedAddress}</div>
                  </div>
                )}
              </div>
              <div className="flex justify-end mt-3">
                <Button 
                  icon={<X className="h-4 w-4" />}
                  onClick={() => setSelectedRow(null)}
                  className="p-button-sm p-button-text"
                  label="Close"
                />
              </div>
            </Card>
          </div>
        )}
      </div>
      
      {/* Color customization panel */}
      {styleProperty && legendItems.length > 0 && (
        <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Customize Colors</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {legendItems.map((item) => (
              <div key={item.value} className="flex items-center space-x-2">
                <ColorPicker
                  value={item.color.replace('#', '')}
                  onChange={(e) => handleColorChange(item.value, e.value as string)}
                  appendTo="self"
                  style={{ width: '2rem', height: '2rem' }}
                />
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}