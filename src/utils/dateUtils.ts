export function formatISODate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleString();
}

export function subtractDaysFromDate(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() - days);
  return result;
}

export function formatDateForAPI(date: Date): string {
  return date.toISOString().replace('Z', '');
}

export function getLastDayTimeRange(referenceDate: string): {
  startTime: string;
  endTime: string;
} {
  const endDate = new Date(referenceDate);
  const startDate = subtractDaysFromDate(endDate, 1);
  
  return {
    startTime: formatDateForAPI(startDate),
    endTime: formatDateForAPI(endDate)
  };
}

export function formatDuration(milliseconds: number): string {
  if (isNaN(milliseconds) || milliseconds <= 0) {
    return '0 seconds';
  }

  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`;
  }
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  }
  
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  
  return `${seconds}s`;
}

// Normalize ISO string by assuming UTC if no timezone info is present
export function normalizeIsoAssumeUtc(input: any): string | any {
  // If input is a string ISO without timezone info, assume UTC and append 'Z'
  if (typeof input === 'string') {
    const s = input.trim();
    // Match patterns like 2025-09-15T22:40:56 or 2025-09-15T22:40:56.883 or 2025-10-24T03:40:43.820 (no Z or offset)
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?$/.test(s)) {
      return s + 'Z';
    }
  }
  return input;
}

// Convert timestamp to UTC ISO format with Z suffix (no milliseconds)
export function toUtcIsoZ(input: any): string {
  if (input === null || input === undefined || input === '') return '';
  const d = new Date(normalizeIsoAssumeUtc(input));
  if (isNaN(d.getTime())) return String(input);
  // toISOString() returns UTC with milliseconds; trim to seconds for consistency
  return d.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

// Convert timestamp to local time with timezone offset
export function toLocalIsoWithOffset(input: any): string {
  if (input === null || input === undefined || input === '') return '';
  const d = new Date(normalizeIsoAssumeUtc(input));
  if (isNaN(d.getTime())) return String(input);
  const pad = (n: number) => String(Math.floor(Math.abs(n))).padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const mins = pad(d.getMinutes());
  const secs = pad(d.getSeconds());
  const offsetMin = -d.getTimezoneOffset();
  const sign = offsetMin >= 0 ? '+' : '-';
  const offH = pad(offsetMin / 60);
  const offM = pad(offsetMin % 60);
  return `${year}-${month}-${day}T${hours}:${mins}:${secs}${sign}${offH}:${offM}`;
}

// Format timestamp for display (human-readable local time)
export function formatTimestampForDisplay(input: any): string {
  if (input === null || input === undefined || input === '') return '';
  
  // Handle different input types
  let dateInput = input;
  if (typeof input === 'number') {
    // Handle Unix timestamps (both seconds and milliseconds)
    dateInput = input < 10000000000 ? input * 1000 : input;
  }
  
  const normalizedInput = normalizeIsoAssumeUtc(dateInput);
  const d = new Date(normalizedInput);
  
  if (isNaN(d.getTime())) return String(input);
  
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
  }).format(d);
}