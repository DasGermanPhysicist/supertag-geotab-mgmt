import { useState, useEffect } from 'react';
import { Site, Organization } from '../types';
import { apiService } from '../services/api';
import { usePersistedState } from './usePersistedState';

export function useSites(authToken?: string, selectedOrganization: Organization | null = null) {
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSite, setSelectedSite] = usePersistedState<Site | null>('selectedSite', null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSites = async () => {
    if (!authToken || !selectedOrganization) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const sitesData = await apiService.fetchOrganizationSites(selectedOrganization.id, authToken);
      setSites(sitesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch organization sites');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authToken && selectedOrganization) {
      fetchSites();
    }
  }, [authToken, selectedOrganization]);

  const selectSite = (site: Site | null) => {
    setSelectedSite(site);
  };

  return {
    sites,
    selectedSite,
    selectSite,
    loading,
    error,
    fetchSites
  };
}