/**
 * Parse a timestamp returned by the API.
 *
 * The backend stores naive UTC datetimes (`datetime.utcnow`) and Pydantic
 * serializes them without a timezone designator, e.g. `"2026-11-10T08:00:00"`.
 * `new Date()` treats such strings as local time, which shifts the displayed
 * time by the UTC offset. Append "Z" so it parses as UTC; `toLocaleString`
 * then converts to the viewer's local timezone.
 *
 * Strings that already carry a timezone designator and date-only strings
 * (no "T") are returned untouched.
 */
export function parseApiDate(value: string): Date {
  if (/[zZ]$/.test(value) || /[+-]\d{2}:?\d{2}$/.test(value)) return new Date(value);
  if (value.includes("T")) return new Date(`${value}Z`);
  return new Date(value);
}

/** Format an API timestamp in the viewer's local timezone. */
export function formatApiDateTime(value: string): string {
  return parseApiDate(value).toLocaleString("zh-CN", { hour12: false });
}
