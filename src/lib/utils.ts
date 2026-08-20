/**
 * utils.ts — tiny pure helpers. No DOM state, no side effects except copy().
 */

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

export const lerp = (from: number, to: number, amount: number): number =>
  from + (to - from) * amount;

/** Joins class names, dropping anything falsy. */
export const cx = (...parts: Array<string | false | null | undefined>): string =>
  parts.filter(Boolean).join(" ");

/** 101416 -> "101,416". Locale-aware, tabular-safe. */
export const formatNumber = (value: number, locale = "en-US"): string =>
  new Intl.NumberFormat(locale).format(Math.round(value));

/** Copies text and resolves true on success. Never throws. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}

/** "14:32" in a given IANA time zone. Used for the Casablanca clock. */
export function timeIn(timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone,
    }).format(new Date());
  } catch {
    return "";
  }
}
