const projects = [
  {
    name: "storeybox",
    href: "https://storeybox.club",
    description: "physical storytelling booth",
    lines: [],
  },
  {
    name: "shapers.ai",
    href: "https://shapersai.com/",
    description: "smb consulting",
    lines: [],
  },
  {
    name: "heylily",
    href: "https://heylily.vercel.app/",
    description: "real-time call safety",
    lines: [],
  },
  {
    name: "ai collective seattle",
    href: "https://www.aicseattle.com/",
    description: "local ai community",
    lines: [],
  },
  {
    name: "cseed",
    href: "https://www.instagram.com/cseeduw/",
    description: "student innovation",
    lines: [],
  },
  {
    name: "diversity and inclusion",
    href: "https://doi.org/10.1371/journal.pdig.0000486",
    description: "plos research paper",
    lines: [],
  },
  {
    name: "slideflow",
    href: "https://slideflow1.vercel.app/",
    description: "presentation intelligence",
    lines: [],
  },
];

export default function ProjectsList() {
  return (
    <div className="projects-page-list" aria-label="Projects">
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
    </div>
  );
}
