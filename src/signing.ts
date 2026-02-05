/**
 * Entity signing: sign artifacts for attribution and handoff between entities.
 */

import crypto from "node:crypto";

/**
 * Secret for signing (from env MOLTBLOCK_SIGNING_KEY or entity-specific MOLTBLOCK_SIGNING_KEY_<id>).
 * Warns if using weak/missing key in production.
 */
function getSecret(entityId: string): Buffer {
  const envKey =
    process.env[`MOLTBLOCK_SIGNING_KEY_${entityId.toUpperCase()}`] ??
    process.env["MOLTBLOCK_SIGNING_KEY"] ??
    "";

  if (!envKey) {
    // Only allow weak default in development/testing
    if (process.env["NODE_ENV"] === "production") {
      throw new Error(
        `Missing MOLTBLOCK_SIGNING_KEY environment variable. ` +
          `Set MOLTBLOCK_SIGNING_KEY or MOLTBLOCK_SIGNING_KEY_${entityId.toUpperCase()} for production use.`
      );
    }
    // Development fallback with warning (stable but weak)
    console.warn(
      `Warning: Using weak default signing key for entity "${entityId}". ` +
        `Set MOLTBLOCK_SIGNING_KEY for secure artifact signing.`
    );
    return Buffer.from(`dev-only-insecure-key-${entityId}`, "utf-8");
  }

  if (envKey.length < 32) {
    console.warn(
      `Warning: MOLTBLOCK_SIGNING_KEY is short (${envKey.length} chars). Use 32+ chars for strong security.`
    );
  }

  return Buffer.from(envKey, "utf-8");
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
