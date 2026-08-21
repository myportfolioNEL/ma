import { cvVersion, type CvFile, type CvSource, type CvSourceKind } from "../data/cv";

/**
 * lib/cv.ts - get one PDF from whichever copy of it answers first, keep it, and
 * hand it to the visitor as a file.
 *
 * THE RACE IS DECIDED BY HEADERS, NOT BY THE LAST BYTE. Both sources are asked
 * at the same instant; the first one to return a response with ok status wins,
 * and the losers are aborted immediately. A visitor therefore never downloads
 * two copies of the same file, and the wait is the wait of the faster server
 * rather than the wait of the one that happens to be listed first.
 *
 * WHY THE ANSWER IS THEN CHECKED. A server can answer fast and still hand over
 * something useless: GitHub Pages serves an HTML error page for a path it does
 * not have, and a PDF that was committed through a text channel is intact at
 * both ends and ruined in the middle. Two cheap tests catch both cases - the
 * file must begin with %PDF-, and its size must be within twelve per cent of
 * the size data/cv.ts declares. A source that fails either test is demoted, the
 * other source is asked, and the demoted copy is still kept as a last resort:
 * a visitor is never sent away empty-handed because a mirror is wrong.
 *
 * WHAT IS CACHED, AND WHERE:
 *   memory        - the Blob, for the rest of this page's life. A second click
 *                   on the same language is instant and silent.
 *   Cache Storage - the Response, for the rest of the browser's life, under a
 *                   key that contains cvVersion. This is the one HTTP-level
 *                   cache a page on GitHub Pages can control without a service
 *                   worker, and bumping VERSION retires the old entries.
 *
 * WHAT THIS FILE DOES NOT DO. It never becomes the only way to get the file:
 * every cell in the interface is a real anchor with a real href and a real
 * download attribute, so a visitor with no JavaScript, a blocked fetch, or a
 * habit of right-clicking still gets the same PDF from the browser itself.
 */

/** Where the bytes that reached the visitor actually came from. */
export type CvOrigin = CvSourceKind | "cache";

export type CvDelivery = {
  origin: CvOrigin;
  bytes: number;
  /** True when the copy that answered is not the size data/cv.ts expects. */
  suspect: boolean;
};

type CvLocale = CvFile["locale"];

type Resolved = {
  blob: Blob;
  origin: CvOrigin;
  suspect: boolean;
};

type Answer = {
  index: number;
  source: CvSource;
  response: Response;
};

const CACHE_NAME = `nl-cv-${cvVersion}`;

/** How far a file may be from its declared size before it is distrusted. */
const TOLERANCE = 0.12;

/** "%PDF-" - the five bytes every PDF starts with. */
const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46, 0x2d];

/** How long the object URL stays alive after the save is triggered. */
const REVOKE_AFTER = 30000;

const held = new Map<CvLocale, Resolved>();
const running = new Map<CvLocale, Promise<Resolved>>();

function cacheAvailable(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof caches !== "undefined" &&
    window.isSecureContext
  );
}

async function looksLikePdf(blob: Blob): Promise<boolean> {
  if (blob.size < PDF_MAGIC.length) return false;
  const head = new Uint8Array(
    await blob.slice(0, PDF_MAGIC.length).arrayBuffer(),
  );
  return PDF_MAGIC.every((byte, index) => head[index] === byte);
}

function plausible(file: CvFile, size: number): boolean {
  return (
    size >= file.bytes * (1 - TOLERANCE) && size <= file.bytes * (1 + TOLERANCE)
  );
}

async function readCache(url: string): Promise<Blob | null> {
  if (!cacheAvailable()) return null;
  try {
    const store = await caches.open(CACHE_NAME);
    const hit = await store.match(url);
    if (!hit) return null;
    return await hit.blob();
  } catch {
    return null;
  }
}

async function writeCache(url: string, response: Response): Promise<void> {
  if (!cacheAvailable()) return;
  try {
    const store = await caches.open(CACHE_NAME);
    await store.put(url, response);
  } catch {
    /* Quota, private mode, or a body that was aborted: the memory map still
       holds the file for this page, which is the part the visitor feels. */
  }
}

/** Older versions of the CV are not worth the space they occupy. */
async function dropStaleCaches(): Promise<void> {
  if (!cacheAvailable()) return;
  try {
    const names = await caches.keys();
    await Promise.all(
      names
        .filter((name) => name.startsWith("nl-cv-") && name !== CACHE_NAME)
        .map((name) => caches.delete(name)),
    );
  } catch {
    /* Nothing here is worth reporting to anyone. */
  }
}

let cleaned = false;

function cleanOnce(): void {
  if (cleaned) return;
  cleaned = true;
  void dropStaleCaches();
}

async function firstToAnswer(
  file: CvFile,
  controllers: AbortController[],
): Promise<Answer> {
  const attempts = file.sources.map(async (source, index): Promise<Answer> => {
    const response = await fetch(source.url, {
      signal: controllers[index].signal,
      credentials: "omit",
      redirect: "follow",
    });
    if (!response.ok) {
      throw new Error(`cv ${source.kind}: HTTP ${response.status}`);
    }
    return { index, source, response };
  });
  return Promise.any(attempts);
}

async function take(
  file: CvFile,
  source: CvSource,
  response: Response,
): Promise<Resolved> {
  /* The clone has to be taken before the body is read, and only a copy that
     passed both tests is worth keeping. */
  const spare = response.clone();
  const blob = await response.blob();

  if (!(await looksLikePdf(blob))) {
    throw new Error(`cv ${source.kind}: not a PDF`);
  }

  const suspect = !plausible(file, blob.size);
  if (!suspect) void writeCache(source.url, spare);

  return { blob, origin: source.kind, suspect };
}

