<h1 align="center">Noureddine El Mobaraki — Portfolio</h1>

<p align="center">
  A dark editorial single page for a front-end engineer in Casablanca.<br />
  React 19, TypeScript, Vite 6, GSAP, one hand-written WebGL shader.<br />
  Three languages, mirrored right-to-left, no UI framework anywhere.
</p>

<p align="center">
  <a href="https://myportfolionel.github.io/ma/"><strong>→ View the live site</strong></a>
</p>

<p align="center">
  <a href="https://github.com/myportfolioNEL/ma/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/myportfolioNEL/ma/actions/workflows/ci.yml/badge.svg" /></a>
  <a href="https://github.com/myportfolioNEL/ma/actions/workflows/deploy.yml"><img alt="Deploy" src="https://github.com/myportfolioNEL/ma/actions/workflows/deploy.yml/badge.svg" /></a>
  <img alt="React 19" src="https://img.shields.io/badge/React-19-087ea4?logo=react&logoColor=white" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.8-3178c6?logo=typescript&logoColor=white" />
  <img alt="Vite 6" src="https://img.shields.io/badge/Vite-6-646cff?logo=vite&logoColor=white" />
</p>

---

## What this is

A portfolio, and the reason to look at it is the engineering rather than the copy.
It ships two separate application shells instead of one responsive layout, drives
every entrance animation through a single batched reveal engine, renders its hero
backdrop from GLSL written by hand, reads correctly in Arabic, French and English
with the layout fully mirrored, and refuses to build if any one of four audit
gates finds a problem.

No UI framework. No CSS framework. No icon package. No component library.
Every pixel and every animation frame in this repository was written for it.

## Live

**https://myportfolionel.github.io/ma/**

Deployed from `main` by GitHub Actions on every push — but only after the build
gates, the type-checker and the test suite all pass.

## Stack

| Concern | Choice |
|---|---|
| UI | React 19.1 + TypeScript 5.8 |
| Build | Vite 6.3, `base: "./"` for sub-path hosting |
| Motion | GSAP 3.13 + ScrollTrigger, Lenis 1.3 for smooth scroll |
| Graphics | Raw WebGL + GLSL, no three.js |
| Styling | Plain CSS, custom properties as design tokens |
| Tests | Vitest 4.1 |
| Type fonts | Bricolage Grotesque, Fraunces, IBM Plex Mono |

## Quick start

```bash
npm ci            # exact lockfile install
npm run dev       # http://localhost:5173
npm run build     # gates → typecheck → dist/
npm run preview   # serve dist/ locally
npm test          # Vitest, single run
```

Node 22.14.0 is what CI uses.

## Scripts

| Script | What it does |
|---|---|
| `dev` | Vite dev server. `predev` restores the CV PDFs first. |
| `build` | restore → 4 audit gates → `tsc -b` → `vite build` |
| `preview` | Serves the built `dist/` |
| `typecheck` | `tsc --noEmit` |
| `test` / `test:watch` | Vitest |
| `verify` | typecheck + test + build, i.e. what CI runs |
| `cv:restore` | Rebuild `public/cv/*.pdf` from Base64 |
| `audit:css` | Unused / undefined CSS custom properties |
| `audit:assets` | Image integrity in `src/assets` |
| `audit:binaries` | Byte-level integrity of every binary in the tree |
| `audit:cv` | PDF structure, sizes and checksums |

## Architecture

```
src/
  data/         content only — profile, projects, metrics, capabilities, cv, translations
  types.ts      the shape of all of the above
  context/      LocaleContext — language, direction, persistence
  lib/          pure helpers: gsap config, text splitting, scroll, warp, cv delivery
  hooks/        reveal engine, smooth scroll, counters, magnetism, letter engine
  components/
    gl/         WebGL backdrop + GLSL source
    layout/     preloader, footer
    ui/         reveal, buttons, marquee, section heads, language switch, CV button
    sections/   about, capabilities, contact, numbers
  desktop/      AppDesktop, Header, Hero, Work, ProjectWindow, CaseStudy, Rail
  mobile/       AppMobile, TopBar, TabBar, Hero, Work, ProjectCard, CaseSheet
  styles/       tokens → base → desktop / mobile, composed by index.css
```

**Two shells, not one responsive layout.** `src/desktop/` and `src/mobile/` are
distinct trees with their own hero, work grid, navigation and case-study
presentation — a floating window on desktop, a bottom sheet on mobile. A phone
never downloads desktop scroll logic it will not run.

Three rules hold the structure together:

1. **Content never lives in a component.** Every string a visitor reads is in
   `src/data`. Changing a project means editing one object.
2. **One motion source.** Lenis is driven by the GSAP ticker, and every entrance
   goes through the single batched reveal engine in `hooks/useReveal.ts`. There
   is no second animation system to fight with.
3. **Only compositor properties animate.** `transform`, `opacity`, `filter`,
   `clip-path`. Nothing animates `width`, `height`, `top` or `left`.

## Three languages, properly

Arabic, French and English, switchable at runtime, preference persisted, and the
entire layout mirrors for RTL — not just text alignment. `src/data/translations.ts`
is the single dictionary, and `translations.test.ts` fails the build if any locale
is missing a key, so a half-translated release cannot ship.

## The CV pipeline

