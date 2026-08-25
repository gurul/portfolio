import PageScaffold from "../../components/PageScaffold";
import { buildPageMetadata } from "../../lib/metadata";

export const metadata = buildPageMetadata({
  path: "/software",
  title: "Software",
  description: "Software projects and experiments built by Gurucharan Lingamallu.",
});

const software = [
  {
    name: "storeybox",
    href: "https://storeybox.org",
    description: "multimodal memory infrastructure",
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
    name: "leap",
    href: "https://github.com/gurul/Leap",
    description: "motion hand tracking as macos input",
    lines: [],
  },
  {
    name: "harborline",
    href: "https://github.com/gurul/harborline",
    description: "disaster response",
    lines: [],
  },
  {
    name: "atlas",
    href: "https://github.com/gurul/atlas",
    description: "an interactive map of your engineering org",
    lines: [],
  },
  {
    name: "debrief",
    href: "https://github.com/gurul/claude-debrief",
    description: "human-gated memory for coding agents",
    lines: [],
  },
  {
    name: "slideflow",
    href: "https://slideflow1.vercel.app/",
    description: "simple presentation helper",
    lines: [],
  },
];

export default function SoftwarePage() {
  return (
    <PageScaffold>
      <div className="projects-page-list" aria-label="Software">
        {software.map((item) => (
          <article key={item.name} className="projects-page-item">
            <p className="projects-page-title">
              <a href={item.href} target="_blank" rel="noreferrer">
                {item.name}
              </a>{" "}
              — {item.description}
            </p>
            {item.lines.map((line) => (
              <p key={line} className="projects-page-line">
                {line}
              </p>
            ))}
          </article>
        ))}
      </div>
    </PageScaffold>
  );
}
