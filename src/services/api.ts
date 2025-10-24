import { Organization, Site, SuperTag } from '../types';

const API_BASE_URL = 'https://networkasset-conductor.link-labs.com';
const GEOCODE_API_URL = 'https://api.george.airfinder.com/reverse.php';
const CLIENT_EDGE_API_URL = 'https://clientedge-conductor.link-labs.com';

export const apiService = {
  fetchOrganizations: async (authHeader: string): Promise<Organization[]> => {
    const response = await fetch(`${API_BASE_URL}/networkAsset/airfinder/organizations`, {
      headers: { 'Authorization': authHeader }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch organizations');
    }

    return await response.json();
  },

  fetchOrganizationSites: async (orgId: string, authHeader: string): Promise<Site[]> => {
    const response = await fetch(`${API_BASE_URL}/networkAsset/airfinder/${orgId}/sites`, {
      headers: { 'Authorization': authHeader }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch organization sites');
    }

    return await response.json();
  },

  fetchTags: async (siteId: string, authHeader: string): Promise<SuperTag[]> => {
    const response = await fetch(
      `${API_BASE_URL}/networkAsset/airfinder/v4/tags?siteId=${siteId}&format=json&page=1&sortBy=nodeName&sort=asc&all=true`,
      {
        headers: { 'Authorization': authHeader }
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch tags');
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response body is not readable');
    }

    let result = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      result += new TextDecoder().decode(value);
    }

    try {
      return JSON.parse(result);
    } catch (e) {
      throw new Error('Invalid JSON response');
    }
  },

  fetchTagsWithAreaGrouping: async (siteId: string, authHeader: string): Promise<any[]> => {
    const response = await fetch(
      `${API_BASE_URL}/networkAsset/airfinder/tags?siteId=${siteId}&groupBy=area&format=json`,
      {
        headers: { 'Authorization': authHeader }
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch tags with area grouping');
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response body is not readable');
    }

    let result = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      result += new TextDecoder().decode(value);
    }

    try {
      return JSON.parse(result);
    } catch (e) {
      throw new Error('Invalid JSON response');
    }
  },

  pairGeotab: async (macAddress: string, geotabSerialNumber: string, authHeader: string): Promise<void> => {
    const encodedMacId = encodeURIComponent(macAddress);
    const url = `${API_BASE_URL}/networkAsset/airfinder/supertags/addGeoTab?macID=${encodedMacId}&geoTabSerialNumber=${geotabSerialNumber}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': authHeader }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to pair Geotab: ${errorText}`);
    }
  },

  unpairGeotab: async (macAddress: string, authHeader: string): Promise<void> => {
    const encodedMacId = encodeURIComponent(macAddress);
    const url = `${API_BASE_URL}/networkAsset/airfinder/supertags/deleteGeoTab/${encodedMacId}`;

    const response = await fetch(url, {
      method: 'DELETE',
      headers: { 'Authorization': authHeader }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to unpair Geotab: ${errorText}`);
    }
  },

  setHydrophobic: async (nodeAddress: string, value: boolean, authHeader: string): Promise<void> => {
    try {
      // The node address needs special encoding as it appears in the example URL
      // We'll use encodeURIComponent which works for most cases
      const encodedNodeAddress = encodeURIComponent(nodeAddress);
      
      console.log(`Setting hydrophobic property for ${nodeAddress} to ${value}`);
      console.log(`Encoded node address: ${encodedNodeAddress}`);
      
      const url = `${API_BASE_URL}/networkAsset/module/${encodedNodeAddress}/metadata/properties/hydrophobic/${value}`;
      console.log(`API URL: ${url}`);
      
      // Switch to PATCH method as specified
      const response = await fetch(url, {
        method: 'PATCH',
        headers: { 
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API Error: ${response.status} ${response.statusText}`);
        console.error(`Response body: ${errorText}`);
        throw new Error(`Failed to set hydrophobic property: ${errorText || response.statusText}`);
      }
      
      console.log(`Successfully set hydrophobic property for ${nodeAddress} to ${value}`);
    } catch (error) {
      console.error("Error in setHydrophobic:", error);
      throw error;
    }
  },

  // New method for geocoding lat/lon to address
  fetchAddressFromCoordinates: async (latitude: number, longitude: number): Promise<any> => {
    try {
      if (!latitude || !longitude) {
        throw new Error('Invalid coordinates');
      }

      const url = `${GEOCODE_API_URL}?lat=${latitude}&lon=${longitude}&zoom=18&format=jsonv2`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Geocoding failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching address:', error);
      throw error;
    }
  },

  // New method to fetch tag event history
  fetchTagEventHistory: async (
    nodeAddress: string,
    endTime: string,
    startTime: string,
    authHeader: string,
    pageId?: string
  ): Promise<any> => {
    try {
      if (!nodeAddress) {
        throw new Error('Node address is required');
      }
      
      if (!startTime || !endTime) {
        throw new Error('Start time and end time are required');
      }
      
      if (!authHeader) {
        throw new Error('Authorization header is required');
      }
      
      // Encode the node address
      const encodedNodeAddress = encodeURIComponent(nodeAddress);
      
      // Build the URL
      let url = `${CLIENT_EDGE_API_URL}/clientEdge/data/uplinkPayload/node/${encodedNodeAddress}/events/${endTime}/${startTime}`;
      
      console.log('Fetching event history from URL:', url);
      
      // Add page id if provided
      if (pageId) {
        url += `?pageId=${pageId}`;
      }
      
      const response = await fetch(url, {
        headers: { 'Authorization': authHeader }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API Error (${response.status}): ${errorText || response.statusText}`);
        throw new Error(`Failed to fetch tag event history: Status ${response.status} - ${errorText || response.statusText}`);
      }
      
      try {
        const data = await response.json();
        return data;
      } catch (parseError) {
        console.error('JSON parsing error:', parseError);
        throw new Error(`Failed to parse event history response: ${parseError.message}`);
      }
    } catch (error) {
      // Enhance error message with more details
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Unknown error occurred fetching tag event history';
      
      console.error('Error fetching tag event history:', {
        message: errorMessage,
        nodeAddress,
        startTime,
        endTime
      });
      
      throw error;
    }
  },

  getCellIdProcessing: async (nodeAddress: string, authHeader: string): Promise<{ enabled: boolean }> => {
    try {
      const encodedNodeAddress = encodeURIComponent(nodeAddress);
      const url = `${API_BASE_URL}/networkAsset/airfinder/v2/supertags/${encodedNodeAddress}/cellIdProcessing`;
      
      console.log(`Getting cellID processing status for ${nodeAddress}`);
      console.log(`API URL: ${url}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: { 
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API Error: ${response.status} ${response.statusText}`);
        console.error(`Response body: ${errorText}`);
        throw new Error(`Failed to get cellID processing status: ${errorText || response.statusText}`);
      }
      
      const result = await response.json();
      console.log(`CellID processing status for ${nodeAddress}:`, result);
      return result;
    } catch (error) {
      console.error("Error in getCellIdProcessing:", error);
      throw error;
    }
  },

  setCellIdProcessing: async (nodeAddress: string, enabled: boolean, authHeader: string): Promise<void> => {
    try {
      const encodedNodeAddress = encodeURIComponent(nodeAddress);
      const url = `${API_BASE_URL}/networkAsset/airfinder/v2/supertags/${encodedNodeAddress}/cellIdProcessing?enable=${enabled}`;
      
      console.log(`Setting cellID processing for ${nodeAddress} to ${enabled}`);
      console.log(`API URL: ${url}`);
      
      const response = await fetch(url, {
        method: 'PUT',
        headers: { 
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API Error: ${response.status} ${response.statusText}`);
        console.error(`Response body: ${errorText}`);
        throw new Error(`Failed to set cellID processing: ${errorText || response.statusText}`);
      }
      
      console.log(`Successfully set cellID processing for ${nodeAddress} to ${enabled}`);
    } catch (error) {
      console.error("Error in setCellIdProcessing:", error);
      throw error;
    }
  }
};