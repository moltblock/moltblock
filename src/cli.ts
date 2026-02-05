#!/usr/bin/env node
/**
 * CLI: run one Code Entity task.
 */

import fs from "node:fs";
import { program } from "commander";
import { CodeEntity } from "./entity.js";
import { defaultCodeEntityBindings } from "./config.js";

async function main(): Promise<void> {
  program
    .name("moltblock")
    .description("Moltblock Code Entity — one task through the loop.")
    .argument("<task>", "Task description (e.g. 'Implement a function add(a,b) that returns a+b.')")
    .option(
      "-t, --test <path>",
      "Path to file containing test code (e.g. vitest test module). If omitted, only syntax check."
    )
    .option(
      "--json",
      "Output result as JSON (draft, critique, final, verification_passed, authoritative_artifact)."
    )
    .action(async (task: string, options: { test?: string; json?: boolean }) => {
      let testCode: string | undefined;

      if (options.test && fs.existsSync(options.test)) {
        testCode = fs.readFileSync(options.test, "utf-8");
      }

      const entity = new CodeEntity(defaultCodeEntityBindings());
      const memory = await entity.run(task, { testCode });

      if (options.json) {
        const out = {
          verification_passed: memory.verificationPassed,
          verification_evidence: memory.verificationEvidence,
          authoritative_artifact: memory.verificationPassed
            ? memory.authoritativeArtifact
            : null,
          draft: memory.draft,
          critique: memory.critique,
          final_candidate: memory.finalCandidate,
        };
        console.log(JSON.stringify(out, null, 2));
      } else {
        console.log("=== Draft ===");
        console.log(memory.draft);
        console.log("\n=== Critique ===");
        console.log(memory.critique);
        console.log("\n=== Final candidate ===");
        console.log(memory.finalCandidate);
        console.log("\n=== Verification ===");
        console.log(
          memory.verificationPassed ? "Passed:" : "Failed:",
          memory.verificationPassed
        );
        console.log(memory.verificationEvidence);
        if (memory.verificationPassed && memory.authoritativeArtifact) {
          console.log("\n=== Authoritative artifact ===");
          console.log(memory.authoritativeArtifact);
        }
      }
    });

  await program.parseAsync(process.argv);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
