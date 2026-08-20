/**
 * audit-cv.mjs - a download that cannot be opened is worse than no download.
 *
 * WHY THIS FILE WAS REWRITTEN. Its first version checked that each PDF existed,
 * began with %PDF-, and was not absurdly small. All three checks passed on
 * three files that no reader on earth could open: they had been committed
 * through a text channel, so every byte outside ASCII had become the three
 * bytes EF BF BD. The header survived, the trailer survived, file(1) still said
 * "PDF document", and every compressed stream inside was destroyed. A gate that
 * only reads the first five bytes of a container format is not a gate.
 *
 * WHAT IS CHECKED NOW, per language:
 *   1. the file exists where src/data/cv.ts says it does;
 *   2. it begins with %PDF- and ends with %%EOF;
 *   3. it contains no EF BF BD sequence - the signature of a binary written as
 *      text, which is how the last three copies died;
 *   4. every FlateDecode stream in it actually inflates. This is the real test:
 *      it reads the file the way a PDF viewer does, and no amount of surviving
 *      ASCII structure can fake it;
 *   5. its size on disk equals the number BYTES declares in src/data/cv.ts, so
 *      the size the browser uses to tell a healthy mirror from a broken one can
 *      never silently drift;
 *   6. its SHA-256 matches scripts/cv-manifest.json, when that file is present.
 *
 * And once, for the data layer: the local URL shape, the mirror base, and
 * CV_ORDER naming exactly the languages that exist.
 *
 * Unlike audit-selectors.mjs, this one exits non-zero when it finds something.
 * A gate that always exits 0 is a log message.
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { constants, inflateSync } from "node:zlib";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cvDir = join(root, "public", "cv");
const dataFile = join(root, "src", "data", "cv.ts");
const manifestFile = join(root, "scripts", "cv-manifest.json");

const MIRROR_BASE = "https://noureddinelmobaraki-web.github.io/nl-audio-cdn/";
const MANGLED = Buffer.from([0xef, 0xbf, 0xbd]);
const MIN_BYTES = 12 * 1024;
const MAX_BYTES = 900 * 1024;

const problems = [];
const notes = [];

function countSequences(buffer, needle) {
  let found = 0;
  let at = buffer.indexOf(needle);
  while (at !== -1) {
    found += 1;
    at = buffer.indexOf(needle, at + needle.length);
  }
  return found;
}

/**
 * Walk every stream in the file, and inflate the ones the dictionary says are
 * deflated. Z_SYNC_FLUSH is used on purpose: a valid stream then inflates even
 * though the slice may carry a trailing newline, while a corrupted one still
 * throws on its own checksum.
 */
function flateReport(buffer) {
  let cursor = 0;
  let total = 0;
  let broken = 0;
  let firstBrokenAt = -1;

  for (;;) {
    const at = buffer.indexOf("stream", cursor);
    if (at === -1) break;
    cursor = at + 6;

    /* "endstream" contains "stream". */
    if (at >= 3 && buffer.subarray(at - 3, at).toString("latin1") === "end") {
      continue;
    }

    const dictionary = buffer
      .subarray(Math.max(0, at - 700), at)
      .toString("latin1");
    if (!dictionary.includes("FlateDecode")) continue;

    let start = at + 6;
    if (buffer[start] === 0x0d) start += 1;
    if (buffer[start] === 0x0a) start += 1;

    const end = buffer.indexOf("endstream", start);
    if (end === -1) {
      broken += 1;
      if (firstBrokenAt < 0) firstBrokenAt = start;
      break;
    }

    let stop = end;
    while (
      stop > start &&
      (buffer[stop - 1] === 0x0a || buffer[stop - 1] === 0x0d)
    ) {
      stop -= 1;
    }

    total += 1;
    try {
      inflateSync(buffer.subarray(start, stop), {
        finishFlush: constants.Z_SYNC_FLUSH,
      });
    } catch {
      broken += 1;
      if (firstBrokenAt < 0) firstBrokenAt = start;
    }
  }

  return { total, broken, firstBrokenAt };
}

let source = "";
try {
  source = readFileSync(dataFile, "utf8");
} catch {
  problems.push("src/data/cv.ts: مفقود");
}

/* The record keys are the truth: fileFor("en") in cv.ts is what the interface
   will ask the server for. Reading them instead of hard-coding a list here
   means this gate still works the day a fourth language is added. */
const locales = [...source.matchAll(/fileFor\("([a-z]{2})"\)/g)].map(
  (match) => match[1],
);

if (locales.length === 0) {
  problems.push('src/data/cv.ts: لا يحتوي أي مدخل fileFor("xx")');
}

if (source && !source.includes("./cv/cv-${locale}.pdf?v=")) {
  problems.push("src/data/cv.ts: شكل الرابط المحلّي تغيّر - راجع scripts/audit-cv.mjs");
}

if (source && !source.includes(MIRROR_BASE)) {
  problems.push(`src/data/cv.ts: لا يذكر المرآة ${MIRROR_BASE}`);
}

/* BYTES is what the browser uses to tell a healthy copy from a mangled one, so
   it is checked against the disk rather than trusted. */
