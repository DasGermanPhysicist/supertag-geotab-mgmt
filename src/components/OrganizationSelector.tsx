import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check } from 'lucide-react';
import { Organization } from '../types';

interface OrganizationSelectorProps {
  organizations: Organization[];
  selectedOrganization: Organization | null;
  onOrganizationSelect: (organization: Organization) => void;
}

export function OrganizationSelector({ organizations, selectedOrganization, onOrganizationSelect }: OrganizationSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredOrganizations = useMemo(() => {
    return organizations.filter(org =>
      org.value.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [organizations, searchTerm]);

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
          <span className="ml-1 block truncate">
            {selectedOrganization ? selectedOrganization.value : 'Select an organization'}
          </span>
        </span>
        <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <ChevronDown className="h-4 w-4 text-gray-400" aria-hidden="true" />
        </span>
      </button>

      {isOpen && (
        <div className="absolute z-20 mt-1 w-full bg-white shadow-lg max-h-96 rounded-md focus:outline-none overflow-hidden">
          <div className="sticky top-0 z-10 bg-white p-2 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search organizations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>
          
          <div className="max-h-60 overflow-y-auto">
            <ul role="listbox">
              {filteredOrganizations.length > 0 ? (
                filteredOrganizations.map((org) => (
                  <li
                    key={org.id}
                    role="option"
                    aria-selected={selectedOrganization?.id === org.id}
                    className={`cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-blue-50 ${
                      selectedOrganization?.id === org.id ? 'bg-blue-50 text-blue-700' : 'text-gray-900'
                    }`}
                    onClick={() => {
                      onOrganizationSelect(org);
                      setIsOpen(false);
                      setSearchTerm('');
                    }}
                  >
                    <div className="flex items-center">
                      <span className={`block truncate ${selectedOrganization?.id === org.id ? 'font-medium' : 'font-normal'}`}>
                        {org.value}
                      </span>
                    </div>

                    {selectedOrganization?.id === org.id && (
                      <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-blue-600">
                        <Check className="h-4 w-4" aria-hidden="true" />
                      </span>
                    )}
                  </li>
                ))
              ) : (
                <li className="relative py-2 pl-3 pr-9 text-gray-500 text-center">
                  No organizations found
                </li>
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}