import { SITE_DESCRIPTION, SITE_NAME } from "./site";

export function buildPageMetadata({
  path,
  description = SITE_DESCRIPTION,
  type = "website",
}) {
  return {
    title: SITE_NAME,
    description,
    alternates: {
      canonical: path,
    },
    openGraph: {
      title: SITE_NAME,
      description,
      url: path,
      siteName: SITE_NAME,
      type,
      images: [
        {
          url: "/opengraph-image.png",
          width: 1024,
          height: 576,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: SITE_NAME,
      description,
      images: ["/twitter-image.png"],
    },
  };
}
