import { Suspense, lazy } from "react";
import { LocaleProvider } from "./context/LocaleContext";
import { usePlatform } from "./lib/platform";

/**
 * App — the router between the two builds.
 *
 * Everything that used to live here now lives in exactly one of two places:
 * src/desktop or src/mobile. This file's only job is to decide which one, and
 * because both are lazy imports, the bundler splits them: a phone downloads
 * the phone build and never parses a line of the desktop build.
 *
 * The fallback is not a spinner. It is the same paper the site is made of, so
 * the handover from HTML to React has no flash of anything.
 */

const AppDesktop = lazy(() => import("./desktop/AppDesktop"));
const AppMobile = lazy(() => import("./mobile/AppMobile"));

export default function App() {
  const platform = usePlatform();

  return (
    <LocaleProvider>
      <Suspense fallback={<div className="boot" aria-hidden="true" />}>
        {platform === "mobile" ? <AppMobile /> : <AppDesktop />}
      </Suspense>
    </LocaleProvider>
  );
}

