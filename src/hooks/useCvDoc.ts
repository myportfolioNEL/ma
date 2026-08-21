import { useCallback, useEffect, useState } from "react";
import { cv } from "../data/cv";
import type { Locale } from "../data/translations";
import { readCv } from "../lib/cv";

/**
 * useCvDoc - a locale in, a readable URL out.
 *
 * THREE STATES, AND NO STATE CALLED "FAILED".
 *
 *   loading      the race is running.
 *   ready        a verified copy is held in memory and addressable.
 *   unverified   either the copy that answered is not the size data/cv.ts
 *                declares, or every copy failed the checks. Either way the
 *                visitor still gets a URL: the first source is same-origin, so
 *                the browser can fetch and display it with no help from this
 *                file. A line in the footer says the copy could not be checked.
 *                An apology with nothing behind it would be worse than a file.
 *
 * Same principle as every anchor in CvButton being real: the engine is an
 * improvement on a path that already worked, never a replacement for one.
 */
export type CvDocState = "loading" | "ready" | "unverified";

export function useCvDoc(locale: Locale) {
  const file = cv[locale];

  const [state, setState] = useState<CvDocState>("loading");
  const [src, setSrc] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let current = true;

    setState("loading");
    setSrc("");

    void readCv(file)
      .then((doc) => {
        if (!current) return;
        setSrc(doc.url);
        setState(doc.suspect ? "unverified" : "ready");
      })
      .catch(() => {
        if (!current) return;
        setSrc(file.sources[0].url);
        setState("unverified");
      });

    return () => {
      current = false;
    };
  }, [file, attempt]);

  /* A retry re-runs the whole race: resolveFile deletes its in-flight entry on
     failure, so this is a real second attempt and not a replayed rejection. */
  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return { state, src, retry };
}
