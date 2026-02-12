import { describe, it, expect } from "vitest";
import { VERSION } from "../src/index.js";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

describe("VERSION", () => {
  it("matches package.json version", () => {
    const pkg = JSON.parse(
      readFileSync(join(__dirname, "..", "package.json"), "utf-8")
    );
    expect(VERSION).toBe(pkg.version);
  });
});
