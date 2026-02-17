/**
 * Date utility functions. All dates are YYYY-MM-DD strings.
 * Uses plain arithmetic to avoid timezone issues.
 */

/** Parse YYYY-MM-DD string to a Date at midnight UTC */
export function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** Format a Date to YYYY-MM-DD */
export function formatDate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Add days to a date string, return new YYYY-MM-DD string */
export function addDays(dateStr: string, days: number): string {
  const date = parseDate(dateStr);
  date.setUTCDate(date.getUTCDate() + days);
  return formatDate(date);
}

/** Generate an inclusive range of YYYY-MM-DD strings from start to end */
export function dateRange(startStr: string, endStr: string): string[] {
  const result: string[] = [];
  const start = parseDate(startStr);
  const end = parseDate(endStr);

  const current = new Date(start);
  while (current <= end) {
    result.push(formatDate(current));
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return result;
}
