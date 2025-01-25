import React, { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { Organization } from '../types';

interface OrganizationSelectorProps {
  organizations: Organization[];
  selectedOrganization: Organization | null;
  onOrganizationSelect: (organization: Organization) => void;
}

export function OrganizationSelector({ organizations, selectedOrganization, onOrganizationSelect }: OrganizationSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredOrganizations = useMemo(() => {
    return organizations.filter(org =>
      org.value.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [organizations, searchTerm]);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2 text-left bg-white border rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {selectedOrganization ? selectedOrganization.value : 'Select an organization'}
      </button>

      {isOpen && (
        <div className="absolute z-20 w-full mt-1 bg-white border rounded-lg shadow-lg">
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search organizations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {filteredOrganizations.map((org) => (
              <button
                key={org.id}
                onClick={() => {
                  onOrganizationSelect(org);
                  setIsOpen(false);
                  setSearchTerm('');
                }}
                className="w-full px-4 py-2 text-left hover:bg-gray-100 focus:outline-none focus:bg-gray-100"
              >
                {org.value}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}