import type { Metric } from "../types";

/**
 * metrics.ts — the ONLY place in the site where a statistic is written.
 *
 * Provenance (counted August 2026 across the three repositories):
 *   lines   NL 63,786 + PRISM 28,821 + MOMENTO 8,809          = 101,416
 *   .tsx    NL 189    + PRISM 46     + MOMENTO 21             = 256
 *   tests   NL 227    + PRISM 31     + MOMENTO 44             = 302
 *   CI      NL 7      + PRISM 4      + MOMENTO 4              = 15
 *
 * If a number changes, it changes here and the whole site follows.
 */
export const metrics: Metric[] = [
  { value: 101416, label: "Lines of production code across three products" },
  { value: 256, label: "React components in production" },
  { value: 302, label: "Automated tests, run on every commit" },
  { value: 15, label: "CI pipelines: quality, e2e, security, deploy" },
];

export const metricsNote =
  "Counted from the NL, PRISM and MOMENTO repositories in August 2026.";
