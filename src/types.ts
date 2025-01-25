export interface SuperTag {
  [key: string]: any; // Dynamic properties from API
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