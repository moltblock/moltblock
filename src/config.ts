/**
 * LLM gateway config: per-role model binding.
 * Load from JSON (moltblock.json), with env overrides.
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { z } from "zod";

/** JSON.parse reviver that strips prototype pollution keys */
function safeJsonParse(text: string): unknown {
  return JSON.parse(text, (key, value) => {
    if (key === "__proto__" || key === "constructor" || key === "prototype") {
      return undefined;
    }
    return value;
  });
}

// Load .env so MOLTBLOCK_ZAI_API_KEY etc. can be set there
try {
  const dotenv = await import("dotenv");
  dotenv.config({ quiet: true });
} catch {
  // dotenv not required
}

// --- Provider defaults registry ---

const PROVIDER_DEFAULTS: Record<string, { baseUrl: string; model: string; envKey: string }> = {
  openai:  { baseUrl: "https://api.openai.com/v1",                               model: "gpt-4o",           envKey: "OPENAI_API_KEY" },
  google:  { baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/", model: "gemini-2.0-flash", envKey: "GOOGLE_API_KEY" },
  zai:     { baseUrl: "https://api.z.ai/api/paas/v4",                            model: "glm-4.7-flash",    envKey: "MOLTBLOCK_ZAI_API_KEY" },
  local:   { baseUrl: "http://localhost:1234/v1",                                 model: "local",            envKey: "" },
};

// --- Zod schemas (OpenClaw-style config) ---

export const BindingEntrySchema = z.object({
  backend: z.string().describe("e.g. 'local' or 'zai' or 'openai'"),
  base_url: z.string().describe("API base URL"),
  model: z.string().default("default").describe("Model id for chat completion"),
  api_key: z.string().nullable().optional().describe("Bearer token; null for local. Prefer env."),
});

export type BindingEntry = z.infer<typeof BindingEntrySchema>;

export const AgentConfigSchema = z.object({
  bindings: z.record(z.string(), BindingEntrySchema).optional().describe("Per-role model bindings"),
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

/** Validate that a config path is within allowed directories (cwd, homedir, or tmpdir). */
function isAllowedConfigPath(filePath: string): boolean {
  const resolved = path.resolve(filePath);
  const allowed = [path.resolve(process.cwd()), path.resolve(os.homedir()), path.resolve(os.tmpdir())];
  return allowed.some((dir) => resolved.startsWith(dir + path.sep) || resolved === dir);
}

/**
 * Resolve moltblock config file: MOLTBLOCK_CONFIG env, then ./moltblock.json, ./.moltblock/moltblock.json, ~/.moltblock/moltblock.json.
 */
function moltblockConfigPath(): string | null {
  const envPath = (process.env["MOLTBLOCK_CONFIG"] ?? "").trim();
  if (envPath && isAllowedConfigPath(envPath) && fs.existsSync(envPath)) {
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
  if (envPath && isAllowedConfigPath(envPath) && fs.existsSync(envPath)) {
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
      const data = safeJsonParse(raw);
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
      const data = safeJsonParse(raw);
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
 * Handles multiple OpenClaw formats: agents.defaults.model.primary ("provider/model"),
 * agent.bindings, providers section, and models section.
 */
function parseOpenClawConfig(data: unknown): MoltblockConfig | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const obj = data as Record<string, unknown>;

  let bindings: Record<string, BindingEntry> | undefined;

  // Check for agents.defaults.model.primary (OpenClaw's actual format: "provider/model")
  if (obj["agents"] && typeof obj["agents"] === "object") {
    const agents = obj["agents"] as Record<string, unknown>;
    if (agents["defaults"] && typeof agents["defaults"] === "object") {
      const defaults = agents["defaults"] as Record<string, unknown>;
      if (defaults["model"] && typeof defaults["model"] === "object") {
        const modelConfig = defaults["model"] as Record<string, unknown>;
        const primary = modelConfig["primary"];
        if (typeof primary === "string" && primary.includes("/")) {
          const parts = primary.split("/");
          const providerName = parts[0] ?? "";
          const modelName = parts.slice(1).join("/");
          const provider = PROVIDER_DEFAULTS[providerName.toLowerCase()];
          if (providerName && provider) {
            const apiKey = getApiKeyForBackend(providerName);
            const binding: BindingEntry = {
              backend: providerName.toLowerCase(),
              base_url: provider.baseUrl,
              model: modelName || provider.model,
              api_key: apiKey,
            };
            bindings = {
              generator: binding,
              critic: { ...binding },
              judge: { ...binding },
              verifier: { ...binding },
            };
          }
        }
      }
    }
  }

  // Check for agent.bindings (same as moltblock)
  if (!bindings && obj["agent"] && typeof obj["agent"] === "object") {
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
    return env("MOLTBLOCK_ZAI_API_KEY") || env("ZAI_API_KEY") || null;
  }
  return null;
}

/** Overrides for provider/model selection (e.g. from CLI flags). */
export interface BindingOverrides {
  provider?: string;
  model?: string;
}

/**
 * Auto-detect the best available provider from environment variables.
 * Priority: explicit override > OPENAI_API_KEY > GOOGLE_API_KEY > MOLTBLOCK_ZAI_API_KEY/ZAI_API_KEY > local.
 */
export function detectProvider(
  overrideProvider?: string,
  overrideModel?: string,
): { backend: string; baseUrl: string; model: string; apiKey: string | null } {
  if (overrideProvider) {
    const p = PROVIDER_DEFAULTS[overrideProvider.toLowerCase()];
    if (!p) {
      throw new Error(
        `Unknown provider "${overrideProvider}". Valid providers: ${Object.keys(PROVIDER_DEFAULTS).join(", ")}`,
      );
    }
    const apiKey = p.envKey ? env(p.envKey) || null : null;
    return {
      backend: overrideProvider.toLowerCase(),
      baseUrl: p.baseUrl,
      model: overrideModel || p.model,
      apiKey,
    };
  }

  // Scan env vars in priority order
  const priority: Array<{ name: string; envKey: string }> = [
    { name: "openai",  envKey: "OPENAI_API_KEY" },
    { name: "google",  envKey: "GOOGLE_API_KEY" },
    { name: "zai",     envKey: "MOLTBLOCK_ZAI_API_KEY" },
    { name: "zai",     envKey: "ZAI_API_KEY" },
  ];

  for (const { name, envKey } of priority) {
    const key = env(envKey);
    if (key) {
      const p = PROVIDER_DEFAULTS[name]!;
      return {
        backend: name,
        baseUrl: p.baseUrl,
        model: overrideModel || p.model,
        apiKey: key,
      };
    }
  }

  // Fallback to local
  const local = PROVIDER_DEFAULTS["local"]!;
  return {
    backend: "local",
    baseUrl: local.baseUrl,
    model: overrideModel || local.model,
    apiKey: null,
  };
}

/**
 * Model bindings for Code Entity. Load from moltblock.json if present, then env overrides.
 * If no JSON, auto-detects provider from env vars. API keys from env win over JSON.
 */
export function defaultCodeEntityBindings(overrides?: BindingOverrides): Record<string, ModelBinding> {
  const cfg = loadMoltblockConfig();

  const envUrl = (key: string, fallback: string): string => env(key) || fallback;
  const envModel = (key: string, fallback: string): string => env(key) || fallback;

  const bindingsFromJson: Record<string, BindingEntry> = cfg?.agent?.bindings ?? {};

  function bindingFor(role: string): ModelBinding {
    const entry = bindingsFromJson[role];
    if (entry) {
      const baseUrl = envUrl(`MOLTBLOCK_${role.toUpperCase()}_BASE_URL`, entry.base_url);
      const model = envModel(`MOLTBLOCK_${role.toUpperCase()}_MODEL`, entry.model ?? "default");
      const envApiKey = env(`MOLTBLOCK_${role.toUpperCase()}_API_KEY`);
      if (!envApiKey && entry.api_key) {
        console.warn(
          `Warning: API key for "${role}" loaded from config file. ` +
            `Use environment variables instead for better security.`
        );
      }
      const apiKey = envApiKey || entry.api_key || getApiKeyForBackend(entry.backend) || null;
      return { backend: entry.backend, baseUrl, apiKey, model };
    }
    // No JSON entry for this role: auto-detect provider
    const detected = detectProvider(overrides?.provider, overrides?.model);
    const baseUrl = envUrl(`MOLTBLOCK_${role.toUpperCase()}_BASE_URL`, detected.baseUrl);
    const model = envModel(`MOLTBLOCK_${role.toUpperCase()}_MODEL`, detected.model);
    return { backend: detected.backend, baseUrl, apiKey: detected.apiKey, model };
  }

  return {
    generator: bindingFor("generator"),
    critic: bindingFor("critic"),
    judge: bindingFor("judge"),
    verifier: bindingFor("verifier"),
  };
}
