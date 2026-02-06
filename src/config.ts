/**
 * LLM gateway config: per-role model binding.
 * Load from JSON (moltblock.json), with env overrides.
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { z } from "zod";

// Load .env so MOLTBLOCK_ZAI_API_KEY etc. can be set there
try {
  const dotenv = await import("dotenv");
  dotenv.config();
} catch {
  // dotenv not required
}

// --- Zod schemas (OpenClaw-style config) ---

export const BindingEntrySchema = z.object({
  backend: z.string().describe("e.g. 'local' or 'zai' or 'openai'"),
  base_url: z.string().describe("API base URL"),
  model: z.string().default("default").describe("Model id for chat completion"),
  api_key: z.string().nullable().optional().describe("Bearer token; null for local. Prefer env."),
});

export type BindingEntry = z.infer<typeof BindingEntrySchema>;

export const AgentConfigSchema = z.object({
  bindings: z.record(BindingEntrySchema).optional().describe("Per-role model bindings"),
});

export type AgentConfig = z.infer<typeof AgentConfigSchema>;

export const MoltblockConfigSchema = z.object({
  agent: AgentConfigSchema.optional().describe("Agent defaults and bindings"),
});

export type MoltblockConfig = z.infer<typeof MoltblockConfigSchema>;

export const ModelBindingSchema = z.object({
  backend: z.string().describe("e.g. 'local' or 'zai' or 'openai'"),
  baseUrl: z.string().describe("API base URL"),
  apiKey: z.string().nullable().default(null).describe("Bearer token; null for local"),
  model: z.string().default("default").describe("Model name for chat completion"),
});

export type ModelBinding = z.infer<typeof ModelBindingSchema>;

/**
 * Resolve moltblock config file: MOLTBLOCK_CONFIG env, then ./moltblock.json, ./.moltblock/moltblock.json, ~/.moltblock/moltblock.json.
 */
