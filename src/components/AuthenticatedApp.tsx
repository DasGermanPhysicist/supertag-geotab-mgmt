import React, { useState } from 'react';
import { Building2, LogOut, Menu, X, Settings, ChevronDown, LayoutDashboard } from 'lucide-react';
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  const handleSetHydrophobic = async (nodeAddress, value) => {
    try {
      console.log(`Attempting to set hydrophobic=${value} for node ${nodeAddress}`);
      
      if (!nodeAddress) {
        throw new Error("Node address is required");
      }
      
      await apiService.setHydrophobic(nodeAddress, value, auth.token!);
      
      if (auth.username) {
        await sendNotification({
          email: auth.username,
          macAddress: nodeAddress,
          type: 'hydrophobic',
          hydrophobicValue: value
        });
      }
      
      refreshData();
      return { success: true };
    } catch (error) {
      console.error('Error setting hydrophobic property:', error);
      return { success: false, error };
    }
  };

  const error = orgError || siteError || dataError;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <LayoutDashboard className="h-6 w-6 text-blue-600" />
            <h1 className="text-xl font-bold text-gray-900 hidden sm:block">Link Labs Tag Manager</h1>
            <h1 className="text-xl font-bold text-gray-900 sm:hidden">Link Labs</h1>
          </div>
          
          <div className="flex items-center">
            <span className="text-sm text-gray-600 mr-3 hidden sm:block">
              {auth.username}
            </span>
            
            <div className="relative group">
              <button 
                className="flex items-center focus:outline-none"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                <div className="hidden sm:flex items-center space-x-1 text-gray-700 hover:text-gray-900">
                  <Settings className="h-5 w-5" />
                  <ChevronDown className="h-4 w-4" />
                </div>
                <Menu className="h-6 w-6 sm:hidden text-gray-700" />
              </button>
              
              <div className="absolute right-0 w-48 py-2 mt-2 bg-white rounded-md shadow-lg hidden sm:group-hover:block z-10">
                <a
                  href="#" 
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" 
                  onClick={(e) => {
                    e.preventDefault();
                    onLogout();
                  }}
                >
                  <div className="flex items-center">
                    <LogOut className="h-4 w-4 mr-2" />
                    <span>Logout</span>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </div>
      </header>
      
      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-gray-900 bg-opacity-50 sm:hidden">
          <div className="fixed right-0 top-0 h-full w-64 bg-white shadow-lg">
            <div className="p-4 flex justify-between items-center border-b">
              <h2 className="text-lg font-medium">Menu</h2>
              <button onClick={() => setMobileMenuOpen(false)}>
                <X className="h-6 w-6 text-gray-500" />
              </button>
            </div>
            <div className="p-4 border-b">
              <p className="text-sm text-gray-600">Signed in as:</p>
              <p className="font-medium">{auth.username}</p>
            </div>
            <div className="p-4">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onLogout();
                }}
                className="w-full flex items-center py-2 text-sm text-gray-700"
              >
                <LogOut className="h-4 w-4 mr-2" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Main content */}
      <main className="flex-1">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="space-y-4 max-w-3xl mb-6 mx-auto">
            <div className="card">
              <div className="space-y-4">
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
            </div>
            
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
              <div className="relative h-12 w-12">
                <div className="absolute top-0 right-0 bottom-0 left-0 border-t-2 border-blue-600 rounded-full animate-spin"></div>
                <div className="absolute top-0 right-0 bottom-0 left-0 border-2 border-gray-200 rounded-full"></div>
              </div>
              {loadingProgress && (
                <div className="text-gray-600 text-center">
                  <p>Loading sites: {loadingProgress.current} of {loadingProgress.total}</p>
                  <div className="w-64 h-2 bg-gray-200 rounded-full mt-2 overflow-hidden">
                    <div 
                      className="h-full bg-blue-600 rounded-full transition-all duration-300"
                      style={{ width: `${(loadingProgress.current / loadingProgress.total) * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          ) : data.length > 0 ? (
            <div className="space-y-4">
              {!selectedSite && (
                <div className="p-4 bg-blue-50 border-l-4 border-blue-500 text-blue-700 rounded-md flex items-center space-x-2">
                  <Building2 className="h-5 w-5 flex-shrink-0" />
                  <span className="font-medium">Showing data from all sites</span>
                </div>
              )}
              <DataTable 
                data={data} 
                auth={{ token: auth.token, username: auth.username }}
                onDataChange={handleDataChange}
                onPairGeotab={handlePairGeotab}
                onUnpairGeotab={handleUnpairGeotab}
                onSetHydrophobic={handleSetHydrophobic}
              />
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 max-w-3xl mx-auto">
                <div className="flex flex-col items-center">
                  <Building2 className="h-16 w-16 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900">No data to display</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {selectedOrganization 
                      ? "Please select a site to view its data"
                      : "Please select an organization to begin"}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      
      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500">
            &copy; {new Date().getFullYear()} Link Labs. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}