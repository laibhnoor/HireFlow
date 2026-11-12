import type { Metadata } from "next";
import { Cpu, Gauge, LogOut, UserRound } from "lucide-react";

import { signOutAction } from "@/app/(app)/actions";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireUser } from "@/lib/auth-guards";
import { env } from "@/lib/env";
import { formatResetTime, getDailyUsage, type Quota } from "@/lib/usage";

export const metadata: Metadata = {
  title: "Settings",
};

export default async function SettingsPage() {
  const user = await requireUser();
  const mockMode = env.llmMockMode;
  const usage = await getDailyUsage(user.id);

  const usageRows: Array<{ label: string; hint: string; quota: Quota }> = [
    {
      label: "Job analyses",
      hint: "Requirement extraction, retrieval and scoring",
      quota: usage.analyses,
    },
    {
      label: "Generated materials",
      hint: "Cover letters, suggestions, roadmaps and interview prep",
      quota: usage.materials,
    },
    {
      label: "CV uploads",
      hint: "Extraction and embedding of new documents",
      quota: usage.cvUploads,
    },
  ];

  return (
    <>
      <PageHeader
        title="Settings"
        description="Your account, AI configuration and data."
      />

      <div className="space-y-5">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <UserRound className="size-4 text-muted-foreground" aria-hidden />
              <CardTitle>Profile</CardTitle>
            </div>
            <CardDescription>
              Details used to personalise generated documents.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Name
                </dt>
                <dd className="mt-1 text-sm">{user.name}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Email
                </dt>
                <dd className="mt-1 break-all text-sm">{user.email}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Cpu className="size-4 text-muted-foreground" aria-hidden />
                <CardTitle>AI provider</CardTitle>
              </div>
              <Badge variant={mockMode ? "warning" : "success"}>
                {mockMode ? "Demo mode" : "Connected"}
              </Badge>
            </div>
            <CardDescription>
              {mockMode
                ? "No OpenAI key is configured. Analyses and documents use deterministic demo output so you can explore the full workflow."
                : "Requests are sent to OpenAI. CV text is used only to produce your analysis and documents."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Chat model
                </dt>
                <dd className="mt-1 font-mono text-xs">{env.OPENAI_CHAT_MODEL}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Embedding model
                </dt>
                <dd className="mt-1 font-mono text-xs">
                  {env.OPENAI_EMBEDDING_MODEL}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Gauge className="size-4 text-muted-foreground" aria-hidden />
                <CardTitle>Daily usage</CardTitle>
              </div>
              <Badge variant="outline">
                Resets {formatResetTime(usage.resetsAt)}
              </Badge>
            </div>
            <CardDescription>
              Cost controls apply per account and reset at midnight UTC.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {usageRows.map((row) => {
              const percent = Math.min(
                100,
                Math.round((row.quota.used / row.quota.limit) * 100),
              );
              const full = !row.quota.allowed;

              return (
                <div key={row.label}>
                  <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
                    <span className="font-medium">{row.label}</span>
                    <span
                      className={
                        full
                          ? "font-medium tabular-nums text-destructive"
                          : "tabular-nums text-muted-foreground"
                      }
                    >
                      {row.quota.used} / {row.quota.limit}
                    </span>
                  </div>
                  <div
                    className="h-1.5 overflow-hidden rounded-full bg-muted"
                    role="img"
                    aria-label={`${row.label}: ${row.quota.used} of ${row.quota.limit} used today`}
                  >
                    <div
                      className={
                        full
                          ? "h-full rounded-full bg-destructive"
                          : percent >= 75
                            ? "h-full rounded-full bg-warning"
                            : "h-full rounded-full bg-primary/80"
                      }
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {row.hint}
                  </p>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Session</CardTitle>
            <CardDescription>
              Sign out of this device. Your data stays in your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={signOutAction}>
              <Button type="submit" variant="outline" className="gap-2">
                <LogOut aria-hidden />
                Sign out
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
