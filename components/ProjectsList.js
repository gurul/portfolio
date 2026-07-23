const projects = [
  {
    name: "storeybox",
    href: "https://storeybox.club",
    description: "physical storytelling booth",
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
    name: "slideflow",
    href: "https://slideflow1.vercel.app/",
    description: "presentation intelligence",
    lines: [],
  },
  {
    name: "shapers ai",
    href: "https://shapersai.com/",
    description: "smb consulting",
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
    href: "https://cseed.co",
    description: "student innovation",
    lines: [],
  },
  {
    name: "harborline",
    href: "https://canva.link/id3dqdobbop5jvn",
    description: "disaster response",
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
