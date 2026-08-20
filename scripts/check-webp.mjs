/**
 * check-webp - answer one question about one file: is this still a WebP?
 *
 * Usage: node scripts/check-webp.mjs <path>
 *
 * It repeats the three checks audit-assets.mjs makes, on a single path, so a
 * candidate file can be judged before it is copied into src/assets.
 */
import { readFileSync } from "node:fs";

const path = process.argv[2];
if (!path) {
  console.error("usage: node scripts/check-webp.mjs <path>");
  process.exit(2);
}

const buffer = readFileSync(path);
const problems = [];

if (buffer.subarray(0, 4).toString("latin1") !== "RIFF") {
  problems.push("no RIFF header");
}
if (buffer.subarray(8, 12).toString("latin1") !== "WEBP") {
  problems.push("no WEBP tag");
}

const declared = buffer.readUInt32LE(4) + 8;
if (Math.abs(declared - buffer.length) > 2) {
  problems.push("declares " + declared + " bytes, on disk " + buffer.length);
}

let replacements = 0;
let at = buffer.indexOf(Buffer.from([0xef, 0xbf, 0xbd]));
while (at !== -1) {
  replacements += 1;
  at = buffer.indexOf(Buffer.from([0xef, 0xbf, 0xbd]), at + 3);
}
if (replacements > 0) {
  problems.push(replacements + " U+FFFD sequences: written as text");
}

if (
  buffer.indexOf(Buffer.from([0x9d, 0x01, 0x2a])) === -1 &&
  buffer.indexOf(Buffer.from("VP8L", "latin1")) === -1
) {
  problems.push("no VP8 start code and no VP8L chunk");
}

if (problems.length > 0) {
  console.error(path + ": BAD\n  " + problems.join("\n  "));
  process.exit(1);
}

console.log(
  path + ": OK, " + buffer.length + " bytes, declared " + declared + " bytes",
);
