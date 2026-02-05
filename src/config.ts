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
 * Resolve config file: MOLTBLOCK_CONFIG env, then ./moltblock.json, ./.moltblock/moltblock.json, ~/.moltblock/moltblock.json.
 */
function configPath(): string | null {
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
 * Load and parse moltblock.json if present. Returns null if no file or parse error.
 */
export function loadMoltblockConfig(): MoltblockConfig | null {
  const configFile = configPath();
  if (!configFile) {
    return null;
  }
  try {
    const raw = fs.readFileSync(configFile, "utf-8");
    const data = JSON.parse(raw);
    return MoltblockConfigSchema.parse(data);
  } catch {
    return null;
  }
}

function env(key: string, defaultValue = ""): string {
  return (process.env[key] ?? defaultValue).trim();
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
        (entry.backend === "zai" ? zaiKey : null) ||
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
