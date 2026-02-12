/**
 * Tests for multi-entity handoff: sendArtifact, receiveArtifacts (Milestone 2d).
 */

import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { sendArtifact, receiveArtifacts } from "../src/handoff.js";
import { Store } from "../src/persistence.js";

describe("handoff", () => {
  let recipientStore: Store;

  beforeEach(() => {
    recipientStore = new Store({ path: ":memory:", entityId: "recipient" });
  });

  afterEach(() => {
    try {
      recipientStore?.close();
    } catch {
      // already closed
    }
  });

  it("sendArtifact returns an artifact ref", () => {
    const ref = sendArtifact("sender-a", recipientStore, "payload content");
    expect(ref).toBeTruthy();
    expect(typeof ref).toBe("string");
  });

  it("sendArtifact uses custom artifact ref when provided", () => {
    const ref = sendArtifact("sender-a", recipientStore, "payload", "custom-ref-123");
    expect(ref).toBe("custom-ref-123");
  });

  it("sendArtifact auto-generates ref with sender id", () => {
    const ref = sendArtifact("sender-x", recipientStore, "payload");
    expect(ref).toContain("sender-x");
  });

  it("receiveArtifacts returns entries with verification status", () => {
    sendArtifact("sender-a", recipientStore, "hello world");
    const received = receiveArtifacts(recipientStore);

    expect(received.length).toBe(1);
    expect(received[0]!.from_entity_id).toBe("sender-a");
    expect(received[0]!.payload_text).toBe("hello world");
    expect(received[0]!.verified).toBe(true);
  });

  it("receiveArtifacts verifies valid signatures", () => {
    sendArtifact("sender-b", recipientStore, "valid payload");
    const received = receiveArtifacts(recipientStore, { verify: true });

    expect(received.length).toBe(1);
    expect(received[0]!.verified).toBe(true);
  });

  it("round-trip: send from A -> receive on B -> verify signature", () => {
    const content = "important artifact data for entity B";
    sendArtifact("entity-a", recipientStore, content);

    const received = receiveArtifacts(recipientStore, { verify: true });
    expect(received.length).toBe(1);
    expect(received[0]!.from_entity_id).toBe("entity-a");
    expect(received[0]!.payload_text).toBe(content);
    expect(received[0]!.verified).toBe(true);
  });

  it("receiveArtifacts respects limit", () => {
    sendArtifact("sender", recipientStore, "payload 1");
    sendArtifact("sender", recipientStore, "payload 2");
    sendArtifact("sender", recipientStore, "payload 3");

    const received = receiveArtifacts(recipientStore, { limit: 2 });
    expect(received.length).toBe(2);
  });

  it("receiveArtifacts without verify returns all as verified=true", () => {
    sendArtifact("sender", recipientStore, "payload");
    const received = receiveArtifacts(recipientStore, { verify: false });

    expect(received.length).toBe(1);
    expect(received[0]!.verified).toBe(true);
  });
});
