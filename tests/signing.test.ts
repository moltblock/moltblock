/**
 * Tests for artifact signing.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { signArtifact, verifyArtifact, artifactHash } from "../src/signing.js";

describe("signing", () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("signArtifact produces base64 signature", () => {
    const sig = signArtifact("test-entity", "hello world");
    expect(sig).toBeTruthy();
    // Should be valid base64
    expect(() => Buffer.from(sig, "base64")).not.toThrow();
  });

  it("signArtifact produces consistent signatures", () => {
    const sig1 = signArtifact("test-entity", "hello world");
    const sig2 = signArtifact("test-entity", "hello world");
    expect(sig1).toBe(sig2);
  });

  it("signArtifact produces different signatures for different content", () => {
    const sig1 = signArtifact("test-entity", "hello world");
    const sig2 = signArtifact("test-entity", "hello world!");
    expect(sig1).not.toBe(sig2);
  });

  it("signArtifact produces different signatures for different entities", () => {
    const sig1 = signArtifact("entity-a", "hello world");
    const sig2 = signArtifact("entity-b", "hello world");
    expect(sig1).not.toBe(sig2);
  });

  it("verifyArtifact returns true for valid signature", () => {
    const payload = "test payload";
    const sig = signArtifact("test-entity", payload);
    expect(verifyArtifact("test-entity", payload, sig)).toBe(true);
  });

  it("verifyArtifact returns false for invalid signature", () => {
    const payload = "test payload";
    const sig = signArtifact("test-entity", payload);
    expect(verifyArtifact("test-entity", "modified payload", sig)).toBe(false);
  });

  it("verifyArtifact returns false for wrong entity", () => {
    const payload = "test payload";
    const sig = signArtifact("entity-a", payload);
    expect(verifyArtifact("entity-b", payload, sig)).toBe(false);
  });

  it("verifyArtifact returns false for malformed signature", () => {
    expect(verifyArtifact("test-entity", "payload", "not-valid-base64!!!")).toBe(
      false
    );
  });

  it("signArtifact uses entity-specific key from env", () => {
    process.env["MOLTBLOCK_SIGNING_KEY_MYENTITY"] = "my-secret-key";
    const sig1 = signArtifact("myentity", "hello");

    delete process.env["MOLTBLOCK_SIGNING_KEY_MYENTITY"];
    const sig2 = signArtifact("myentity", "hello");

    // Different keys should produce different signatures
    expect(sig1).not.toBe(sig2);
  });

  it("signArtifact uses global key from env", () => {
    process.env["MOLTBLOCK_SIGNING_KEY"] = "global-secret-key";
    const sig1 = signArtifact("test-entity", "hello");

    delete process.env["MOLTBLOCK_SIGNING_KEY"];
    const sig2 = signArtifact("test-entity", "hello");

    expect(sig1).not.toBe(sig2);
  });

  it("artifactHash produces consistent hash", () => {
    const h1 = artifactHash("hello world");
    const h2 = artifactHash("hello world");
    expect(h1).toBe(h2);
  });

  it("artifactHash produces 32-char hex string", () => {
    const h = artifactHash("hello world");
    expect(h).toHaveLength(32);
    expect(/^[0-9a-f]+$/.test(h)).toBe(true);
  });

  it("artifactHash produces different hashes for different content", () => {
    const h1 = artifactHash("hello world");
    const h2 = artifactHash("hello world!");
    expect(h1).not.toBe(h2);
  });

  it("signArtifact handles Buffer input", () => {
    const payload = Buffer.from("hello world", "utf-8");
    const sig = signArtifact("test-entity", payload);
    expect(sig).toBeTruthy();
  });

  it("verifyArtifact handles Buffer input", () => {
    const payload = Buffer.from("test payload", "utf-8");
    const sig = signArtifact("test-entity", payload);
    expect(verifyArtifact("test-entity", payload, sig)).toBe(true);
  });

  it("artifactHash handles Buffer input", () => {
    const h1 = artifactHash("hello world");
    const h2 = artifactHash(Buffer.from("hello world", "utf-8"));
    expect(h1).toBe(h2);
  });
});