function moltblockConfigPath(): string | null {
  const envPath = (process.env["MOLTBLOCK_CONFIG"] ?? "").trim();
  if (envPath && fs.existsSync(envPath)) {
    return envPath;
  }
  const cwd = process.cwd();
  const candidates = [
    path.join(cwd, "moltblock.json"),
    path.join(cwd, ".moltblock", "moltblock.json"),
    path.join(os.homedir(), ".moltblock", "moltblock.json"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

/**
 * Resolve OpenClaw config file: OPENCLAW_CONFIG env, then ./openclaw.json, ./.openclaw/openclaw.json, ~/.openclaw/openclaw.json.
 */
function openclawConfigPath(): string | null {
  const envPath = (process.env["OPENCLAW_CONFIG"] ?? "").trim();
  if (envPath && fs.existsSync(envPath)) {
    return envPath;
  }
  const cwd = process.cwd();
  const candidates = [
    path.join(cwd, "openclaw.json"),
    path.join(cwd, ".openclaw", "openclaw.json"),
    path.join(os.homedir(), ".openclaw", "openclaw.json"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

/** Track which config source was used */
export type ConfigSource = "moltblock" | "openclaw" | "env" | null;
let lastConfigSource: ConfigSource = null;

/**
 * Get the source of the last loaded config.
 */
export function getConfigSource(): ConfigSource {
  return lastConfigSource;
}

/**
 * Load and parse moltblock.json if present, fallback to openclaw.json.
 * Returns null if no file or parse error.
 */
export function loadMoltblockConfig(): MoltblockConfig | null {
  // Try moltblock config first
  const moltblockFile = moltblockConfigPath();
  if (moltblockFile) {
    try {
      const raw = fs.readFileSync(moltblockFile, "utf-8");
      const data = JSON.parse(raw);
      const config = MoltblockConfigSchema.parse(data);
      lastConfigSource = "moltblock";
      return config;
    } catch {
      // Parse error, try fallback
    }
  }

  // Fallback to OpenClaw config
  const openclawFile = openclawConfigPath();
  if (openclawFile) {
    try {
      const raw = fs.readFileSync(openclawFile, "utf-8");
      const data = JSON.parse(raw);
      const config = parseOpenClawConfig(data);
      if (config) {
        lastConfigSource = "openclaw";
        console.log(`Using OpenClaw config from ${openclawFile}`);
        return config;
      }
    } catch {
      // Parse error
    }
  }

  lastConfigSource = "env";
  return null;
}

/**
 * Parse OpenClaw config and convert to MoltblockConfig format.
 * OpenClaw uses a similar structure but may have different field names.
 */
function parseOpenClawConfig(data: unknown): MoltblockConfig | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const obj = data as Record<string, unknown>;

  // OpenClaw may have agent.bindings or providers section
  // Try to extract bindings from various possible locations
  let bindings: Record<string, BindingEntry> | undefined;

  // Check for agent.bindings (same as moltblock)
  if (obj["agent"] && typeof obj["agent"] === "object") {
    const agent = obj["agent"] as Record<string, unknown>;
    if (agent["bindings"] && typeof agent["bindings"] === "object") {
      bindings = extractBindings(agent["bindings"] as Record<string, unknown>);
    }
  }

  // Check for providers section (OpenClaw style)
  if (!bindings && obj["providers"] && typeof obj["providers"] === "object") {
    bindings = extractBindingsFromProviders(obj["providers"] as Record<string, unknown>);
  }

  // Check for models section
  if (!bindings && obj["models"] && typeof obj["models"] === "object") {
    bindings = extractBindings(obj["models"] as Record<string, unknown>);
  }

  if (!bindings) {
    return null;
  }

  return {
    agent: { bindings },
  };
}

/**
 * Extract bindings from a bindings-like object.
 */
function extractBindings(obj: Record<string, unknown>): Record<string, BindingEntry> {
  const result: Record<string, BindingEntry> = {};

  for (const [role, value] of Object.entries(obj)) {
    if (value && typeof value === "object") {
      const entry = value as Record<string, unknown>;
      const rawApiKey = entry["api_key"] ?? entry["apiKey"];
      const binding: BindingEntry = {
        backend: String(entry["backend"] ?? entry["provider"] ?? "openai"),
        base_url: String(entry["base_url"] ?? entry["baseUrl"] ?? entry["url"] ?? ""),
        model: String(entry["model"] ?? "default"),
        api_key: typeof rawApiKey === "string" ? rawApiKey : null,
      };
      if (binding.base_url) {
        result[role] = binding;
      }
    }
  }

  return result;
}

/**
 * Extract bindings from OpenClaw providers section.
 * Maps provider configs to role bindings.
 */
function extractBindingsFromProviders(providers: Record<string, unknown>): Record<string, BindingEntry> {
  const result: Record<string, BindingEntry> = {};

  // Map first available provider to all roles
  for (const [providerName, config] of Object.entries(providers)) {
    if (config && typeof config === "object") {
      const entry = config as Record<string, unknown>;
      const rawApiKey = entry["api_key"] ?? entry["apiKey"];
      const binding: BindingEntry = {
        backend: providerName,
        base_url: String(entry["base_url"] ?? entry["baseUrl"] ?? entry["url"] ?? ""),
        model: String(entry["model"] ?? entry["default_model"] ?? "default"),
        api_key: typeof rawApiKey === "string" ? rawApiKey : null,
      };

      if (binding.base_url) {
        // Use this provider for all roles unless specific ones are defined
        if (!result["generator"]) result["generator"] = binding;
        if (!result["critic"]) result["critic"] = binding;
        if (!result["judge"]) result["judge"] = binding;
        if (!result["verifier"]) result["verifier"] = binding;
      }
    }
  }

  return result;
}

function env(key: string, defaultValue = ""): string {
  return (process.env[key] ?? defaultValue).trim();
}

/**
 * Get API key for a backend from standard env vars.
 */
function getApiKeyForBackend(backend: string): string | null {
  const backendLower = backend.toLowerCase();
  if (backendLower === "openai") {
    return env("OPENAI_API_KEY") || null;
  }
  if (backendLower === "anthropic" || backendLower === "claude") {
    return env("ANTHROPIC_API_KEY") || null;
  }
  if (backendLower === "google" || backendLower === "gemini") {
    return env("GOOGLE_API_KEY") || null;
  }
  if (backendLower === "zai") {
    return env("MOLTBLOCK_ZAI_API_KEY") || null;
  }
  return null;
}

/**
 * Model bindings for Code Entity. Load from moltblock.json if present, then env overrides.
 * If no JSON, uses env/.env only (backward compatible). API keys from env win over JSON.
 */
export function defaultCodeEntityBindings(): Record<string, ModelBinding> {
  const cfg = loadMoltblockConfig();
  const zaiKey = env("MOLTBLOCK_ZAI_API_KEY");
  const localUrl = env("MOLTBLOCK_GENERATOR_BASE_URL") || "http://localhost:1234/v1";
  const localModel = env("MOLTBLOCK_GENERATOR_MODEL") || "local";

  const envUrl = (key: string, fallback: string): string => env(key) || fallback;
  const envModel = (key: string, fallback: string): string => env(key) || fallback;

  const bindingsFromJson: Record<string, BindingEntry> = cfg?.agent?.bindings ?? {};

  function bindingFor(
    role: string,
    defaultBackend: string,
    defaultBase: string,
    defaultModel: string,
    defaultApiKey: string | null
  ): ModelBinding {
    const entry = bindingsFromJson[role];
    if (entry) {
      const baseUrl = envUrl(`MOLTBLOCK_${role.toUpperCase()}_BASE_URL`, entry.base_url);
      const model = envModel(`MOLTBLOCK_${role.toUpperCase()}_MODEL`, entry.model ?? "default");
      const apiKey =
        env(`MOLTBLOCK_${role.toUpperCase()}_API_KEY`) ||
        entry.api_key ||
        getApiKeyForBackend(entry.backend) ||
        null;
      return { backend: entry.backend, baseUrl, apiKey, model };
    }
    // No JSON: legacy env-only behavior
    if (role === "generator") {
      return { backend: "local", baseUrl: localUrl, apiKey: null, model: localModel };
    }
    if (role === "critic") {
      const useZai = Boolean(zaiKey);
      return {
        backend: useZai ? "zai" : "local",
        baseUrl: envUrl(
          "MOLTBLOCK_CRITIC_BASE_URL",
          useZai ? "https://api.z.ai/api/paas/v4" : localUrl
        ),
        apiKey: useZai ? zaiKey : null,
        model: envModel("MOLTBLOCK_CRITIC_MODEL", useZai ? "glm-4.7-flash" : localModel),
      };
    }
    if (role === "judge") {
      const useZai = Boolean(zaiKey);
      return {
        backend: useZai ? "zai" : "local",
        baseUrl: envUrl(
          "MOLTBLOCK_JUDGE_BASE_URL",
          useZai ? "https://api.z.ai/api/paas/v4" : localUrl
        ),
        apiKey: useZai ? zaiKey : null,
        model: envModel("MOLTBLOCK_JUDGE_MODEL", useZai ? "glm-4.7-flash" : localModel),
      };
    }
    if (role === "verifier") {
      return {
        backend: "local",
        baseUrl: envUrl("MOLTBLOCK_VERIFIER_BASE_URL", localUrl),
        apiKey: null,
        model: envModel("MOLTBLOCK_VERIFIER_MODEL", localModel),
      };
    }
    return { backend: defaultBackend, baseUrl: defaultBase, apiKey: defaultApiKey, model: defaultModel };
  }

  return {
    generator: bindingFor("generator", "local", localUrl, localModel, null),
    critic: bindingFor("critic", zaiKey ? "zai" : "local", localUrl, localModel, zaiKey || null),
    judge: bindingFor("judge", zaiKey ? "zai" : "local", localUrl, localModel, zaiKey || null),
    verifier: bindingFor("verifier", "local", localUrl, localModel, null),
  };
}
