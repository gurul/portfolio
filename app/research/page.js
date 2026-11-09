import LinkList from "../../components/LinkList";
import PageScaffold from "../../components/PageScaffold";
import { RESEARCH } from "../../lib/content";
import { buildPageMetadata } from "../../lib/metadata";
import { JsonLd } from "../../lib/structuredData";

// The list itself lives in lib/content.js, shared with the JSON-LD and /llms.txt.
export const metadata = buildPageMetadata({
  path: "/research",
  title: "research",
  description:
    "Research and academic publications by Gurucharan Lingamallu (Guru), including work on open data and diversity in clinical AI (PLOS Digital Health).",
});

export default function ResearchPage() {
  return (
    <PageScaffold>
      <JsonLd path="/research" />
      <LinkList items={RESEARCH} label="Research" />
    </PageScaffold>
  );
}
