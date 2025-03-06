import { Organization, Site, SuperTag } from '../types';

const API_BASE_URL = 'https://networkasset-conductor.link-labs.com';

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
  }
};