const projectSections = [
  {
    title: "ventures",
    projects: [
      {
        name: "storeybox",
        href: "https://storeybox.club",
        description: "physical storytelling booth",
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
        name: "shapers.ai",
        href: "https://shapers-ai.vercel.app/",
        description: "smb consulting",
        lines: [],
      },
      {
        name: "cseed",
        href: "https://www.instagram.com/cseeduw/",
        description: "student innovation",
        lines: [],
      },
    ],
  },
  {
    title: "publications",
    projects: [
      {
        name: "diversity and inclusion",
        href: "https://doi.org/10.1371/journal.pdig.0000486",
        description: "plos digital health paper",
        lines: [],
      },
    ],
  },
  {
    title: "media",
    projects: [
      {
        name: "ide bench",
        href: "https://www.linkedin.com/posts/afterquery_introducing-ide-bench-a-multi-language-ugcPost-7427784381123080192-MHqe",
        description: "launch video",
        lines: [],
      },
      {
        name: "yelo",
        href: "https://www.instagram.com/yelo.seattle/",
        description: "social content",
        lines: [],
      },
    ],
  },
];

export default function ProjectsList() {
  return (
    <div className="projects-page-sections" aria-label="Projects">
      {projectSections.map((section) => (
        <section key={section.title} className="projects-page-section">
          <p className="projects-page-heading">{section.title}</p>
          <div className="projects-page-list">
            {section.projects.map((project) => (
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
        </section>
      ))}
    </div>
  );
}
