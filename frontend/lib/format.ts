import {
  format,
  formatDistanceToNow,
  isToday,
  isYesterday,
  parseISO,
} from "date-fns";

function toDate(input: string | Date | null | undefined): Date | null {
  if (!input) return null;
  return typeof input === "string" ? parseISO(input) : input;
}

export function fmtDate(input: string | Date | null | undefined) {
  const d = toDate(input);
  if (!d) return "—";
  return format(d, "MMM d, yyyy");
}

export function fmtDateTime(input: string | Date | null | undefined) {
  const d = toDate(input);
  if (!d) return "—";
  return format(d, "MMM d, yyyy · h:mm a");
}

export function fmtRelative(input: string | Date | null | undefined) {
  const d = toDate(input);
  if (!d) return "—";
  if (isToday(d)) return `Today · ${format(d, "h:mm a")}`;
  if (isYesterday(d)) return `Yesterday · ${format(d, "h:mm a")}`;
  return formatDistanceToNow(d, { addSuffix: true });
}

export function fmtCount(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

export function initials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("");
}
