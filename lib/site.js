export const SITE_NAME = "Gurucharan Lingamallu";
export const SITE_DESCRIPTION = "Personal website for Gurucharan Lingamallu.";

const FALLBACK_SITE_URL = "https://guru.graystar12.com";

function normalizeSiteUrl(url) {
  if (!url) {
    return null;
  }

  const siteUrl = url.startsWith("http://") || url.startsWith("https://") ? url : `https://${url}`;

  return siteUrl.replace(/\/+$/, "");
}

export function getSiteUrl() {
  return (
    normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL) ||
    normalizeSiteUrl(process.env.SITE_URL) ||
    normalizeSiteUrl(process.env.VERCEL_PROJECT_PRODUCTION_URL) ||
    FALLBACK_SITE_URL
  );
}

export function getMetadataBase() {
  return new URL(getSiteUrl());
}

export function isProductionIndexable() {
  if (process.env.NODE_ENV !== "production") {
    return false;
  }

  if (process.env.VERCEL_ENV) {
    return process.env.VERCEL_ENV === "production";
  }

  return true;
}
