#!/bin/bash
sed -i '4713,$d' src/styles/desktop.css
cat << 'CSS_EOF' >> src/styles/desktop.css
/* ==========================================================================
   CV READER - THE WINDOW

   WHAT THIS IS NOT ANY MORE. v3 tried to fit the whole page into the window.
   The page is about 704 x 2875 CSS px - four A4 pages of body text - so the
   honest fit was 0.24 and 14px type came out at 3.4px. There is no window on a
   laptop in which this document is both complete and legible; the arithmetic is
   in reader.ts. So the page is drawn at printed size, the window scrolls, and
   the magnifier does the close reading. That is what a document reader is.

   THE WINDOW IS THE PAGE. The panel is painted in --cv-sheet, the same paper
   the document is on, so there is no frame, no toolbar and no furniture around
   the text - only the sheet, and two icons floating over its corner.
   ========================================================================== */
.cvv {
  position: fixed;
  inset: 0;
  z-index: var(--z-overlay);
  display: grid;
  place-items: center;
  animation: cvv-fade 180ms var(--e-out) both;
}

.cvv__scrim {
  position: absolute;
  inset: 0;
  background: var(--scrim);
  backdrop-filter: blur(var(--scrim-blur));
  cursor: zoom-out;
}

.cvv__panel {
  position: relative;
  inline-size: min(56rem, 100vw - var(--s-6));
  block-size: min(94svh, 66rem);
  overflow: hidden;
  background: var(--cv-sheet);
  color: var(--text);
  border: 1px solid rgba(var(--gold-rgb), 0.28);
  border-radius: var(--win-r);
  box-shadow:
    0 1px 0 rgba(255, 253, 248, 0.7) inset,
    0 48px 120px -48px rgba(23, 20, 15, 0.72),
    0 8px 28px -16px rgba(23, 20, 15, 0.45);
  animation: cvv-rise 260ms var(--e-out) both;
}

/* The only scrolling surface in the window. The page inside it is at printed
   size, so this scrolls the way a document scrolls: naturally, one page long. */
.cvv__stage {
  position: relative;
  block-size: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;
  padding: var(--s-5);
  scrollbar-width: thin;
  scrollbar-color: rgba(23, 20, 15, 0.2) transparent;
}

.cvv__stage::-webkit-scrollbar {
  inline-size: 8px;
}

.cvv__stage::-webkit-scrollbar-thumb {
  background: rgba(23, 20, 15, 0.18);
  border-radius: var(--radius-pill);
}

.cvv__stage::-webkit-scrollbar-track {
  background: transparent;
}

/* While the glass is on, the glass IS the cursor. */
.cvv__stage[data-lens="true"] {
  cursor: none;
}

/* THE GLASS.
   Physical left/top and a translate, not inset-inline-start: --lp-x is measured
   from the panel's LEFT edge by getBoundingClientRect, which does not flip in
   Arabic. Using a logical property here would send the glass to the wrong side
   of an RTL window.
   It is a sibling of the stage, so scrolling slides the page underneath it and
   the glass stays where it was put - which is what a loupe on paper does.
   pointer-events: none on a fine pointer: the glass never eats a click and the
   text under it stays selectable. */
.cvv__glass {
  --lp-size: 260px;
  --lp-x: 0px;
  --lp-y: 0px;
  position: absolute;
  left: 0;
  top: 0;
  z-index: 3;
  inline-size: var(--lp-size);
  block-size: var(--lp-size);
  translate: var(--lp-x) var(--lp-y);
  border-radius: 50%;
  overflow: hidden;
  background: var(--cv-sheet);
  box-shadow:
    0 24px 50px -24px rgba(23, 20, 15, 0.6),
    0 3px 12px -6px rgba(23, 20, 15, 0.4);
  opacity: 1;
  transition: opacity 140ms var(--e-out);
  pointer-events: none;
  contain: paint;
  will-change: translate;
}

.cvv__glass[data-over="false"] {
  opacity: 0;
}

/* THE CLONE.
   Individual transform properties compose as translate, then rotate, then
   scale - so a point p of the page is painted at p * --lp-z + --lp-tx. That is
   exactly the expression mirrorShift solves, which is why the two must stay in
   step: if you ever swap these for a single `transform`, the order reverses and
   the glass will show the wrong part of the page.
   The width is the page's LAYOUT width, so the clone breaks its lines in the
   same places the page does. */
.cvv__mirror {
  --lp-w: 44rem;
  --lp-z: 2.5;
  --lp-tx: 0px;
  --lp-ty: 0px;
  position: absolute;
  left: 0;
  top: 0;
  inline-size: var(--lp-w);
  transform-origin: 0 0;
  translate: var(--lp-tx) var(--lp-ty);
  scale: var(--lp-z);
  pointer-events: none;
}

.cvv__mirror > .cvp {
  inline-size: 100%;
  max-inline-size: none;
  margin: 0;
  border: 0;
  border-radius: 0;
  box-shadow: none;
  animation: none;
  transition: none;
}

.cvv__rim {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 1px solid rgba(var(--gold-rgb), 0.5);
  box-shadow:
    inset 0 0 0 3px rgba(255, 253, 248, 0.6),
    inset 0 0 26px rgba(23, 20, 15, 0.1);
  pointer-events: none;
}

.cvv__sheen {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: radial-gradient(
    120% 90% at 26% 16%,
    rgba(255, 255, 255, 0.5) 0%,
    rgba(255, 255, 255, 0.1) 34%,
    rgba(255, 255, 255, 0) 58%
  );
  opacity: 0.7;
  pointer-events: none;
}

/* The only furniture in the window: two icons, no labels, over the page. */
.cvv__ctl {
  position: absolute;
  inset-block-start: var(--s-3);
  inset-inline-end: var(--s-3);
  z-index: 4;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.cvv__tool {
  inline-size: 34px;
  block-size: 34px;
  display: grid;
  place-items: center;
  padding: 0;
  border: 1px solid var(--gold-hair-soft);
  border-radius: 10px;
  background: var(--surface-glass);
  backdrop-filter: blur(6px);
  color: var(--text-dim);
  cursor: pointer;
  transition:
    color 160ms var(--e-out),
    background-color 160ms var(--e-out),
    border-color 160ms var(--e-out);
}

.cvv__tool:hover {
  color: var(--text);
  background: var(--surface-2);
  border-color: rgba(var(--gold-rgb), 0.45);
}

.cvv__tool:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.cvv__tool[aria-pressed="true"] {
  color: var(--accent-ink);
  background: var(--accent);
  border-color: var(--accent);
}

@keyframes cvv-fade {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes cvv-rise {
  from {
    opacity: 0;
    transform: translateY(10px) scale(0.985);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

/* The sheen is the first thing to go on a weak device; the glass still reads as
   an instrument through its rim alone. */
[data-quality="low"] .cvv__sheen {
  display: none;
}

[data-quality="low"] .cvv__scrim {
  backdrop-filter: none;
}

[data-quality="low"] .cvv__tool {
  backdrop-filter: none;
  background: var(--surface-2);
}

@media (prefers-reduced-motion: reduce) {
  .cvv,
  .cvv__panel {
    animation: none;
  }

  .cvv__glass,
  .cvv__tool {
    transition: none;
  }
}
CSS_EOF
bash patch_desktop.sh