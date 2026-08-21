#!/bin/bash
sed -i '3393,$d' src/styles/mobile.css
cat << 'CSS_EOF' >> src/styles/mobile.css
/* ==========================================================================
   CV READER - THE WINDOW, PHONE
   Full bleed, because a document on a 390px screen has no room for a frame.
   The page is at printed size and the sheet scrolls; the glass is dragged with
   a finger, and capture and handlers are on the glass itself - see useReader.
   ========================================================================== */
.cvv {
  position: fixed;
  inset: 0;
  z-index: var(--z-overlay);
  display: grid;
  align-items: end;
  animation: cvv-fade 160ms var(--e-out) both;
}

.cvv__scrim {
  position: absolute;
  inset: 0;
  background: var(--scrim);
}

.cvv__panel {
  --cvv-drag: 0px;
  position: relative;
  inline-size: 100vw;
  block-size: 96svh;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  overflow: hidden;
  background: var(--cv-sheet);
  color: var(--text);
  border-start-start-radius: var(--win-r);
  border-start-end-radius: var(--win-r);
  translate: 0 var(--cvv-drag);
  transition: translate 240ms var(--e-out);
  animation: cvv-sheet-in 280ms var(--e-out) both;
  box-shadow: 0 -18px 60px -24px rgba(23, 20, 15, 0.7);
}

/* No transition while a finger is on it, or the sheet lags behind the thumb. */
.cvv__panel[data-pulling="true"] {
  transition: none;
}

.cvv__grab {
  display: grid;
  place-items: center;
  inline-size: 100%;
  block-size: 30px;
  padding: 0;
  border: 0;
  background: transparent;
  touch-action: none;
  -webkit-tap-highlight-color: transparent;
}

.cvv__grab-bar {
  inline-size: 40px;
  block-size: 4px;
  border-radius: var(--radius-pill);
  background: rgba(23, 20, 15, 0.22);
}

.cvv__stage {
  position: relative;
  min-block-size: 0;
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
  padding: var(--s-3);
  padding-block-end: var(--s-6);
}

.cvv__glass {
  --lp-size: 176px;
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
    0 18px 40px -18px rgba(23, 20, 15, 0.6),
    0 2px 10px -5px rgba(23, 20, 15, 0.45);
  touch-action: none;
  contain: paint;
  will-change: translate;
  transition: opacity 140ms var(--e-out);
}

/* A finger has to be able to find it again, so it fades rather than vanishes. */
.cvv__glass[data-over="false"] {
  opacity: 0.35;
}

.cvv__glass[data-dragging="true"] {
  box-shadow:
    0 24px 52px -20px rgba(23, 20, 15, 0.66),
    0 3px 12px -5px rgba(23, 20, 15, 0.5);
}

.cvv__mirror {
  --lp-w: 22rem;
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
  margin: 0;
  border: 0;
  border-radius: 0;
  box-shadow: none;
  animation: none;
}

.cvv__rim {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 1px solid rgba(var(--gold-rgb), 0.5);
  box-shadow:
    inset 0 0 0 3px rgba(255, 253, 248, 0.6),
    inset 0 0 20px rgba(23, 20, 15, 0.12);
  pointer-events: none;
}

.cvv__sheen {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: radial-gradient(
    120% 90% at 26% 16%,
    rgba(255, 255, 255, 0.45) 0%,
    rgba(255, 255, 255, 0.08) 34%,
    rgba(255, 255, 255, 0) 58%
  );
  opacity: 0.65;
  pointer-events: none;
}

.cvv__ctl {
  position: absolute;
  inset-block-start: 34px;
  inset-inline-end: var(--s-3);
  z-index: 4;
  display: inline-flex;
  gap: var(--s-1);
}

.cvv__tool {
  inline-size: 42px;
  block-size: 42px;
  display: grid;
  place-items: center;
  padding: 0;
  border: 1px solid var(--gold-hair-soft);
  border-radius: 12px;
  background: var(--surface-glass);
  color: var(--text-dim);
  -webkit-tap-highlight-color: transparent;
}

.cvv__tool[aria-pressed="true"] {
  color: var(--accent-ink);
  background: var(--accent);
  border-color: var(--accent);
}

.cvv__tool:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

@keyframes cvv-fade {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes cvv-sheet-in {
  from {
    transform: translateY(18px);
    opacity: 0;
  }
  to {
    transform: none;
    opacity: 1;
  }
}

[data-quality="low"] .cvv__sheen {
  display: none;
}

@media (prefers-reduced-motion: reduce) {
  .cvv,
  .cvv__panel {
    animation: none;
  }
}
CSS_EOF
bash patch_mobile_2.sh