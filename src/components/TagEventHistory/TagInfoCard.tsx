import React from 'react';
import { SuperTag } from '../../types';

interface TagInfoCardProps {
  tag: Partial<SuperTag>;
  nodeAddress?: string | null;
}

export function TagInfoCard({ tag, nodeAddress }: TagInfoCardProps) {
  return (
    <div className="bg-blue-50 p-3 rounded border border-blue-200">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <div className="text-sm text-blue-800 font-medium">Node Name</div>
          <div className="text-lg">{tag.nodeName || nodeAddress}</div>
        </div>
        {tag.macAddress && (
          <div>
            <div className="text-sm text-blue-800 font-medium">MAC Address</div>
            <div className="font-mono">{tag.macAddress}</div>
          </div>
        )}
        {tag.areaName && (
          <div>
            <div className="text-sm text-blue-800 font-medium">Area</div>
            <div>{tag.areaName}</div>
          </div>
        )}
      </div>
    </div>
  );
}