import ExperiencingNarratives from "../../components/ExperiencingNarratives";
import PageScaffold from "../../components/PageScaffold";
import { getYearContributionCount } from "../../lib/github";
import { buildPageMetadata } from "../../lib/metadata";

// Newest first; shown after the static "narratives experienced:" label.
const NARRATIVES = [
  { title: "machines of loving grace" },
  { title: "oppenheimer" },
  { title: "interstellar" },
  { title: "the white tiger" },
  { title: "life of pi" },
  { title: "lord of the flies" },
  { title: "1917" },
  { title: "the bhagavad gita" },
  { title: "becoming nobody" },
  { title: "the odyssey" },
  { title: "the deep learning revolution" },
  { title: "the man who knew infinity" },
  { title: "the imitation game" },
  { title: "inception" },
  { title: "iron man" },
  { title: "dune" },
  { title: "meditations" },
  { title: "the knowledge illusion" },
  { title: "bahubali" },
  { title: "rrr" },
  { title: "kalki" },
  { title: "project hail mary" },
  { title: "percy jackson" },
  { title: "the kane chronicles" },
  { title: "the book thief" },
  { title: "never let me go" },
  { title: "trials of apollo" },
  { title: "divergent" },
  { title: "to kill a mockingbird" },
  { title: "sapiens" },
];

export const revalidate = 3600;
export const metadata = buildPageMetadata({
  path: "/about",
  description:
    "About Gurucharan Lingamallu: builder, designer, and computer science student focused on AI, memory, and human experience.",
});

export default async function AboutPage() {
  const yearContributionCount = await getYearContributionCount();

  return (
    <PageScaffold>
      <p>
        My name is{" "}
        <a
          className="name-link"
          href="https://www.instagram.com/gurulingamallu/"
          target="_blank"
          rel="noreferrer"
        >
          Gurucharan Lingamallu
        </a>
        , <span className="inline-nowrap">or Guru (గురు) for short.</span>
      </p>
      <p>
        I build at the intersection of AI, memory, and human experience while
        studying Computer Science at the University of Washington.
      </p>
      <p>
        I love reading, writing, designing, dancing, working out, playing
        sports, making music and spending quality time with loved ones.
      </p>
      <p>
        I'm heavily inspired by{" "}
        <a
          className="name-link"
          href="https://en.wikipedia.org/wiki/Leonardo_da_Vinci"
          target="_blank"
          rel="noreferrer"
        >
          Leonardo da Vinci
        </a>
        , the original{" "}
        <a
          className="name-link"
          href="https://www.studentsofhistory.com/what-is-a-renaissance-man?srsltid=AfmBOoqp3BEKdw8gJWkRdU4-Q-Vm2hmjxKhM0o4dltRK-EAJcw4iiUnr"
          target="_blank"
          rel="noreferrer"
        >
          Renaissance man
        </a>
        . I want to live the
        same way: endlessly curious, learning and making across every
        discipline I can reach.
      </p>

      <p>
        <span className="inline-nowrap">
          you can find my code on{" "}
          <a
            className="commit-history-link"
            href="https://github.com/gurul"
            target="_blank"
            rel="noreferrer"
          >
            github
          </a>
          ,
        </span>{" "}
        <span className="inline-nowrap">
          my research on{" "}
          <a
            className="commit-history-link"
            href="https://orcid.org/0009-0004-5574-4696"
            target="_blank"
            rel="noreferrer"
          >
            orcid
          </a>
          ,
        </span>{" "}
        <span className="inline-nowrap">
          my thoughts on{" "}
          <a
            className="commit-history-link"
            href="https://substack.com/@gurulingamallu"
            target="_blank"
            rel="noreferrer"
          >
            substack
          </a>
          ,
        </span>{" "}
        <span className="inline-nowrap">
          and my career on{" "}
          <a
            className="commit-history-link"
            href="https://www.linkedin.com/in/gurul"
            target="_blank"
            rel="noreferrer"
          >
            linkedin
          </a>
          .
        </span>
      </p>

      <section className="commit-history" aria-label="GitHub commit history">
        <div className="commit-history-viewport">
          <img
            className="commit-history-image"
            src="https://ghchart.rshah.org/gurul"
            alt="GitHub contribution chart for gurul, cropped to the last six months"
          />
        </div>

        <div className="commit-history-meta">
          <p className="commit-history-count">
            <span>{yearContributionCount} contributions</span>
            <span>in the last year</span>
          </p>
        </div>
      </section>

      <ExperiencingNarratives entries={NARRATIVES} />
    </PageScaffold>
  );
}
