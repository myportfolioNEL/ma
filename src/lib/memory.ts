/**
 * lib/memory.ts - the site's memory.
 *
 * Everything the visitor did that is worth knowing on the next screen goes
 * through this one file: where they were on the page, where they were inside a
 * window, how many times they have been here, which language they read in.
 *
 * THREE RULES, AND THEY ARE THE WHOLE FILE.
 *
 *  1. ONE NAMESPACE, ONE VERSION. Every key is `nl.mem.<version>.<name>`.
 *     Nothing else in the site may write a bare key again, and a version bump
 *     retires the whole shelf at once instead of leaving stale shapes behind
 *     that crash a JSON.parse six months later.
 *
 *  2. STORAGE IS ALLOWED TO BE MISSING. Private mode, an iframe with third
 *     party storage blocked, a full quota, a browser with cookies off: every
 *     one of those throws on the first getItem, not on the write. So the real
 *     store is probed once per scope and a Map takes over when it is not
 *     there. Losing the memory when the tab closes is a small loss. Throwing
 *     during a scroll handler is a broken site.
 *
 *  3. EVERY VALUE IS STAMPED. A scroll offset from eleven days ago is not
 *     memory, it is a bug wearing memory's coat. readFresh drops anything
 *     older than the age its caller is willing to trust.
 *
 * The pure helpers at the bottom - isFresh, clampRatio, crossedDepths - carry
 * no DOM and no storage, which is why src/lib/memory.test.ts can run them in
 * the node environment vitest.config.ts already uses.
 */

export const MEMORY_VERSION = "v1";

/** Deliberately not "nl.": lib/quality.ts already owns `nl.quality`. */
const NAMESPACE = "nl.mem";

export type Scope = "session" | "local";

export type Stamped<T> = { t: number; v: T };

/** The only place a storage key is ever spelled. */
export function memoryKey(name: string): string {
  return `${NAMESPACE}.${MEMORY_VERSION}.${name}`;
}

/* Written when the real store refuses. Same API, shorter life. */
const shadow = new Map<string, string>();
const usable = new Map<Scope, boolean>();

function backing(scope: Scope): Storage | null {
  if (typeof window === "undefined") return null;
  if (usable.get(scope) === false) return null;

  try {
    const store = scope === "session" ? window.sessionStorage : window.localStorage;
    const probe = `${NAMESPACE}.probe`;
    store.setItem(probe, "1");
    store.removeItem(probe);
    usable.set(scope, true);
    return store;
  } catch {
    usable.set(scope, false);
    return null;
  }
}

function readRaw(key: string, scope: Scope): string | null {
  const store = backing(scope);
  if (!store) return shadow.get(key) ?? null;
  try {
    return store.getItem(key) ?? shadow.get(key) ?? null;
  } catch {
    return shadow.get(key) ?? null;
  }
}

function writeRaw(key: string, value: string, scope: Scope): void {
  shadow.set(key, value);
  const store = backing(scope);
  if (!store) return;
  try {
    store.setItem(key, value);
  } catch {
    /* Quota, or a private window that allows the probe and refuses the write.
       The shadow copy already has it. */
  }
}

/** Reads a stored value. Returns `whenMissing` for absent or damaged entries. */
export function readMemory<T>(
  name: string,
  whenMissing: T,
  scope: Scope = "session",
): T {
  const raw = readRaw(memoryKey(name), scope);
  if (raw === null) return whenMissing;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return whenMissing;
  }
}

export function writeMemory(
  name: string,
  value: unknown,
  scope: Scope = "session",
): void {
  try {
    writeRaw(memoryKey(name), JSON.stringify(value), scope);
  } catch {
    /* A value that cannot be serialised is a caller bug, never a crash here. */
  }
}

export function dropMemory(name: string, scope: Scope = "session"): void {
  const key = memoryKey(name);
  shadow.delete(key);
  const store = backing(scope);
  if (!store) return;
  try {
    store.removeItem(key);
  } catch {
    /* ignore */
  }
}