const declared = {};
const bytesBlock = source.match(/const BYTES[^{]*\{([^}]*)\}/);
if (bytesBlock) {
  for (const match of bytesBlock[1].matchAll(/([a-z]{2})\s*:\s*(\d+)/g)) {
    declared[match[1]] = Number(match[2]);
  }
} else if (source) {
  problems.push(
    "src/data/cv.ts: لا يعرّف BYTES - المتصفّح يفقد وسيلته لكشف النسخة التالفة",
  );
}

/* The three cells of the interface come from CV_ORDER. A language that exists
   and is not listed is a file nobody can reach. */
const orderBlock = source.match(/CV_ORDER[^=]*=\s*\[([^\]]*)\]/);
if (orderBlock) {
  const order = [...orderBlock[1].matchAll(/"([a-z]{2})"/g)].map((m) => m[1]);
  for (const locale of locales) {
    if (!order.includes(locale)) {
      problems.push(`src/data/cv.ts: CV_ORDER لا يذكر "${locale}"`);
    }
  }
  for (const locale of order) {
    if (!locales.includes(locale)) {
      problems.push(`src/data/cv.ts: CV_ORDER يذكر "${locale}" ولا ملفّ له`);
    }
  }
} else if (source) {
  problems.push("src/data/cv.ts: لا يصدّر CV_ORDER");
}

let manifest = null;
if (existsSync(manifestFile)) {
  try {
    manifest = JSON.parse(readFileSync(manifestFile, "utf8"));
  } catch {
    problems.push("scripts/cv-manifest.json: JSON غير سليم");
  }
}

for (const locale of locales) {
  const rel = `public/cv/cv-${locale}.pdf`;
  const abs = join(cvDir, `cv-${locale}.pdf`);

  let size = 0;
  try {
    size = statSync(abs).size;
  } catch {
    problems.push(`${rel}: مفقود`);
    continue;
  }

  const buffer = readFileSync(abs);

  if (buffer.subarray(0, 5).toString("latin1") !== "%PDF-") {
    problems.push(`${rel}: لا يبدأ بـ %PDF- - ليس ملف PDF سليماً`);
  }
  if (!buffer.subarray(-2048).includes("%%EOF")) {
    problems.push(`${rel}: لا ينتهي بـ %%EOF - الملفّ مقتطع`);
  }
  if (size < MIN_BYTES) {
    problems.push(`${rel}: ${size} بايت فقط - أصغر من أن يكون سيرة`);
  }
  if (size > MAX_BYTES) {
    problems.push(`${rel}: ${size} بايت - أكبر من اللازم لصفحة نصّية`);
  }

  const mangled = countSequences(buffer, MANGLED);
  if (mangled > 0) {
    problems.push(
      `${rel}: يحمل ${mangled} تسلسل EF BF BD - كُتب كنصّ لا كملفّ ثنائي`,
    );
  }

  const flate = flateReport(buffer);
  if (flate.total === 0) {
    problems.push(`${rel}: لا يحتوي أي تدفّق FlateDecode - ليس PDF من متصفّح`);
  } else if (flate.broken > 0) {
    problems.push(
      `${rel}: ${flate.broken} من ${flate.total} تدفّق مضغوط لا ينفكّ` +
        ` - أول تلف عند البايت ${flate.firstBrokenAt}`,
    );
  }

  if (declared[locale] === undefined) {
    problems.push(`${rel}: BYTES في cv.ts لا يذكر "${locale}"`);
  } else if (declared[locale] !== size) {
    problems.push(
      `${rel}: cv.ts يعلن ${declared[locale]} بايت والقرص يحمل ${size}`,
    );
  }

  if (manifest && manifest.files && manifest.files[locale]) {
    const want = manifest.files[locale];
    const sha = createHash("sha256").update(buffer).digest("hex");
    if (want.bytes !== size) {
      problems.push(`${rel}: البيان يعلن ${want.bytes} بايت والقرص ${size}`);
    }
    if (want.sha256 !== sha) {
      problems.push(`${rel}: بصمة SHA-256 لا تطابق scripts/cv-manifest.json`);
    }
  }

  notes.push(`  ${rel}: ${size} بايت, ${flate.total} تدفّق مضغوط سليم`);
}

/* The other direction: a file nobody links to is a file nobody updates. */
try {
  for (const entry of readdirSync(cvDir)) {
    if (!entry.endsWith(".pdf")) continue;
    const locale = entry.replace(/^cv-/, "").replace(/\.pdf$/, "");
    if (!locales.includes(locale)) {
      problems.push(`public/cv/${entry}: ملفّ لا تربطه cv.ts بأي لغة`);
    }
  }
} catch {
  problems.push("public/cv: المجلّد غير موجود");
}

if (problems.length > 0) {
  console.error("audit-cv: سيرة ذاتية غير صالحة");
  for (const problem of problems) console.error(`  ${problem}`);
  console.error("  الإصلاح: node scripts/restore-cv.mjs");
  process.exit(1);
}

console.log(
  `audit-cv: ${locales.length} ملفات PDF سليمة - ${locales.join(", ")}`,
);
for (const note of notes) console.log(note);
