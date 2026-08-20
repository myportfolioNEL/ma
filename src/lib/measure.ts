import { ScrollTrigger } from "./motion";
import { measureEnergyTargets } from "./energy";

/**
 * lib/measure.ts — إعادة القياس تحدث مرّة واحدة، مهما طلبها من طلب.
 *
 * إعادة القياس تقرأ موضع وحجم كل مُطلِق في الصفحة. أربع جهات تطلبها خلال
 * نصف ثانية تعني أربع قراءات كاملة للتخطيط في أسوأ لحظة ممكنة: لحظة وصول
 * الخطوط والصور. هذا الملف يجمعها في واحدة، ويُؤجّلها إلى لحظة خمول.
 */

let timer = 0;
let pending = false;

function run(): void {
  pending = false;
  measureEnergyTargets();
  ScrollTrigger.refresh();
}

/**
 * يطلب إعادة قياس. الطلبات المتتالية تُدمَج في واحدة.
 * @param delay مليليثانية الانتظار قبل التنفيذ.
 */
export function requestMeasure(delay = 200): void {
  window.clearTimeout(timer);
  pending = true;
  timer = window.setTimeout(() => {
    /* إن كان المتصفّح مشغولاً، ننتظر فجوة خمول بدل أن نزاحمه على الإطار. */
    if ("requestIdleCallback" in window) {
      (window as Window & {
        requestIdleCallback: (cb: () => void, o?: { timeout: number }) => number;
      }).requestIdleCallback(run, { timeout: 400 });
      return;
    }
    run();
  }, delay);
}

/** للحالات التي لا تحتمل تأخيراً: إغلاق لوحة تغيّر طول الصفحة. */
export function measureNow(): void {
  window.clearTimeout(timer);
  run();
}

/** هل هناك قياس مؤجّل؟ للاختبار وحده. */
export function measurePending(): boolean {
  return pending;
}
