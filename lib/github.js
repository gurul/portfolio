const GITHUB_USERNAME = "gurul";
const GITHUB_PROFILE_CONTRIBUTIONS_URL = `https://github.com/${GITHUB_USERNAME}?action=show&controller=profiles&tab=contributions&user_id=${GITHUB_USERNAME}`;

async function fetchContributionFragment() {
  const response = await fetch(
    GITHUB_PROFILE_CONTRIBUTIONS_URL,
    {
      next: { revalidate: 3600 },
      headers: {
        "User-Agent": "portfolio-site",
        "X-Requested-With": "XMLHttpRequest",
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to load GitHub contribution summary");
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

export async function getYearContributionCount() {
  return extractLastYearContributionCount(await fetchContributionFragment());
}
