import Link from "next/link";
import {
  ArrowRight,
  Check,
  ClipboardList,
  FileCheck2,
  FileText,
  MessagesSquare,
  PenLine,
  Quote,
  Route,
  ShieldCheck,
  Sparkles,
  Target,
  Wand2,
} from "lucide-react";

import { ScoreRing } from "@/components/score-ring";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const dimensions = [
  { label: "Must-have skills", score: 88 },
  { label: "Relevant experience", score: 85 },
  { label: "Education", score: 70 },
  { label: "Projects", score: 90 },
];

const matchedSkills = ["React", "TypeScript", "Next.js", "Design systems"];
const missingSkills = ["GraphQL", "Playwright"];

const features = [
  {
    icon: Target,
    title: "Transparent match score",
    body: "A weighted rubric across skills, experience, education and projects. Every point is broken down by requirement, not guessed by a model.",
  },
  {
    icon: FileCheck2,
    title: "Evidence you can cite",
    body: "Each matched requirement links back to the exact CV section and line that supports it. Partial matches say what's missing.",
  },
  {
    icon: PenLine,
    title: "Tailored cover letters",
    body: "Drafts grounded in your real experience, with tone and length controls. Edit inline and export when it sounds like you.",
  },
  {
    icon: Wand2,
    title: "CV improvements",
    body: "Concrete rewrites for weak bullets, missing keywords and ATS gaps — with a hard rule against inventing experience.",
  },
  {
    icon: Route,
    title: "Gap-closing roadmap",
    body: "Missing skills ranked by how much they affect this role, with a focused learning plan instead of a generic course list.",
  },
  {
    icon: MessagesSquare,
    title: "Interview preparation",
    body: "Role-specific behavioural, technical and system design questions, each anchored to your CV and the job's real requirements.",
  },
];