async function fromNetwork(file: CvFile): Promise<Resolved> {
  const controllers = file.sources.map(() => new AbortController());

  let answer: Answer | null = null;
  try {
    answer = await firstToAnswer(file, controllers);
  } catch {
    answer = null;
  }

  let salvage: Resolved | null = null;

  if (answer) {
    const winner = answer;
    /* The race is over the moment one source answers: cancel the rest before
       they spend the visitor's bandwidth on a copy nobody will read. */
    controllers.forEach((controller, index) => {
      if (index !== winner.index) controller.abort();
    });

    try {
      const resolved = await take(file, winner.source, winner.response);
      if (!resolved.suspect) return resolved;
      salvage = resolved;
    } catch {
      salvage = null;
    }
  }

  /* Either nobody answered, or the fastest answer was not a file this site
     recognises. Ask the remaining sources one at a time. */
  for (const [index, source] of file.sources.entries()) {
    if (answer && index === answer.index) continue;
    try {
      const response = await fetch(source.url, {
        credentials: "omit",
        redirect: "follow",
      });
      if (!response.ok) continue;
      const resolved = await take(file, source, response);
      if (!resolved.suspect) return resolved;
      if (!salvage) salvage = resolved;
    } catch {
      continue;
    }
  }

  if (salvage) return salvage;
  throw new Error("cv: no source produced a usable file");
}

async function resolveFile(file: CvFile): Promise<Resolved> {
  const inMemory = held.get(file.locale);
  if (inMemory) return inMemory;

  const inProgress = running.get(file.locale);
  if (inProgress) return inProgress;

  cleanOnce();

  const job = (async (): Promise<Resolved> => {
    for (const source of file.sources) {
      const hit = await readCache(source.url);
      if (hit && plausible(file, hit.size) && (await looksLikePdf(hit))) {
        return { blob: hit, origin: "cache", suspect: false };
      }
    }
    return fromNetwork(file);
  })();

  running.set(file.locale, job);
  try {
    const resolved = await job;
    held.set(file.locale, resolved);
    return resolved;
  } finally {
    running.delete(file.locale);
  }
}

function save(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = "noopener";
  anchor.style.display = "none";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  /* Revoking in the same tick can cancel the save in Safari. */
  window.setTimeout(() => URL.revokeObjectURL(url), REVOKE_AFTER);
}

/**
 * Ask the browser to download the first source itself, with no fetch involved.
 * Used when the engine fails: the sources are same-origin, so the download
 * attribute is honoured and the visitor still gets the file.
 */
export function nativeSaveCv(file: CvFile): void {
  const anchor = document.createElement("a");
  anchor.href = file.sources[0].url;
  anchor.download = file.fileName;
  anchor.rel = "noopener";
  anchor.style.display = "none";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
}

/**
 * Fetch a file before it is asked for, on hover or focus. Failure is silent by
 * design: a warm-up that did not work costs the visitor nothing, because the
 * click path runs the whole race again.
 */
export async function warmCv(file: CvFile): Promise<void> {
  try {
    await resolveFile(file);
  } catch {
    /* Nothing to report: the visitor has not asked for anything yet. */
  }
}

/** Deliver the file. Throws only when every copy of it failed. */
export async function downloadCv(file: CvFile): Promise<CvDelivery> {
  const resolved = await resolveFile(file);
  save(resolved.blob, file.fileName);
  return {
    origin: resolved.origin,
    bytes: resolved.blob.size,
    suspect: resolved.suspect,
  };
}

/* --- reading the file in place ------------------------------------------- */

/** A resolved CV, addressable by the browser as a URL rather than saved to disk. */
export type CvDoc = {
  /** A blob: URL any <iframe> or new tab can read. */
  url: string;
  origin: CvOrigin;
  bytes: number;
  /** True when the copy that answered is not the size data/cv.ts expects. */
  suspect: boolean;
};

/**
 * One object URL per language, kept for the life of the page.
 *
 * WHY IT IS NOT REVOKED EAGERLY. An object URL is a handle, not a copy: the Blob
 * behind it is the one the memory map already holds for the download path.
 * Keeping the handle means closing and reopening the reader, or switching
 * language and switching back, costs no network, no cache read and no decode.
 * Revoking it early would only guarantee that the second open is slower than
 * the first, for no saving at all.
 */
const docs = new Map<CvLocale, CvDoc>();

/**
 * The file, as something the browser can display. Reuses resolveFile, so the
 * race, both integrity checks and the Cache Storage entry are the ones the
 * download path already uses - there is no second network policy in this file
 * and there must never be one.
 */
export async function readCv(file: CvFile): Promise<CvDoc> {
  const existing = docs.get(file.locale);
  if (existing) return existing;

  const resolved = await resolveFile(file);

  /* Two callers awaiting the same resolveFile promise must not create two URLs
     for one Blob. */
  const again = docs.get(file.locale);
  if (again) return again;

  const doc: CvDoc = {
    url: URL.createObjectURL(resolved.blob),
    origin: resolved.origin,
    bytes: resolved.blob.size,
    suspect: resolved.suspect,
  };
  docs.set(file.locale, doc);
  return doc;
}

/** Hands every held URL back. Nothing calls this in normal use - a page unload
    releases them anyway - so it exists to keep the handles from being a leak
    with no door. */
export function releaseCvDocs(): void {
  for (const doc of docs.values()) URL.revokeObjectURL(doc.url);
  docs.clear();
}

