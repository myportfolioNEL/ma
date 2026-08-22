import { useCallback, useEffect, useState } from "react";
import "../styles/mobile.css";
import "../styles/reader.css";

import Liquid from "../components/gl/Liquid";
import Preloader from "../components/layout/Preloader";
import Footer from "../components/layout/Footer";
import About from "../components/sections/About";
import Capabilities from "../components/sections/Capabilities";
import Contact from "../components/sections/Contact";
import Numbers from "../components/sections/Numbers";

import CaseSheet from "./CaseSheet";
import Hero from "./Hero";
import TabBar from "./TabBar";
import TopBar from "./TopBar";
import Work from "./Work";

import { useJourney } from "../hooks/useJourney";
import { useReveal } from "../hooks/useReveal";
import { useScrollMobile } from "../hooks/useScrollMobile";
import { useScrollMemory } from "../hooks/useScrollMemory";
import { useActiveSection } from "../hooks/useUi";
import { useLocale } from "../context/LocaleContext";
import { track } from "../lib/analytics";
import { lockScroll, unlockScroll } from "../lib/scroll";
import { projects } from "../data/projects";
import type { Project } from "../types";

/**
 * AppMobile — the thumb build.
 *
 * Same content, different machine. The differences from the desktop build are
 * not cosmetic: navigation is a bottom tab bar, the case study is a bottom
 * sheet that can be dragged away, and there is no cursor code at all, because
 * there is no cursor.
 *
 * This file owns the mobile stylesheet import, so nothing here can be
 * affected by desktop.css and nothing in desktop.css needs to know a phone
 * exists.
 */

const SECTION_IDS = ["work", "numbers", "about", "capabilities", "contact"];

export default function AppMobile() {
  const [ready, setReady] = useState(false);
  const [openProject, setOpenProject] = useState<Project | null>(null);

  const { locale } = useLocale();

  useScrollMobile();
  useScrollMemory(SECTION_IDS);
  useReveal();
  const active = useActiveSection(SECTION_IDS);
  useJourney({ sections: SECTION_IDS, build: "mobile", locale });

  const open = useCallback((project: Project) => {
    setOpenProject(project);
    track("project_open", { project: project.id, build: "mobile" });
  }, []);

  const close = useCallback(() => {
    setOpenProject(null);
  }, []);

  /* Named owner: see the note in AppDesktop.tsx. On a phone the cost of a
     lock released by the wrong caller is the whole page falling to the top. */
  useEffect(() => {
    if (openProject === null) {
      unlockScroll("sheet");
      return;
    }
    lockScroll("sheet");
    return () => unlockScroll("sheet");
  }, [openProject]);

  return (
    <>
      <a className="skip" href="#work">
        Skip to work
      </a>

      <Preloader onDone={() => setReady(true)} />

      <Liquid active={ready} />

      <TopBar />

      <main id="main">
        <Hero start={ready} />
        <Work projects={projects} onOpen={open} />
        <Numbers />
        <About />
        <Capabilities />
        <Contact />
      </main>

      <Footer />

      <TabBar sections={SECTION_IDS} active={active} />

      {openProject ? (
        <CaseSheet project={openProject} onClose={close} />
      ) : null}
    </>
  );
}
