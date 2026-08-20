/**
 * restore-cv.mjs - rebuild public/cv/*.pdf from the base64 copies in
 * scripts/cv-b64/.
 *
 * WHY THIS EXISTS. Twice now, a binary file has arrived in this repository
 * mangled: src/assets/portrait.webp, and then all three CV PDFs. The signature
 * is identical in both cases - every byte the channel could not decode as UTF-8
 * was replaced by EF BF BD, so the file grew by about half and its compressed
 * contents became noise. The cause is not this repository; it is that a binary
 * was moved through something that only carries text.
 *
 * Base64 is text. It cannot be mangled by a text channel, it survives copy and
 * paste, and it can be verified byte for byte. So the three PDFs also live here
 * as ASCII, and this script turns them back into files. If public/cv/ is ever
 * broken again, one command repairs it, and scripts/audit-cv.mjs proves the
 * repair.
 *
 * USAGE
 *   node scripts/restore-cv.mjs                   rebuild and verify
 *   node scripts/restore-cv.mjs --write-manifest  rebuild and refresh the
 *                                                 checksums, after replacing a
 *                                                 CV with a new version
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const b64Dir = join(root, "scripts", "cv-b64");
const cvDir = join(root, "public", "cv");
const manifestFile = join(root, "scripts", "cv-manifest.json");
const dataFile = join(root, "src", "data", "cv.ts");

const writeManifest = process.argv.includes("--write-manifest");
const problems = [];
const rebuilt = {};

if (!existsSync(b64Dir)) {
  console.error("restore-cv: scripts/cv-b64 غير موجود");
  process.exit(1);
}

mkdirSync(cvDir, { recursive: true });

const entries = readdirSync(b64Dir)
  .filter((name) => /^cv-[a-z]{2}\.pdf\.b64$/.test(name))
  .sort();

if (entries.length === 0) {
  console.error("restore-cv: لا ملفّات base64 في scripts/cv-b64");
  process.exit(1);
}

for (const entry of entries) {
  const locale = entry.slice(3, 5);
  const text = readFileSync(join(b64Dir, entry), "utf8");

  /* Whitespace is how base64 survives line wrapping and editors. */
  const clean = text.replace(/\s+/g, "");
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(clean)) {
    problems.push(`scripts/cv-b64/${entry}: ليس base64 سليماً`);
    continue;
  }

  const buffer = Buffer.from(clean, "base64");

  if (buffer.subarray(0, 5).toString("latin1") !== "%PDF-") {
    problems.push(`scripts/cv-b64/${entry}: الناتج لا يبدأ بـ %PDF-`);
    continue;
  }
  if (buffer.includes(Buffer.from([0xef, 0xbf, 0xbd]))) {
    problems.push(
      `scripts/cv-b64/${entry}: النصّ نفسه محرّف - أعد جلب ملفّ base64`,
    );
    continue;
  }

  const target = join(cvDir, `cv-${locale}.pdf`);
  writeFileSync(target, buffer);

  const sha = createHash("sha256").update(buffer).digest("hex");
  rebuilt[locale] = { bytes: buffer.length, sha256: sha };
  console.log(`restore-cv: public/cv/cv-${locale}.pdf  ${buffer.length} بايت`);
}

if (problems.length > 0) {
  console.error("restore-cv: فشل");
  for (const problem of problems) console.error(`  ${problem}`);
  process.exit(1);
}

const ordered = {};
for (const locale of Object.keys(rebuilt).sort()) {
  ordered[locale] = rebuilt[locale];
}

if (writeManifest) {
  const version =
    (readFileSync(dataFile, "utf8").match(/const VERSION = "([^"]+)"/) ?? [])[1] ??
    "unknown";
  writeFileSync(
    manifestFile,
    `${JSON.stringify(
      {
        version,
        note: "Regenerate with: node scripts/restore-cv.mjs --write-manifest",
        files: ordered,
      },
      null,
      2,
    )}\n`,
  );
  console.log("restore-cv: scripts/cv-manifest.json حُدّث");
  console.log("  راجع BYTES في src/data/cv.ts إن تغيّرت الأحجام");
} else if (existsSync(manifestFile)) {
  const manifest = JSON.parse(readFileSync(manifestFile, "utf8"));
  for (const [locale, made] of Object.entries(ordered)) {
    const want = manifest.files?.[locale];
    if (!want) {
      problems.push(`scripts/cv-manifest.json: لا يذكر "${locale}"`);
      continue;
    }
    if (want.sha256 !== made.sha256) {
      problems.push(
        `public/cv/cv-${locale}.pdf: بصمة الناتج لا تطابق البيان`,
      );
    }
  }
  if (problems.length > 0) {
    console.error("restore-cv: الناتج لا يطابق البيان");
    for (const problem of problems) console.error(`  ${problem}`);
    process.exit(1);
  }
  console.log("restore-cv: البصمات تطابق scripts/cv-manifest.json");
}

console.log("restore-cv: تمّ - شغّل node scripts/audit-cv.mjs للتأكيد");
