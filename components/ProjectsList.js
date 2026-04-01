const projects = [
  {
    name: "storeybox",
    href: "https://storeybox.club",
    description: "physical storytelling booth",
    lines: [],
  },
  {
    name: "ai collective seattle",
    href: "https://www.aicseattle.com/",
    description: "local ai community",
    lines: [],
  },
  {
    name: "slideflow",
    href: "https://slideflow1.vercel.app/",
    description: "presentation intelligence",
    lines: [],
  },
  {
    name: "heylily",
    href: "https://github.com/gurul/lilyServes",
    description: "real-time call safety",
    lines: [],
  },
];

export default function ProjectsList() {
  return (
    <section className="projects-page-list" aria-label="Projects">
      {projects.map((project) => (
        <article key={project.name} className="projects-page-item">
          <p className="projects-page-title">
            <a href={project.href} target="_blank" rel="noreferrer">
              {project.name}
            </a>{" "}
            — {project.description}
          </p>
          {project.lines.map((line) => (
            <p key={line} className="projects-page-line">
              {line}
            </p>
          ))}
        </article>
      ))}
    </section>
  );
}
