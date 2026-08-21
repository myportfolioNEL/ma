import { useEffect, useRef } from "react";
import {
  attachLiquid,
  pulseLiquid,
  sampleLiquid,
  subscribeLiquid,
  type LiquidSample,
  type LiquidTick,
} from "../lib/liquid";
import { gsap, prefersReducedMotion } from "../lib/motion";
import { isCoarsePointer, pointerState } from "../lib/pointer";
import { hashString } from "../lib/seed";
import {
  AXES,
  REST,
  SLEEP_DISTANCE,
  STEP,
  axisString,
  letterTarget,
  quantise,
  travellingWave,
  type LetterTarget,
} from "../lib/letters";

/**
 * useLetterEngine — the name, letter by letter.
 *
 * Attach the returned ref to a heading that contains nothing but text. The
 * hook splits it, owns it, animates it, and puts it back exactly as it found
 * it on unmount.
 *
 * Design decisions worth keeping:
 *
 *   · One engine, not twenty-two animations. Every letter is driven from the
 *     single shared clock in lib/liquid.ts. There is no per-letter tween, no
 *     stagger timeline, and no second rAF loop.
 *
 *   · Boxes are frozen after the webfont resolves. font-variation-settings
 *     changes glyph advance widths; freezing the measured width means a
 *     letter can be redrawn without moving its neighbours by a subpixel.
 *
 *   · Transforms every frame, axes only on a step change. Transforms are
 *     composited and cost close to nothing. Axis changes re-rasterise a glyph
 *     on the main thread, so they are quantised and, in practice, only the
 *     few letters closest to the pointer ever pay.
 *
 *   · Every write names all three axes. Naming only "wght" silently resets
 *     "wdth" and "opsz" to the font's defaults.
 *
 *   · Rest is exact. When the pointer leaves, the engine writes the literal
 *     resting values once and then does nothing at all. It does not ease
 *     toward rest forever, and it does not leave will-change behind.
 *
 *   · On a touch screen there is no pointer to follow, so a tap sends one
 *     travelling wave through the letters and the engine goes back to sleep.
 */

type Options = {
  enabled?: boolean;
  /** 0–1 follow factor. Lower is heavier. */
  ease?: number;
  /** Identity key; also seeds each letter. Give each heading its own. */
  id?: string;
  /** "auto" picks pointer on a mouse and tap on a touch screen. */
  mode?: "auto" | "pointer" | "tap";
};

type Letter = {
  element: HTMLElement;
  index: number;
  seed: number;
  /** Document-space centre. */
  cx: number;
  cy: number;
  current: LetterTarget;
  target: LetterTarget;
  setX: (value: number) => void;
  setY: (value: number) => void;
  setRotate: (value: number) => void;
  setScaleX: (value: number) => void;
  setScaleY: (value: number) => void;
  axisKey: string;
  tintKey: number;
};

const SLEEP_FRAMES = 20;
const WAVE_SECONDS = 0.95;

function cloneTarget(source: LetterTarget): LetterTarget {
  return { ...source };
}

