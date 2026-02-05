/**
 * Entity signing: sign artifacts for attribution and handoff between entities.
 */

import crypto from "node:crypto";

/**
 * Secret for signing (from env MOLTBLOCK_SIGNING_KEY or entity-specific MOLTBLOCK_SIGNING_KEY_<id>).
 */
function getSecret(entityId: string): Buffer {
  const envKey =
    process.env[`MOLTBLOCK_SIGNING_KEY_${entityId.toUpperCase()}`] ??
    process.env["MOLTBLOCK_SIGNING_KEY"] ??
    "";
  const key = envKey || `default-secret-${entityId}`;
  return Buffer.from(key, "utf-8");
}

/**
 * Sign an artifact payload; return base64-encoded signature.
 */
export function signArtifact(entityId: string, payload: string | Buffer): string {
  const data = typeof payload === "string" ? Buffer.from(payload, "utf-8") : payload;
  const hmac = crypto.createHmac("sha256", getSecret(entityId));
  hmac.update(data);
  return hmac.digest("base64");
}

/**
 * Verify a signed artifact. Returns true if valid.
 */
export function verifyArtifact(
  entityId: string,
  payload: string | Buffer,
  signatureB64: string
): boolean {
  try {
    const expected = signArtifact(entityId, payload);
    return crypto.timingSafeEqual(
      Buffer.from(expected, "base64"),
      Buffer.from(signatureB64, "base64")
    );
  } catch {
    return false;
  }
}

/**
 * Stable hash of artifact content (for storage/reference).
 */
export function artifactHash(payload: string | Buffer): string {
  const data = typeof payload === "string" ? Buffer.from(payload, "utf-8") : payload;
  return crypto.createHash("sha256").update(data).digest("hex").slice(0, 32);
}
