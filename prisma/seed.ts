/**
 * Idempotent demo seed.
 *
 * Forces offline mode before any app module imports `@/lib/env`, so running the
 * seed never spends OpenAI credits. Everything goes through the real ingestion,
 * analysis and generation pipelines, which means the demo data has the same
 * evidence, scoring and versioning guarantees as user-created data.
 *
 * Run with: npm run db:seed
 */
process.env.OPENAI_API_KEY = "";

import bcrypt from "bcryptjs";

import type { MaterialType } from "@/lib/generation/types";

const DEMO_EMAIL = "demo@hireflow.app";
const DEMO_PASSWORD = "demo12345";

type Status =
  | "SAVED"
  | "APPLIED"
  | "SCREENING"
  | "INTERVIEW"
  | "OFFER"
  | "REJECTED"
  | "WITHDRAWN";

type SeedJob = {
  company: string;
  title: string;
  location: string;
  employmentType: string;
  source: string;
  status: Status;
  createdDaysAgo: number;
  appliedDaysAgo: number | null;
  /** [from, to, daysAgo] transitions shown on the timeline. */
  history: Array<[Status, Status, number]>;
  description: string;
};

const JOBS: SeedJob[] = [
  {
    company: "Northwind Labs",
    title: "Senior Frontend Engineer",
    location: "London, UK",
    employmentType: "Full-time",
    source: "LinkedIn",
    status: "OFFER",
    createdDaysAgo: 16,
    appliedDaysAgo: 15,
    history: [
      ["SAVED", "APPLIED", 15],
      ["APPLIED", "SCREENING", 9],
      ["SCREENING", "INTERVIEW", 5],
      ["INTERVIEW", "OFFER", 2],
    ],
    description: `Northwind Labs builds analytics products for operations teams. We are looking for a senior frontend engineer to lead the next generation of our dashboard.

Requirements
- 5+ years of professional frontend experience building production web applications
- Expert-level TypeScript and React
- Strong experience with Next.js and the App Router
- Strong understanding of web accessibility (WCAG 2.1) and semantic HTML
- Experience building and maintaining design systems used by multiple teams
- Experience with Playwright or similar end-to-end testing tools
- Excellent communication and stakeholder management skills

Nice to have
- Experience with performance profiling and Core Web Vitals
- Familiarity with GraphQL and data-heavy interfaces`,
  },
  {
    company: "Helio Health",
    title: "Frontend Engineer, Design Systems",
    location: "Remote (UK)",
    employmentType: "Full-time",
    source: "Company site",
    status: "INTERVIEW",
    createdDaysAgo: 12,
    appliedDaysAgo: 11,
    history: [
      ["SAVED", "APPLIED", 11],
      ["APPLIED", "SCREENING", 7],
      ["SCREENING", "INTERVIEW", 3],
    ],
    description: `Helio Health is modernising how clinicians access patient records. The design systems team owns the components and tokens used across four clinical products.

What we're looking for
- Strong React and TypeScript skills in a production environment
- Experience maintaining a shared component library with Storybook
- A practical understanding of WCAG 2.1 AA and semantic HTML
- Experience working closely with designers on design tokens
- Comfortable reviewing pull requests and giving constructive feedback
- Clear written communication for asynchronous, remote work

Nice to have
- Experience in regulated healthcare products
- Familiarity with visual regression testing and Chromatic`,
  },
  {
    company: "Cobalt Finance",
    title: "Senior React Engineer",
    location: "Manchester, UK",
    employmentType: "Full-time",
    source: "Referral",
    status: "SCREENING",
    createdDaysAgo: 9,
    appliedDaysAgo: 8,
    history: [
      ["SAVED", "APPLIED", 8],
      ["APPLIED", "SCREENING", 5],
    ],
    description: `Cobalt Finance builds internal tools for treasury teams. You will own the React front end of a trading dashboard where correctness and clarity matter more than flash.

Requirements
- 4+ years of experience shipping React applications
- Strong TypeScript and state management skills
- Experience building complex data tables and forms
- Experience with automated testing using Vitest or Jest
- Working knowledge of SQL and relational data modelling
- Ability to explain technical trade-offs to non-engineers

Nice to have
- Experience with financial or regulated products
- Familiarity with Next.js server components`,
  },
  {
    company: "Atlas Travel",
    title: "Full-Stack Engineer",
    location: "Bristol, UK",
    employmentType: "Full-time",
    source: "Otta",
    status: "APPLIED",
    createdDaysAgo: 6,
    appliedDaysAgo: 5,
    history: [["SAVED", "APPLIED", 5]],
    description: `Atlas Travel helps independent hotels sell directly to guests. Our small product team owns the booking engine end to end.

Requirements
- Experience building full-stack features with React and Node.js
- Strong understanding of REST API design and PostgreSQL
- Experience deploying applications on AWS
- Familiarity with Docker and containerised development
- Ability to work across frontend and backend without hand-offs
- Experience with GraphQL is a plus

Nice to have
- Experience with payment integrations
- Exposure to infrastructure as code using Terraform`,
  },
  {
    company: "Meridian Retail",
    title: "Lead Frontend Engineer",
    location: "London, UK",
    employmentType: "Full-time",
    source: "LinkedIn",
    status: "REJECTED",
    createdDaysAgo: 4,
    appliedDaysAgo: 3,
    history: [
      ["SAVED", "APPLIED", 3],
      ["APPLIED", "REJECTED", 1],
    ],
    description: `Meridian Retail is rebuilding its storefront for peak trading. This is a hands-on lead role for someone who enjoys setting direction as much as shipping code.

Requirements
- Proven experience leading a frontend team of five or more engineers
- Deep React and TypeScript expertise
- Experience owning performance budgets for high-traffic commerce sites
- Strong stakeholder management across product, design and merchandising
- Experience with hiring, mentoring and running performance reviews
- Familiarity with A/B testing and analytics instrumentation

Nice to have
- Experience with headless commerce platforms
- Knowledge of SEO for large catalogues`,
  },
  {
    company: "Lumen Analytics",
    title: "Frontend Platform Engineer",
    location: "Remote (EU)",
    employmentType: "Full-time",
    source: "Saved from newsletter",
    status: "SAVED",
    createdDaysAgo: 1,
    appliedDaysAgo: null,
    history: [],
    description: `Lumen Analytics gives product teams self-serve access to event data. The platform team owns the frontend build, shared libraries and developer experience.

Requirements
- Strong TypeScript and React experience
- Experience with Next.js and modern bundlers
- Experience maintaining shared packages in a monorepo
- Knowledge of CI/CD pipelines and GitHub Actions
- Comfortable debugging build performance and dependency issues
- Clear documentation habits and asynchronous communication

Nice to have
- Experience with Turborepo and pnpm workspaces
- Familiarity with design tokens and theming`,
  },
];

