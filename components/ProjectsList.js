const projects = [
  {
    name: "storeybox",
    href: "https://storeybox.club",
    description: "memory infrastructure",
    lines: [],
  },
  {
    name: "handyman",
    href: "https://github.com/gurul/handyman",
    description: "self-generating product tours",
    lines: [],
  },
  {
    name: "heylily",
    href: "https://heylily.vercel.app/",
    description: "real-time call safety",
    lines: [],
  },
  {
    name: "diversity",
    href: "https://doi.org/10.1371/journal.pdig.0000486",
    description: "open data in clinical ai",
    lines: [],
  },
  {
    name: "debrief",
    href: "https://github.com/gurul/claude-debrief",
    description: "human-gated memory for coding agents",
    lines: [],
  },
  {
    name: "harborline",
    href: "https://github.com/gurul/harborline",
    description: "disaster response",
    lines: [],
  },
  {
    name: "cse493",
    href: "https://midi-transport-0b7.notion.site/Terrain-Generation-378c6d84df52800abd61ff9a23175b77?source=copy_link",
    description: "deep learning terrain generator",
    lines: [],
  },
  {
    name: "api H",
    href: "https://github.com/gurul/apiH",
    description: "computer use workflow contracts",
    lines: [],
  },
  {
    name: "slideflow",
    href: "https://slideflow1.vercel.app/",
    description: "presentation intelligence",
    lines: [],
  },
];

function WorkList({ items, label }) {
  return (
    <div className="projects-page-list" aria-label={label}>
      {items.map((project) => (
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

export default function ProjectsList() {
  return (
    <WorkList items={projects} label="Projects" />
  );
}
