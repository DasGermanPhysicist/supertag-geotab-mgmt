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