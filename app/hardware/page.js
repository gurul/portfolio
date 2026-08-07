import PageScaffold from "../../components/PageScaffold";
import { buildPageMetadata } from "../../lib/metadata";

export const metadata = buildPageMetadata({
  path: "/hardware",
  title: "Hardware",
  description: "Hardware projects built by Gurucharan Lingamallu.",
});

const hardware = [
  {
    name: "hardware-logging",
    href: "https://github.com/gurul/hardware-logging",
    description:
      "open-source structured serial logging so ai coding agents can debug firmware recursively",
    lines: [],
  },
  {
    name: "storeybox",
    href: "https://storeybox.club",
    description: "physical memory infrastructure",
    lines: [],
  },
  {
    name: "claude pet",
    href: "https://github.com/gurul/claude-pet",
    description: "esp32 desk pet for claude code",
    lines: [],
  },
];

export default function HardwarePage() {
  return (
    <PageScaffold>
      <div className="projects-page-list" aria-label="Hardware">
        {hardware.map((item) => (
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
