import { getSiteUrl, isProductionIndexable } from "../lib/site";

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
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
