import {
  BACKGROUND,
  COMMUNITIES,
  INSPIRATION_LINKS,
  NAME_LINK,
  PAGES,
  PERSON,
  PROFILES,
  PROJECTS,
  RESEARCH,
} from "../../lib/content";
import { getSiteUrl } from "../../lib/site";

// /llms.txt (llmstxt.org): a plain-text index for agents. Built from
// lib/content.js, so every link on the site is listed here too.
export const dynamic = "force-static";

const item = ({ name, href, description }) => `- [${name}](${href}): ${description}`;

export function GET() {
  const site = getSiteUrl();
  const body = [
    `# ${PERSON.name}`,
    "",
    `> ${PERSON.name} (${PERSON.nickname}, ${PERSON.nativeNickname}; full name ${PERSON.fullName}) ${PERSON.summary}.`,
    "",
    "Every link on the site is below. Each page is also plain server-rendered HTML with schema.org JSON-LD.",
    "",
    `${BACKGROUND.headline}. Based in ${BACKGROUND.location}.`,
    "",
    "## Pages",
    ...PAGES.map((p) => `- [${p.label}](${site}${p.path}): ${p.summary}`),
    "",
    "## Profiles",
    ...PROFILES.map((p) => `- [${p.label}](${p.href}): ${p.lead.replace("my", "Guru's")} ${p.label}`),
    `- [instagram](${NAME_LINK}): linked from Guru's name on the about page`,
    "",
    "## Projects",
    ...PROJECTS.map(item),
    "",
    "## Communities",
    ...COMMUNITIES.map(
      (c) =>
        `- [${c.name}](${c.href}): ${c.description}; Guru's role: ${c.role}` +
        (c.start ? ` (${c.start} – ${c.end || "present"})` : ""),
    ),
    "",
    "## Research",
    ...RESEARCH.map(
      (r) => `- [${r.title}](${r.href}): ${r.description}; ${r.journal}, ${r.published}`,
    ),
    "",
    "## Judging",
    ...BACKGROUND.judging.map(item),
    "",
    "## Background",
    ...BACKGROUND.experience.map((e) => `- ${e.title}, ${e.org} (${e.when}): ${e.what}`),
    `- ${BACKGROUND.education.degree}, ${BACKGROUND.education.school} (${BACKGROUND.education.when})`,
    "",
    "## Leadership",
    ...COMMUNITIES.map((c) => `- ${c.role}, ${c.name}`),
    ...BACKGROUND.leadership.map((l) => `- ${l.role}, ${l.org} (${l.context})`),
    "",
    "## Awards",
    ...BACKGROUND.awards.map((a) => `- ${a}`),
    "",
    "## Optional",
    `- [Leonardo da Vinci](${INSPIRATION_LINKS.daVinci}): Guru's main inspiration`,
    `- [Renaissance man](${INSPIRATION_LINKS.renaissanceMan}): the way of living Guru aims for`,
    `- [sitemap](${site}/sitemap.xml): every page URL`,
    "",
  ].join("\n");

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
