const GITHUB_USERNAME = "gurul";
const GITHUB_PROFILE_CONTRIBUTIONS_URL = `https://github.com/${GITHUB_USERNAME}?action=show&controller=profiles&tab=contributions&user_id=${GITHUB_USERNAME}`;
// A slow GitHub must not hold a build or a revalidation open.
const FETCH_TIMEOUT_MS = 8000;

async function fetchContributionFragment() {
  const response = await fetch(
    GITHUB_PROFILE_CONTRIBUTIONS_URL,
    {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        "User-Agent": "portfolio-site",
        "X-Requested-With": "XMLHttpRequest",
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to load GitHub contribution summary (HTTP ${response.status})`
    );
  }

  return response.text();
}

function extractLastYearContributionCount(markup) {
  const match = markup.match(
    /<h2[^>]*>\s*([\d,]+)\s*contributions\s*in the last year\s*<\/h2>/i
  );

  if (!match) {
    throw new Error("Failed to parse GitHub contribution summary");
  }

  return Number(match[1].replaceAll(",", ""));
}

// Returns the count, or null when GitHub fails during `next build`, so a
// GitHub hiccup never fails a deploy (the page revalidates within the hour).
// At runtime (ISR revalidation) the error is rethrown on purpose: Next then
// keeps serving the last good page instead of caching one without a count.
export async function getYearContributionCount() {
  try {
    return extractLastYearContributionCount(await fetchContributionFragment());
  } catch (error) {
    if (process.env.NEXT_PHASE === "phase-production-build") {
      console.warn(`[github] ${error.message}; building without the count.`);
      return null;
    }
    throw error;
  }
}
