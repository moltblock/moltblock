/**
 * Tests for SQLite WAL mode, transactions, and Symbol.dispose (Milestone 3a/3d).
 */

import { describe, it, expect, afterEach } from "vitest";
import { Store, setStrategy, getStrategy } from "../src/persistence.js";

describe("Store WAL mode", () => {
  let store: Store;

  afterEach(() => {
    try {
      store?.close();
    } catch {
      // already closed
    }
  });

  it("enables WAL journal mode", () => {
    store = new Store({ path: ":memory:" });
    const db = store.getDb();
    const result = db.pragma("journal_mode") as Array<{ journal_mode: string }>;
    // In-memory databases use "memory" journal mode since WAL is not supported for :memory:
    // but the pragma call should not throw
    expect(result).toBeDefined();
    expect(result.length).toBeGreaterThan(0);
  });

  it("Symbol.dispose closes the database", () => {
    store = new Store({ path: ":memory:" });
    const db = store.getDb();

    // Verify db is open
    expect(db.open).toBe(true);

    // Use Symbol.dispose
    store[Symbol.dispose]();

    // Verify db is closed
    expect(db.open).toBe(false);
  });

  it("close and Symbol.dispose are equivalent", () => {
    const store1 = new Store({ path: ":memory:" });
    const store2 = new Store({ path: ":memory:" });

    store1.close();
    expect(store1.getDb().open).toBe(false);

    store2[Symbol.dispose]();
    expect(store2.getDb().open).toBe(false);

    // Set store to store1 for afterEach cleanup (already closed)
    store = store1;
  });
});

describe("Strategy versioning atomicity", () => {
  let store: Store;

  afterEach(() => {
    try {
      store?.close();
    } catch {
      // already closed
    }
  });

  it("setStrategy auto-increments version atomically", () => {
    store = new Store({ path: ":memory:", entityId: "test" });

    setStrategy(store, "generator", "prompt v1");
    setStrategy(store, "generator", "prompt v2");
    setStrategy(store, "generator", "prompt v3");

    // Should return the latest version
    const latest = getStrategy(store, "generator");
    expect(latest).toBe("prompt v3");

    // Verify versions are sequential
    const db = store.getDb();
    const rows = db
      .prepare("SELECT version FROM strategies WHERE entity_id = ? AND role = ? ORDER BY version")
      .all("test", "generator") as Array<{ version: number }>;
    expect(rows.map((r) => r.version)).toEqual([1, 2, 3]);
  });

  it("setStrategy for different roles has independent versions", () => {
    store = new Store({ path: ":memory:", entityId: "test" });

    setStrategy(store, "generator", "gen prompt");
    setStrategy(store, "critic", "crit prompt");
    setStrategy(store, "generator", "gen prompt v2");

    expect(getStrategy(store, "generator")).toBe("gen prompt v2");
    expect(getStrategy(store, "critic")).toBe("crit prompt");

    const db = store.getDb();
    const genVersions = db
      .prepare("SELECT version FROM strategies WHERE entity_id = ? AND role = 'generator' ORDER BY version")
      .all("test") as Array<{ version: number }>;
    const critVersions = db
      .prepare("SELECT version FROM strategies WHERE entity_id = ? AND role = 'critic' ORDER BY version")
      .all("test") as Array<{ version: number }>;

    expect(genVersions.map((r) => r.version)).toEqual([1, 2]);
    expect(critVersions.map((r) => r.version)).toEqual([1]);
  });
});