export function useLetterEngine<T extends HTMLElement>(options: Options = {}) {
  const { enabled = true, ease = 0.16, id = "letters", mode = "auto" } = options;

  const ref = useRef<T | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const host = ref.current;
    if (!host) return;

    /* Reduced motion gets the typography and none of the machinery: no split,
       no listeners, no clock. The heading is simply a heading. */
    if (prefersReducedMotion()) return;

    /* ---- الحارس الأول: الخط العربي متّصل -----------------------------------
       تقطيع نص عربي إلى span لكل حرف يفكّ الوصل ويحوّل الكلمة إلى حروف
       منفصلة. لا توجد طريقة "أذكى" لفعل ذلك: الحل الصحيح هو ألا يُقطَّع. */
    if (/[\u0600-\u06FF\u0750-\u077F]/.test(host.textContent ?? "")) {
      host.classList.add("ln--plain");
      return;
    }

    /* ---- الحارس الثاني: التدفّق ---------------------------------------------
       الحروف تُرصّ كصناديق سطرية. داخل تدفّق RTL يُقلب ترتيبها وترتيب
       الكلمات معاً، فيصير الاسم اللاتيني مقلوباً. الاسم اسم عَلَم لاتيني:
       اتجاهه ملك له، لا للصفحة. */
    host.setAttribute("dir", "ltr");
    host.style.unicodeBidi = "isolate";

    /* ---- 1. split ---------------------------------------------------------- */
    const originalHTML = host.innerHTML;
    const text = (host.textContent ?? "").replace(/\s+/g, " ").trim();
    if (!text) return;

    host.setAttribute("aria-label", text);
    host.textContent = "";

    const letters: Letter[] = [];
    const words = text.split(" ");

    words.forEach((word, wordIndex) => {
      const wordElement = document.createElement("span");
      wordElement.className = "ln__word";
      wordElement.setAttribute("aria-hidden", "true");

      Array.from(word).forEach((character) => {
        const letterElement = document.createElement("span");
        letterElement.className = "ln__char";
        letterElement.textContent = character;
        wordElement.appendChild(letterElement);

        const index = letters.length;
        letters.push({
          element: letterElement,
          index,
          seed: hashString(`${id}:${index}:${character}`),
          cx: 0,
          cy: 0,
          current: cloneTarget(REST),
          target: cloneTarget(REST),
          setX: gsap.quickSetter(letterElement, "x", "px") as (v: number) => void,
          setY: gsap.quickSetter(letterElement, "y", "px") as (v: number) => void,
          setRotate: gsap.quickSetter(letterElement, "rotate", "deg") as (
            v: number,
          ) => void,
          setScaleX: gsap.quickSetter(letterElement, "scaleX") as (
            v: number,
          ) => void,
          setScaleY: gsap.quickSetter(letterElement, "scaleY") as (
            v: number,
          ) => void,
          axisKey: "",
          tintKey: -1,
        });
      });

      host.appendChild(wordElement);

      /* A real space between words, outside the animated spans, so the line
         still wraps and still copies as normal text. */
      if (wordIndex < words.length - 1) {
        host.appendChild(document.createTextNode(" "));
      }
    });

    /* ---- 2. freeze the boxes, then remember where they are ----------------- */
    let frozen = false;

    const freezeAndMeasure = () => {
      /* Read everything first … */
      const rects = letters.map((letter) =>
        letter.element.getBoundingClientRect(),
      );
      const scrollX = window.scrollX;
      const scrollY = window.scrollY;

      /* … then write everything. Never interleave: interleaving is what turns
         twenty-two letters into twenty-two forced synchronous layouts. */
      letters.forEach((letter, index) => {
        const rect = rects[index];
        letter.cx = rect.left + rect.width / 2 + scrollX;
        letter.cy = rect.top + rect.height / 2 + scrollY;
        if (!frozen) {
          letter.element.style.width = `${rect.width.toFixed(2)}px`;
        }
      });

      frozen = true;
    };

    const measureOnly = () => {
      const rects = letters.map((letter) =>
        letter.element.getBoundingClientRect(),
      );
      const scrollX = window.scrollX;
      const scrollY = window.scrollY;
      letters.forEach((letter, index) => {
        letter.cx = rects[index].left + rects[index].width / 2 + scrollX;
        letter.cy = rects[index].top + rects[index].height / 2 + scrollY;
      });
    };

    /* Re-freezing is not "call freezeAndMeasure again".

       getBoundingClientRect returns the frozen width once one is set, and it
       includes transforms. So put the line back to a still, unstyled state
       first: clear the widths, park every letter at rest, then measure. */
    const refreeze = () => {
      letters.forEach((letter) => {
        letter.current = cloneTarget(REST);
        letter.setX(0);
        letter.setY(0);
        letter.setRotate(0);
        letter.setScaleX(1);
        letter.setScaleY(1);
        letter.element.style.width = "";
      });
      frozen = false;
      freezeAndMeasure();
    };

    /* The webfont decides the advance width of every glyph, so the widths must
       be frozen from the webfont — not from the fallback.

       document.fonts.ready is not enough on its own: it resolves immediately
       when no font load has been *started* yet, and on a cold load that is the
       normal state, because the families arrive in a separate third-party
       stylesheet that has not been parsed when this effect runs. Freezing
       there records fallback metrics, and every glyph of the real family is
       then wider than the box reserved for it — which is exactly how the name
       ends up printed on top of itself.

       So: name the family, wait for it, wait for the set, then freeze. */
    let cancelled = false;

    const waitForFont = async (): Promise<void> => {
      if (typeof document === "undefined" || !("fonts" in document)) return;
      const family = getComputedStyle(host).fontFamily;
      try {
        await document.fonts.load(`1em ${family}`);
      } catch {
        /* An exotic family string. The set below is still worth waiting for. */
      }
      try {
        await document.fonts.ready;
      } catch {
        /* Nothing to do: measure with whatever is applied. */
      }
    };

    void waitForFont().then(() => {
      if (cancelled) return;
      refreeze();
      /* One more pass on the next frame. The first can land in the same frame
         the face is applied, before layout has used the new metrics. */
      requestAnimationFrame(() => {
        if (!cancelled) refreeze();
      });
    });

    /* Any face that arrives later — a second weight, a slow retry — changes
       the metrics again. Re-freezing is idempotent and costs one layout read. */
    const onFontLoaded = () => {
      if (!cancelled) refreeze();
    };
    if (typeof document !== "undefined" && "fonts" in document) {
      document.fonts.addEventListener("loadingdone", onFontLoaded);
    }

    /* A resize can rewrap the heading, which moves every letter. Widths stay
       frozen — they belong to the glyphs, not the layout — but centres are
       re-read, debounced. */
    let resizeTimer = 0;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        if (frozen) measureOnly();
      }, 150);
    };
    window.addEventListener("resize", onResize, { passive: true });

    /* ---- 3. visibility gate ------------------------------------------------ */
    let visible = true;
    const observer = new IntersectionObserver(
      (entries) => {
        visible = entries[0]?.isIntersecting ?? true;
        if (visible && frozen) measureOnly();
      },
      { rootMargin: "10% 0px" },
    );
    observer.observe(host);

    /* ---- 4. state ---------------------------------------------------------- */
    const useTap = mode === "tap" || (mode === "auto" && isCoarsePointer());

    const sample: LiquidSample = { dx: 0, dy: 0, energy: 0 };
    let restFrames = 0;
    let asleep = false;
    let layered = false;

    /* Tap wave state, phone only. */
    let waveTime = -1;
    let waveOrigin = 0;

    const release = attachLiquid();

    const wake = () => {
      if (!layered) {
        letters.forEach((letter) => {
          letter.element.style.willChange = "transform";
        });
        layered = true;
      }
      asleep = false;
      restFrames = 0;
    };

    const sleep = () => {
      letters.forEach((letter) => {
        letter.current = cloneTarget(REST);
        letter.setX(0);
        letter.setY(0);
        letter.setRotate(0);
        letter.setScaleX(1);
        letter.setScaleY(1);

        const restAxes = axisString(AXES.wght.rest, AXES.wdth.rest, AXES.opsz.rest);
        if (letter.axisKey !== restAxes) {
          letter.element.style.fontVariationSettings = restAxes;
          letter.axisKey = restAxes;
        }
        if (letter.tintKey !== 0) {
          letter.element.style.setProperty("--l", "0");
          letter.tintKey = 0;
        }
        letter.element.style.willChange = "";
      });
      layered = false;
      asleep = true;
    };

    /* ---- 5. the tap path --------------------------------------------------- */
    const onPointerDown = (event: PointerEvent) => {
      if (!useTap || !frozen) return;

      /* Disturb the background at the point of contact, so the field and the
         letters are answering the same touch. */
      pulseLiquid(event.clientX, event.clientY, 1.15);

      const x = event.clientX + window.scrollX;
      const y = event.clientY + window.scrollY;

      let nearest = 0;
      let nearestDistance = Infinity;
      letters.forEach((letter) => {
        const distance = Math.hypot(letter.cx - x, letter.cy - y);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearest = letter.index;
        }
      });

      waveOrigin = nearest;
      waveTime = 0;
      wake();
    };

    if (useTap) {
      host.addEventListener("pointerdown", onPointerDown, { passive: true });
    }

    /* ---- 6. the frame ------------------------------------------------------ */
    const unsubscribe = subscribeLiquid((tick: LiquidTick) => {
      if (!frozen || !visible) return;

      const pointer = pointerState;

      /* On a mouse, being far away is the normal state and it must be cheap:
         one distance check against the first and last letter, then out. */
      if (!useTap) {
        const anchor = letters[0];
        const last = letters[letters.length - 1];
        const anchorY = anchor.cy - tick.scrollY;
        const nearEnough =
          pointer.present &&
          Math.abs(pointer.y - anchorY) < SLEEP_DISTANCE &&
          pointer.x > Math.min(anchor.cx, last.cx) - tick.scrollX - SLEEP_DISTANCE &&
          pointer.x < Math.max(anchor.cx, last.cx) - tick.scrollX + SLEEP_DISTANCE;

        if (!nearEnough && asleep) return;
        if (nearEnough && asleep) wake();
      } else if (waveTime < 0 && asleep) {
        return;
      }

      let waveFront = -1;
      if (waveTime >= 0) {
        waveTime += tick.dt;
        waveFront = (waveTime / WAVE_SECONDS) * letters.length * 0.9;
        if (waveTime > WAVE_SECONDS) waveTime = -1;
      }

      const factor = 1 - Math.pow(1 - ease, tick.dt * 60);
      let motion = 0;

      for (let index = 0; index < letters.length; index += 1) {
        const letter = letters[index];

        const viewX = letter.cx - tick.scrollX;
        const viewY = letter.cy - tick.scrollY;

        sampleLiquid(viewX, viewY, sample);

        const wave =
          waveFront >= 0
            ? travellingWave(index - waveOrigin, waveFront) *
              Math.max(0, 1 - waveTime / WAVE_SECONDS)
            : 0;

        letterTarget(
          {
            dx: useTap ? 9999 : pointer.x - viewX,
            dy: useTap ? 9999 : pointer.y - viewY,
            fieldX: sample.dx,
            fieldY: sample.dy,
            energy: sample.energy,
            seed: letter.seed,
            wave,
          },
          letter.target,
        );

        const current = letter.current;
        const target = letter.target;

        current.x += (target.x - current.x) * factor;
        current.y += (target.y - current.y) * factor;
        current.rotate += (target.rotate - current.rotate) * factor;
        current.scaleX += (target.scaleX - current.scaleX) * factor;
        current.scaleY += (target.scaleY - current.scaleY) * factor;
        current.wght += (target.wght - current.wght) * factor;
        current.wdth += (target.wdth - current.wdth) * factor;
        current.opsz += (target.opsz - current.opsz) * factor;
        current.tint += (target.tint - current.tint) * factor;

        motion +=
          Math.abs(current.x) +
          Math.abs(current.y) +
          Math.abs(current.rotate) +
          Math.abs(current.tint);

        /* Transforms: cheap, every frame. */
        letter.setX(current.x);
        letter.setY(current.y);
        letter.setRotate(current.rotate);
        letter.setScaleX(current.scaleX);
        letter.setScaleY(current.scaleY);

        /* Axes: expensive, only on a step change, always all three. */
        const axes = axisString(
          quantise(current.wght, STEP.wght),
          quantise(current.wdth, STEP.wdth),
          quantise(current.opsz, STEP.opsz),
        );
        if (axes !== letter.axisKey) {
          letter.element.style.fontVariationSettings = axes;
          letter.axisKey = axes;
        }

        /* Colour: a custom property, also stepped. The stylesheet decides what
           the number means; the engine only reports how hot the letter is. */
        const tint = quantise(Math.min(current.tint, 1), STEP.tint);
        if (tint !== letter.tintKey) {
          letter.element.style.setProperty("--l", tint.toFixed(2));
          letter.tintKey = tint;
        }
      }

      if (motion < 0.12 && waveTime < 0) {
        restFrames += 1;
        if (restFrames > SLEEP_FRAMES && !asleep) sleep();
      } else {
        restFrames = 0;
      }
    });

    /* ---- 7. put it back exactly as it was ---------------------------------- */
    return () => {
      cancelled = true;
      if (typeof document !== "undefined" && "fonts" in document) {
        document.fonts.removeEventListener("loadingdone", onFontLoaded);
      }
      unsubscribe();
      observer.disconnect();
      release();
      window.removeEventListener("resize", onResize);
      window.clearTimeout(resizeTimer);
      if (useTap) host.removeEventListener("pointerdown", onPointerDown);
      host.removeAttribute("aria-label");
      host.innerHTML = originalHTML;
    };
  }, [ease, enabled, id, mode]);

  return ref;
}
