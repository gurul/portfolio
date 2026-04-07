import PageScaffold from "../../components/PageScaffold";
import ProjectsList from "../../components/ProjectsList";
import { buildPageMetadata } from "../../lib/metadata";

export const metadata = buildPageMetadata({
  path: "/projects",
  title: "Projects",
  description: "Selected projects and experiments built by Gurucharan Lingamallu.",
});

export default function ProjectsPage() {
  return (
    <PageScaffold>
      <ProjectsList />
    </PageScaffold>
  );
}
