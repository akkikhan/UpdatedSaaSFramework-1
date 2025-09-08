export const NOTIFICATION_DELAY_MS = 3000;

// Map of modules and the modules they depend on.
export const MODULE_DEPENDENCIES: Record<string, string[]> = {
  rbac: ["auth"],
  logging: ["auth"],
};
