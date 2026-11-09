import LinkList from "../../components/LinkList";
import PageScaffold from "../../components/PageScaffold";
import { COMMUNITIES } from "../../lib/content";
import { buildPageMetadata } from "../../lib/metadata";
import { JsonLd } from "../../lib/structuredData";

// The list itself lives in lib/content.js, shared with the JSON-LD and /llms.txt.
export const metadata = buildPageMetadata({
  path: "/communities",
  title: "communities",
  description:
    "Communities built and led by Gurucharan Lingamallu (Guru): Shapers AI, AI Collective Seattle, Youth Tech Assembly and CSEED.",
});

export default function CommunitiesPage() {
  return (
    <PageScaffold>
      <JsonLd path="/communities" />
      <LinkList items={COMMUNITIES} label="Communities" />
    </PageScaffold>
  );
}
