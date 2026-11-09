// Every outbound link on the site lives here. The pages render from these
// lists, and so do the JSON-LD graph (lib/structuredData.js) and /llms.txt,
// so a link added to a page is automatically visible to crawlers and agents.

export const PERSON = {
  name: "Gurucharan Lingamallu",
  fullName: "Sri Surya Gurucharan Lingamallu",
  nickname: "Guru",
  nativeNickname: "గురు",
  summary:
    "builds at the intersection of AI, memory, and human experience while studying Computer Science at the University of Washington",
  university: {
    name: "University of Washington",
    url: "https://www.washington.edu/",
  },
  knowsAbout: [
    "Artificial intelligence",
    "AI agents",
    "Agent memory",
    "Computer use agents",
    "Human experience",
    "Computer science",
  ],
};

// Public background, from the LinkedIn profile and resume (2026-11-08).
// Machine-facing only: it feeds the Person JSON-LD and /llms.txt, not the
// visible page. No contact details or private profile data go here.
export const BACKGROUND = {
  headline:
    "AI Engineer at Era; CS at the University of Washington; World Economic Forum Global Shaper; AI Collective Seattle lead",
  location: "Seattle, Washington",
  current: { title: "AI Engineer", org: "Era", legalName: "Era Laboratories" },
  experience: [
    {
      title: "AI Engineer",
      org: "Era",
      when: "Oct 2026 – present",
      what: "memory, voice, agent systems, infrastructure, evaluations and experimental products",
    },
    {
      title: "Software Engineer Intern (Product, Platform)",
      org: "Era",
      when: "Jun – Sep 2026",
      what: "an AI hardware builder that turns natural language into working devices, and Atlas, a self-updating AI knowledge base across 91 repos",
    },
    {
      title: "Applied AI Engineer, Global Shaper",
      org: "World Economic Forum Global Shapers Community",
      when: "Feb 2026 – present",
      what: "co-founded Shapers AI, a 501(c)(3) building AI tools for Washington small businesses with the State SBDC",
    },
    {
      title: "Technical & Media Lead",
      org: "AI Collective Seattle",
      when: "Dec 2025 – present",
      what: "community platform for 2.7K+ members; events with partners like Anthropic, Vercel, Atlassian and Madrona",
    },
    {
      title: "Strategic Projects Intern, Growth",
      org: "AfterQuery",
      when: "Jan – Mar 2026",
      what: "the IDE-Bench evals analysis dashboard across 15 models and 6K runs, and a partnerships CRM",
    },
    {
      title: "Editorial Associate",
      org: "The AI Collective",
      when: "Nov 2025 – Mar 2026",
      what: "human-centered AI news and analysis for 250K+ readers in 40+ countries",
    },
    {
      title: "Venture Fellow",
      org: "Comma Capital",
      when: "Jun – Aug 2025",
      what: "1 of 30 fellows mentored on early-stage company building",
    },
    {
      title: "AI Safety Research Fellow",
      org: "MIT Critical Data",
      when: "2023 – 2024",
      what: "disease and demographic representation in LLM pretraining corpora; co-author of the PLOS Digital Health open-data paper",
    },
    {
      title: "Digital Strategy Consultant Extern",
      org: "PwC",
      when: "Aug – Oct 2024",
      what: "a platform turning Goodwill workforce-trainee data into employer-facing portfolios",
    },
    {
      title: "Software Engineer Intern, Platform",
      org: "Quadrant Technologies",
      when: "Jun – Aug 2024",
      what: "a knowledge graph of people, events and media with an AI chatbot",
    },
    {
      title: "Marketing & Creative Lead, Co-President",
      org: "cseed",
      when: "Dec 2023 – Oct 2024",
      what: "grew cseed from ~30 to 1K+ members; supported the launch of buildspace",
    },
  ],
  education: {
    school: "University of Washington",
    degree: "Bachelor of Science, Computer Science",
    when: "Sep 2023 – Jun 2027",
  },
  awards: [
    "2nd place, NVIDIA x Accel x H Company x Gradium x AWS Computer Use Agent Hackathon (Handyman)",
    "Biola University Startup Competition Impact Award (Storeybox)",
    "Best Agent Use, Sentient Labs Hackathon (Harborline)",
    "H. Watson Scholarship",
    "Indian National Rollerskating Champion (gold medal, 2013)",
  ],
  judging: [
    {
      name: "IA40 Summit Hackathon",
      href: "https://www.aicseattle.com/events/ia40-hackathon",
      description:
        "judge; presented by Madrona with Vercel and OpenAI, with AI Collective Seattle; Sep 29, 2026, Seattle",
      date: "2026-09-29",
    },
  ],
  memberOf: ["World Economic Forum Global Shapers Community", "AI Collective Seattle", "Delta Sigma Pi"],
  // Leadership roles beyond the communities page (from LinkedIn).
  leadership: [
    { org: "Delta Sigma Pi", role: "Member", context: "University of Washington" },
    { org: "Computer Science Honor Society", role: "Co-President", context: "Eastlake High School" },
    { org: "FRC 1294 (FIRST Robotics)", role: "Director of Business; Software Developer", context: "Eastlake High School" },
    { org: "Function Form Future", role: "Director of Technology & Public Affairs", context: "Eastlake High School" },
    { org: "Technology Student Association", role: "Treasurer & Mentorship Lead", context: "Eastlake High School" },
    { org: "DECA", role: "Mentor", context: "Eastlake High School" },
  ],
};

