import { BACKGROUND, COMMUNITIES, PERSON, PROFILES, PROJECTS, RESEARCH } from "./content";
import { getSiteUrl } from "./site";

// One schema.org graph per page. Every page repeats the same Person and
// WebSite nodes under stable @ids, so crawlers resolve them to one entity;
// each page then adds its own node pointing back at that Person.

const siteUrl = () => getSiteUrl();
export const personId = () => `${siteUrl()}/#person`;
const websiteId = () => `${siteUrl()}/#website`;
const ref = (id) => ({ "@id": id });

// Bump when the profile's facts change (Google wants the human edit date).
const PROFILE_MODIFIED = "2026-11-08";

function personNode() {
  return {
    "@type": "Person",
    "@id": personId(),
    name: PERSON.name,
    alternateName: [PERSON.fullName, PERSON.nickname, PERSON.nativeNickname],
    url: `${siteUrl()}/about`,
    image: `${siteUrl()}/opengraph-image.jpg`,
    description: `${PERSON.name} (${PERSON.nickname}) ${PERSON.summary}.`,
    jobTitle: BACKGROUND.current.title,
    worksFor: {
      "@type": "Organization",
      name: BACKGROUND.current.org,
      legalName: BACKGROUND.current.legalName,
    },
    alumniOf: {
      "@type": "CollegeOrUniversity",
      name: PERSON.university.name,
      url: PERSON.university.url,
    },
    homeLocation: { "@type": "Place", name: BACKGROUND.location },
    memberOf: BACKGROUND.memberOf.map((name) => ({ "@type": "Organization", name })),
    award: BACKGROUND.awards,
    knowsAbout: PERSON.knowsAbout,
    sameAs: PROFILES.map((p) => p.href),
    identifier: {
      "@type": "PropertyValue",
      propertyID: "ORCID",
      value: PROFILES.find((p) => p.key === "orcid").href.split("/").pop(),
    },
  };
}

function websiteNode() {
  return {
    "@type": "WebSite",
    "@id": websiteId(),
    url: siteUrl(),
    name: PERSON.name,
    alternateName: "GURU",
    publisher: ref(personId()),
    inLanguage: "en",
  };
}

function collectionPage(path, name, items, itemType, creatorKey) {
  const url = `${siteUrl()}${path}`;
  return {
    "@type": "CollectionPage",
    "@id": `${url}#page`,
    url,
    name,
    isPartOf: ref(websiteId()),
    about: ref(personId()),
    mainEntity: {
      "@type": "ItemList",
      itemListElement: items.map((item, i) => ({
        "@type": "ListItem",
        position: i + 1,
        item: {
          "@type": itemType,
          name: item.name,
          description: item.description,
          url: item.href,
          [creatorKey]: ref(personId()),
        },
      })),
    },
  };
}

const PAGE_NODES = {
  "/about": () => ({
    "@type": "ProfilePage",
    "@id": `${siteUrl()}/about#page`,
    url: `${siteUrl()}/about`,
    name: `About ${PERSON.name}`,
    isPartOf: ref(websiteId()),
    dateModified: PROFILE_MODIFIED,
    mainEntity: ref(personId()),
  }),
  "/projects": () =>
    collectionPage("/projects", `Projects by ${PERSON.name}`, PROJECTS, "CreativeWork", "creator"),
  "/communities": () =>
    collectionPage("/communities", `Communities built by ${PERSON.name}`, COMMUNITIES, "Organization", "founder"),
  "/research": () => {
    const url = `${siteUrl()}/research`;
    return {
      "@type": "CollectionPage",
      "@id": `${url}#page`,
      url,
      name: `Research by ${PERSON.name}`,
      isPartOf: ref(websiteId()),
      about: ref(personId()),
      hasPart: RESEARCH.map((paper) => ({
        "@type": "ScholarlyArticle",
        headline: paper.title,
        name: paper.title,
        alternateName: paper.name,
        abstract: paper.description,
        url: paper.href,
        sameAs: paper.href,
        datePublished: paper.published,
        isPartOf: { "@type": "Periodical", name: paper.journal },
        author: [ref(personId())],
      })),
    };
  },
};

export function buildGraph(path) {
  const page = PAGE_NODES[path];
  return {
    "@context": "https://schema.org",
    "@graph": [personNode(), websiteNode(), ...(page ? [page()] : [])],
  };
}

// Server-rendered, so crawlers that never run JavaScript still read it.
// "<" is escaped so a string can never close the script tag.
export function JsonLd({ path }) {
  const json = JSON.stringify(buildGraph(path)).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
