import Link from "next/link";

import { requireUser } from "@/lib/auth-guards";
import { AppMobileNav, AppSidebar } from "@/components/app/app-nav";
import { Logo } from "@/components/logo";
import { initials } from "@/lib/utils";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await requireUser();

  return (
    <div className="min-h-svh bg-muted/20">
      <AppSidebar user={user} />

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-md">
          <div className="flex h-14 items-center gap-4 px-4 sm:px-6">
            <Link
              href="/dashboard"
              aria-label="HireFlow dashboard"
              className="lg:hidden"
            >
              <Logo showWordmark={false} />
            </Link>
            <p className="hidden text-sm font-medium text-muted-foreground lg:block">
              Workspace
            </p>
            <div className="ml-auto flex items-center gap-2">
              <Link
                href="/settings"
                aria-label="Account settings"
                className="grid size-8 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary ring-offset-background transition-colors hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {initials(user.name)}
              </Link>
            </div>
          </div>
          <div className="border-t">
            <AppMobileNav />
          </div>
        </header>

        <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
