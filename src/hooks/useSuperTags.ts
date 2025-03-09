import { useState, useEffect } from 'react';
import { SuperTag, Site } from '../types';
import { apiService } from '../services/api';

export function useSuperTags(authToken?: string, selectedSite: Site | null = null, sites: Site[] = []) {
  const [data, setData] = useState<SuperTag[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingProgress, setLoadingProgress] = useState<{ current: number; total: number } | null>(null);

  const enrichTagsWithAddress = async (tags: SuperTag[]): Promise<SuperTag[]> => {
    // Create a new array to hold the enriched tags
    const enrichedTags: SuperTag[] = [];
    
    // Process tags in batches to avoid overwhelming the API
    const batchSize = 10;
    const tagCount = tags.length;
    
    // Update the loading progress to include address resolution
    setLoadingProgress({ current: 0, total: tagCount });
    
    for (let i = 0; i < tagCount; i += batchSize) {
      const batch = tags.slice(i, i + batchSize);
      
      // Process each tag in the batch concurrently
      const processedBatch = await Promise.all(
        batch.map(async (tag) => {
          try {
            // Check if the tag has latitude and longitude
            if (tag.latitude && tag.longitude) {
              // Parse latitude and longitude to numbers if they're strings
              const lat = typeof tag.latitude === 'string' ? parseFloat(tag.latitude) : tag.latitude;
              const lon = typeof tag.longitude === 'string' ? parseFloat(tag.longitude) : tag.longitude;
              
              // Skip if values can't be parsed
              if (isNaN(lat) || isNaN(lon)) {
                return tag;
              }
              
              // Fetch address data
              const addressData = await apiService.fetchAddressFromCoordinates(lat, lon);
              
              // Add address data to the tag
              return {
                ...tag,
                addressData: addressData,
                formattedAddress: addressData.display_name,
                // Add individual address components
                ...Object.keys(addressData.address || {}).reduce((obj, key) => {
                  obj[`address_${key}`] = addressData.address[key];
                  return obj;
                }, {} as Record<string, string>)
              };
            }
          } catch (err) {
            console.error(`Error fetching address for tag ${tag.nodeName}:`, err);
          }
          
          return tag;
        })
      );
      
      // Add the processed batch to the enriched tags
      enrichedTags.push(...processedBatch);
      
      // Update progress
      setLoadingProgress({ current: i + batch.length, total: tagCount });
    }
    
    return enrichedTags;
  };

  const fetchTags = async () => {
    if (!authToken) return;
    
    setLoading(true);
    setError(null);
    
    if (selectedSite) {
      try {
        // Fetch data from both endpoints
        const tagsData = await apiService.fetchTags(selectedSite.id, authToken);
        const tagsWithAreaData = await apiService.fetchTagsWithAreaGrouping(selectedSite.id, authToken);
        
        // Process area-grouped tags to flatten the structure for merging
        const flattenedAreaTags: SuperTag[] = [];
        tagsWithAreaData.forEach(areaData => {
          if (areaData.tags && Array.isArray(areaData.tags)) {
            areaData.tags.forEach(tag => {
              // Extract the tag data from inside the area structure
              if (tag && tag.assetInfo && tag.assetInfo.metadata && tag.assetInfo.metadata.props) {
                // Add area ID and name directly to tag properties for easier access
                const tagWithArea = {
                  ...tag,
                  // Ensure area properties are included in the tag itself
                  areaId: areaData.areaId,
                  areaName: areaData.areaName,
                  ...tag.assetInfo.metadata.props
                };
                flattenedAreaTags.push(tagWithArea);
              }
            });
          }
        });
        
        // Merge the data, preserving all properties and prioritizing new fields from the area grouping endpoint
        const mergedData = tagsData.map(tag => {
          const matchingAreaTag = flattenedAreaTags.find(areaTag => 
            areaTag.macAddress === tag.macAddress || 
            (areaTag.nodeAddress && tag.nodeAddress && areaTag.nodeAddress === tag.nodeAddress)
          );
          
          if (matchingAreaTag) {
            // Create a new object with both sets of properties, prioritizing area data
            return { ...tag, ...matchingAreaTag };
          }
          return tag;
        });
        
        // Enrich the data with address information
        const enrichedData = await enrichTagsWithAddress(mergedData);
        setData(enrichedData);
      } catch (err) {
        console.error('Fetch tags error:', err);
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
          // Fetch data from both endpoints
          const siteTags = await apiService.fetchTags(site.id, authToken);
          const siteTagsWithArea = await apiService.fetchTagsWithAreaGrouping(site.id, authToken);
          
          // Process area-grouped tags to flatten the structure for merging
          const flattenedAreaTags: SuperTag[] = [];
          siteTagsWithArea.forEach(areaData => {
            if (areaData.tags && Array.isArray(areaData.tags)) {
              areaData.tags.forEach(tag => {
                // Extract the tag data from inside the area structure
                if (tag && tag.assetInfo && tag.assetInfo.metadata && tag.assetInfo.metadata.props) {
                  // Add area ID and name directly to tag properties for easier access
                  const tagWithArea = {
                    ...tag,
                    // Ensure area properties are included in the tag itself
                    areaId: areaData.areaId,
                    areaName: areaData.areaName,
                    ...tag.assetInfo.metadata.props
                  };
                  flattenedAreaTags.push(tagWithArea);
                }
              });
            }
          });
          
          // Merge the data, preserving all properties and prioritizing new fields from the area grouping endpoint
          const mergedSiteTags = siteTags.map(tag => {
            const matchingAreaTag = flattenedAreaTags.find(areaTag => 
              areaTag.macAddress === tag.macAddress || 
              (areaTag.nodeAddress && tag.nodeAddress && areaTag.nodeAddress === tag.nodeAddress)
            );
            
            if (matchingAreaTag) {
              // Create a new object with both sets of properties, prioritizing area data
              return { ...tag, ...matchingAreaTag };
            }
            return tag;
          });
          
          // Add site information to each tag
          const tagsWithSite = mergedSiteTags.map((tag: SuperTag) => ({
            ...tag,
            siteName: site.value,
            siteId: site.id
          }));
          
          allTags.push(...tagsWithSite);
        } catch (err) {
          console.error(`Error fetching tags for site ${site.value}:`, err);
        }
      }

      // Log the count of tags fetched
      console.log(`Fetched ${allTags.length} tags across ${sites.length} sites`);

      // Enrich the data with address information
      const enrichedTags = await enrichTagsWithAddress(allTags);
      setData(enrichedTags);
    } catch (err) {
      console.error('Error in fetchAllSiteTags:', err);
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