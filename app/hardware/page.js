import PageScaffold from "../../components/PageScaffold";
import { buildPageMetadata } from "../../lib/metadata";

export const metadata = buildPageMetadata({
  path: "/hardware",
  title: "Hardware",
  description: "Hardware projects built by Gurucharan Lingamallu.",
});

const hardware = [
  {
    name: "gencad",
    href: "https://github.com/gurul/gencad",
    description: "parametric cad from a prompt",
    lines: [],
  },
  {
    name: "leap",
    href: "https://github.com/gurul/Leap",
    description: "motion hand tracking as macos input",
    lines: [],
  },
  {
    name: "agent pet",
    href: "https://github.com/gurul/claude-pet",
    description: "esp32 desk buddy",
    lines: [],
  },
  {
    name: "cameraboi",
    href: "https://github.com/gurul/cameraboi",
    description: "usb document camera eyes",
    lines: [],
  },
  {
    name: "hwlog",
    href: "https://github.com/gurul/hardware-logging",
    description: "serial logging for debugging firmware",
    lines: [],
  }
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
