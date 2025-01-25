import React, { useState, useMemo } from 'react';
import { Search, Building2 } from 'lucide-react';
import { Site } from '../types';

interface SiteSelectorProps {
  sites: Site[];
  selectedSite: Site | null;
  onSiteSelect: (site: Site | null) => void;
}

export function SiteSelector({ sites, selectedSite, onSiteSelect }: SiteSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredSites = useMemo(() => {
    return sites.filter(site =>
      site.value.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [sites, searchTerm]);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2 text-left bg-white border rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {selectedSite ? selectedSite.value : 'All Sites'}
      </button>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg">
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search sites..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto">
            <button
              onClick={() => {
                onSiteSelect(null);
                setIsOpen(false);
                setSearchTerm('');
              }}
              className="w-full px-4 py-2 text-left hover:bg-gray-100 focus:outline-none focus:bg-gray-100 flex items-center space-x-2 font-medium text-blue-600"
            >
              <Building2 className="h-4 w-4" />
              <span>View All Sites</span>
            </button>
            <div className="border-t"></div>
            {filteredSites.map((site) => (
              <button
                key={site.id}
                onClick={() => {
                  onSiteSelect(site);
                  setIsOpen(false);
                  setSearchTerm('');
                }}
                className="w-full px-4 py-2 text-left hover:bg-gray-100 focus:outline-none focus:bg-gray-100"
              >
                {site.value}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}