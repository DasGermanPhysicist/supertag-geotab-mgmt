import React from 'react';
import { Building2 } from 'lucide-react';
import { DataTable } from './DataTable';
import { SiteSelector } from './SiteSelector';
import { OrganizationSelector } from './OrganizationSelector';
import { useOrganizations } from '../hooks/useOrganizations';
import { useSites } from '../hooks/useSites';
import { useSuperTags } from '../hooks/useSuperTags';
import { AuthState } from '../types';
import { sendNotification } from '../services/notifications';
import { apiService } from '../services/api';

interface AuthenticatedAppProps {
  auth: AuthState;
  onLogout: () => void;
}

export function AuthenticatedApp({ auth, onLogout }: AuthenticatedAppProps) {
  const { 
    organizations, 
    selectedOrganization, 
    selectOrganization, 
    error: orgError 
  } = useOrganizations(auth.token);

  const { 
    sites, 
    selectedSite, 
    selectSite, 
    error: siteError 
  } = useSites(auth.token, selectedOrganization);

  const { 
    data, 
    loading, 
    error: dataError, 
    loadingProgress, 
    refreshData 
  } = useSuperTags(auth.token, selectedSite, sites);

  const handleOrganizationSelect = async (organization) => {
    selectOrganization(organization);
  };

  const handleSiteSelect = (site) => {
    selectSite(site);
  };

  const handleDataChange = () => {
    refreshData();
  };

  const handlePairGeotab = async (macAddress, geotabSerialNumber) => {
    try {
      await apiService.pairGeotab(macAddress, geotabSerialNumber, auth.token!);
      
      if (auth.username) {
        await sendNotification({
          email: auth.username,
          macAddress: macAddress,
          geotabSerialNumber: geotabSerialNumber,
          type: 'pair'
        });
      }
      
      refreshData();
      return { success: true };
    } catch (error) {
      console.error('Error pairing Geotab:', error);
      return { success: false, error };
    }
  };

  const handleUnpairGeotab = async (macAddress) => {
    try {
      await apiService.unpairGeotab(macAddress, auth.token!);
      
      if (auth.username) {
        await sendNotification({
          email: auth.username,
          macAddress: macAddress,
          type: 'unpair'
        });
      }
      
      refreshData();
      return { success: true };
    } catch (error) {
      console.error('Error unpairing Geotab:', error);
      return { success: false, error };
    }
  };

  const error = orgError || siteError || dataError;

  return (
    <div className="max-w-7xl mx-auto py-6 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Link Labs GeoTab Management Tool</h1>
        <div className="flex items-center gap-4">
          <span className="text-gray-600">{auth.username}</span>
          <button
            onClick={onLogout}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            Logout
          </button>
        </div>
      </div>
      
      <div className="space-y-4 max-w-md mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Organization
          </label>
          <OrganizationSelector
            organizations={organizations}
            selectedOrganization={selectedOrganization}
            onOrganizationSelect={handleOrganizationSelect}
          />
        </div>
        {selectedOrganization && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Site
            </label>
            <SiteSelector
              sites={sites}
              selectedSite={selectedSite}
              onSiteSelect={handleSiteSelect}
            />
          </div>
        )}
      </div>
      
      {error && (
        <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      
      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          {loadingProgress && (
            <div className="text-gray-600">
              Loading sites: {loadingProgress.current} of {loadingProgress.total}
            </div>
          )}
        </div>
      ) : data.length > 0 ? (
        <div className="space-y-4">
          {!selectedSite && (
            <div className="flex items-center space-x-2 text-blue-600">
              <Building2 className="h-5 w-5" />
              <span className="font-medium">Showing data from all sites</span>
            </div>
          )}
          <DataTable 
            data={data} 
            auth={{ token: auth.token, username: auth.username }}
            onDataChange={handleDataChange}
            onPairGeotab={handlePairGeotab}
            onUnpairGeotab={handleUnpairGeotab}
          />
        </div>
      ) : (
        <div className="text-center text-gray-600 py-12">
          {selectedOrganization 
            ? "Please select a site to view its data"
            : "Please select an organization to begin"}
        </div>
      )}
    </div>
  );
}