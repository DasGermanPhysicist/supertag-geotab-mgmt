import { Organization, Site, SuperTag, TagEventHistory } from '../types';

// API base URLs — could be moved to .env for per-environment config
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'https://networkasset-conductor.link-labs.com';
const GEOCODE_API_URL = import.meta.env.VITE_GEOCODE_API_URL ?? 'https://api.george.airfinder.com/reverse.php';
const CLIENT_EDGE_API_URL = import.meta.env.VITE_CLIENT_EDGE_API_URL ?? 'https://clientedge-conductor.link-labs.com';

/** Shared helper: makes an authenticated request and throws on non-OK responses. */
async function authFetch(url: string, authHeader: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(url, {
    ...init,
    headers: {
      'Authorization': authHeader,
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    throw new Error(`API ${init?.method ?? 'GET'} ${url} failed (${response.status}): ${errorText}`);
  }

  return response;
}

/** Reads a streamed response body to a string and parses JSON. */
async function readStreamAsJson<T>(response: Response): Promise<T> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Response body is not readable');

  let raw = '';
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    raw += new TextDecoder().decode(value);
  }

  return JSON.parse(raw);
}

export const apiService = {
  fetchOrganizations: async (authHeader: string): Promise<Organization[]> => {
    const response = await authFetch(
      `${API_BASE_URL}/networkAsset/airfinder/organizations`,
      authHeader
    );
    return response.json();
  },

  fetchOrganizationSites: async (orgId: string, authHeader: string): Promise<Site[]> => {
    const response = await authFetch(
      `${API_BASE_URL}/networkAsset/airfinder/${orgId}/sites`,
      authHeader
    );
    return response.json();
  },

  fetchTags: async (siteId: string, authHeader: string): Promise<SuperTag[]> => {
    const response = await authFetch(
      `${API_BASE_URL}/networkAsset/airfinder/v4/tags?siteId=${siteId}&format=json&page=1&sortBy=nodeName&sort=asc&all=true`,
      authHeader
    );
    return readStreamAsJson<SuperTag[]>(response);
  },

  fetchTagsWithAreaGrouping: async (siteId: string, authHeader: string): Promise<any[]> => {
    const response = await authFetch(
      `${API_BASE_URL}/networkAsset/airfinder/tags?siteId=${siteId}&groupBy=area&format=json`,
      authHeader
    );
    return readStreamAsJson<any[]>(response);
  },

  pairGeotab: async (macAddress: string, geotabSerialNumber: string, authHeader: string): Promise<void> => {
    const encodedMacId = encodeURIComponent(macAddress);
    await authFetch(
      `${API_BASE_URL}/networkAsset/airfinder/supertags/addGeoTab?macID=${encodedMacId}&geoTabSerialNumber=${geotabSerialNumber}`,
      authHeader,
      { method: 'POST' }
    );
  },

  unpairGeotab: async (macAddress: string, authHeader: string): Promise<void> => {
    const encodedMacId = encodeURIComponent(macAddress);
    await authFetch(
      `${API_BASE_URL}/networkAsset/airfinder/supertags/deleteGeoTab/${encodedMacId}`,
      authHeader,
      { method: 'DELETE' }
    );
  },

  setHydrophobic: async (nodeAddress: string, value: boolean, authHeader: string): Promise<void> => {
    const encodedNodeAddress = encodeURIComponent(nodeAddress);
    await authFetch(
      `${API_BASE_URL}/networkAsset/module/${encodedNodeAddress}/metadata/properties/hydrophobic/${value}`,
      authHeader,
      { method: 'PATCH', headers: { 'Content-Type': 'application/json' } }
    );
  },

  fetchAddressFromCoordinates: async (latitude: number, longitude: number): Promise<any> => {
    if (!latitude || !longitude) {
      throw new Error('Invalid coordinates');
    }

    const response = await fetch(
      `${GEOCODE_API_URL}?lat=${latitude}&lon=${longitude}&zoom=18&format=jsonv2`
    );

    if (!response.ok) {
      throw new Error(`Geocoding failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  },

  fetchTagEventHistory: async (
    nodeAddress: string,
    endTime: string,
    startTime: string,
    authHeader: string,
    pageId?: string
  ): Promise<TagEventHistory> => {
    if (!nodeAddress) throw new Error('Node address is required');
    if (!startTime || !endTime) throw new Error('Start time and end time are required');

    const encodedNodeAddress = encodeURIComponent(nodeAddress);
    let url = `${CLIENT_EDGE_API_URL}/clientEdge/data/uplinkPayload/node/${encodedNodeAddress}/events/${endTime}/${startTime}`;
    if (pageId) url += `?pageId=${pageId}`;

    const response = await authFetch(url, authHeader);
    return response.json();
  },

  getCellIdProcessing: async (nodeAddress: string, authHeader: string): Promise<{ enabled: boolean }> => {
    const encodedNodeAddress = encodeURIComponent(nodeAddress);
    const response = await authFetch(
      `${API_BASE_URL}/networkAsset/airfinder/v2/supertags/${encodedNodeAddress}/cellIdProcessing`,
      authHeader,
      { headers: { 'Content-Type': 'application/json' } }
    );
    return response.json();
  },

  setCellIdProcessing: async (nodeAddress: string, enabled: boolean, authHeader: string): Promise<void> => {
    const encodedNodeAddress = encodeURIComponent(nodeAddress);
    await authFetch(
      `${API_BASE_URL}/networkAsset/airfinder/v2/supertags/${encodedNodeAddress}/cellIdProcessing?enable=${enabled}`,
      authHeader,
      { method: 'PUT', headers: { 'Content-Type': 'application/json' } }
    );
  },
};