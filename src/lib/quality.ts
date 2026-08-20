/**
 * lib/quality.ts — من يدفع ثمن الزينة؟
 *
 * قراران، لا أكثر:
 *
 * 1) قرار قبليّ من إشارات الجهاز: عدد النوى، والذاكرة، والشاشة، وتوفير البيانات.
 *    هذا يقع قبل أول رسم، فلا يرى الزائر نسخة ثقيلة ثم تخفّ.
 *
 * 2) قرار بعديّ من الواقع: عينة من أزمنة الإطارات. إن كان الوسيط أبطأ من
 *    الميزانية، ننزل إلى الخفيف ولا نعود في هذه الجلسة.
 *
 * لماذا لا نعود؟ لأن الصعود والنزول المتكرّر أسوأ من البقاء في الأسفل: موقع
 * يتقلّب مطهره كل ثلاث ثوانٍ يبدو معطوباً، لا مقتصداً.
 *
 * النتيجة تُكتب في data-quality على <html>، فتقرأها الورقة والشيفرة معاً.
 */

export type Quality = "high" | "low";

const KEY = "nl.quality";

/** ميزانية الإطار: 20ms أي حوالي 50 إطاراً في الثانية. تحتها لا نستحقّ الزينة. */
const FRAME_BUDGET_MS = 20;

/** مدّة العينة. أقصر من هذا يقيس زحمة التحميل، لا التمرير. */
const SAMPLE_MS = 2600;

/** لا نحكم قبل أن تهدأ لحطة التحميل. */
const SAMPLE_DELAY_MS = 1500;

let current: Quality = "high";
let decided = false;

type Nav = Navigator & {
  deviceMemory?: number;
  connection?: { saveData?: boolean; effectiveType?: string };
};

function readStored(): Quality | null {
  try {
    const value = window.sessionStorage.getItem(KEY);
    return value === "low" || value === "high" ? value : null;
  } catch {
    return null;
  }
}

function store(value: Quality): void {
  try {
    window.sessionStorage.setItem(KEY, value);
  } catch {
    /* وضع خاصّ أو تخزين ممنوع: لا يهمّ. القرار يُتّخذ من جديد. */
  }
}

/** القرار القبليّ. رخيص، ويصيب في الأغلبية. */
function guess(): Quality {
  const nav = navigator as Nav;

  if (nav.connection?.saveData) return "low";

  const cores = nav.hardwareConcurrency ?? 8;
  if (cores <= 4) return "low";

  const memory = nav.deviceMemory;
  if (typeof memory === "number" && memory <= 4) return "low";

  const type = nav.connection?.effectiveType;
  if (type === "slow-2g" || type === "2g" || type === "3g") return "low";

  /* شاشة عالية الكثافة مع لمس: كل بكسل منطقي يصير تسعة حقيقية أحياناً. */
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  if (coarse && window.devicePixelRatio >= 3 && cores <= 6) return "low";

  return "high";
}

function apply(value: Quality): void {
  current = value;
  document.documentElement.dataset.quality = value;
  store(value);
}

/** الوسيط لا المتوسّط: إطار واحد طوله 300ms لا يجوز أن يحكم على جهاز سليم. */
function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function sample(): void {
  if (current === "low") return;

  const frames: number[] = [];
  let last = performance.now();
  const stopAt = last + SAMPLE_MS;

  const tick = (now: number) => {
    frames.push(now - last);
    last = now;
    if (now < stopAt) {
      requestAnimationFrame(tick);
      return;
    }

    /* أوّل خمسة إطارات تحمل أثر بداية القياس نفسه. تُطرح. */
    const clean = frames.slice(5);
    if (clean.length > 20 && median(clean) > FRAME_BUDGET_MS) apply("low");
  };

  requestAnimationFrame(tick);
}

/**
 * يُنادى مرّة واحدة، قبل createRoot.
 * أي نداء لاحق لا يفعل شيئاً.
 */
export function initQuality(): Quality {
  if (decided) return current;
  decided = true;

  const stored = readStored();
  apply(stored ?? guess());

  /* القرار القبليّ قد يكون متفائلاً. نتحقّق منه من الواقع بعد أن تهدأ البداية. */
  if (!stored && current === "high") {
    window.setTimeout(sample, SAMPLE_DELAY_MS);
  }

  return current;
}

/** الجودة الحالية. */
export function quality(): Quality {
  return current;
}

/** اختصار للشرط الأكثر تكرّراً في الشيفرة. */
export function isLowQuality(): boolean {
  return current === "low";
}
