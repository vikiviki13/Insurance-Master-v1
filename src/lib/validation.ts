/** Pure validation helpers shared by forms (inline errors) and services (final guard). */

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/** Returns an error message or null. */
export function checkPercent(label: string, v: number | null | undefined, required = true): string | null {
  if (v == null) return required ? `${label} is required` : null;
  if (!isNum(v)) return `${label} must be a number`;
  if (v < 0 || v > 100) return `${label} must be between 0 and 100`;
  return null;
}

export function checkAmount(label: string, v: number | null | undefined, required = true): string | null {
  if (v == null) return required ? `${label} is required` : null;
  if (!isNum(v)) return `${label} must be a number`;
  if (v < 0) return `${label} cannot be negative`;
  return null;
}

export interface Range {
  min: number;
  /** null = open ended */
  max: number | null;
}

/** Min/max sanity (min <= max, no negatives). */
export function checkRange(min: number | null, max: number | null, unit: string, allowOpenEnd = true): string | null {
  if (min == null) return `From ${unit} is required`;
  if (min < 0) return `From ${unit} cannot be negative`;
  if (max == null) return allowOpenEnd ? null : `To ${unit} is required`;
  if (max < 0) return `To ${unit} cannot be negative`;
  if (min > max) return `From ${unit} cannot be greater than To ${unit}`;
  return null;
}

export const rangesOverlap = (a: Range, b: Range): boolean => {
  const aMax = a.max ?? Infinity;
  const bMax = b.max ?? Infinity;
  return a.min <= bMax && b.min <= aMax;
};

export function findOverlap<T>(items: T[], candidate: Range, get: (t: T) => Range): T | undefined {
  return items.find((i) => rangesOverlap(get(i), candidate));
}

export const describeRange = (r: Range, unit = ""): string =>
  r.max == null ? `${r.min}${unit}+` : `${r.min} – ${r.max}${unit}`;

/** Gaps between consecutive ranges (informational warning only). */
export function findGaps(ranges: Range[]): Range[] {
  const sorted = [...ranges].sort((a, b) => a.min - b.min);
  const gaps: Range[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const end = sorted[i].max;
    if (end == null) break;
    if (sorted[i + 1].min > end + 1) gaps.push({ min: end + 1, max: sorted[i + 1].min - 1 });
  }
  return gaps;
}

export const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
