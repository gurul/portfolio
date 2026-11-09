import { getSiteUrl, isProductionIndexable } from "../lib/site";

// AI crawlers, search indexes and user-triggered fetchers, named one by one.
// `*` already allows them; naming them states the opt-in explicitly, and a
// future `*` rule cannot shut them out by accident. Never disallow /_next/:
// renderers such as Applebot need the JS and CSS.
const AI_AGENTS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot",
  "Applebot-Extended",
  "Bingbot",
  "meta-externalagent",
  "MistralAI-User",
];

export default function robots() {
  const siteUrl = getSiteUrl();

  if (!isProductionIndexable()) {
    return {
      rules: {
        userAgent: "*",
        disallow: "/",
      },
    };
  }

  return {
    rules: [
      { userAgent: "*", allow: "/" },
      { userAgent: AI_AGENTS, allow: "/" },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
