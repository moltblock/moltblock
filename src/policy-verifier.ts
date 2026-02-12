/**
 * PolicyVerifier: rule-based verifier that catches dangerous patterns without an LLM call.
 */

import type { WorkingMemory } from "./memory.js";
import type { Verifier, VerificationResult, VerifierContext } from "./verifier-interface.js";

/** A single policy rule. */
export interface PolicyRule {
  id: string;
  description: string;
  /** What to match against: "artifact", "task", or "both". */
  target: "artifact" | "task" | "both";
  /** Regex pattern string. */
  pattern: string;
  /** "deny" blocks the artifact; "allow" overrides deny rules in the same category. */
  action: "deny" | "allow";
  category: string;
  enabled: boolean;
}

// --- Built-in deny rules ---

const BUILTIN_RULES: PolicyRule[] = [
  // Destructive commands
  { id: "cmd-rm-rf", description: "Recursive force delete", target: "artifact", pattern: "\\brm\\s+-rf\\b", action: "deny", category: "destructive-cmd", enabled: true },
  { id: "cmd-rm-r", description: "Recursive delete", target: "artifact", pattern: "\\brm\\s+-r\\s+/", action: "deny", category: "destructive-cmd", enabled: true },
  { id: "cmd-drop-table", description: "SQL DROP TABLE", target: "artifact", pattern: "\\bDROP\\s+(TABLE|DATABASE)\\b", action: "deny", category: "destructive-sql", enabled: true },
  { id: "cmd-truncate", description: "SQL TRUNCATE", target: "artifact", pattern: "\\bTRUNCATE\\s+TABLE\\b", action: "deny", category: "destructive-sql", enabled: true },
  { id: "cmd-dd", description: "Raw disk write (dd)", target: "artifact", pattern: "\\bdd\\s+if=", action: "deny", category: "destructive-cmd", enabled: true },
  { id: "cmd-chmod-777", description: "World-writable permissions", target: "artifact", pattern: "\\bchmod\\s+777\\b", action: "deny", category: "destructive-cmd", enabled: true },
  { id: "cmd-mkfs", description: "Filesystem creation", target: "artifact", pattern: "\\bmkfs\\b", action: "deny", category: "destructive-cmd", enabled: true },

  // Sensitive file paths
  { id: "path-ssh", description: "SSH directory access", target: "both", pattern: "~?\\/?\\.ssh\\/", action: "deny", category: "sensitive-path", enabled: true },
  { id: "path-etc-passwd", description: "/etc/passwd access", target: "both", pattern: "\\/etc\\/passwd\\b", action: "deny", category: "sensitive-path", enabled: true },
  { id: "path-etc-shadow", description: "/etc/shadow access", target: "both", pattern: "\\/etc\\/shadow\\b", action: "deny", category: "sensitive-path", enabled: true },
  { id: "path-dotenv", description: ".env file access", target: "artifact", pattern: "\\.(env|env\\.local|env\\.production)\\b", action: "deny", category: "sensitive-path", enabled: true },
  { id: "path-id-rsa", description: "Private key file", target: "both", pattern: "\\bid_rsa\\b|\\bid_ed25519\\b", action: "deny", category: "sensitive-path", enabled: true },
  { id: "path-credentials", description: "Credentials file", target: "both", pattern: "\\bcredentials\\.(json|yaml|yml|xml)\\b", action: "deny", category: "sensitive-path", enabled: true },

  // Hardcoded secrets
  { id: "secret-api-key", description: "Hardcoded API key pattern", target: "artifact", pattern: "(api[_-]?key|apikey)\\s*[=:]\\s*[\"'][A-Za-z0-9_\\-]{20,}", action: "deny", category: "hardcoded-secret", enabled: true },
  { id: "secret-password", description: "Hardcoded password", target: "artifact", pattern: "(password|passwd|pwd)\\s*[=:]\\s*[\"'][^\"']{4,}", action: "deny", category: "hardcoded-secret", enabled: true },
  { id: "secret-private-key", description: "Private key material", target: "artifact", pattern: "-----BEGIN\\s+(RSA|EC|DSA|OPENSSH)?\\s*PRIVATE\\s+KEY-----", action: "deny", category: "hardcoded-secret", enabled: true },
  { id: "secret-token", description: "Hardcoded token/secret", target: "artifact", pattern: "(secret|token)\\s*[=:]\\s*[\"'][A-Za-z0-9_\\-]{20,}", action: "deny", category: "hardcoded-secret", enabled: true },

  // Data exfiltration
  { id: "exfil-curl-post", description: "curl POST request", target: "artifact", pattern: "\\bcurl\\s+.*-X\\s*POST\\b", action: "deny", category: "exfiltration", enabled: true },
  { id: "exfil-wget", description: "wget to HTTP", target: "artifact", pattern: "\\bwget\\s+http", action: "deny", category: "exfiltration", enabled: true },
];

/** Pre-compiled rule with cached regex. */
interface CompiledRule {
  rule: PolicyRule;
  regex: RegExp;
}

/**
 * Rule-based policy verifier. Checks artifacts and tasks against deny/allow rules.
 * Allow rules in the same category override deny rules.
 * Regexes are pre-compiled in the constructor for performance.
 */
export class PolicyVerifier implements Verifier {
  readonly name = "PolicyVerifier";
  private rules: PolicyRule[];
  private compiledRules: CompiledRule[];

  constructor(customRules?: PolicyRule[]) {
    this.rules = [...BUILTIN_RULES];
    if (customRules) {
      this.rules.push(...customRules);
    }
    // Pre-compile all regexes once
    this.compiledRules = this.rules.map((rule) => ({
      rule,
      regex: new RegExp(rule.pattern, "i"),
    }));
  }

  async verify(memory: WorkingMemory, context?: VerifierContext): Promise<VerificationResult> {
    const artifact = memory.finalCandidate || "";
    const task = context?.task ?? memory.task ?? "";

    const violations: string[] = [];
    const allowedCategories = new Set<string>();

    // First pass: collect allowed categories
    for (const { rule, regex } of this.compiledRules) {
      if (!rule.enabled || rule.action !== "allow") continue;
      const text = this.getTargetText(rule.target, artifact, task);
      if (regex.test(text)) {
        allowedCategories.add(rule.category);
      }
    }

    // Second pass: check deny rules (skip allowed categories)
    for (const { rule, regex } of this.compiledRules) {
      if (!rule.enabled || rule.action !== "deny") continue;
      if (allowedCategories.has(rule.category)) continue;

      const text = this.getTargetText(rule.target, artifact, task);
      if (regex.test(text)) {
        violations.push(`[${rule.id}] ${rule.description}`);
      }
    }

    if (violations.length > 0) {
      return {
        passed: false,
        evidence: `Policy violations:\n${violations.join("\n")}`,
        verifierName: this.name,
      };
    }

    return {
      passed: true,
      evidence: "All policy rules passed.",
      verifierName: this.name,
    };
  }

  private getTargetText(target: "artifact" | "task" | "both", artifact: string, task: string): string {
    if (target === "artifact") return artifact;
    if (target === "task") return task;
    return `${task}\n${artifact}`;
  }
}
