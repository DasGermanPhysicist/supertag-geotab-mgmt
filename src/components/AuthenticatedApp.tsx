import { useState, useMemo } from 'react';
import { Building2, LogOut, Menu, X, LayoutDashboard, Map, Tag, Radio, Cpu, Battery, AlertTriangle, Wifi, MapPin } from 'lucide-react';
import { usePersistedState } from '../hooks/usePersistedState';
import { PrimeDataTable } from './DataTable/PrimeDataTable';
import { SiteSelector } from './SiteSelector';
import { OrganizationSelector } from './OrganizationSelector';
import { useOrganizations } from '../hooks/useOrganizations';
import { useSites } from '../hooks/useSites';
import { useSuperTags } from '../hooks/useSuperTags';
import { Organization, Site, SuperTag } from '../types';
import { sendNotification } from '../services/notifications';
import { apiService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { TagMapView } from './TagMapView';

export function AuthenticatedApp() {
  const { auth, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'map'>('table');
  const [selectedMapTag, setSelectedMapTag] = useState<SuperTag | null>(null);
  const [geocodingEnabled, setGeocodingEnabled] = usePersistedState<boolean>('geocodingEnabled', false);

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
  } = useSuperTags(auth.token, selectedSite, sites, geocodingEnabled);

  // Summary stats computed from current data
  const stats = useMemo(() => {
    if (!data.length) return null;
    const total = data.length;
    const paired = data.filter(t => t.geotabSerialNumber).length;
    const lowBattery = data.filter(t => String(t.batteryStatus) === '0').length;
    const withLocation = data.filter(t => t.latitude && t.longitude).length;
    const cellIdDisabled = data.filter(t => t.cellIdProcessingEnabled === false).length;
    return { total, paired, lowBattery, withLocation, cellIdDisabled };
  }, [data]);

  const handleOrganizationSelect = async (organization: Organization) => {
    selectOrganization(organization);
  };

  const handleSiteSelect = (site: Site | null) => {
    selectSite(site);
  };

  const handleDataChange = () => {
    refreshData();
  };

  const handlePairGeotab = async (macAddress: string, geotabSerialNumber: string) => {
    try {
      await apiService.pairGeotab(macAddress, geotabSerialNumber, auth.token!);
      
      if (auth.username) {
        await sendNotification({
          email: auth.username,
          macAddress,
          geotabSerialNumber,
          type: 'pair'
        });
      }
      
      refreshData();
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error : new Error(String(error)) };
    }
  };

  const handleUnpairGeotab = async (macAddress: string) => {
    try {
      await apiService.unpairGeotab(macAddress, auth.token!);
      
      if (auth.username) {
        await sendNotification({
          email: auth.username,
          macAddress,
          type: 'unpair'
        });
      }
      
      refreshData();
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error : new Error(String(error)) };
    }
  };

  const handleSetHydrophobic = async (nodeAddress: string, value: boolean) => {
    try {
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
      return { success: false, error: error instanceof Error ? error : new Error(String(error)) };
    }
  };

  const handleGetCellIdProcessing = async (nodeAddress: string) => {
    try {
      if (!nodeAddress) {
        throw new Error("Node address is required");
      }
      
      const result = await apiService.getCellIdProcessing(nodeAddress, auth.token!);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error : new Error(String(error)) };
    }
  };

  const handleSetCellIdProcessing = async (nodeAddress: string, enabled: boolean) => {
    try {
      if (!nodeAddress) {
        throw new Error("Node address is required");
      }
      
      await apiService.setCellIdProcessing(nodeAddress, enabled, auth.token!);
      
      if (auth.username) {
        await sendNotification({
          email: auth.username,
          macAddress: nodeAddress,
          type: 'cellIdProcessing',
          cellIdProcessingValue: enabled
        });
      }
      
      refreshData();
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error : new Error(String(error)) };
    }
  };

  const error = orgError || siteError || dataError;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* ─── Header ─── */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            {/* Left: Logo + selectors */}
            <div className="flex items-center gap-4 min-w-0">
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
                  <Radio className="h-4 w-4 text-white" />
                </div>
                <span className="text-base font-semibold text-gray-900 hidden lg:block">Link Labs</span>
              </div>

              <div className="hidden sm:flex items-center gap-2 min-w-0">
                <span className="text-gray-300">|</span>
                <div className="w-48 lg:w-56">
                  <OrganizationSelector
                    organizations={organizations}
                    selectedOrganization={selectedOrganization}
                    onOrganizationSelect={handleOrganizationSelect}
                  />
                </div>
                {selectedOrganization && (
                  <div className="w-44 lg:w-52">
                    <SiteSelector
                      sites={sites}
                      selectedSite={selectedSite}
                      onSiteSelect={handleSiteSelect}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Right: View toggle + user */}
            <div className="flex items-center gap-3">
              {data.length > 0 && (
                <div className="hidden sm:inline-flex rounded-lg border border-gray-200 p-0.5 bg-gray-50">
                  <button
                    onClick={() => setViewMode('table')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                      viewMode === 'table'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <LayoutDashboard className="h-3.5 w-3.5" />
                    Table
                  </button>
                  <button
                    onClick={() => setViewMode('map')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                      viewMode === 'map'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Map className="h-3.5 w-3.5" />
                    Map
                  </button>
                </div>
              )}

              {/* Geocoding toggle */}
              <button
                onClick={() => setGeocodingEnabled(!geocodingEnabled)}
                className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                  geocodingEnabled
                    ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                    : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                }`}
                title={geocodingEnabled ? 'Address geocoding is ON (slower loading)' : 'Address geocoding is OFF (faster loading)'}
              >
                <MapPin className="h-3.5 w-3.5" />
                <span className="hidden lg:inline">{geocodingEnabled ? 'Addresses ON' : 'Addresses OFF'}</span>
              </button>

              <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-gray-200">
                <div className="h-7 w-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold">
                  {auth.username?.charAt(0).toUpperCase()}
                </div>
                <button
                  onClick={logout}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  title="Logout"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>

              <button
                className="sm:hidden p-1"
                onClick={() => setMobileMenuOpen(true)}
              >
                <Menu className="h-5 w-5 text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ─── Mobile menu drawer ─── */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 sm:hidden" onClick={() => setMobileMenuOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="absolute right-0 top-0 h-full w-72 bg-white shadow-xl flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 flex justify-between items-center border-b">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-sm font-bold">
                  {auth.username?.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{auth.username}</p>
                </div>
              </div>
              <button onClick={() => setMobileMenuOpen(false)}>
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            <div className="p-4 space-y-3 flex-1">
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider">Organization</label>
              <OrganizationSelector
                organizations={organizations}
                selectedOrganization={selectedOrganization}
                onOrganizationSelect={handleOrganizationSelect}
              />
              {selectedOrganization && (
                <>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider">Site</label>
                  <SiteSelector
                    sites={sites}
                    selectedSite={selectedSite}
                    onSiteSelect={handleSiteSelect}
                  />
                </>
              )}

              {data.length > 0 && (
                <>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mt-4">View</label>
                  <div className="inline-flex rounded-lg border border-gray-200 p-0.5 bg-gray-50 w-full">
                    <button
                      onClick={() => { setViewMode('table'); setMobileMenuOpen(false); }}
                      className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md transition-all ${
                        viewMode === 'table' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                      }`}
                    >
                      <LayoutDashboard className="h-3.5 w-3.5" /> Table
                    </button>
                    <button
                      onClick={() => { setViewMode('map'); setMobileMenuOpen(false); }}
                      className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md transition-all ${
                        viewMode === 'map' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                      }`}
                    >
                      <Map className="h-3.5 w-3.5" /> Map
                    </button>
                  </div>
                </>
              )}

              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mt-4">Options</label>
              <button
                onClick={() => setGeocodingEnabled(!geocodingEnabled)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                  geocodingEnabled
                    ? 'bg-green-50 text-green-700 border-green-200'
                    : 'bg-gray-50 text-gray-500 border-gray-200'
                }`}
              >
                <MapPin className="h-4 w-4" />
                {geocodingEnabled ? 'Addresses ON' : 'Addresses OFF'}
              </button>
            </div>

            <div className="p-4 border-t">
              <button
                onClick={() => { setMobileMenuOpen(false); logout(); }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Main content ─── */}
      <main className="flex-1">
        <div className="max-w-[1600px] mx-auto py-4 px-4 sm:px-6 lg:px-8 space-y-4">
          {/* Error banner */}
          {error && (
            <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* All-sites indicator */}
          {!selectedSite && data.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
              <Building2 className="h-4 w-4 flex-shrink-0" />
              <span className="font-medium">Showing data from all {sites.length} sites</span>
            </div>
          )}

          {/* Summary stat cards */}
          {stats && !loading && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <StatCard icon={<Tag className="h-4 w-4" />} label="Total Tags" value={stats.total} color="blue" />
              <StatCard icon={<Wifi className="h-4 w-4" />} label="Geotab Paired" value={stats.paired} color="green" />
              <StatCard icon={<Cpu className="h-4 w-4" />} label="CellID Disabled" value={stats.cellIdDisabled} color={stats.cellIdDisabled > 0 ? 'red' : 'gray'} />
              <StatCard icon={<Battery className="h-4 w-4" />} label="Low Battery" value={stats.lowBattery} color={stats.lowBattery > 0 ? 'red' : 'gray'} />
              <StatCard icon={<Map className="h-4 w-4" />} label="With Location" value={stats.withLocation} color="purple" />
            </div>
          )}

          {/* Loading state */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 space-y-4">
              <div className="relative h-10 w-10">
                <div className="absolute inset-0 border-t-2 border-blue-600 rounded-full animate-spin" />
                <div className="absolute inset-0 border-2 border-gray-200 rounded-full" />
              </div>
              {loadingProgress ? (
                <div className="text-center space-y-2">
                  <p className="text-sm text-gray-600">
                    Loading site {loadingProgress.current} of {loadingProgress.total}
                  </p>
                  <div className="w-56 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all duration-300"
                      style={{ width: `${(loadingProgress.current / loadingProgress.total) * 100}%` }}
                    />
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">Loading tags...</p>
              )}
            </div>
          ) : data.length > 0 ? (
            <>
              {viewMode === 'table' ? (
                <PrimeDataTable 
                  data={data} 
                  auth={{ token: auth.token, username: auth.username }}
                  onDataChange={handleDataChange}
                  onPairGeotab={handlePairGeotab}
                  onUnpairGeotab={handleUnpairGeotab}
                  onSetHydrophobic={handleSetHydrophobic}
                  onGetCellIdProcessing={handleGetCellIdProcessing}
                  onSetCellIdProcessing={handleSetCellIdProcessing}
                />
              ) : (
                <TagMapView 
                  data={data}
                  selectedRow={selectedMapTag}
                  setSelectedRow={setSelectedMapTag}
                  loading={loading}
                />
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-24">
              <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-10 max-w-md text-center">
                <div className="h-14 w-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                  <Building2 className="h-7 w-7 text-gray-400" />
                </div>
                <h3 className="text-base font-semibold text-gray-900">
                  {selectedOrganization ? 'No tags found' : 'Get started'}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {selectedOrganization
                    ? 'Select a different site or check your filters'
                    : 'Select an organization above to view tag data'}
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ─── Footer ─── */}
      <footer className="border-t border-gray-200 bg-white mt-auto">
        <div className="max-w-[1600px] mx-auto py-3 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-xs text-gray-400">
            &copy; {new Date().getFullYear()} Link Labs &middot; Tag Manager
          </p>
        </div>
      </footer>
    </div>
  );
}

// ─── Stat Card Component ───
function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    green: 'bg-green-50 text-green-600 border-green-100',
    red: 'bg-red-50 text-red-600 border-red-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
    gray: 'bg-gray-50 text-gray-500 border-gray-100',
  };

  return (
    <div className={`rounded-xl border p-3 ${colorMap[color] ?? colorMap.gray}`}>
      <div className="flex items-center gap-2 mb-1 opacity-80">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="text-2xl font-bold tracking-tight">{value.toLocaleString()}</p>
    </div>
  );
}