const CV_TEXT = `ALEX MORGAN
Senior Frontend Engineer
alex.morgan@example.com | London, UK | github.com/alexmorgan

SUMMARY
Senior frontend engineer with 8 years of experience building accessible, high-performance web applications. I specialise in React and TypeScript design systems, performance budgets and developer experience. Comfortable leading small teams and partnering closely with product and design.

EXPERIENCE
Northwind Labs — Senior Frontend Engineer
2022 – Present
- Led the migration of a 40-screen analytics dashboard to Next.js App Router, cutting first paint from 3.1s to 0.9s and reducing client bundle size by 38%.
- Built and maintained a TypeScript component library used by four product teams; migrated 38 legacy components with zero visual regressions.
- Introduced Playwright end-to-end tests and a CI preview environment, reducing release regressions by 60%.
- Mentored three mid-level engineers and ran the frontend guild's accessibility clinic.

Brightside Commerce — Frontend Engineer
2019 – 2022
- Rebuilt the checkout flow in React and TypeScript, improving conversion by 11% and reducing support tickets by a quarter.
- Introduced Storybook and visual regression testing for 120 components.
- Worked with designers to define the first design tokens and dark theme.

Pinecone Studio — Junior Web Developer
2017 – 2019
- Delivered marketing sites for 14 clients using React, Gatsby and headless CMSs.
- Improved Lighthouse performance scores from an average of 62 to 94.

EDUCATION
University of Bristol — BSc Computer Science
2013 – 2016
First-class honours. Dissertation on accessible interaction design.

SKILLS
Languages: TypeScript, JavaScript, HTML, CSS, SQL
Frameworks: React, Next.js, Remix, Tailwind CSS
Testing: Playwright, Vitest, Testing Library, Storybook
Tools: Git, GitHub Actions, Figma, Vercel, Docker

PROJECTS
OpenA11y — Maintainer
An open-source accessibility linter for React components with 2.4k GitHub stars. Built the rule engine in TypeScript and authored documentation.

Budget Lens — Creator
A Chrome extension that estimates the performance cost of third-party scripts before they load.

CERTIFICATIONS
AWS Certified Cloud Practitioner (2023)
`;

const STATUS_LABELS: Record<Status, string> = {
  SAVED: "Saved",
  APPLIED: "Applied",
  SCREENING: "Screening",
  INTERVIEW: "Interview",
  OFFER: "Offer",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
};

/** Documents to pre-generate for the strongest application. */
const MATERIALS: Array<{ type: MaterialType; horizon?: "4_weeks" | "12_weeks" }> = [
  { type: "COVER_LETTER" },
  { type: "CV_SUGGESTIONS" },
  { type: "ROADMAP", horizon: "12_weeks" },
  { type: "INTERVIEW_PREP" },
];

