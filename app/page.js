import GifAsciiPlayer from "../components/GifAsciiPlayer";

const GITHUB_USERNAME = "gurul";

export const revalidate = 3600;

function formatDateKey(date) {
  return date.toISOString().slice(0, 10);
}

async function fetchContributionPage(year) {
  const from = `${year}-01-01`;
  const to = `${year}-12-31`;
  const response = await fetch(
    `https://github.com/users/${GITHUB_USERNAME}/contributions?from=${from}&to=${to}`,
    {
      next: { revalidate },
      headers: {
        "User-Agent": "portfolio-site",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to load GitHub contributions for ${year}`);
  }

  return response.text();
}

function collectContributionCounts(markup) {
  const contributions = new Map();
  const cellPattern =
    /data-date="(\d{4}-\d{2}-\d{2})"[\s\S]*?<tool-tip[\s\S]*?>(No|\d+) contribution(?:s)? on[\s\S]*?<\/tool-tip>/g;

  for (const match of markup.matchAll(cellPattern)) {
    const [, date, countText] = match;
    contributions.set(date, countText === "No" ? 0 : Number(countText));
  }

  return contributions;
}

async function getYearContributionCount() {
  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setUTCDate(startDate.getUTCDate() - 365);

  const years = new Set([
    startDate.getUTCFullYear(),
    endDate.getUTCFullYear(),
  ]);

  const pages = await Promise.all(
    Array.from(years).map(async (year) =>
      collectContributionCounts(await fetchContributionPage(year))
    )
  );

  const mergedCounts = new Map();
  for (const page of pages) {
    for (const [date, count] of page.entries()) {
      mergedCounts.set(date, count);
    }
  }

  let total = 0;
  for (
    let current = new Date(
      Date.UTC(
        startDate.getUTCFullYear(),
        startDate.getUTCMonth(),
        startDate.getUTCDate()
      )
    );
    current <= endDate;
    current.setUTCDate(current.getUTCDate() + 1)
  ) {
    total += mergedCounts.get(formatDateKey(current)) ?? 0;
  }

  return total;
}

export default async function HomePage() {
  const yearContributionCount = await getYearContributionCount();

  return (
    <main className="page-shell">
      <section className="intro-grid">
        <div className="intro-spacer" aria-hidden="true" />

        <div className="copy-column">
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
            , or Guru (గురు) for short.
          </p>
          <p>
            I work at the intersection of AI, memory, and human experience
            while studying Computer Science at the University of Washington.
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

          <GifAsciiPlayer />

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
        </div>
      </section>
    </main>
  );
}
