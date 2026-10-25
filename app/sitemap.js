import { getSiteUrl } from "../lib/site";

// Only routes that exist under app/. "/" serves the about page, whose
// canonical URL is /about, so "/" is not listed separately.

const routes = [
  {
    path: "/about",
    changeFrequency: "weekly",
    priority: 1,
  },
  {
    path: "/projects",
    changeFrequency: "monthly",
    priority: 0.9,
  },
  {
    path: "/communities",
    changeFrequency: "monthly",
    priority: 0.9,
  },
  {
    path: "/research",
    changeFrequency: "monthly",
    priority: 0.9,
  },
];

export default function sitemap() {
  const siteUrl = getSiteUrl();

  return routes.map(({ path, changeFrequency, priority }) => ({
    url: `${siteUrl}${path}`,
    changeFrequency,
    priority,
  }));
}
