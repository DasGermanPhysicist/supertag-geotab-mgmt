import React, { useState, useEffect } from 'react';
import { Button } from 'primereact/button';
import { MapPin, Eye, ExternalLink, Loader } from 'lucide-react';
import { apiService } from '../../services/api';

interface EventLocationInfoProps {
  // Accepts various representations of location data
  latitude?: number | string;
  longitude?: number | string;
  lat?: number | string;
  lon?: number | string;
  lng?: number | string;
}

export function EventLocationInfo(props: EventLocationInfoProps) {
  const [addressData, setAddressData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  // Extract coordinates from various possible property names
  const latitude = props.latitude || props.lat;
  const longitude = props.longitude || props.lon || props.lng;

  // Fetch address data on mount if coordinates are available
  useEffect(() => {
    const fetchAddressData = async () => {
      if (!latitude || !longitude) return;
      
      try {
        // Convert to numbers if they're strings
        const lat = typeof latitude === 'string' ? parseFloat(latitude) : latitude;
        const lon = typeof longitude === 'string' ? parseFloat(longitude) : longitude;
        
        // Skip if values can't be parsed
        if (isNaN(lat) || isNaN(lon)) return;
        
        setLoading(true);
        setError(null);
        
        const data = await apiService.fetchAddressFromCoordinates(lat, lon);
        setAddressData(data);
      } catch (err) {
        console.error('Error fetching address:', err);
        setError('Could not retrieve address information');
      } finally {
        setLoading(false);
      }
    };
    
    fetchAddressData();
  }, [latitude, longitude]);

  // Generate Google Maps URL
  const getMapsUrl = () => {
    if (!latitude || !longitude) return '';
    return `https://www.google.com/maps?q=${latitude},${longitude}`;
  };

  if (!latitude || !longitude) {
    return <span className="text-gray-500 italic">No location data</span>;
  }

  return (
    <div className="relative">
      <div className="flex flex-col">
        {/* Always display the coordinates */}
        <div className="font-mono text-gray-700 flex items-center">
          <MapPin className="h-3.5 w-3.5 mr-1 text-blue-600" />
          <span className="mr-1">{typeof latitude === 'string' ? parseFloat(latitude).toFixed(6) : latitude.toFixed(6)},</span>
          <span>{typeof longitude === 'string' ? parseFloat(longitude).toFixed(6) : longitude.toFixed(6)}</span>
        </div>
        
        {/* Address information (show when expanded or available) */}
        {loading ? (
          <div className="mt-1 flex items-center text-gray-500 text-sm">
            <Loader className="h-3 w-3 mr-1 animate-spin" />
            <span>Loading address...</span>
          </div>
        ) : error ? (
          <div className="mt-1 text-red-500 text-xs">{error}</div>
        ) : addressData && (expanded || !loading) ? (
          <div className={`mt-1 ${expanded ? '' : 'line-clamp-1'}`}>
            <div className="text-sm text-gray-700">{addressData.display_name}</div>
            
            {expanded && (
              <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
                {Object.entries(addressData.address || {}).map(([key, value]) => (
                  <div key={key} className="flex flex-col">
                    <span className="text-gray-500 capitalize">{key.replace('_', ' ')}</span>
                    <span className="font-medium">{String(value)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
        
        {/* Action buttons */}
        <div className="mt-1 flex items-center space-x-2">
          {addressData && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
            >
              <Eye className="h-3 w-3 mr-1" />
              {expanded ? 'Show less' : 'Show more'}
            </button>
          )}
          
          <a
            href={getMapsUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            View on map
          </a>
        </div>
      </div>
    </div>
  );
}