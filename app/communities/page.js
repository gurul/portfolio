import PageScaffold from "../../components/PageScaffold";
import { buildPageMetadata } from "../../lib/metadata";

export const metadata = buildPageMetadata({
  path: "/communities",
  title: "Communities",
  description: "Communities built and led by Gurucharan Lingamallu.",
});

const communities = [
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
];

export default function CommunitiesPage() {
  return (
    <PageScaffold>
      <div className="projects-page-list" aria-label="Communities">
        {communities.map((item) => (
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
