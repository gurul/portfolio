import PageScaffold from "../../components/PageScaffold";

const experience = [
  {
    company: "Storeybox",
    role: "Co-Founder",
    time: "Dec 2025 – Present",
    description:
      "built a prompt-driven storytelling kiosk and multi-model video pipeline that captured 600+ stories",
  },
  {
    company: "World Economic Forum Global Shapers Community",
    role: "Global Shaper",
    time: "Feb 2026 – Present",
    description:
      "founding team for the Shapers AI Initiative and deployed AI systems for small businesses with international pilots",
  },
  {
    company: "AI Collective Seattle",
    role: "Technical & Media Lead",
    time: "Jan 2026 – Present",
    description:
      "built a full-stack community platform powering 1.8K+ members with real-time data and 3D experiences",
  },
  {
    company: "AI Collective",
    role: "Editorial Associate",
    time: "Dec 2025 – Mar 2026",
    description:
      "contributed to editorial planning, curation, and production for a newsletter with 200,000+ readers",
  },
  {
    company: "AfterQuery",
    role: "Growth Strategist Intern",
    time: "Jan 2026 – Mar 2026",
    description:
      "built CRM and graph-based referral systems that mapped 10K+ candidates and increased conversion by 11%",
  },
  {
    company: "Yelo",
    role: "Growth Intern",
    time: "Nov 2025 – Dec 2025",
    description:
      "drove early-stage market development and user acquisition experiments",
  },
  {
    company: "x-google ai stealth startup",
    role: "Software Engineer Intern",
    time: "Sep 2025 – Nov 2025",
    description:
      "built enterprise-grade agent systems and automation workflows",
  },
  {
    company: "Comma Capital",
    role: "Venture Capital Fellow",
    time: "Jun 2025 – Aug 2025",
    description:
      "evaluated startups and developed investment theses across early-stage companies",
  },
  {
    company: "cseed",
    role: "Marketing/Creative Lead, Co-President",
    time: "Dec 2023 – Mar 2025",
    description:
      "grew membership 43x from 30 to 1,000+ by leading a 34-member board and launched the 6-week Buildspace program supporting 150+ students and 60+ projects",
  },
  {
    company: "MIT Critical Data",
    role: "AI Research Fellow",
    time: "Oct 2024 – Dec 2024",
    description:
      "built multilingual pipelines and evaluated LLM bias across models, datasets, and alignment strategies",
  },
  {
    company: "PwC",
    role: "Digital Strategy Consultant Extern",
    time: "Aug 2024 – Oct 2024",
    description:
      "built an interactive platform for Goodwill SP that turned trainee data into stories and improved employer engagement",
  },
  {
    company: "Quadrant Technologies",
    role: "Software Engineer Intern",
    time: "Jun 2024 – Aug 2024",
    description:
      "engineered a Neo4j-based family memory platform with 1M+ nodes and 40% lower query latency",
  },
  {
    company: "MIT IMES",
    role: "Data Research Intern",
    time: "Jul 2023 – Feb 2024",
    description:
      "built fuzzy-matching pipelines across 27K+ researchers and co-authored a PLOS Digital Health publication",
  },
  {
    company: "Encode Justice",
    role: "Policy Research Fellow",
    time: "Jun 2022 – Mar 2023",
    description:
      "conducted research on algorithmic bias and AI governance",
  },
  {
    company: "Forsys Inc",
    role: "Software Engineer Intern",
    time: "Jun 2022 – Aug 2022",
    description:
      "built revenue engineering systems and backend workflows",
  },
  {
    company: "ATLAS Collaboration",
    role: "Machine Learning Research Intern",
    time: "Nov 2021 – Jun 2022",
    description:
      "developed ML methods for signal processing in particle and gravitational data",
  },
];

export default function ExperiencePage() {
  return (
    <PageScaffold scrollable>
      <section className="experience-list" aria-label="Experience">
        {experience.map((item) => (
          <article
            key={`${item.company}-${item.role}-${item.time}`}
            className="experience-item"
          >
            <div className="experience-header">
              <p className="experience-company">{item.company}</p>
              <p className="experience-time">{item.time}</p>
            </div>
            <p className="experience-role">{item.role}</p>
            <p className="experience-description">{item.description}</p>
          </article>
        ))}
      </section>
    </PageScaffold>
  );
}
