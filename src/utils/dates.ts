/**
 * Local date handling helpers to ensure dates never shift due to UTC conversions.
 */

/**
 * Returns today's date in the user's LOCAL time zone as YYYY-MM-DD.
 */
export function getLocalTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns the current month key in user's LOCAL time zone as YYYY-MM.
 */
export function getLocalCurrentMonthKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Parses a YYYY-MM-DD string into a Date in the user's LOCAL time zone.
 */
export function parseLocalDate(dateStr: string): Date {
  const parts = dateStr.split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  return new Date(year, (month || 1) - 1, day || 1);
}

/**
 * Formats a YYYY-MM-DD date string for display using local calendar values.
 * e.g. "Nov 2, 2026"
 */
export function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = parseLocalDate(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Formats a YYYY-MM string into a human-readable month title.
 * e.g. "2026-11" -> "November 2026"
 */
export function formatMonthName(yearMonth: string): string {
  if (!yearMonth) return '';
  const parts = yearMonth.split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const date = new Date(year, (month || 1) - 1, 1);
  return date.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Shifts a YYYY-MM string by delta months (+1 or -1).
 */
export function addMonths(yearMonth: string, delta: number): string {
  const parts = yearMonth.split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const d = new Date(year, month - 1 + delta, 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/**
 * Validates whether a string is a valid YYYY-MM-DD calendar date.
 */
export function isValidDateString(dateStr: string): boolean {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return false;
  }
  const parts = dateStr.split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  const d = new Date(year, month - 1, day);
  return (
    d.getFullYear() === year &&
    d.getMonth() === month - 1 &&
    d.getDate() === day
  );
}
