/**
 * audit-binaries.mjs - one gate for the whole class of failure.
 *
 * WHY THIS EXISTS. This repository has now lost two different binaries to the
 * same accident: src/assets/portrait.webp, and all three CV PDFs. In both cases
 * the bytes were decoded as UTF-8 and re-encoded, so every byte that is not
 * valid UTF-8 became EF BF BD - three bytes where there was one. The file grows
 * by roughly half, its ASCII header and trailer survive intact, file(1) still
 * names the format correctly, and every compressed stream inside is rubble.
 *
 * audit-assets.mjs guards src/assets. audit-cv.mjs guards the CV PDFs. Nothing
 * guarded a font, an OG image, or an audio file dropped anywhere else - so the
 * third occurrence would have shipped. This walks the whole working tree and
 * applies the two tests that catch the accident regardless of where it lands:
 *
 *   1. no EF BF BD sequence anywhere in the file;
 *   2. the format's magic bytes are where the format says they are.
 *
 * It exits non-zero. A gate that always exits 0 is a log message.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const SKIP_DIRS = new Set([
  ".git", "node_modules", "dist", "dist-ssr", ".vite", "coverage", ".idea", ".vscode",
]);

/** Extension -> the signatures that must be present, and where. */
const MAGIC = {
  ".pdf": [{ at: 0, bytes: [0x25, 0x50, 0x44, 0x46, 0x2d], name: "%PDF-" }],
  ".png": [{ at: 0, bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], name: "PNG" }],
  ".jpg": [{ at: 0, bytes: [0xff, 0xd8, 0xff], name: "JPEG" }],
  ".jpeg": [{ at: 0, bytes: [0xff, 0xd8, 0xff], name: "JPEG" }],
  ".gif": [{ at: 0, bytes: [0x47, 0x49, 0x46, 0x38], name: "GIF8" }],
  ".webp": [
    { at: 0, bytes: [0x52, 0x49, 0x46, 0x46], name: "RIFF" },
    { at: 8, bytes: [0x57, 0x45, 0x42, 0x50], name: "WEBP" },
  ],
  ".avif": [{ at: 4, bytes: [0x66, 0x74, 0x79, 0x70], name: "ftyp" }],
  ".mp4": [{ at: 4, bytes: [0x66, 0x74, 0x79, 0x70], name: "ftyp" }],
  ".woff": [{ at: 0, bytes: [0x77, 0x4f, 0x46, 0x46], name: "wOFF" }],
  ".woff2": [{ at: 0, bytes: [0x77, 0x4f, 0x46, 0x32], name: "wOF2" }],
  ".ico": [{ at: 0, bytes: [0x00, 0x00, 0x01, 0x00], name: "ICO" }],
  ".mp3": [],
  ".zip": [{ at: 0, bytes: [0x50, 0x4b], name: "PK" }],
};

const MANGLED = Buffer.from([0xef, 0xbf, 0xbd]);
const problems = [];
const checked = [];

function countSequences(buffer, needle) {
  let found = 0;
  let at = buffer.indexOf(needle);
  while (at !== -1) {
    found += 1;
    at = buffer.indexOf(needle, at + needle.length);
  }
  return found;
}

function inspect(abs, ext) {
  const rel = relative(root, abs).split(sep).join("/");
  const size = statSync(abs).size;
  if (size === 0) {
    problems.push(`${rel}: ملفّ فارغ`);
    return;
  }

  const buffer = readFileSync(abs);

  const mangled = countSequences(buffer, MANGLED);
  if (mangled > 0) {
    problems.push(`${rel}: يحمل ${mangled} تسلسل EF BF BD - كُتب كنصّ لا كملفّ ثنائي`);
  }

  for (const signature of MAGIC[ext]) {
    const head = buffer.subarray(signature.at, signature.at + signature.bytes.length);
    const ok = signature.bytes.every((byte, index) => head[index] === byte);
    if (!ok) {
      problems.push(`${rel}: لا يحمل بصمة ${signature.name} عند البايت ${signature.at}`);
    }
  }

  checked.push(`  ${rel}: ${size} بايت`);
}

function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(join(dir, entry.name));
      continue;
    }
    if (!entry.isFile()) continue;
    const ext = extname(entry.name).toLowerCase();
    if (!(ext in MAGIC)) continue;
    inspect(join(dir, entry.name), ext);
  }
}

walk(root);

if (problems.length > 0) {
  console.error("audit-binaries: ملفّات ثنائية تالفة");
  for (const problem of problems) console.error(`  ${problem}`);
  console.error("  الإصلاح: node scripts/restore-cv.mjs — ولا تمرّر ملفّاً ثنائياً عبر قناة نصّية");
  process.exit(1);
}

console.log(`audit-binaries: ${checked.length} ملفّ ثنائي سليم`);
for (const note of checked) console.log(note);
