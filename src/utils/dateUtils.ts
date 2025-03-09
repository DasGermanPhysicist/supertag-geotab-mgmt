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