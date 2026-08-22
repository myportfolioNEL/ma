with open("src/desktop/AppDesktop.tsx", "r") as f:
    content = f.read()

target = """import { useReveal } from "../hooks/useReveal";
import { useScrollDesktop } from "../hooks/useScrollDesktop";
import { lockScroll, unlockScroll } from "../lib/scroll";
import { useActiveSection } from "../hooks/useUi";
import { projects } from "../data/projects";"""

replacement = """import { useJourney } from "../hooks/useJourney";
import { useReveal } from "../hooks/useReveal";
import { useScrollDesktop } from "../hooks/useScrollDesktop";
import { useScrollMemory } from "../hooks/useScrollMemory";
import { useActiveSection } from "../hooks/useUi";
import { useLocale } from "../context/LocaleContext";
import { track } from "../lib/analytics";
import { lockScroll, unlockScroll } from "../lib/scroll";
import { projects } from "../data/projects";"""

content = content.replace(target, replacement)

with open("src/desktop/AppDesktop.tsx", "w") as f:
    f.write(content)
