// Normalized JWT helper to handle ESM + CommonJS interop when using dynamic import
// jsonwebtoken is a CommonJS module; in ESM dynamic import it may surface functions
// either directly or under .default depending on loader nuances.
import type { SignOptions } from "jsonwebtoken";

export async function getJwtModule(): Promise<any> {
  const mod: any = await import("jsonwebtoken");
  // If sign not directly available, look under default
  if (
    mod &&
    typeof mod.sign !== "function" &&
    mod.default &&
    typeof mod.default.sign === "function"
  ) {
    return mod.default;
  }
  return mod;
}

export async function signJwt(
  payload: any,
  secret: string,
  options: SignOptions = { expiresIn: "8h" }
) {
  const jwt = await getJwtModule();
  return jwt.sign(payload, secret, options);
}
