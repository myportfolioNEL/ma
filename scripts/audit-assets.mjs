/**
 * audit-assets — هل الأصول الثنائية لا تزال ثنائية؟
 *
 * سبب وجوده: مرّ ملفّ portrait.webp في أداة تكتب نصّاً، فاستُبدلت مئات آلاف
 * البايتات بمحرف U+FFFD. الملفّ بقي باسمه، وحجمه بدا معقولاً، ولم يشتكِ أحد
 * إلا المتصفّح، وبمفردة واحدة صامتة.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const ROOT = "src/assets";
const FFFD = Buffer.from([0xef, 0xbf, 0xbd]);
const RASTER = [".webp", ".png", ".jpg", ".jpeg", ".avif", ".gif", ".ico"];

/** عدّ مرّات محرف الاستبدال داخل الملفّ. في صورة سليمة العدد صفر. */
function countReplacements(buffer) {
  let total = 0;
  let at = buffer.indexOf(FFFD);
  while (at !== -1) {
    total += 1;
    at = buffer.indexOf(FFFD, at + 3);
  }
  return total;
}

/** الحجم الذي يُعلنه الملفّ عن نفسه، للصيغ التي تعلنه. */
function declaredSize(buffer, ext) {
  if (ext === ".webp" && buffer.subarray(0, 4).toString("latin1") === "RIFF") {
    return buffer.readUInt32LE(4) + 8;
  }
  return null;
}

const problems = [];

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      walk(path);
      continue;
    }
    const ext = extname(entry).toLowerCase();
    if (!RASTER.includes(ext)) continue;

    const buffer = readFileSync(path);

    const replacements = countReplacements(buffer);
    if (replacements > 0) {
      problems.push(`${path}: يحمل ${replacements} محرف U+FFFD — كُتب كنصّ، لا كملفّ ثنائي`);
    }

    const declared = declaredSize(buffer, ext);
    if (declared !== null && Math.abs(declared - buffer.length) > 2) {
      problems.push(`${path}: يعلن ${declared} بايت وعلى القرص ${buffer.length}`);
    }

    if (
      ext === ".webp" &&
      buffer.indexOf(Buffer.from([0x9d, 0x01, 0x2a])) === -1 &&
      buffer.indexOf(Buffer.from("VP8L", "latin1")) === -1
    ) {
      problems.push(`${path}: لا يحمل رمز بدء صورة صالحاً`);
    }
  }
}

try {
  walk(ROOT);
} catch {
  console.log(`audit-assets: لا مجلّد ${ROOT}، لا شيء لفحصه.`);
  process.exit(0);
}

if (problems.length > 0) {
  console.error("audit-assets: أصول تالفة\n" + problems.map((p) => "  " + p).join("\n"));
  process.exit(1);
}

console.log("audit-assets: كلّ الأصول سليمة.");
