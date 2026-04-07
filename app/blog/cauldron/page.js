import PageScaffold from "../../../components/PageScaffold";
import { buildPageMetadata } from "../../../lib/metadata";

export const metadata = buildPageMetadata({
  path: "/blog/cauldron",
  title: "cauldron",
  description:
    "A short reflection by Gurucharan Lingamallu on presence, absence, and helping people find themselves.",
  type: "article",
});

export default function CauldronPage() {
  return (
    <PageScaffold>
      <p className="blog-post-title">cauldron</p>
      <p>I aspire to be present and absent.</p>
      <p>
        One of my burning desires is to help people find themselves. To act as
        a cauldron for their ideas, absorbing their stories, motives, and quiet
        contradictions until something new begins to form.
      </p>
      <p>
        A conduit of sorts, absorbing and reflecting their thoughts, helping
        them see themselves in a new light.
      </p>
      <p>
        I want to disappear into that process, to be less of a figure and more
        of a force.
      </p>
    </PageScaffold>
  );
}
