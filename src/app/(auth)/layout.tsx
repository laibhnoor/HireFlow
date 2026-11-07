import Link from "next/link";
import { Check } from "lucide-react";

import { Logo } from "@/components/logo";

const proofPoints = [
  "Requirement-by-requirement scoring",
  "Evidence quoted from your own CV",
  "Cover letters, CV edits and interview prep",
];

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            background:
              "radial-gradient(700px circle at 15% 0%, white, transparent 55%)",
          }}
        />

        <div className="relative">
          <Link
            href="/"
            className="inline-flex rounded-xl bg-background px-3 py-2"
            aria-label="HireFlow home"
          >
            <Logo />
          </Link>
        </div>

        <div className="relative max-w-md">
          <h2 className="text-balance text-3xl font-semibold leading-tight tracking-tight">
            Every application, backed by evidence.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-primary-foreground/75">
            HireFlow shows you what your CV actually proves — and what it
            doesn't — before you spend an evening on another application.
          </p>

          <ul className="mt-8 space-y-3">
            {proofPoints.map((point) => (
              <li key={point} className="flex items-center gap-2.5 text-sm">
                <span className="grid size-5 place-items-center rounded-full bg-primary-foreground/15">
                  <Check className="size-3" aria-hidden />
                </span>
                {point}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative">
          <div className="rounded-xl border border-primary-foreground/15 bg-primary-foreground/10 p-4 backdrop-blur-sm">
            <p className="text-sm">
              “I stopped guessing which roles were worth my time. The evidence
              panel told me more in ten seconds than an hour of reading the
              posting.”
            </p>
            <p className="mt-2 text-xs text-primary-foreground/70">
              Early HireFlow user · Product designer
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col">
        <div className="p-6 lg:hidden">
          <Link href="/" aria-label="HireFlow home" className="inline-flex">
            <Logo />
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center px-6 py-10">
          <div className="w-full max-w-sm">{children}</div>
        </div>

        <p className="px-6 pb-6 text-center text-xs text-muted-foreground">
          Your CV is stored privately and never shared with employers.
        </p>
      </div>
    </div>
  );
}
