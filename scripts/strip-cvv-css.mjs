import { readFileSync, writeFileSync } from "node:fs";

/**
 * strip-cvv-css.mjs - deletes every reader-window rule from the two build
 * stylesheets, so that src/styles/reader.css is the only place .cvv* exists.
 *
 * WHY A SCRIPT AND NOT A PATCH. Twice now the reader's CSS has been rewritten
 * as "replace lines 4757 to the end of desktop.css", and twice the replacement
 * did not land: the markup shipped as v4 while the stylesheet stayed v3, so
 * .cvv__ctl had no rule at all and .cvv__fit had a rule and no element. A line
 * range is a guess about a file's state. This script is not: it parses the
 * file, drops the blocks whose selectors mention cvv, and says how many it
 * dropped. Run it twice and the second run reports 0. That is the proof.
 *
 * It is deliberately dumb about everything else: .cvp (the printed sheet) and
 * .cv__ (the download plate) are NOT touched.
 */

const FILES = ["src/styles/desktop.css", "src/styles/mobile.css"];

/** Selector lists that belong to the reading window. */
const READER = /\bcvv\b|cvv__|\.cvv/;
/** Section headers that only introduced those rules. */
const READER_COMMENT = /CV READER|cvv__/i;
/** Conditional groups whose contents are ordinary rules and can be recursed. */
const GROUP = /^@(media|supports|container|layer|scope)\b/i;

/** Split CSS into comments, whitespace, statements and blocks. One level. */
function segments(css) {
  const out = [];
  let i = 0;

  while (i < css.length) {
    if (css.startsWith("/*", i)) {
      const end = css.indexOf("*/", i + 2);
      const stop = end === -1 ? css.length : end + 2;
      out.push({ kind: "comment", text: css.slice(i, stop) });
      i = stop;
      continue;
    }

    const ws = /^\s+/.exec(css.slice(i));
    if (ws) {
      out.push({ kind: "space", text: ws[0] });
      i += ws[0].length;
      continue;
    }

    /* Read a prelude up to the first { or ; that is not inside a string. */
    let j = i;
    let quote = "";
    while (j < css.length) {
      const ch = css[j];
      if (quote) {
        if (ch === "\\") j += 1;
        else if (ch === quote) quote = "";
      } else if (ch === '"' || ch === "'") {
        quote = ch;
      } else if (ch === "{" || ch === ";") {
        break;
      }
      j += 1;
    }

    if (css[j] === ";" || j >= css.length) {
      out.push({ kind: "statement", text: css.slice(i, j + 1) });
      i = j + 1;
      continue;
    }

    /* Walk to the matching close brace. */
    const prelude = css.slice(i, j).trim();
    let depth = 0;
    let k = j;
    quote = "";
    for (; k < css.length; k += 1) {
      const ch = css[k];
      if (quote) {
        if (ch === "\\") k += 1;
        else if (ch === quote) quote = "";
        continue;
      }
      if (ch === '"' || ch === "'") quote = ch;
      else if (css.startsWith("/*", k)) {
        const end = css.indexOf("*/", k + 2);
        k = end === -1 ? css.length : end + 1;
      } else if (ch === "{") depth += 1;
      else if (ch === "}") {
        depth -= 1;
        if (depth === 0) break;
      }
    }

    out.push({
      kind: "block",
      prelude,
      body: css.slice(j + 1, k),
      text: css.slice(i, k + 1),
    });
    i = k + 1;
  }

  return out;
}

function strip(css) {
  const segs = segments(css);
  const kept = [];
  let removed = 0;
  let heldComment = null;
  let heldSpace = "";

  const flush = () => {
    if (heldComment) kept.push(heldComment);
    if (heldSpace) kept.push(heldSpace);
    heldComment = null;
    heldSpace = "";
  };

  for (const seg of segs) {
    if (seg.kind === "comment") {
      flush();
      heldComment = seg.text;
      continue;
    }

    if (seg.kind === "space") {
      if (heldComment) heldSpace += seg.text;
      else kept.push(seg.text);
      continue;
    }

    if (seg.kind === "statement") {
      flush();
      kept.push(seg.text);
      continue;
    }

    /* @keyframes cvv-fade, @keyframes cvv-rise: judged by name. */
    if (/^@keyframes\b/i.test(seg.prelude)) {
      if (READER.test(seg.prelude)) {
        removed += 1;
        if (heldComment && READER_COMMENT.test(heldComment)) heldComment = null;
        heldSpace = "";
        continue;
      }
      flush();
      kept.push(seg.text);
      continue;
    }

    /* @media / @supports: strip the inside, drop the wrapper if it empties. */
    if (GROUP.test(seg.prelude)) {
      const inner = strip(seg.body);
      removed += inner.removed;
      const hasRules = segments(inner.css).some((s) => s.kind === "block");
      if (!hasRules) {
        if (heldComment && READER_COMMENT.test(heldComment)) heldComment = null;
        heldSpace = "";
        continue;
      }
      flush();
      kept.push(`${seg.prelude} {${inner.css}}`);
      continue;
    }

    /* An ordinary rule. */
    if (READER.test(seg.prelude)) {
      removed += 1;
      if (heldComment && READER_COMMENT.test(heldComment)) heldComment = null;
      heldSpace = "";
      continue;
    }

    flush();
    kept.push(seg.text);
  }

  flush();
  return { css: kept.join(""), removed };
}

let total = 0;
for (const file of FILES) {
  const before = readFileSync(file, "utf8");
  const { css, removed } = strip(before);
  const tidy = `${css.replace(/\n{3,}/g, "\n\n").trimEnd()}\n`;
  if (tidy !== before) writeFileSync(file, tidy, "utf8");
  total += removed;
  console.log(
    `strip-cvv-css: ${file} - ${removed} reader rule(s) removed, ` +
      `${before.split("\n").length} -> ${tidy.split("\n").length} lines`,
  );

  const left = tidy
    .split("\n")
    .map((line, index) => [index + 1, line])
    .filter(([, line]) => /^\s*[^@\s][^{]*\.cvv/.test(line));
  if (left.length) {
    console.error(`\n${file} still styles the reader:`);
    for (const [n, line] of left) console.error(`  ${n}: ${line.trim()}`);
    process.exit(1);
  }
}

console.log(
  total === 0
    ? "strip-cvv-css: nothing to remove - reader.css already owns the window"
    : `strip-cvv-css: ${total} rule(s) removed; src/styles/reader.css owns the window`,
);
