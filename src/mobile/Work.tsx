import ProjectCard from "./ProjectCard";
import { useLocale } from "../context/LocaleContext";
import type { Project } from "../types";

/**
 * Work — phone. A single column of full-width cards.
 */

type Props = {
  projects: Project[];
  onOpen: (project: Project) => void;
};

export default function Work({ projects, onOpen }: Props) {
  const { t, localizeProject } = useLocale();

  return (
    <section className="section work" id="work">
      <div className="head">
        <span className="head__index">01</span>
        <h2 className="head__title">{t.sectionHeads.work.title}</h2>
        <span className="head__note">{t.sectionHeads.work.note}</span>
      </div>

      <ul className="cards">
        {projects.map((project, index) => (
          <li key={project.id}>
            <ProjectCard
              project={localizeProject(project)}
              index={index}
              onOpen={onOpen}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

