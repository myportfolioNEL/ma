import { useCallback, useEffect, useRef, useState } from "react";
import "../styles/desktop.css";
import "../styles/reader.css";

import Liquid from "../components/gl/Liquid";
import Preloader from "../components/layout/Preloader";
import Footer from "../components/layout/Footer";
import About from "../components/sections/About";
import Capabilities from "../components/sections/Capabilities";
import Contact from "../components/sections/Contact";
import Numbers from "../components/sections/Numbers";

import CaseStudy from "./CaseStudy";
import Header from "./Header";
import Hero from "./Hero";
import Rail from "./Rail";
import Work from "./Work";

import { useJourney } from "../hooks/useJourney";
import { useReveal } from "../hooks/useReveal";
import { useScrollDesktop } from "../hooks/useScrollDesktop";
import { useScrollMemory } from "../hooks/useScrollMemory";
import { useActiveSection } from "../hooks/useUi";
import { useLocale } from "../context/LocaleContext";
import { track } from "../lib/analytics";
import { lockScroll, unlockScroll } from "../lib/scroll";
import { projects } from "../data/projects";
import type { Project } from "../types";

/**
 * AppDesktop — the mouse build.
 *
 * This file owns the desktop stylesheet import, which is what keeps the two
 * builds honest: mobile.css cannot leak in here and desktop.css cannot leak
 * into the phone. It also owns the two pieces of state that belong to the
 * whole page — whether the intro has finished, and which case study is open.
 *
 * Keep the hook calls exactly as they are in the current App.tsx. They are
 * moved here unchanged; if a signature in this project differs from what is
 * written below, the project's version wins.
 */

const SECTION_IDS = ["work", "numbers", "about", "capabilities", "contact"];

export default function AppDesktop() {
  const [ready, setReady] = useState(false);
  const [openProject, setOpenProject] = useState<Project | null>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  const { locale } = useLocale();

  useScrollDesktop();
  /* Reads the visitor's last place out of session memory and puts them back
     on it, before anything else has a chance to scroll the page. */
  useScrollMemory(SECTION_IDS);
  useReveal();
  const active = useActiveSection(SECTION_IDS);
  useJourney({ sections: SECTION_IDS, build: "desktop", locale });

  const open = useCallback((project: Project, source: HTMLElement | null) => {
    returnFocus.current = source;
    setOpenProject(project);
    track("project_open", { project: project.id, build: "desktop" });
  }, []);

  const close = useCallback(() => {
    setOpenProject(null);
    /* Send the keyboard back where it came from, not to the top of the page. */
    returnFocus.current?.focus();
    returnFocus.current = null;
  }, []);

  /* One owner for the scroll lock: the overlay's existence, nothing else. */
  /* Named owner. The old boolean form released the page lock whenever this
     effect re-ran, even when the CV reader was the component holding it -
     which unpinned the body under an open window and dropped the document to
     the top. See lib/scroll.ts. This effect can only ever release its own
     lock now. */
  useEffect(() => {
    if (openProject === null) {
      unlockScroll("case");
      return;
    }
    lockScroll("case");
    return () => unlockScroll("case");
  }, [openProject]);

  return (
    <>
      <a className="skip" href="#work">
        Skip to work
      </a>

      <Preloader onDone={() => setReady(true)} />

      {/* The surface everything sits on. Held flat until the intro is done. */}
      <Liquid active={ready} />

      <Header active={active} />
      <Rail sections={SECTION_IDS} active={active} />

      <main id="main">
        <Hero start={ready} />
        <Work projects={projects} onOpen={open} />
        <Numbers />
        <About />
        <Capabilities />
        <Contact />
      </main>

      <Footer />

      {openProject ? (
        <CaseStudy project={openProject} onClose={close} />
      ) : null}
    </>
  );
}
