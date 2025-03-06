import { useState, useEffect } from 'react';
import { SuperTag, Site } from '../types';
import { apiService } from '../services/api';

export function useSuperTags(authToken?: string, selectedSite: Site | null = null, sites: Site[] = []) {
  const [data, setData] = useState<SuperTag[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingProgress, setLoadingProgress] = useState<{ current: number; total: number } | null>(null);

  const fetchTags = async () => {
    if (!authToken) return;
    
    setLoading(true);
    setError(null);
    
    if (selectedSite) {
      try {
        const tagsData = await apiService.fetchTags(selectedSite.id, authToken);
        setData(tagsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch tags');
      } finally {
        setLoading(false);
        setLoadingProgress(null);
      }
    } else if (sites.length > 0) {
      await fetchAllSiteTags();
    } else {
      setLoading(false);
    }
  };

  const fetchAllSiteTags = async () => {
    if (!authToken || sites.length === 0) return;
    
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
          const siteTags = await apiService.fetchTags(site.id, authToken);
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

  useEffect(() => {
    if (authToken) {
      if (selectedSite) {
        fetchTags();
      } else if (sites.length > 0) {
        fetchAllSiteTags();
      }
    }
  }, [selectedSite, sites.length, authToken]);

  const refreshData = () => {
    if (selectedSite) {
      fetchTags();
    } else if (sites.length > 0) {
      fetchAllSiteTags();
    }
  };

  return {
    data,
    loading,
    error,
    loadingProgress,
    refreshData
  };
}