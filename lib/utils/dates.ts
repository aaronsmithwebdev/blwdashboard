import { DateTime } from "luxon";

const SYDNEY_ZONE = "Australia/Sydney";

export function parseDateOnly(value: string) {
  const parsed = DateTime.fromISO(value, { zone: SYDNEY_ZONE });
  return parsed.isValid ? parsed : null;
}

export function toSydneyISOStart(value: string) {
  const parsed = parseDateOnly(value);
  return parsed ? parsed.startOf("day").toISO() : null;
}

export function toSydneyISOEnd(value: string) {
  const parsed = parseDateOnly(value);
  return parsed ? parsed.endOf("day").toISO() : null;
}

export function parseFunraisinDate(value?: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const hasTimezone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(trimmed);
  const isoParsed = DateTime.fromISO(trimmed, { zone: hasTimezone ? undefined : SYDNEY_ZONE });
  if (isoParsed.isValid) {
    return isoParsed.toISO();
  }

  const fallback = DateTime.fromFormat(trimmed, "yyyy-MM-dd HH:mm:ss", { zone: SYDNEY_ZONE });
  return fallback.isValid ? fallback.toISO() : null;
}

export function coerceBoolean(value: unknown) {
  if (value === null || value === undefined) return null;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["y", "yes", "true", "1"].includes(normalized)) return true;
    if (["n", "no", "false", "0"].includes(normalized)) return false;
  }
  return null;
}

export function toNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const asNumber = Number(value);
  return Number.isFinite(asNumber) ? asNumber : null;
}

export function toStringOrNull(value: unknown) {
  if (value === null || value === undefined) return null;
  const str = String(value).trim();
  return str ? str : null;
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
