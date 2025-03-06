import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Building2, ChevronDown, Check } from 'lucide-react';
import { Site } from '../types';

interface SiteSelectorProps {
  sites: Site[];
  selectedSite: Site | null;
  onSiteSelect: (site: Site | null) => void;
}

export function SiteSelector({ sites, selectedSite, onSiteSelect }: SiteSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredSites = useMemo(() => {
    return sites.filter(site =>
      site.value.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [sites, searchTerm]);

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full relative bg-white border border-gray-300 rounded-md shadow-sm pl-3 pr-10 py-2 text-left cursor-default focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="flex items-center">
          {selectedSite ? (
            <span className="ml-1 block truncate">{selectedSite.value}</span>
          ) : (
            <span className="ml-1 block truncate">All Sites</span>
          )}
        </span>
        <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <ChevronDown className="h-4 w-4 text-gray-400" aria-hidden="true" />
        </span>
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-96 rounded-md focus:outline-none overflow-hidden">
          <div className="sticky top-0 z-10 bg-white p-2 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search sites..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>
          
          <div className="max-h-60 overflow-y-auto">
            <ul role="listbox">
              <li
                role="option"
                aria-selected={selectedSite === null}
                className={`cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-blue-50 ${
                  selectedSite === null ? 'bg-blue-50 text-blue-700' : 'text-gray-900'
                }`}
                onClick={() => {
                  onSiteSelect(null);
                  setIsOpen(false);
                  setSearchTerm('');
                }}
              >
                <div className="flex items-center">
                  <Building2 className="h-4 w-4 flex-shrink-0 mr-2" />
                  <span className={`block truncate ${selectedSite === null ? 'font-medium' : 'font-normal'}`}>
                    View All Sites
                  </span>
                </div>
                
                {selectedSite === null && (
                  <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-blue-600">
                    <Check className="h-4 w-4" aria-hidden="true" />
                  </span>
                )}
              </li>
              
              <li className="border-t border-gray-200"></li>
              
              {filteredSites.length > 0 ? (
                filteredSites.map((site) => (
                  <li
                    key={site.id}
                    role="option"
                    aria-selected={selectedSite?.id === site.id}
                    className={`cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-blue-50 ${
                      selectedSite?.id === site.id ? 'bg-blue-50 text-blue-700' : 'text-gray-900'
                    }`}
                    onClick={() => {
                      onSiteSelect(site);
                      setIsOpen(false);
                      setSearchTerm('');
                    }}
                  >
                    <div className="flex items-center">
                      <span className={`ml-1 block truncate ${selectedSite?.id === site.id ? 'font-medium' : 'font-normal'}`}>
                        {site.value}
                      </span>
                    </div>
                    
                    {selectedSite?.id === site.id && (
                      <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-blue-600">
                        <Check className="h-4 w-4" aria-hidden="true" />
                      </span>
                    )}
                  </li>
                ))
              ) : (
                <li className="relative py-2 pl-3 pr-9 text-gray-500 text-center">
                  No sites found
                </li>
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}