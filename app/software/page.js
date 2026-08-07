import PageScaffold from "../../components/PageScaffold";
import { buildPageMetadata } from "../../lib/metadata";

export const metadata = buildPageMetadata({
  path: "/software",
  title: "Software",
  description: "Software projects and experiments built by Gurucharan Lingamallu.",
});

const software = [
  {
    name: "maker",
    href: "https://maker.era.world",
    description: "ai-powered hardware builder",
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
    name: "harborline",
    href: "https://github.com/gurul/harborline",
    description: "disaster response",
    lines: [],
  },
  {
    name: "debrief",
    href: "https://github.com/gurul/claude-debrief",
    description: "human-gated memory for coding agents",
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
