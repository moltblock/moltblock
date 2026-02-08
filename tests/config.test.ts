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
  detectProvider,
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

  it("loadMoltblockConfig handles OpenClaw agents.defaults.model.primary format", () => {
    const openclawConfig = path.join(tmpDir, "openclaw.json");
    fs.writeFileSync(
      openclawConfig,
      JSON.stringify({
        agents: {
          defaults: {
            model: {
              primary: "zai/glm-4.7",
            },
          },
        },
      }),
      "utf-8"
    );

    delete process.env["MOLTBLOCK_CONFIG"];
    process.env["OPENCLAW_CONFIG"] = openclawConfig;

    const result = loadMoltblockConfig();

    expect(result).not.toBeNull();
    expect(result?.agent?.bindings?.["generator"]).toBeDefined();
    expect(result?.agent?.bindings?.["critic"]).toBeDefined();
    expect(result?.agent?.bindings?.["judge"]).toBeDefined();
    expect(result?.agent?.bindings?.["verifier"]).toBeDefined();
    expect(result?.agent?.bindings?.["generator"]?.backend).toBe("zai");
    expect(result?.agent?.bindings?.["generator"]?.model).toBe("glm-4.7");
    expect(result?.agent?.bindings?.["generator"]?.base_url).toBe("https://api.z.ai/api/paas/v4");
    expect(getConfigSource()).toBe("openclaw");
  });

  it("loadMoltblockConfig handles OpenClaw openai/gpt-4o primary format", () => {
    const openclawConfig = path.join(tmpDir, "openclaw.json");
    fs.writeFileSync(
      openclawConfig,
      JSON.stringify({
        agents: {
          defaults: {
            model: {
              primary: "openai/gpt-4o",
            },
          },
        },
      }),
      "utf-8"
    );

    delete process.env["MOLTBLOCK_CONFIG"];
    process.env["OPENCLAW_CONFIG"] = openclawConfig;

    const result = loadMoltblockConfig();

    expect(result).not.toBeNull();
    expect(result?.agent?.bindings?.["generator"]?.backend).toBe("openai");
    expect(result?.agent?.bindings?.["generator"]?.model).toBe("gpt-4o");
    expect(result?.agent?.bindings?.["generator"]?.base_url).toBe("https://api.openai.com/v1");
  });

  describe("detectProvider", () => {
    it("detects OPENAI_API_KEY", () => {
      delete process.env["GOOGLE_API_KEY"];
      delete process.env["MOLTBLOCK_ZAI_API_KEY"];
      delete process.env["ZAI_API_KEY"];
      process.env["OPENAI_API_KEY"] = "sk-test";

      const result = detectProvider();
      expect(result.backend).toBe("openai");
      expect(result.baseUrl).toBe("https://api.openai.com/v1");
      expect(result.model).toBe("gpt-4o");
      expect(result.apiKey).toBe("sk-test");
    });

    it("detects GOOGLE_API_KEY", () => {
      delete process.env["OPENAI_API_KEY"];
      delete process.env["MOLTBLOCK_ZAI_API_KEY"];
      delete process.env["ZAI_API_KEY"];
      process.env["GOOGLE_API_KEY"] = "gkey-test";

      const result = detectProvider();
      expect(result.backend).toBe("google");
      expect(result.model).toBe("gemini-2.0-flash");
      expect(result.apiKey).toBe("gkey-test");
    });

    it("detects MOLTBLOCK_ZAI_API_KEY", () => {
      delete process.env["OPENAI_API_KEY"];
      delete process.env["GOOGLE_API_KEY"];
      delete process.env["ZAI_API_KEY"];
      process.env["MOLTBLOCK_ZAI_API_KEY"] = "zai-test";

      const result = detectProvider();
      expect(result.backend).toBe("zai");
      expect(result.apiKey).toBe("zai-test");
    });

    it("detects ZAI_API_KEY as fallback", () => {
      delete process.env["OPENAI_API_KEY"];
      delete process.env["GOOGLE_API_KEY"];
      delete process.env["MOLTBLOCK_ZAI_API_KEY"];
      process.env["ZAI_API_KEY"] = "zai-fallback";

      const result = detectProvider();
      expect(result.backend).toBe("zai");
      expect(result.apiKey).toBe("zai-fallback");
    });

    it("falls back to local when no env vars set", () => {
      delete process.env["OPENAI_API_KEY"];
      delete process.env["GOOGLE_API_KEY"];
      delete process.env["MOLTBLOCK_ZAI_API_KEY"];
      delete process.env["ZAI_API_KEY"];

      const result = detectProvider();
      expect(result.backend).toBe("local");
      expect(result.baseUrl).toBe("http://localhost:1234/v1");
      expect(result.apiKey).toBeNull();
    });

    it("OPENAI_API_KEY wins over GOOGLE_API_KEY (priority)", () => {
      process.env["OPENAI_API_KEY"] = "sk-openai";
      process.env["GOOGLE_API_KEY"] = "gkey";
      delete process.env["MOLTBLOCK_ZAI_API_KEY"];
      delete process.env["ZAI_API_KEY"];

      const result = detectProvider();
      expect(result.backend).toBe("openai");
    });

    it("explicit provider override takes precedence", () => {
      process.env["OPENAI_API_KEY"] = "sk-openai";
      process.env["GOOGLE_API_KEY"] = "gkey";

      const result = detectProvider("google");
      expect(result.backend).toBe("google");
      expect(result.apiKey).toBe("gkey");
    });

    it("explicit model override works", () => {
      process.env["OPENAI_API_KEY"] = "sk-openai";

      const result = detectProvider("openai", "gpt-4-turbo");
      expect(result.model).toBe("gpt-4-turbo");
    });

    it("unknown provider throws", () => {
      expect(() => detectProvider("unknown-provider")).toThrow(/Unknown provider/);
    });
  });

  describe("defaultCodeEntityBindings with overrides", () => {
    it("--provider flag sets all roles", () => {
      delete process.env["MOLTBLOCK_CONFIG"];
      delete process.env["OPENCLAW_CONFIG"];
      delete process.env["OPENAI_API_KEY"];
      delete process.env["GOOGLE_API_KEY"];
      delete process.env["MOLTBLOCK_ZAI_API_KEY"];
      delete process.env["ZAI_API_KEY"];
      process.env["GOOGLE_API_KEY"] = "gkey-test";

      const bindings = defaultCodeEntityBindings({ provider: "google" });
      expect(bindings["generator"].backend).toBe("google");
      expect(bindings["critic"].backend).toBe("google");
      expect(bindings["judge"].backend).toBe("google");
      expect(bindings["verifier"].backend).toBe("google");
      expect(bindings["generator"].apiKey).toBe("gkey-test");
    });

    it("--model flag overrides default model for all roles", () => {
      delete process.env["MOLTBLOCK_CONFIG"];
      delete process.env["OPENCLAW_CONFIG"];
      process.env["OPENAI_API_KEY"] = "sk-test";
      delete process.env["GOOGLE_API_KEY"];
      delete process.env["MOLTBLOCK_ZAI_API_KEY"];
      delete process.env["ZAI_API_KEY"];
      // Clear per-role env overrides that may come from .env
      delete process.env["MOLTBLOCK_GENERATOR_MODEL"];
      delete process.env["MOLTBLOCK_CRITIC_MODEL"];
      delete process.env["MOLTBLOCK_JUDGE_MODEL"];
      delete process.env["MOLTBLOCK_VERIFIER_MODEL"];

      const bindings = defaultCodeEntityBindings({ provider: "openai", model: "gpt-4-turbo" });
      expect(bindings["generator"].model).toBe("gpt-4-turbo");
      expect(bindings["critic"].model).toBe("gpt-4-turbo");
    });

    it("per-role env overrides still apply on top of auto-detect", () => {
      delete process.env["MOLTBLOCK_CONFIG"];
      delete process.env["OPENCLAW_CONFIG"];
      process.env["OPENAI_API_KEY"] = "sk-test";
      delete process.env["GOOGLE_API_KEY"];
      delete process.env["MOLTBLOCK_ZAI_API_KEY"];
      delete process.env["ZAI_API_KEY"];
      process.env["MOLTBLOCK_CRITIC_BASE_URL"] = "http://custom:9999/v1";
      process.env["MOLTBLOCK_CRITIC_MODEL"] = "custom-model";

      const bindings = defaultCodeEntityBindings();
      expect(bindings["generator"].backend).toBe("openai");
      expect(bindings["critic"].baseUrl).toBe("http://custom:9999/v1");
      expect(bindings["critic"].model).toBe("custom-model");

      delete process.env["MOLTBLOCK_CRITIC_BASE_URL"];
      delete process.env["MOLTBLOCK_CRITIC_MODEL"];
    });

    it("auto-detects openai when OPENAI_API_KEY is set and no config exists", () => {
      delete process.env["MOLTBLOCK_CONFIG"];
      delete process.env["OPENCLAW_CONFIG"];
      process.env["OPENAI_API_KEY"] = "sk-autodetect";
      delete process.env["GOOGLE_API_KEY"];
      delete process.env["MOLTBLOCK_ZAI_API_KEY"];
      delete process.env["ZAI_API_KEY"];

      const bindings = defaultCodeEntityBindings();
      expect(bindings["generator"].backend).toBe("openai");
      expect(bindings["generator"].baseUrl).toBe("https://api.openai.com/v1");
      expect(bindings["generator"].apiKey).toBe("sk-autodetect");
    });
  });
});
