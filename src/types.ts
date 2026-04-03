// Known fields returned by the Link Labs API for a tag.
// The index signature preserves compatibility with dynamic/unknown API properties.
export interface SuperTag {
  macAddress: string;
  nodeName?: string;
  nodeAddress?: string;
  geotabSerialNumber?: string | null;
  registrationToken?: string;
  lastEventTime?: string;
  batteryStatus?: string | number;
  motionState?: string | boolean;
  isLost?: string | boolean;
  hydrophobic?: string | boolean;
  locationName?: string;
  areaId?: string;
  areaName?: string;
  zoneName?: string;
  latitude?: number | string;
  longitude?: number | string;
  siteName?: string;
  siteId?: string;
  // Geocoded address enrichment
  formattedAddress?: string;
  addressData?: Record<string, any>;
  [key: string]: any;
}

export interface AuthState {
  username: string;
  isAuthenticated: boolean;
  token?: string;
}

export interface ColumnVisibility {
  [key: string]: boolean;
}

export interface Site {
  id: string;
  value: string;
  [key: string]: any;
}

export interface Organization {
  id: string;
  value: string;
  [key: string]: any;
}

export interface TagEvent {
  uuid: string;
  time: string;
  type: string;
  metadata: {
    props: Record<string, any>;
    tags: any[];
  };
  value: Record<string, any>;
  [key: string]: any;
}

export interface TagEventHistory {
  queryUrl: { href: string };
  subjectType: string;
  subject: string;
  queryTime: string;
  maxWTime: string;
  minWTime: string;
  resultCount: number;
  moreRecordsExist: boolean;
  nextPageId: string | null;
  results: TagEvent[];
}

export interface MsgTypeMap {
  [key: string]: string;
}

// Common result type for async operations
export interface OperationResult {
  success: boolean;
  error?: Error;
  data?: any;
}