import { Fragment } from "react";
import ExperiencingNarratives from "../../components/ExperiencingNarratives";
import PageScaffold from "../../components/PageScaffold";
import { getYearContributionCount } from "../../lib/github";
import { INSPIRATION_LINKS, NAME_LINK, PERSON, PROFILES } from "../../lib/content";
import { buildPageMetadata } from "../../lib/metadata";
import { JsonLd } from "../../lib/structuredData";

// Newest first; shown after the static "narratives experienced:" label.
const NARRATIVES = [
  { title: "small giants" },
  { title: "peddi" },
  { title: "the joy of mathematics" },
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
    "Gurucharan Lingamallu (Guru) builds at the intersection of AI, memory, and human experience while studying Computer Science at the University of Washington.",
});

export default async function AboutPage() {
  const yearContributionCount = await getYearContributionCount();

  return (
    <PageScaffold>
      <JsonLd path="/about" />
      <p>
        My name is{" "}
        <a
          className="name-link"
          href={NAME_LINK}
          target="_blank"
          rel="noreferrer"
        >
          {PERSON.fullName}
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
          href={INSPIRATION_LINKS.daVinci}
          target="_blank"
          rel="noreferrer"
        >
          Leonardo da Vinci
        </a>
        , the original{" "}
        <a
          className="name-link"
          href={INSPIRATION_LINKS.renaissanceMan}
          target="_blank"
          rel="noreferrer"
        >
          Renaissance man
        </a>
        . I want to live the
        same way: endlessly curious, learning and making across every
        discipline I can reach.
      </p>

      {/* rel="me" tells crawlers each profile is the same person as this site. */}
      <p>
        {PROFILES.map((profile, i) => {
          const isLast = i === PROFILES.length - 1;
          return (
            <Fragment key={profile.key}>
              <span className="inline-nowrap">
                {isLast ? "and " : i === 0 ? "you can find " : ""}
                {profile.lead}{" "}
                <a
                  className="commit-history-link"
                  href={profile.href}
                  target="_blank"
                  rel="me noreferrer"
                >
                  {profile.label}
                </a>
                {isLast ? "." : ","}
              </span>
              {isLast ? null : " "}
            </Fragment>
          );
        })}
      </p>

      <section className="commit-history" aria-label="GitHub commit history">
        <div className="commit-history-viewport">
          <img
            className="commit-history-image"
            src="https://ghchart.rshah.org/gurul"
            width={663}
            height={104}
            alt="GitHub contribution chart for gurul, cropped to the last six months"
          />
        </div>

        <div className="commit-history-meta">
          {yearContributionCount !== null && (
            <p className="commit-history-count">
              <span>{yearContributionCount} contributions</span>
              <span>in the last year</span>
            </p>
          )}
        </div>
      </section>

      <ExperiencingNarratives entries={NARRATIVES} />
    </PageScaffold>
  );
}
