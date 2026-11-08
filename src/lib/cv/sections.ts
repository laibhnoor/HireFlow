import type { CvSection } from "@/lib/cv/types";

type AliasMap = Record<string, string[]>;

const ALIASES: AliasMap = {
  Summary: [
    "summary",
    "professional summary",
    "profile",
    "professional profile",
    "about",
    "about me",
    "objective",
    "career objective",
    "personal statement",
    "personal profile",
  ],
  Experience: [
    "experience",
    "work experience",
    "professional experience",
    "relevant experience",
    "employment",
    "employment history",
    "work history",
    "career history",
  ],
  Education: [
    "education",
    "education and training",
    "academic background",
    "academic qualifications",
    "qualifications",
    "academics",
  ],
  Skills: [
    "skills",
    "technical skills",
    "core skills",
    "key skills",
    "skills and tools",
    "technical skills and tools",
    "core competencies",
    "competencies",
    "technologies",
    "tech stack",
    "technical proficiencies",
  ],
  Projects: [
    "projects",
    "personal projects",
    "selected projects",
    "key projects",
    "side projects",
    "portfolio",
  ],
  Certifications: [
    "certifications",
    "certificates",
    "licenses",
    "licenses and certifications",
    "professional certifications",
    "certifications and licenses",
  ],
  Awards: ["awards", "achievements", "honors", "honours", "awards and achievements"],
  Publications: ["publications", "research", "research experience", "papers"],
  Languages: ["languages", "language skills"],
  Volunteer: [
    "volunteer",
    "volunteering",
    "volunteer experience",
    "community involvement",
    "community experience",
  ],
  Interests: ["interests", "hobbies", "hobbies and interests"],
};

const LOOKUP = new Map<string, string>();
for (const [canonical, aliases] of Object.entries(ALIASES)) {
  for (const alias of aliases) {
    LOOKUP.set(alias, canonical);
  }
}

export function parseCvSections(text: string): CvSection[] {
  const lines = text.split("\n");
  const collected: CvSection[] = [];
  let currentName = "Header";
  let buffer: string[] = [];

  const flush = () => {
    const content = buffer.join("\n").trim();
    if (content) collected.push({ name: currentName, content });
    buffer = [];
  };

  for (const line of lines) {
    const heading = matchHeading(line);
    if (heading) {
      flush();
      currentName = heading;
      continue;
    }
    buffer.push(line);
  }
  flush();

  if (collected.length === 0) {
    return [{ name: "CV", content: text.trim() }];
  }

  // Merge duplicate headings (e.g. a sidebar repeating "Skills").
  const merged: CvSection[] = [];
  for (const section of collected) {
    const existing = merged.find((item) => item.name === section.name);
    if (existing) {
      existing.content = `${existing.content}\n\n${section.content}`.trim();
    } else {
      merged.push({ ...section });
    }
  }

  return merged;
}

function matchHeading(line: string) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 48) return null;

  const normalized = trimmed
    .replace(/^[\s\-–—•*#|]+/, "")
    .replace(/[\s:–—|-]+$/, "")
    .replace(/\s+/g, " ")
    .toLowerCase();

  if (!normalized || normalized.split(" ").length > 6) return null;
  if (/[.;]$/.test(trimmed)) return null;

  return LOOKUP.get(normalized) ?? null;
}
