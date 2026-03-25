import PageScaffold from "../../components/PageScaffold";
import { getYearContributionCount } from "../../lib/github";

export const revalidate = 3600;

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
        sports, making music and spending quality time with friends and family.
      </p>

      <p>
        <span className="inline-nowrap">you can find my work </span>
        <a
          className="commit-history-link"
          href="https://github.com/gurul"
          target="_blank"
          rel="noreferrer"
        >
          @gurul
        </a>
      </p>

      <section className="commit-history" aria-label="GitHub commit history">
        <div className="commit-history-viewport">
          <img
            className="commit-history-image"
            src="https://ghchart.rshah.org/gurul"
            alt="GitHub contribution chart for gurul, cropped to recent months"
          />
        </div>

        <div className="commit-history-meta">
          <p className="commit-history-count">
            <span>{yearContributionCount} contributions</span>
            <span>in the last year</span>
          </p>
        </div>
      </section>
    </PageScaffold>
  );
}
