import { getSiteUrl } from "../lib/site";

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
    path: "/blog/cauldron",
    changeFrequency: "yearly",
    priority: 0.7,
  },
  {
    path: "/blog/the-voice-with-vision",
    changeFrequency: "yearly",
    priority: 0.7,
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
