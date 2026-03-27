const GITHUB_USERNAME = "gurul";
const GITHUB_TIME_ZONE = "America/Los_Angeles";

function formatDateKey(parts) {
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(
    parts.day
  ).padStart(2, "0")}`;
}

function getDatePartsInTimeZone(date, timeZone = GITHUB_TIME_ZONE) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(date);

  return {
    year: Number(parts.find((part) => part.type === "year")?.value),
    month: Number(parts.find((part) => part.type === "month")?.value),
    day: Number(parts.find((part) => part.type === "day")?.value),
  };
}

function parseDateKey(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function addDays(dateKey, days) {
  const date = parseDateKey(dateKey);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function getWeekStartDateKey(dateKey) {
  const date = parseDateKey(dateKey);
  return addDays(dateKey, -date.getUTCDay());
}

async function fetchContributionPage(year) {
  const from = `${year}-01-01`;
  const to = `${year}-12-31`;
  const response = await fetch(
    `https://github.com/users/${GITHUB_USERNAME}/contributions?from=${from}&to=${to}`,
    {
      next: { revalidate: 3600 },
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

export async function getYearContributionCount() {
  const todayDateKey = formatDateKey(getDatePartsInTimeZone(new Date()));
  const startDateKey = addDays(getWeekStartDateKey(todayDateKey), -52 * 7);

  const years = new Set([
    Number(startDateKey.slice(0, 4)),
    Number(todayDateKey.slice(0, 4)),
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
    let currentDateKey = startDateKey;
    currentDateKey <= todayDateKey;
    currentDateKey = addDays(currentDateKey, 1)
  ) {
    total += mergedCounts.get(currentDateKey) ?? 0;
  }

  return total;
}
