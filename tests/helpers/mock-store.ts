/**
 * Test helper: create an in-memory Store for tests.
 */

import { Store } from "../../src/persistence.js";

/**
 * Create a fresh in-memory Store for testing.
 * Deduplicates the `:memory:` pattern used across test files.
 */
export function createTestStore(entityId = "test-entity"): Store {
  return new Store({ path: ":memory:", entityId });
}
