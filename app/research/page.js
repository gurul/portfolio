import PageScaffold from "../../components/PageScaffold";
import { buildPageMetadata } from "../../lib/metadata";

export const metadata = buildPageMetadata({
  path: "/research",
  title: "Research",
  description: "Research and academic publications by Gurucharan Lingamallu.",
});

const research = [
  {
    name: "plos",
    href: "https://doi.org/10.1371/journal.pdig.0000486",
    description: "open data in clinical ai",
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
];

export default function ResearchPage() {
  return (
    <PageScaffold>
      <div className="projects-page-list" aria-label="Research">
        {research.map((item) => (
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
