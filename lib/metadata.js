import { SITE_DESCRIPTION, SITE_NAME } from "./site";

export function buildPageMetadata({
  path,
  title = SITE_NAME,
  description = SITE_DESCRIPTION,
  type = "website",
}) {
  const pageTitle = title === SITE_NAME ? SITE_NAME : `${title} | ${SITE_NAME}`;

  return {
    title: pageTitle,
    description,
    alternates: {
      canonical: path,
    },
    openGraph: {
      title: pageTitle,
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
      title: pageTitle,
      description,
      images: ["/twitter-image.png"],
    },
  };
}
