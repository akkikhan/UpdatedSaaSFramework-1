export const GUID_CANON =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function sanitizeGuid(value: unknown): string {
  return typeof value === "string"
    ? value.trim().replace(/[{}]/g, "").toLowerCase()
    : "";
}
