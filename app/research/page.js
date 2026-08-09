import PageScaffold from "../../components/PageScaffold";
import { buildPageMetadata } from "../../lib/metadata";

export const metadata = buildPageMetadata({
  path: "/research",
  title: "Research",
  description: "Research and academic publications by Gurucharan Lingamallu.",
});

const research = [
  {
    name: "highway1",
    href: "https://github.com/gurul/highway1",
    description: "intrinsically creative ai",
    lines: [],
  },
  {
    name: "diversity",
    href: "https://doi.org/10.1371/journal.pdig.0000486",
    description: "open data in clinical ai",
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
