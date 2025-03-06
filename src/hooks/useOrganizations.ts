import { useState, useEffect } from 'react';
import { Organization } from '../types';
import { apiService } from '../services/api';
import { usePersistedState } from './usePersistedState';

export function useOrganizations(authToken?: string) {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrganization, setSelectedOrganization] = usePersistedState<Organization | null>(
    'selectedOrganization', 
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrganizations = async () => {
    if (!authToken) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const orgsData = await apiService.fetchOrganizations(authToken);
      setOrganizations(orgsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch organizations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authToken) {
      fetchOrganizations();
    }
  }, [authToken]);

  const selectOrganization = (organization: Organization) => {
    setSelectedOrganization(organization);
  };

  return {
    organizations,
    selectedOrganization,
    selectOrganization,
    loading,
    error,
    fetchOrganizations
  };
}