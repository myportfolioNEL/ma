import { readFileSync } from "node:fs";

/* الأصناف التي تمثّل أسطحاً كبيرة: إن أخذت مقاساً من مكانين فهذا تصادم. */
const WATCH = ["win__btn", "win__copy", "win__pane", "win__chrome", "card__btn", "card__copy"];
const BOXY = /(^|;|\{)\s*(padding|padding-inline|inline-size|block-size|min-height|width|height)\s*:/;

let bad = 0;
for (const file of ["src/styles/desktop.css", "src/styles/mobile.css"]) {
  const css = readFileSync(file, "utf8");
  const lines = css.split("\n");
  for (const name of WATCH) {
    const hits = [];
    const re = new RegExp(`(^|,|\\s)\\.${name}\\s*(,|\\{|:)`);
    lines.forEach((line, i) => {
      if (!re.test(line)) return;
      const block = lines.slice(i, i + 24).join("\n").split("}")[0];
      if (BOXY.test(block)) hits.push(i + 1);
    });
    if (hits.length > 1) {
      bad++;
      console.log(`تصادم محتمل: .${name} يأخذ مقاساً في ${file} عند الأسطر ${hits.join(", ")}`);
    }
  }
}
console.log(bad === 0 ? "الأسماء نظيفة" : `راجِع ${bad} حالة أعلاه`);
