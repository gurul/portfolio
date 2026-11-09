import LinkList from "../../components/LinkList";
import PageScaffold from "../../components/PageScaffold";
import { PROJECTS } from "../../lib/content";
import { buildPageMetadata } from "../../lib/metadata";
import { JsonLd } from "../../lib/structuredData";

// The list itself lives in lib/content.js, shared with the JSON-LD and /llms.txt.
export const metadata = buildPageMetadata({
  path: "/projects",
  title: "projects",
  description:
    "Projects built by Gurucharan Lingamallu (Guru): personal agents, memory infrastructure for AI, robotics, hardware tooling and developer tools.",
});

export default function ProjectsPage() {
  return (
    <PageScaffold>
      <JsonLd path="/projects" />
      <LinkList items={PROJECTS} label="Projects" />
    </PageScaffold>
  );
}
