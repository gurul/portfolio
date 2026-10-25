import { SITE_DESCRIPTION, SITE_NAME } from "./site";

// A page with a `title` is named in the tab as "projects · GURU"; one without
// (the about page, which is also home) is just "GURU".
export function buildPageMetadata({
  path,
  title,
  description = SITE_DESCRIPTION,
  type = "website",
}) {
  const fullTitle = title ? `${title} · ${SITE_NAME}` : SITE_NAME;
  return {
    title: fullTitle,
    description,
    alternates: {
      canonical: path,
    },
    openGraph: {
      title: fullTitle,
      description,
      url: path,
      siteName: SITE_NAME,
      type,
      images: [
        {
          url: "/opengraph-image.jpg",
          width: 1024,
          height: 576,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: ["/twitter-image.jpg"],
    },
  };
}