const steps = [
  {
    icon: FileText,
    title: "Upload your CV",
    body: "PDF, DOCX or plain text. HireFlow parses your sections, then indexes your experience, projects and education for retrieval.",
  },
  {
    icon: ClipboardList,
    title: "Paste the job description",
    body: "Requirements are extracted and split into must-haves and nice-to-haves, so a long wish list doesn't distort your score.",
  },
  {
    icon: Sparkles,
    title: "Get your evidence-backed plan",
    body: "See what matches, what doesn't, and what to do about it — then generate the cover letter, roadmap and interview prep.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />

      <main id="main" className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-border/60">
          <div className="pointer-events-none absolute inset-0 grid-bg opacity-60" />
          <div
            className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full opacity-25 blur-3xl"
            style={{
              background:
                "radial-gradient(closest-side, var(--primary), transparent)",
            }}
          />

          <div className="relative mx-auto grid w-full max-w-6xl gap-16 px-6 pb-20 pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:pb-28 lg:pt-24">
            <div className="animate-fade-up">
              <Badge variant="outline" className="gap-1.5 border-primary/25 bg-primary/5 text-primary">
                <ShieldCheck className="size-3.5" aria-hidden />
                Evidence-first job matching
              </Badge>

              <h1 className="mt-5 text-balance text-4xl font-semibold leading-[1.06] tracking-tight sm:text-5xl lg:text-[3.4rem]">
                Know exactly why you match{" "}
                <span className="bg-gradient-to-r from-primary to-[oklch(0.62_0.2_320)] bg-clip-text text-transparent">
                  before you apply.
                </span>
              </h1>

              <p className="mt-5 max-w-xl text-pretty text-[17px] leading-relaxed text-muted-foreground">
                HireFlow reads your CV against any job description, scores the
                fit requirement by requirement, and shows the evidence behind
                every point. Then it drafts the materials that close the gap.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/signup"
                  className={buttonVariants({ size: "lg", className: "gap-2" })}
                >
                  Analyse your first job
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
                <a
                  href="#how-it-works"
                  className={buttonVariants({ variant: "outline", size: "lg" })}
                >
                  See how it works
                </a>
              </div>

              <ul className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                {["Free while in beta", "No credit card", "Your CV stays private"].map(
                  (item) => (
                    <li key={item} className="flex items-center gap-1.5">
                      <Check className="size-4 text-success" aria-hidden />
                      {item}
                    </li>
                  ),
                )}
              </ul>
            </div>

            {/* Product preview */}
            <div className="animate-fade-up animation-delay-150">
              <div className="relative">
                <div
                  className="absolute -inset-4 -z-10 rounded-[2rem] opacity-30 blur-2xl"
                  style={{
                    background:
                      "radial-gradient(closest-side, var(--primary), transparent)",
                  }}
                />
                <Card className="overflow-hidden shadow-xl shadow-primary/5">
                  <CardContent className="p-0">
                    <div className="flex items-center justify-between gap-4 border-b bg-muted/40 px-5 py-4">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">
                          Senior Frontend Engineer
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          Northwind Labs · Remote
                        </p>
                      </div>
                      <Badge variant="success" className="shrink-0">
                        Strong fit
                      </Badge>
                    </div>

                    <div className="grid gap-6 px-5 py-6 sm:grid-cols-[auto_1fr] sm:items-center">
                      <ScoreRing score={82} size={148} label="Match" />
                      <div className="space-y-3">
                        {dimensions.map((dimension) => (
                          <div key={dimension.label}>
                            <div className="mb-1 flex items-center justify-between text-[11px]">
                              <span className="text-muted-foreground">
                                {dimension.label}
                              </span>
                              <span className="font-medium tabular-nums">
                                {dimension.score}
                              </span>
                            </div>
                            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full bg-primary"
                                style={{ width: `${dimension.score}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4 border-t px-5 py-5">
                      <div>
                        <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                          Matched
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {matchedSkills.map((skill) => (
                            <Badge key={skill} variant="success">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                          Gaps
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {missingSkills.map((skill) => (
                            <Badge key={skill} variant="warning">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="border-t bg-muted/30 px-5 py-4">
                      <div className="flex gap-2.5">
                        <Quote
                          className="mt-0.5 size-4 shrink-0 text-primary"
                          aria-hidden
                        />
                        <div>
                          <p className="text-[13px] leading-relaxed">
                            Led the migration of a 40-screen dashboard to
                            Next.js App Router, cutting first paint from 3.1s to
                            0.9s.
                          </p>
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            Evidence · CV › Experience, bullet 3
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          <div className="relative border-t border-border/60 bg-muted/30">
            <div className="mx-auto grid w-full max-w-6xl grid-cols-1 divide-y divide-border/60 px-6 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              {[
                { value: "24", label: "requirements mapped per role" },
                { value: "100%", label: "of scores backed by CV evidence" },
                { value: "0", label: "invented skills or experience" },
              ].map((stat) => (
                <div key={stat.label} className="px-2 py-5 text-center sm:px-6">
                  <p className="text-2xl font-semibold tabular-nums">
                    {stat.value}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="mx-auto w-full max-w-6xl px-6 py-20 lg:py-24">
          <div className="max-w-2xl">
            <p className="text-sm font-medium text-primary">How it works</p>
            <h2 className="mt-2 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              From job posting to a plan in three steps.
            </h2>
            <p className="mt-3 text-muted-foreground">
              No dashboards to configure, no prompts to write. Bring a CV and a
              role you want, and HireFlow does the reading.
            </p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {steps.map((step, index) => (
              <Card key={step.title} className="relative overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
                      <step.icon className="size-5" aria-hidden />
                    </span>
                    <span className="text-3xl font-semibold text-border">
                      0{index + 1}
                    </span>
                  </div>
                  <h3 className="mt-4 font-semibold">{step.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {step.body}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Features */}
        <section id="features" className="border-y border-border/60 bg-muted/30">
          <div className="mx-auto w-full max-w-6xl px-6 py-20 lg:py-24">
            <div className="max-w-2xl">
              <p className="text-sm font-medium text-primary">The whole loop</p>
              <h2 className="mt-2 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                Everything after “I found a job I want.”
              </h2>
              <p className="mt-3 text-muted-foreground">
                Analysis is the start. HireFlow carries the same evidence
                through every document you send and every answer you prepare.
              </p>
            </div>

            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <Card key={feature.title} className="transition-colors hover:border-primary/30">
                  <CardContent className="p-6">
                    <span className="grid size-10 place-items-center rounded-lg bg-background text-primary ring-1 ring-border">
                      <feature.icon className="size-5" aria-hidden />
                    </span>
                    <h3 className="mt-4 font-semibold">{feature.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                      {feature.body}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Trust */}
        <section id="trust" className="mx-auto w-full max-w-6xl px-6 py-20 lg:py-24">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-sm font-medium text-primary">Why evidence</p>
              <h2 className="mt-2 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                A score you can actually argue with.
              </h2>
              <p className="mt-3 max-w-lg text-muted-foreground">
                Most tools give you a number and hope you trust it. HireFlow
                shows its work: the requirement, the weight, the verdict, and
                the line in your CV that supports it.
              </p>

              <ul className="mt-7 space-y-3.5">
                {[
                  "Requirement-level verdicts: matched, partial or missing.",
                  "Quoted evidence with a section and bullet reference.",
                  "A published rubric, so the same CV and job always score the same.",
                  "Explicit gaps — never invented experience to fill them.",
                ].map((item) => (
                  <li key={item} className="flex gap-2.5 text-sm">
                    <Check
                      className="mt-0.5 size-4 shrink-0 text-success"
                      aria-hidden
                    />
                    <span className="text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Card className="shadow-lg shadow-primary/5">
              <CardContent className="p-0">
                <div className="flex items-center justify-between border-b px-5 py-3.5">
                  <span className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                    Requirement detail
                  </span>
                  <Badge variant="success">Matched</Badge>
                </div>
                <div className="space-y-4 p-5">
                  <div>
                    <p className="text-sm font-medium">
                      “Production experience with React and TypeScript”
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Must-have · Skills · Weight 8
                    </p>
                  </div>

                  <div className="rounded-lg border border-success/25 bg-success/5 p-4">
                    <p className="text-[13px] leading-relaxed">
                      “Built and maintained a component library in TypeScript
                      used by four product teams; migrated 38 components from
                      legacy JavaScript with zero regressions.”
                    </p>
                    <p className="mt-2 text-[11px] font-medium text-muted-foreground">
                      Cited from CV › Experience › Platform Engineer
                    </p>
                  </div>

                  <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                    <div className="rounded-lg border px-3 py-2">
                      <span className="text-foreground">Evidence strength</span>
                      <br />
                      Direct · 0.91 similarity
                    </div>
                    <div className="rounded-lg border px-3 py-2">
                      <span className="text-foreground">Rubric</span>
                      <br />
                      v1.0 · skills 40 / exp 25 / edu 15
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* CTA */}
        <section className="px-6 pb-20 lg:pb-24">
          <div className="relative mx-auto w-full max-w-6xl overflow-hidden rounded-2xl border border-primary/20 bg-primary px-6 py-14 text-center text-primary-foreground sm:px-12">
            <div
              className="pointer-events-none absolute inset-0 opacity-20"
              style={{
                background:
                  "radial-gradient(600px circle at 20% 0%, white, transparent 60%)",
              }}
            />
            <div className="relative mx-auto max-w-2xl">
              <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                Stop guessing. Start with evidence.
              </h2>
              <p className="mt-3 text-pretty text-primary-foreground/80">
                Bring one CV and one job description. In a few minutes you'll
                know where you stand and exactly what to do next.
              </p>
              <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
                <Link
                  href="/signup"
                  className={buttonVariants({
                    size: "lg",
                    variant: "secondary",
                    className: "gap-2 bg-background text-foreground hover:bg-background/90",
                  })}
                >
                  Create your free account
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
                <Link
                  href="/login"
                  className={buttonVariants({
                    size: "lg",
                    variant: "outline",
                    className:
                      "border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground",
                  })}
                >
                  Sign in
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-2">
            <FileCheck2 className="size-4 text-primary" aria-hidden />
            <span className="font-medium text-foreground">HireFlow</span>
            <span className="text-border">·</span>
            <span>Evidence-backed applications</span>
          </div>
          <p>© {new Date().getFullYear()} HireFlow. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
