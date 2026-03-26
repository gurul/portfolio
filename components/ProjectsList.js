const projects = [
  {
    name: "storeybox",
    href: "https://storeybox.club",
    description: "physical storytelling booth",
    lines: [
      "step inside → answer prompts → leave with a film + photo strip",
      "150+ participants, ★4.6/5, 100% would do it again",
    ],
  },
  {
    name: "ai collective seattle",
    href: "https://www.aicseattle.com/",
    description: "local ai community",
    lines: ["1.8K+ members · demos, research, and community experiences"],
  },
  {
    name: "slideflow",
    href: "https://slideflow1.vercel.app/",
    description: "presentation intelligence",
    lines: [
      "upload slides → get timing, transcript, and delivery feedback",
      "300+ users, case comp preperation",
    ],
  },
  {
    name: "heylily",
    href: "https://github.com/gurul/lilyServes",
    description: "real-time call safety",
    lines: [
      "streams Twilio calls and transcribes phone audio in real time",
      "uses GPT-4o + Hive AI to flag scam and deepfake risk live",
    ],
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
