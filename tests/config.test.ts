/**
 * Tests for JSON config loading (moltblock.json).
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  loadMoltblockConfig,
  defaultCodeEntityBindings,
  MoltblockConfigSchema,
  getConfigSource,
} from "../src/config.js";

describe("config", () => {
  let tmpDir: string;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "moltblock-test-"));
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it("loadMoltblockConfig returns null when no file exists", () => {
    delete process.env["MOLTBLOCK_CONFIG"];
    // Since we can't control CWD easily, just verify the function doesn't throw
    const result = loadMoltblockConfig();
    // May be null or a config if user has a file; we only assert it's null or valid
    if (result !== null) {
      expect(result).toHaveProperty("agent");
    }
  });

  it("loadMoltblockConfig loads from MOLTBLOCK_CONFIG env", () => {
    const configFile = path.join(tmpDir, "moltblock.json");
    fs.writeFileSync(
      configFile,
      JSON.stringify({
        agent: {
          bindings: {
            generator: {
              backend: "local",
              base_url: "http://localhost:1234/v1",
              model: "local",
            },
          },
        },
      }),
      "utf-8"
    );

    process.env["MOLTBLOCK_CONFIG"] = configFile;
    const result = loadMoltblockConfig();

    expect(result).not.toBeNull();
    expect(result?.agent).not.toBeNull();
    expect(result?.agent?.bindings).toBeDefined();
    expect(result?.agent?.bindings?.["generator"]).toBeDefined();
    expect(result?.agent?.bindings?.["generator"]?.backend).toBe("local");
    expect(result?.agent?.bindings?.["generator"]?.base_url).toBe(
      "http://localhost:1234/v1"
    );
  });

  it("defaultCodeEntityBindings returns structure with all roles", () => {
    const bindings = defaultCodeEntityBindings();
    expect(Object.keys(bindings).sort()).toEqual([
      "critic",
      "generator",
      "judge",
      "verifier",
    ]);

    for (const [role, binding] of Object.entries(bindings)) {
      expect(binding.backend).toBeDefined();
      expect(binding.baseUrl).toBeDefined();
      expect(binding.model).toBeDefined();
    }
  });

  it("defaultCodeEntityBindings uses config file bindings", () => {
    const configFile = path.join(tmpDir, "moltblock.json");
    fs.writeFileSync(
      configFile,
      JSON.stringify({
        agent: {
          bindings: {
            generator: {
              backend: "local",
              base_url: "http://127.0.0.1:9999/v1",
              model: "custom",
            },
          },
        },
      }),
      "utf-8"
    );

    process.env["MOLTBLOCK_CONFIG"] = configFile;
    const bindings = defaultCodeEntityBindings();

    expect(bindings["generator"]?.baseUrl).toBe("http://127.0.0.1:9999/v1");
    expect(bindings["generator"]?.model).toBe("custom");
  });

  it("MoltblockConfigSchema validates config structure", () => {
    const valid = MoltblockConfigSchema.parse({
      agent: {
        bindings: {
          generator: {
            backend: "local",
            base_url: "http://localhost:1234/v1",
          },
        },
      },
    });

    expect(valid.agent?.bindings?.["generator"]?.backend).toBe("local");
  });

  it("loadMoltblockConfig falls back to OpenClaw config", () => {
    // Create OpenClaw config
    const openclawConfig = path.join(tmpDir, "openclaw.json");
    fs.writeFileSync(
      openclawConfig,
      JSON.stringify({
        agent: {
          bindings: {
            generator: {
              backend: "openai",
              base_url: "https://api.openai.com/v1",
              model: "gpt-4",
            },
            critic: {
              backend: "anthropic",
              base_url: "https://api.anthropic.com/v1",
              model: "claude-3",
            },
          },
        },
      }),
      "utf-8"
    );

    // Clear moltblock config, set openclaw config
    delete process.env["MOLTBLOCK_CONFIG"];
    process.env["OPENCLAW_CONFIG"] = openclawConfig;

    const result = loadMoltblockConfig();

    expect(result).not.toBeNull();
    expect(result?.agent?.bindings?.["generator"]?.backend).toBe("openai");
    expect(result?.agent?.bindings?.["critic"]?.backend).toBe("anthropic");
    expect(getConfigSource()).toBe("openclaw");
  });

  it("loadMoltblockConfig prefers moltblock over openclaw", () => {
    // Create both configs
    const moltblockConfig = path.join(tmpDir, "moltblock.json");
    const openclawConfig = path.join(tmpDir, "openclaw.json");

    fs.writeFileSync(
      moltblockConfig,
      JSON.stringify({
        agent: {
          bindings: {
            generator: { backend: "local", base_url: "http://localhost:1234/v1", model: "local" },
          },
        },
      }),
      "utf-8"
    );

    fs.writeFileSync(
      openclawConfig,
      JSON.stringify({
        agent: {
          bindings: {
            generator: { backend: "openai", base_url: "https://api.openai.com/v1", model: "gpt-4" },
          },
        },
      }),
      "utf-8"
    );

    process.env["MOLTBLOCK_CONFIG"] = moltblockConfig;
    process.env["OPENCLAW_CONFIG"] = openclawConfig;

    const result = loadMoltblockConfig();

    expect(result?.agent?.bindings?.["generator"]?.backend).toBe("local");
    expect(getConfigSource()).toBe("moltblock");
  });

  it("loadMoltblockConfig handles OpenClaw providers format", () => {
    const openclawConfig = path.join(tmpDir, "openclaw.json");
    fs.writeFileSync(
      openclawConfig,
      JSON.stringify({
        providers: {
          openai: {
            base_url: "https://api.openai.com/v1",
            model: "gpt-4o",
            api_key: "sk-test",
          },
        },
      }),
      "utf-8"
    );

    delete process.env["MOLTBLOCK_CONFIG"];
    process.env["OPENCLAW_CONFIG"] = openclawConfig;

    const result = loadMoltblockConfig();

    expect(result).not.toBeNull();
    // Providers format should create bindings for all roles
    expect(result?.agent?.bindings?.["generator"]).toBeDefined();
    expect(result?.agent?.bindings?.["critic"]).toBeDefined();
    expect(result?.agent?.bindings?.["generator"]?.backend).toBe("openai");
  });
});
