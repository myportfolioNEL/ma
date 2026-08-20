# Noureddine El Mobaraki — Portfolio

Dark editorial single page. React 19 + TypeScript + Vite 6, GSAP ScrollTrigger
for motion, Lenis for smooth scrolling, one hand-written WebGL shader for the
hero backdrop. No UI framework, no CSS framework, no icon package.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check, then build to dist/
npm run preview  # serve dist/ locally
```

## Architecture in one screen

```
src/
  data/        content only — profile, projects, metrics, capabilities
  lib/         gsap config, text splitter, pure helpers
  hooks/       smooth scroll, reveal engine, counters, magnetism, observers
  components/
    gl/        raw WebGL backdrop + GLSL
    layout/    preloader, header, rail, cursor, footer
    ui/        reveal, button, marquee, section head, icons
    sections/  hero, work, case study, numbers, about, capabilities, contact
  styles/      tokens -> base -> ui -> sections (imported by index.css)
```

Three rules keep it that way:

1. **Content never lives in a component.** Every string a visitor reads is in
   `src/data`. Changing a project means editing one object.
2. **One motion source.** Lenis is driven by the GSAP ticker, and every
   entrance goes through the single batched reveal engine in
   `hooks/useReveal.ts`. There is no second animation system to fight.
3. **Only compositor properties animate.** transform, opacity, filter and
   clip-path. Nothing animates width, height, top or left.

## Accessibility and motion

`prefers-reduced-motion` is honoured everywhere: Lenis is not created, the
preloader is skipped, the WebGL loop never starts, and every reveal is applied
instantly. The site is fully usable by keyboard, and the case-study overlay is
a labelled modal that traps nothing but returns focus on close.

## Performance notes

- Device pixel ratio for the shader is capped at 1.75.
- The WebGL loop pauses when the hero scrolls away or the tab is hidden.
- `content-visibility: auto` on off-screen sections.
- React and the motion runtime are separate chunks, so a content edit does not
  invalidate the cached animation bundle.

## Deploying to GitHub Pages

`vite.config.ts` sets `base: "./"`, so `dist/` works from any sub-path. Push the
contents of `dist/` to the `gh-pages` branch, or point Pages at `/docs`.
