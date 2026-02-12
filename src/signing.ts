/**
 * Entity signing: sign artifacts for attribution and handoff between entities.
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

/** Derive a per-entity key using HKDF for domain separation. */
function deriveKey(secret: Buffer, entityId: string): Buffer {
  const salt = Buffer.from("moltblock-signing", "utf-8");
  const info = Buffer.from(entityId, "utf-8");
  return Buffer.from(crypto.hkdfSync("sha256", secret, salt, info, 32));
}

/**
 * Secret for signing (from env MOLTBLOCK_SIGNING_KEY or entity-specific MOLTBLOCK_SIGNING_KEY_<id>).
 * Uses HKDF to derive per-entity keys from the base secret.
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
    // Development fallback: generate and persist a random per-entity key
    const safeId = entityId.replace(/[^a-zA-Z0-9_-]/g, "_");
    const devKeyPath = path.join(".moltblock", `dev-signing-key-${safeId}`);
    try {
      const dir = path.dirname(devKeyPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
      }
      if (fs.existsSync(devKeyPath)) {
        return Buffer.from(fs.readFileSync(devKeyPath, "utf-8"), "hex");
      }
      const key = crypto.randomBytes(32);
      fs.writeFileSync(devKeyPath, key.toString("hex"), { mode: 0o600 });
      console.warn(
        `Warning: Generated dev signing key for entity "${entityId}". ` +
          `Set MOLTBLOCK_SIGNING_KEY for secure artifact signing.`
      );
      return key;
    } catch {
      // Weak deterministic fallback requires explicit opt-in
      if (process.env["MOLTBLOCK_INSECURE_DEV_SIGNING"] !== "1") {
        throw new Error(
          `No MOLTBLOCK_SIGNING_KEY set and filesystem unavailable. ` +
            `Set MOLTBLOCK_SIGNING_KEY for signing, or set MOLTBLOCK_INSECURE_DEV_SIGNING=1 to allow weak dev fallback.`
        );
      }
      console.warn(
        `Warning: Using weak default signing key for entity "${entityId}". ` +
          `Set MOLTBLOCK_SIGNING_KEY for secure artifact signing.`
      );
      return Buffer.from(`dev-only-insecure-key-${entityId}`, "utf-8");
    }
  }

  const keyBytes = Buffer.from(envKey, "utf-8");
  if (keyBytes.length < 16) {
    throw new Error(
      `MOLTBLOCK_SIGNING_KEY must be at least 16 bytes. ` +
        `Current: ${keyBytes.length} bytes. Generate with: openssl rand -hex 32`
    );
  }
  if (keyBytes.length < 32) {
    console.warn(
      `Warning: MOLTBLOCK_SIGNING_KEY is short (< 32 bytes). Use 32+ bytes for strong security.`
    );
  }

  return deriveKey(keyBytes, entityId);
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
  return crypto.createHash("sha256").update(data).digest("hex");
}
