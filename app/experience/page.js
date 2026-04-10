import PageScaffold from "../../components/PageScaffold";
import { buildPageMetadata } from "../../lib/metadata";

export const metadata = buildPageMetadata({
  path: "/experience",
  title: "Experience",
  description:
    "Experience across startups, research, community building, and product work by Gurucharan Lingamallu.",
});

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
      "helped launch the Shapers AI Initiative and deploy AI systems for small businesses in international pilots",
  },
  {
    company: "AI Collective Seattle",
    role: "Technical & Media Lead",
    time: "Jan 2026 – Present",
    description:
      "built a full-stack community platform for 1.8K+ members with real-time data and 3D experiences",
  },
  {
    company: "AI Collective",
    role: "Editorial Associate",
    time: "Nov 2025 – Mar 2026",
    description:
      "helped plan, curate, and produce a newsletter reaching 200,000+ readers",
  },
  {
    company: "AfterQuery",
    role: "Growth Strategist Intern",
    time: "Jan 2026 – Mar 2026",
    description:
      "built CRM and referral systems that mapped 10K+ candidates and increased conversion by 11%",
  },
  {
    company: "Yelo",
    role: "Growth Intern",
    time: "Nov 2025 – Dec 2025",
    description:
      "ran early-stage market development and user acquisition experiments",
  },
  {
    company: "Stealth Startup (Ex-Google AI Team)",
    role: "Software Engineer Intern",
    time: "Sep 2025 – Nov 2025",
    description:
      "built a 92%-accurate AI ticket-routing platform and multi-agent workflow UI for investor demos",
  },
  {
    company: "Comma Capital",
    role: "Venture Capital Fellow",
    time: "Jun 2025 – Aug 2025",
    description:
      "evaluated early-stage startups, developed investment theses, and participated in partner mentorship sessions",
  },
  {
    company: "cseed",
    role: "Marketing/Creative Lead, Co-President",
    time: "Dec 2023 – Mar 2025",
    description:
      "helped grow cseed into one of UW's largest innovation communities and supported the launch of Buildspace",
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
      "pitched an interactive platform for Goodwill SP that turned trainee data into employer-facing stories",
  },
  {
    company: "Quadrant Technologies",
    role: "Software Engineer Intern",
    time: "Jun 2024 – Aug 2024",
    description:
      "engineered a Neo4j-based memory platform with 1M+ nodes and 40% lower query latency",
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
      "researched algorithmic bias and AI governance",
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
      "developed ML methods for signal processing across particle and gravitational data",
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
