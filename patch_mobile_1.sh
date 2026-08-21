#!/bin/bash
sed -i '3035,3391d' src/styles/mobile.css
sed -i '3035i\
/* ── The CV download, rebuilt for a thumb ──────────────────────────────────\
   Same rail, same glider, same three cells, same two-letter codes as the mouse\
   build. What changes is that every row is a 48px target and intent is :active\
   rather than :hover - a hover rule on a touch screen stays lit after the\
   finger leaves and then lies about where you are.\
\
   THERE IS EXACTLY ONE .cv__seg RULE IN THIS FILE. There used to be two, at\
   3086 and 3359, fighting over the same element: one a stacked grid, the other\
   an inline pill of three columns with a second row for the eyes. That is why\
   the eyes fell onto a line of their own underneath the codes. */\
.cv {\
  --cv-cells: 3;\
  position: relative;\
  display: grid;\
  gap: var(--s-3);\
  padding: var(--s-3);\
  border: 1px solid var(--gold-hair-soft);\
  border-radius: 14px;\
  background: transparent;\
  color: var(--text);\
  -webkit-tap-highlight-color: transparent;\
}\
\
.cv__head {\
  display: grid;\
  grid-template-columns: auto minmax(0, 1fr);\
  align-items: center;\
  gap: var(--s-3);\
  min-width: 0;\
}\
\
.cv__mark {\
  display: inline-flex;\
  color: var(--accent);\
}\
\
.cv__copy {\
  display: grid;\
  gap: 0.18rem;\
  min-width: 0;\
}\
\
.cv__label {\
  font-weight: 600;\
  font-size: 0.95rem;\
  line-height: 1.25;\
}\
\
.cv__meta {\
  font-family: var(--font-mono);\
  font-size: 0.6rem;\
  letter-spacing: 0.12em;\
  text-transform: uppercase;\
  color: var(--text-faint);\
}\
\
.cv__seg {\
  --cv-cells: 3;\
  position: relative;\
  display: grid;\
  grid-auto-rows: minmax(var(--tap, 48px), auto);\
  padding-inline-start: var(--s-4);\
}\
\
.cv__rail {\
  position: absolute;\
  inset-block: 0;\
  inset-inline-start: 0;\
  width: 1px;\
  background: linear-gradient(\
    180deg,\
    rgba(var(--rr-rgb), 0) 0%,\
    rgba(var(--rr-rgb), 0.5) 20%,\
    rgba(var(--rr-rgb), 0.5) 80%,\
    rgba(var(--rr-rgb), 0) 100%\
  );\
  pointer-events: none;\
}\
\
.cv__glider {\
  position: absolute;\
  inset-inline: 0;\
  top: 0;\
  height: calc(100% / var(--cv-cells));\
  background: linear-gradient(\
    180deg,\
    rgba(var(--rr-rgb), 0) 0%,\
    var(--rr-lit) 28%,\
    var(--gold) 72%,\
    rgba(var(--gold-rgb), 0) 100%\
  );\
  opacity: 0;\
  transform: translateY(0%);\
  transition:\
    transform 260ms var(--e-out),\
    opacity 200ms var(--e-out);\
  pointer-events: none;\
}\
\
/* Rest: the row that matches the interface language, written by the component. */\
.cv[data-rest="ar"] .cv__glider {\
  transform: translateY(0%);\
  opacity: 0.85;\
}\
\
.cv[data-rest="en"] .cv__glider {\
  transform: translateY(100%);\
  opacity: 0.85;\
}\
\
.cv[data-rest="fr"] .cv__glider {\
  transform: translateY(200%);\
  opacity: 0.85;\
}\
\
.cv__row {\
  display: grid;\
  grid-template-columns: 2.4rem minmax(0, 1fr) auto;\
  align-items: center;\
  gap: var(--s-3);\
  min-block-size: var(--tap, 48px);\
}\
\
.cv__code {\
  font-family: var(--font-mono);\
  font-size: var(--t-mono);\
  letter-spacing: var(--ls-mono);\
  font-variant-numeric: tabular-nums;\
  text-transform: uppercase;\
  color: var(--text);\
}\
\
.cv__size {\
  font-family: var(--font-mono);\
  font-size: 0.6875rem;\
  letter-spacing: 0.06em;\
  font-variant-numeric: tabular-nums;\
  white-space: nowrap;\
  color: var(--text-ghost);\
}\
\
.cv__acts {\
  display: inline-flex;\
  align-items: center;\
  gap: var(--s-1);\
}\
\
.cv__eye,\
.cv__opt {\
  position: relative;\
  inline-size: 40px;\
  block-size: 40px;\
  display: grid;\
  place-items: center;\
  padding: 0;\
  border: 1px solid var(--line);\
  border-radius: 11px;\
  background: transparent;\
  color: var(--text-dim);\
  overflow: hidden;\
  -webkit-tap-highlight-color: transparent;\
}\
\
.cv__eye:active,\
.cv__opt:active {\
  color: var(--text);\
  background: var(--accent-soft);\
  border-color: rgba(var(--accent-rgb), 0.4);\
}\
\
.cv__eye:focus-visible,\
.cv__opt:focus-visible {\
  outline: 2px solid var(--accent);\
  outline-offset: 2px;\
}\
\
.cv__opt[data-state="done"] {\
  color: var(--accent);\
  border-color: rgba(var(--accent-rgb), 0.4);\
}\
\
.cv__opt[data-state="failed"] {\
  color: var(--accent-2);\
}\
\
.cv__opt-line {\
  position: absolute;\
  inset-inline: 0;\
  inset-block-end: 0;\
  block-size: 1px;\
  background: var(--accent);\
  transform: scaleX(0);\
  transform-origin: 0 50%;\
  opacity: 0;\
}\
\
.cv__opt[data-state="busy"] .cv__opt-line {\
  opacity: 1;\
  animation: cv-sweep-m 900ms var(--e-out) infinite;\
}\
\
@keyframes cv-sweep-m {\
  0% {\
    transform: scaleX(0);\
    transform-origin: 0 50%;\
    opacity: 0.7;\
  }\
  50% {\
    transform: scaleX(1);\
    transform-origin: 0 50%;\
    opacity: 1;\
  }\
  50.1% {\
    transform-origin: 100% 50%;\
  }\
  100% {\
    transform: scaleX(0);\
    transform-origin: 100% 50%;\
    opacity: 0.7;\
  }\
}\
\
/* Announced, not shown. */\
.cv__live {\
  position: absolute;\
  width: 1px;\
  height: 1px;\
  padding: 0;\
  margin: -1px;\
  overflow: hidden;\
  clip-path: inset(50%);\
  white-space: nowrap;\
}\
' src/styles/mobile.css
