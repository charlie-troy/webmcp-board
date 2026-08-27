const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** True only for real calendar dates written exactly as YYYY-MM-DD. */
export function isValidIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

/** Format a Date using the user's local calendar day, not its UTC day. */
export function localDateIso(value = new Date()): string {
  const year = value.getFullYear().toString().padStart(4, "0");
  const month = (value.getMonth() + 1).toString().padStart(2, "0");
  const day = value.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Add whole calendar days without inheriting the browser's DST offset. */
export function addDaysIso(value: string, days: number): string {
  const parsed = new Date(`${value}T00:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}
