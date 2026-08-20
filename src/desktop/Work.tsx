import SectionHead from "../components/ui/SectionHead";
import ProjectWindow from "./ProjectWindow";
import { useLocale } from "../context/LocaleContext";
import type { Project } from "../types";

/**
 * Work — desktop. Three windows in a staggered column; each one is a real
 * button that opens its case study.
 */

type Props = {
  projects: Project[];
  onOpen: (project: Project, source: HTMLElement | null) => void;
};

export default function Work({ projects, onOpen }: Props) {
  const { t, localizeProject } = useLocale();

  return (
    <section className="section work" id="work">
      <SectionHead
        index="01"
        title={t.sectionHeads.work.title}
      />

      <div className="work__list">
        {projects.map((project, index) => (
          <ProjectWindow
            key={project.id}
            project={localizeProject(project)}
            index={index}
            onOpen={onOpen}
          />
        ))}
      </div>
    </section>
  );
}