The most interesting file here is `src/lib/cv.ts`, and the reason is a bug that
cost this repository two red builds.

**On the client.** Both copies of a PDF — the local one and the CDN mirror — are
requested at the same instant, and the first to return headers wins; the loser is
aborted, so nobody downloads the same file twice. A fast answer is not trusted
blindly: GitHub Pages serves an HTML error page for a missing path, and a PDF
damaged in transit is intact at both ends and rubble in the middle. So the
response must begin with `%PDF-` and land within ±12% of the size declared in
`src/data/cv.ts`. A source that fails is demoted, the other is tried, and the
demoted copy is still kept as a last resort — a visitor is never sent away
empty-handed because a mirror is wrong. The winner is cached in memory for the
page and in Cache Storage under a key containing `cvVersion`. And none of it is
load-bearing: every CV cell is a real `<a download>`, so no JavaScript still
means no problem.

**In the repository.** The PDFs are **not committed**. `public/cv/*.pdf` is in
`.gitignore`, and the tracked source of truth is `scripts/cv-b64/*.b64` — the
same files as 7-bit ASCII Base64 — plus `scripts/cv-manifest.json` holding an
exact size and SHA-256 for each. `scripts/restore-cv.mjs` decodes them, rejects
anything that is not a PDF, and verifies every checksum. It runs at the head of
`build` and `predev`.

That design exists because the alternative failed. Binaries committed here had
been decoded as UTF-8 and re-encoded, turning every non-UTF-8 byte into `EF BF BD`:
the files grew by about half, kept their ASCII header and trailer, still
identified as PDFs to `file(1)`, and lost **every** compressed stream. It killed
`src/assets/portrait.webp`, then all three CVs at byte 291. Base64 is immune to
that channel, so the bytes are no longer what gets stored.

## Build gates

`npm run build` runs four gates before the compiler, and each exits non-zero:

| Gate | Checks |
|---|---|
| `audit-css-vars.mjs` | Every CSS custom property is defined and every definition is used |
| `audit-assets.mjs` | Image magic bytes, declared vs. actual size, `U+FFFD` contamination |
| `audit-binaries.mjs` | Walks the whole tree for `EF BF BD` and verifies format signatures |
| `audit-cv.mjs` | `%PDF-` … `%%EOF`, **inflates every FlateDecode stream**, sizes, SHA-256 |

`audit-cv.mjs` is the one worth reading. Its first version checked that each PDF
existed, started with `%PDF-` and was not tiny — and passed three files no reader
on earth could open. A gate that reads the first five bytes of a container format
is not a gate. It now inflates every compressed stream, the way a PDF viewer
would.

## Accessibility and reduced motion

`prefers-reduced-motion` is honoured completely, not cosmetically: Lenis is never
constructed, the preloader is skipped, the WebGL render loop never starts, and
every reveal is applied instantly. The site is fully keyboard-operable, and the
case-study overlay is a labelled modal that returns focus on close.

## Performance

- Shader device-pixel-ratio capped at 1.75.
- The WebGL loop pauses when the hero scrolls out of view or the tab is hidden.
- `content-visibility: auto` on off-screen sections.
- React and the motion runtime are separate chunks, so editing a component does
  not invalidate the cached GSAP bundle.
- The first project poster is preloaded at high priority; the other two are lazy.
  The other project origins get a DNS prefetch and nothing more.

## Tests

Vitest, run on every commit. `content.test.ts` asserts the integrity of the data
layer — CV URL shapes, declared byte sizes, locale coverage, `CV_ORDER`
agreeing with the files that actually exist. `translations.test.ts` fails if a
locale is missing a key.

## CI/CD

`.github/workflows/ci.yml` on every push and pull request to `main`:
ubuntu-24.04, Node 22.14.0, `npm ci`, restore binaries, typecheck, test, build,
upload `dist` as an artifact. `.github/workflows/deploy.yml` publishes to GitHub
Pages from `main`.

## The products this site presents

| | Project | What it is | Scale |
|---|---|---|---|
| 01 | **NL** — [live](https://noureddinelmobaraki-web.github.io/NL/) | Six-theme music and media platform: Web Audio engine, frame-locked LRC lyrics, film library, retro desktop, accounts | 63,786 lines · 189 components · 227 tests |
| 02 | **PRISM** — [live](https://prismmoo.github.io/ma/) | Configurable art commerce with a live price configurator, wall visualiser and a serverless back end | 28,821 lines · 46 components · 31 tests |
| 03 | **MOMENTO** — [live](https://momentowatch.github.io/ma/) | Trilingual mobile-first watch boutique with a single-source catalogue and WhatsApp checkout | 8,809 lines · 21 components · 44 tests |

Counted across the three repositories in August 2026: **101,416 lines**,
**256 components**, **302 automated tests**, **15 CI pipelines**.

## Contact

- **Email** — noureddinelmobaraki@gmail.com
- **WhatsApp** — [+212 612-806932](https://wa.me/212612806932)
- **Telegram** — [@noureddin_el_mobaraki](https://t.me/noureddin_el_mobaraki)
- **GitHub** — [noureddinelmobaraki-web](https://github.com/noureddinelmobaraki-web)

Open to full-time roles, contract and freelance work.

## Licence

There is no licence file in this repository, so default copyright applies: the
source is public to read and review, not to reuse. Add a `LICENSE` file if that
should change.
