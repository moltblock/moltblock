/**
 * Verifier: run vitest on code artifact; gate authority and memory admission.
 */

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { WorkingMemory } from "./memory.js";

/**
 * Remove markdown code fence if present.
 */
export function extractCodeBlock(text: string): string {
  let trimmed = text.trim();
  if (trimmed.startsWith("```")) {
    const lines = trimmed.split("\n");
    // Remove first line (```typescript or ```)
    if (lines[0]?.startsWith("```")) {
      lines.shift();
    }
    // Remove last line if it's just ```
    if (lines.length > 0 && lines[lines.length - 1]?.trim() === "```") {
      lines.pop();
    }
    return lines.join("\n");
  }
  return trimmed;
}

/**
 * Write code (and optional test) to temp dir, run vitest, return (passed, stdout+stderr).
 * If testCode is undefined, we only check that the code is syntactically valid (compiles).
 */
export async function runVitestOnCode(
  code: string,
  testCode?: string
): Promise<{ passed: boolean; output: string }> {
  const cleanCode = extractCodeBlock(code);

  // Create temp directory
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "moltblock-verify-"));

  try {
    // Write solution file
    fs.writeFileSync(path.join(tmpDir, "solution.ts"), cleanCode, "utf-8");

    // Write minimal package.json for ES modules
    fs.writeFileSync(
      path.join(tmpDir, "package.json"),
      JSON.stringify({ type: "module" }, null, 2),
      "utf-8"
    );

    if (testCode) {
      // Write test file
      const cleanTest = extractCodeBlock(testCode);
      fs.writeFileSync(path.join(tmpDir, "solution.test.ts"), cleanTest, "utf-8");
    }

    // Run vitest (or just tsc if no tests)
    const result = await new Promise<{ passed: boolean; output: string }>((resolve) => {
      const args = testCode
        ? ["vitest", "run", "--reporter=verbose", "--no-color"]
        : ["tsc", "--noEmit", "--strict", "--target", "ES2022", "--module", "NodeNext", "solution.ts"];

      const proc = spawn("npx", args, {
        cwd: tmpDir,
        timeout: 30000,
        shell: true,
      });

      let stdout = "";
      let stderr = "";

      proc.stdout?.on("data", (data: Buffer) => {
        stdout += data.toString();
      });

      proc.stderr?.on("data", (data: Buffer) => {
        stderr += data.toString();
      });

      proc.on("close", (exitCode) => {
        resolve({
          passed: exitCode === 0,
          output: stdout + stderr,
        });
      });

      proc.on("error", (err) => {
        resolve({
          passed: false,
          output: `Process error: ${err.message}`,
        });
      });
    });

    return result;
  } finally {
    // Cleanup temp directory
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * Simple TypeScript syntax check using regex and basic parsing.
 * Returns true if the code looks like valid TypeScript syntax.
 */
function syntaxCheck(code: string): { valid: boolean; error?: string } {
  // Basic checks for common syntax errors
  let braceCount = 0;
  let parenCount = 0;
  let bracketCount = 0;
  let inString = false;
  let stringChar = "";
  let inComment = false;
  let inBlockComment = false;

  for (let i = 0; i < code.length; i++) {
    const char = code[i]!;
    const nextChar = code[i + 1];

    // Handle comments
    if (!inString) {
      if (char === "/" && nextChar === "/" && !inBlockComment) {
        inComment = true;
        continue;
      }
      if (char === "/" && nextChar === "*" && !inComment) {
        inBlockComment = true;
        i++;
        continue;
      }
      if (char === "*" && nextChar === "/" && inBlockComment) {
        inBlockComment = false;
        i++;
        continue;
      }
      if (char === "\n" && inComment) {
        inComment = false;
        continue;
      }
    }

    if (inComment || inBlockComment) continue;

    // Handle strings
    if ((char === '"' || char === "'" || char === "`") && code[i - 1] !== "\\") {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar) {
        inString = false;
        stringChar = "";
      }
      continue;
    }

    if (inString) continue;

    // Count brackets
    if (char === "{") braceCount++;
    if (char === "}") braceCount--;
    if (char === "(") parenCount++;
    if (char === ")") parenCount--;
    if (char === "[") bracketCount++;
    if (char === "]") bracketCount--;

    if (braceCount < 0 || parenCount < 0 || bracketCount < 0) {
      return { valid: false, error: "Unmatched closing bracket" };
    }
  }

  if (braceCount !== 0) {
    return { valid: false, error: `Unmatched braces (${braceCount > 0 ? "missing }" : "extra }"})` };
  }
  if (parenCount !== 0) {
    return { valid: false, error: `Unmatched parentheses (${parenCount > 0 ? "missing )" : "extra )"})` };
  }
  if (bracketCount !== 0) {
    return { valid: false, error: `Unmatched brackets (${bracketCount > 0 ? "missing ]" : "extra ]"})` };
  }
  if (inString) {
    return { valid: false, error: "Unterminated string" };
  }

  return { valid: true };
}

/**
 * Run verification on final_candidate. For Code Entity: run vitest.
 * Sets verification_passed and verification_evidence; if pass, sets authoritative_artifact.
 */
export async function runVerifier(memory: WorkingMemory, testCode?: string): Promise<void> {
  const code = memory.finalCandidate;

  if (!code) {
    memory.setVerification(false, "No final candidate to verify.");
    return;
  }

  // If no test code provided, do a basic syntax check
  if (!testCode) {
    const cleanCode = extractCodeBlock(code);
    const check = syntaxCheck(cleanCode);
    if (check.valid) {
      memory.setVerification(true, "Syntax check passed (no tests provided).");
    } else {
      memory.setVerification(false, `Syntax error: ${check.error}`);
    }
    return;
  }

  // Run vitest with test code
  const { passed, output } = await runVitestOnCode(code, testCode);
  memory.setVerification(passed, output);
}
