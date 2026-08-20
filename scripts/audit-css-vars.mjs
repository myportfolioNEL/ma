#!/usr/bin/env node
/**
 * Fails when a CSS custom property is used but never declared.
 *
 * Round 23 shipped 192 dead var() references because one APPEND step was
 * skipped. Nothing in the toolchain noticed: an unresolved var() with no
 * fallback makes the browser drop the whole declaration, quietly. This script
 * is the thing that notices.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const ROOT = "src";

/* Set at runtime by JavaScript, or always used with a fallback. Not bugs. */
const ALLOWED = new Set([
  "--e",        // energy field, set per frame by lib/energy.ts
  "--l",        // letter tint, set by useLetterEngine
  "--rd",       // reveal delay, set by useReveal
  "--rx",       // ripple x, set by the button and plate ink
  "--ry",       // ripple y
  "--pw-w",     // live preview viewport, set by useLivePreview
  "--pw-h",
  "--pw-scale",
  "--marquee-duration", // set inline by Marquee.tsx
  "--distort",  // set by the hero shader bridge
  "--dir",      // set by LocaleContext (1 or -1)
]);

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) out.push(...walk(path));
    else if (extname(path) === ".css") out.push(path);
  }
  return out;
}

const files = walk(ROOT);
const declared = new Set();
const used = new Map();

for (const file of files) {
  const css = readFileSync(file, "utf8");

  /* Declarations: "--name:" and "@property --name". */
  for (const m of css.matchAll(/(^|[;{\s])(--[\w-]+)\s*:/g)) declared.add(m[2]);
  for (const m of css.matchAll(/@property\s+(--[\w-]+)/g)) declared.add(m[1]);

  /* Uses: var(--name) with no fallback. var(--name, x) is safe by design. */
  for (const m of css.matchAll(/var\(\s*(--[\w-]+)\s*\)/g)) {
    if (!used.has(m[1])) used.set(m[1], new Set());
    used.get(m[1]).add(file);
  }
}

const missing = [...used.keys()]
  .filter((name) => !declared.has(name) && !ALLOWED.has(name))
  .sort();

console.log(`declared: ${declared.size}   used: ${used.size}   missing: ${missing.length}`);

if (missing.length) {
  console.error("\nUNDEFINED custom properties (used with no declaration and no fallback):\n");
  for (const name of missing) {
    console.error(`  ${name.padEnd(22)} used in ${[...used.get(name)].join(", ")}`);
  }
  console.error("\nEvery one of these silently deletes the declaration that contains it.");
  process.exit(1);
}

console.log("No undefined custom properties.");