/** Reads a stamped value, or null when it is missing or too old. */
export function readFresh<T>(
  name: string,
  maxAgeMs: number,
  scope: Scope = "session",
): T | null {
  const entry = readMemory<Stamped<T> | null>(name, null, scope);
  if (!entry || typeof entry !== "object" || !("v" in entry)) return null;
  if (!isFresh(entry.t, maxAgeMs)) {
    dropMemory(name, scope);
    return null;
  }
  return entry.v;
}

export function writeFresh<T>(
  name: string,
  value: T,
  scope: Scope = "session",
): void {
  const entry: Stamped<T> = { t: Date.now(), v: value };
  writeMemory(name, entry, scope);
}

/**
 * Removes everything this site wrote under an older MEMORY_VERSION. Called once
 * per page life. Keys owned by other files - `nl.quality`, `portfolio-locale` -
 * do not carry this namespace and are never touched.
 */
export function evictOldVersions(): void {
  const scopes: ["session", "local"] = ["session", "local"];
  const keep = `${NAMESPACE}.${MEMORY_VERSION}.`;

  for (const scope of scopes) {
    const store = backing(scope);
    if (!store) continue;
    const stale: string[] = [];
    try {
      for (let index = 0; index < store.length; index += 1) {
        const key = store.key(index);
        if (!key) continue;
        if (key.startsWith(`${NAMESPACE}.`) && !key.startsWith(keep)) stale.push(key);
      }
      for (const key of stale) store.removeItem(key);
    } catch {
      /* ignore */
    }
  }
}

/* --- the visitor, counted once per session ------------------------------ */

export type Visit = {
  /** Stable across visits. Never sent anywhere but the site's own analytics. */
  id: string;
  visits: number;
  first: number;
  last: number;
};

const VISIT_KEY = "visit";
const VISIT_COUNTED = "visit.counted";

export function newId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    /* fall through */
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Reads the profile without touching it. */
export function visitProfile(): Visit {
  const now = Date.now();
  const stored = readMemory<Partial<Visit> | null>(VISIT_KEY, null, "local");
  return {
    id: typeof stored?.id === "string" ? stored.id : newId(),
    visits: typeof stored?.visits === "number" ? stored.visits : 0,
    first: typeof stored?.first === "number" ? stored.first : now,
    last: typeof stored?.last === "number" ? stored.last : now,
  };
}

/** Counts this session exactly once, however many components ask. */
export function openVisit(): Visit {
  const profile = visitProfile();
  const counted = readMemory<boolean>(VISIT_COUNTED, false, "session");

  const visit: Visit = {
    ...profile,
    visits: counted ? Math.max(1, profile.visits) : profile.visits + 1,
    last: Date.now(),
  };

  if (!counted) writeMemory(VISIT_COUNTED, true, "session");
  writeMemory(VISIT_KEY, visit, "local");
  return visit;
}

/* --- pure helpers. No DOM, no storage, unit tested ---------------------- */

/** Tolerant of a clock that moved: an age in either direction is an age. */
export function isFresh(stamp: number, maxAgeMs: number, now = Date.now()): boolean {
  if (!Number.isFinite(stamp) || stamp <= 0) return false;
  return Math.abs(now - stamp) <= maxAgeMs;
}

export function clampRatio(value: number): number {
  /* NaN is the only value with no sensible clamp: an unknown position is the
     top of the section, not the bottom of it. The infinities do have one -
     they are simply very far in a direction - so they clamp like any other
     out-of-range number rather than collapsing to zero. */
  if (Number.isNaN(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

/** The depth marks GA4 reports read well. Percentages, not ratios. */
export const DEPTHS: readonly number[] = [10, 25, 50, 75, 90, 100];

/** Which marks a move from `previous`% to `next`% has just crossed. */
export function crossedDepths(previous: number, next: number): number[] {
  if (!Number.isFinite(previous) || !Number.isFinite(next)) return [];
  if (!(next > previous)) return [];
  return DEPTHS.filter((mark) => previous < mark && next >= mark);
}
