/**
 * Risk classification: keyword-based risk levels for tasks.
 */

export type RiskLevel = "low" | "medium" | "high";

export interface RiskClassification {
  level: RiskLevel;
  reasons: string[];
}

interface RiskPattern {
  pattern: RegExp;
  level: "high" | "medium";
  reason: string;
}

const RISK_PATTERNS: RiskPattern[] = [
  // High: destructive operations
  { pattern: /\brm\s+-rf\b/i, level: "high", reason: "Recursive file deletion (rm -rf)" },
  { pattern: /\brm\s+-r\b/i, level: "high", reason: "Recursive file deletion (rm -r)" },
  { pattern: /\brmdir\b/i, level: "high", reason: "Directory removal" },
  { pattern: /\bdrop\s+(table|database)\b/i, level: "high", reason: "SQL DROP statement" },
  { pattern: /\btruncate\s+table\b/i, level: "high", reason: "SQL TRUNCATE statement" },
  { pattern: /\bformat\s+[a-z]:/i, level: "high", reason: "Disk format command" },
  { pattern: /\bmkfs\b/i, level: "high", reason: "Filesystem creation (mkfs)" },
  { pattern: /\bdd\s+if=/i, level: "high", reason: "Raw disk write (dd)" },

  // High: privilege escalation
  { pattern: /\bsudo\b/i, level: "high", reason: "Sudo privilege escalation" },
  { pattern: /\bchmod\s+777\b/i, level: "high", reason: "World-writable permissions (chmod 777)" },
  { pattern: /\bchmod\s+\+s\b/i, level: "high", reason: "Set-UID/GID bit (chmod +s)" },

  // High: credential/key access
  { pattern: /\b(private[_\s]?key|id_rsa|id_ed25519)\b/i, level: "high", reason: "Private key access" },
  { pattern: /\/etc\/shadow\b/i, level: "high", reason: "Shadow password file access" },
  { pattern: /~?\/?\.ssh\//i, level: "high", reason: "SSH directory access" },
  { pattern: /\bcredentials?\.(json|yaml|yml|xml|conf)\b/i, level: "high", reason: "Credentials file access" },

  // High: system modification
  { pattern: /\/etc\/passwd\b/i, level: "high", reason: "System password file access" },
  { pattern: /\bsystemctl\s+(stop|disable|mask)\b/i, level: "high", reason: "System service modification" },
  { pattern: /\bkill\s+-9\b/i, level: "high", reason: "Force kill process" },

  // Medium: network operations
  { pattern: /\bcurl\b/i, level: "medium", reason: "Network request (curl)" },
  { pattern: /\bwget\b/i, level: "medium", reason: "Network download (wget)" },
  { pattern: /\bfetch\s*\(/i, level: "medium", reason: "Network fetch call" },
  { pattern: /\bhttp(s)?:\/\//i, level: "medium", reason: "HTTP URL reference" },

  // Medium: file writes
  { pattern: /\bwrite\s*file\b/i, level: "medium", reason: "File write operation" },
  { pattern: /\bfs\.write/i, level: "medium", reason: "Filesystem write (fs.write)" },
  { pattern: /\bfs\.unlink/i, level: "medium", reason: "File deletion (fs.unlink)" },

  // Medium: database modifications
  { pattern: /\b(insert|update|delete|alter)\s+(into|from|table)\b/i, level: "medium", reason: "Database modification" },

  // Medium: subprocess spawning
  { pattern: /\bexec\s*\(/i, level: "medium", reason: "Subprocess execution (exec)" },
  { pattern: /\bspawn\s*\(/i, level: "medium", reason: "Subprocess spawning" },
  { pattern: /\bchild_process\b/i, level: "medium", reason: "Child process module" },
  { pattern: /\beval\s*\(/i, level: "medium", reason: "Dynamic code evaluation (eval)" },
];

/**
 * Classify a task's risk level based on keyword/pattern matching.
 * Returns the highest risk level found and all matching reasons.
 */
export function classifyRisk(task: string): RiskClassification {
  const reasons: string[] = [];
  let level: RiskLevel = "low";

  for (const { pattern, level: patternLevel, reason } of RISK_PATTERNS) {
    if (pattern.test(task)) {
      reasons.push(reason);
      if (patternLevel === "high") {
        level = "high";
      } else if (patternLevel === "medium" && level !== "high") {
        level = "medium";
      }
    }
  }

  return { level, reasons };
}
