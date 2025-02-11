import React, { useState, useEffect } from 'react';
import { LoginForm } from './components/LoginForm';
import { DataTable } from './components/DataTable';
import { SiteSelector } from './components/SiteSelector';
import { OrganizationSelector } from './components/OrganizationSelector';
import { AuthState, SuperTag, Site, Organization } from './types';
import { Building2 } from 'lucide-react';
import { usePersistedState } from './hooks/usePersistedState';

const API_BASE_URL = 'https://networkasset-conductor.link-labs.com';

function App() {
  // Persist authentication state
  const [auth, setAuth] = usePersistedState<AuthState>('auth', {
    username: '',
    isAuthenticated: false,
  });

  // Persist organization and site selections
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrganization, setSelectedOrganization] = usePersistedState<Organization | null>('selectedOrganization', null);
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSite, setSelectedSite] = usePersistedState<Site | null>('selectedSite', null);
  const [data, setData] = useState<SuperTag[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState<{ current: number; total: number } | null>(null);

  // Load initial data when auth is restored
  useEffect(() => {
    if (auth.isAuthenticated && auth.token) {
      fetchOrganizations(auth.token);
    }
  }, [auth.isAuthenticated]);

  // Load site data when organization is restored
  useEffect(() => {
    if (auth.isAuthenticated && auth.token && selectedOrganization) {
      fetchOrganizationSites(selectedOrganization.id, auth.token);
    }
  }, [selectedOrganization, auth.isAuthenticated]);

  // Load tag data when site is restored
  useEffect(() => {
    if (auth.isAuthenticated && auth.token) {
      if (selectedSite) {
        fetchTags(selectedSite.id, auth.token);
      } else if (sites.length > 0) {
        fetchAllSiteTags(sites, auth.token);
      }
    }
  }, [selectedSite, sites.length, auth.isAuthenticated]);

  const fetchOrganizations = async (authHeader: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/networkAsset/airfinder/organizations`, {
        headers: {
          'Authorization': authHeader
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch organizations');
      }

      const orgsData = await response.json();
      setOrganizations(orgsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch organizations');
    }
  };

  const fetchOrganizationSites = async (orgId: string, authHeader: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/networkAsset/airfinder/${orgId}/sites`, {
        headers: {
          'Authorization': authHeader
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch organization sites');
      }

      const sitesData = await response.json();
      setSites(sitesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch organization sites');
    }
  };

  const fetchTags = async (siteId: string, authHeader: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `${API_BASE_URL}/networkAsset/airfinder/v4/tags?siteId=${siteId}&format=json&page=1&sortBy=nodeName&sort=asc&all=true`,
        {
          headers: {
            'Authorization': authHeader
          }
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
        const jsonData = JSON.parse(result);
        setData(jsonData);
      } catch (e) {
        throw new Error('Invalid JSON response');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tags');
    } finally {
      setLoading(false);
      setLoadingProgress(null);
    }
  };

  const fetchAllSiteTags = async (sites: Site[], authHeader: string) => {
    setLoading(true);
    setError(null);
    setData([]);
    setLoadingProgress({ current: 0, total: sites.length });

    try {
      const allTags: SuperTag[] = [];
      
      for (let i = 0; i < sites.length; i++) {
        const site = sites[i];
        setLoadingProgress({ current: i + 1, total: sites.length });
        
        try {
          const response = await fetch(
            `${API_BASE_URL}/networkAsset/airfinder/v4/tags?siteId=${site.id}&format=json&page=1&sortBy=nodeName&sort=asc&all=true`,
            {
              headers: {
                'Authorization': authHeader
              }
            }
          );

          if (!response.ok) {
            console.error(`Failed to fetch tags for site ${site.value}`);
            continue;
          }

          const reader = response.body?.getReader();
          if (!reader) {
            console.error(`Response body not readable for site ${site.value}`);
            continue;
          }

          let result = '';
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            result += new TextDecoder().decode(value);
          }

          const siteTags = JSON.parse(result);
          const tagsWithSite = siteTags.map((tag: SuperTag) => ({
            ...tag,
            siteName: site.value,
            siteId: site.id
          }));
          allTags.push(...tagsWithSite);
        } catch (err) {
          console.error(`Error fetching tags for site ${site.value}:`, err);
        }
      }

      setData(allTags);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tags from all sites');
    } finally {
      setLoading(false);
      setLoadingProgress(null);
    }
  };

  const handleLogin = async (username: string, password: string) => {
    setLoading(true);
    setError(null);
    
    const authHeader = 'Basic ' + btoa(`${username}:${password}`);
    
    try {
      const response = await fetch(`${API_BASE_URL}/networkAsset/airfinder/organizations`, {
        headers: {
          'Authorization': authHeader
        }
      });

      if (!response.ok) {
        throw new Error('Authentication failed');
      }

      const orgsData = await response.json();
      setOrganizations(orgsData);
      setAuth({ username, isAuthenticated: true, token: authHeader });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleOrganizationSelect = async (organization: Organization) => {
    setSelectedOrganization(organization);
    if (auth.token) {
      await fetchOrganizationSites(organization.id, auth.token);
    }
  };

  const handleSiteSelect = (site: Site | null) => {
    setSelectedSite(site);
    if (!site) {
      if (auth.token && sites.length > 0) {
        fetchAllSiteTags(sites, auth.token);
      }
    } else {
      if (auth.token) {
        fetchTags(site.id, auth.token);
      }
    }
  };

  const handleDataChange = () => {
    if (selectedSite) {
      fetchTags(selectedSite.id, auth.token!);
    } else if (sites.length > 0) {
      fetchAllSiteTags(sites, auth.token!);
    }
  };

  const handleLogout = () => {
    setAuth({ username: '', isAuthenticated: false });
    setSelectedOrganization(null);
    setSelectedSite(null);
    setData([]);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {!auth.isAuthenticated ? (
        <div className="min-h-screen bg-gray-50">
          {error && (
            <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          <LoginForm onLogin={handleLogin} />
        </div>
      ) : (
        <div className="max-w-7xl mx-auto py-6 px-4">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Link Labs GeoTab Management Tool</h1>
            <div className="flex items-center gap-4">
              <span className="text-gray-600">{auth.username}</span>
              <button
                onClick={handleLogout}
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
      )}
    </div>
  );
}

export default App;