function daysAgo(days: number, hour = 10) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  date.setUTCHours(hour, 0, 0, 0);
  return date;
}

async function main() {
  const { prisma } = await import("@/lib/db");
  const { ingestCv } = await import("@/lib/cv/ingest");
  const { analyzeJob } = await import("@/lib/jobs/analyze");

  console.log("Seeding HireFlow demo data…");

  // Idempotent: keep the same User row so existing demo sessions stay valid,
  // and reset only the data that belongs to the account.
  const existing = await prisma.user.findUnique({
    where: { email: DEMO_EMAIL },
    select: { id: true },
  });

  let userId: string;

  if (existing) {
    await prisma.$transaction([
      prisma.application.deleteMany({ where: { userId: existing.id } }),
      prisma.job.deleteMany({ where: { userId: existing.id } }),
      prisma.cv.deleteMany({ where: { userId: existing.id } }),
      prisma.usageLog.deleteMany({ where: { userId: existing.id } }),
    ]);
    userId = existing.id;
    console.log("Reset previous demo data.");
  } else {
    const created = await prisma.user.create({
      data: {
        email: DEMO_EMAIL,
        passwordHash: "",
        name: "Alex Morgan",
      },
      select: { id: true },
    });
    userId = created.id;
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash,
      name: "Alex Morgan",
      headline: "Senior Frontend Engineer",
      location: "London, UK",
    },
  });

  const file = new File([CV_TEXT], "alex-morgan-cv.txt", {
    type: "text/plain",
  });
  const cv = await ingestCv(userId, file);
  console.log(`CV indexed: ${cv.chunkCount} chunks.`);

  const applications: Array<{
    id: string;
    company: string;
    title: string;
    status: Status;
    score: number;
  }> = [];

  for (const job of JOBS) {
    const result = await analyzeJob(userId, {
      cvId: cv.cvId,
      company: job.company,
      title: job.title,
      location: job.location,
      employmentType: job.employmentType,
      description: job.description,
    });

    const createdAt = daysAgo(job.createdDaysAgo);
    const appliedAt =
      job.appliedDaysAgo === null ? null : daysAgo(job.appliedDaysAgo, 12);
    const lastTransition = job.history.at(-1);
    const updatedAt = lastTransition
      ? daysAgo(lastTransition[2], 14)
      : createdAt;

    await prisma.application.update({
      where: { id: result.applicationId },
      data: {
        status: job.status,
        appliedAt,
        source: job.source,
        createdAt,
        updatedAt,
      },
    });

    // Keep the analysis event on the day the application was created.
    await prisma.applicationEvent.updateMany({
      where: {
        applicationId: result.applicationId,
        type: "ANALYSIS_COMPLETED",
      },
      data: { createdAt },
    });

    for (const [from, to, days] of job.history) {
      await prisma.applicationEvent.create({
        data: {
          applicationId: result.applicationId,
          type: "STATUS_CHANGED",
          note: `${STATUS_LABELS[from]} → ${STATUS_LABELS[to]}`,
          createdAt: daysAgo(days, 14),
        },
      });
    }

    applications.push({
      id: result.applicationId,
      company: job.company,
      title: job.title,
      status: job.status,
      score: result.overallScore,
    });

    console.log(
      `Analysis: ${job.company} — ${job.title} (${result.overallScore}/100, ${job.status})`,
    );
  }

  // Pre-generate one version of each material for the Northwind application.
  const primary = applications.find(
    (application) => application.company === "Northwind Labs",
  );

  if (primary) {
    const { loadMaterialContext } = await import(
      "@/lib/generation/context"
    );
    const { streamMaterial } = await import("@/lib/generation/generate");
    const { saveGeneratedMaterial } = await import("@/lib/generation/persist");

    for (const material of MATERIALS) {
      const context = await loadMaterialContext(userId, primary.id);
      const generation = await streamMaterial(context, {
        type: material.type,
        tone: "professional",
        length: "standard",
        emphasis: "experience",
        horizon: material.horizon ?? "4_weeks",
        interviewFocus: "balanced",
        note: "",
      });

      let content = "";
      for await (const chunk of generation.stream) {
        content += chunk;
      }

      const usage = generation.getUsage();
      const saved = await saveGeneratedMaterial({
        userId,
        applicationId: primary.id,
        type: material.type,
        content,
        model: generation.model,
        promptVersion: generation.promptVersion,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
      });

      console.log(`Generated ${material.type} v${saved.version}.`);
    }
  }

  console.log("");
  console.log("Demo account ready:");
  console.log(`  Email:    ${DEMO_EMAIL}`);
  console.log(`  Password: ${DEMO_PASSWORD}`);
  console.log(`  CV:       ${cv.cvId}`);
  console.log(`  Apps:     ${applications.length}`);

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error("Seed failed:", error);
  process.exitCode = 1;
});