// The name on the about page links here.
export const NAME_LINK = "https://www.instagram.com/gurulingamallu/";

// The about page's "you can find my ..." line. rel="me" marks each one as the
// same person as this site.
export const PROFILES = [
  { key: "github", label: "github", lead: "my code on", href: "https://github.com/gurul" },
  { key: "orcid", label: "orcid", lead: "my research on", href: "https://orcid.org/0009-0004-5574-4696" },
  { key: "substack", label: "substack", lead: "my thoughts on", href: "https://substack.com/@gurulingamallu" },
  { key: "linkedin", label: "linkedin", lead: "my career on", href: "https://www.linkedin.com/in/gurul" },
];

// Links inside the about page's prose.
export const INSPIRATION_LINKS = {
  daVinci: "https://en.wikipedia.org/wiki/Leonardo_da_Vinci",
  renaissanceMan: "https://www.studentsofhistory.com/what-is-a-renaissance-man",
};

export const PROJECTS = [
  { name: "eve", href: "https://github.com/gurul/eve_01", description: "embodied personal agent", lines: [] },
  { name: "storeybox", href: "https://storeybox.co", description: "multimodal memory infrastructure", lines: [] },
  { name: "handyman", href: "https://github.com/gurul/handyman", description: "self-generating product tours", lines: [] },
  { name: "debrief", href: "https://github.com/gurul/claude-debrief", description: "self-curating memory for coding agents", lines: [] },
  { name: "heylily", href: "https://heylily.vercel.app/", description: "real-time call safety", lines: [] },
  { name: "harborline", href: "https://github.com/gurul/harborline", description: "natural disaster response", lines: [] },
  { name: "pika", href: "https://github.com/gurul/pika", description: "autonomous car", lines: [] },
  { name: "cameraboi", href: "https://github.com/gurul/cameraboi", description: "any camera as a tool call", lines: [] },
  { name: "hwlog", href: "https://github.com/gurul/hardware-logging", description: "serial logging for debugging firmware", lines: [] },
  { name: "gencad", href: "https://github.com/gurul/gencad", description: "parametric cad from a prompt", lines: [] },
  { name: "leap", href: "https://github.com/gurul/Leap", description: "hand gestures as macos input", lines: [] },
  { name: "slideflow", href: "https://slideflow1.vercel.app/", description: "simple presentation helper", lines: [] },
];

// `role`, `start`, `end` and `cofounded` are for machines (JSON-LD,
// llms.txt); the page shows `name` and `description`.
export const COMMUNITIES = [
  {
    name: "shapers ai",
    href: "https://shapersai.com/",
    description: "smb consulting",
    role: "Co-founder; Applied AI Engineer (World Economic Forum Global Shaper)",
    cofounded: true,
    start: "2026-02",
    lines: [],
  },
  {
    name: "ai collective seattle",
    href: "https://www.aicseattle.com/",
    description: "local ai community",
    role: "Technical & Media Lead",
    start: "2025-12",
    lines: [],
  },
  {
    name: "youth tech assembly",
    href: "https://www.youthtechassembly.org/",
    description: "global voice on ai",
    role: "Global Youth Tech Assembly Representative (World Economic Forum Global Shapers)",
    lines: [],
  },
  {
    name: "cseed",
    href: "https://cseed.co",
    description: "student innovation",
    role: "Co-President; Marketing & Creative Lead",
    start: "2023-12",
    end: "2024-10",
    lines: [],
  },
];

// `title`, `journal` and `published` are for machines (JSON-LD, llms.txt);
// the page shows `name` and `description`.
export const RESEARCH = [
  {
    name: "diversity",
    href: "https://doi.org/10.1371/journal.pdig.0000486",
    description: "open data in clinical ai",
    title: "Diversity and inclusion: A hidden additional benefit of Open Data",
    journal: "PLOS Digital Health",
    published: "2024-07-23",
    lines: [],
  },
];

// The site's own pages, in nav order.
export const PAGES = [
  { path: "/about", label: "about", summary: "who Guru is, with links to Guru's code, research, writing and career" },
  { path: "/projects", label: "projects", summary: "things Guru has built" },
  { path: "/communities", label: "communities", summary: "communities Guru has built and led" },
  { path: "/research", label: "research", summary: "Guru's research and academic publications" },
];
