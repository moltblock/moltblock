// Keeps the exported VERSION constant in src/index.ts in sync with package.json.
// Runs automatically via the npm "version" lifecycle script (see package.json),
// so `npm version <patch|minor|...>` updates the source constant and stages it
// into the version commit. tests/version.test.ts enforces that they match.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const target = join(root, "src", "index.ts");

const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf-8"));
const src = readFileSync(target, "utf-8");

const pattern = /export const VERSION = "[^"]*";/;
if (!pattern.test(src)) {
  console.error(
    `sync-version: could not find a VERSION constant to update in ${target}`
  );
  process.exit(1);
}

const next = src.replace(pattern, `export const VERSION = "${pkg.version}";`);
if (next === src) {
  console.log(`sync-version: VERSION already ${pkg.version}`);
} else {
  writeFileSync(target, next);
  console.log(`sync-version: src/index.ts VERSION -> ${pkg.version}`);
}
