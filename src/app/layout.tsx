import type { Metadata, Viewport } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "HireFlow — evidence-backed job applications",
    template: "%s · HireFlow",
  },
  description:
    "HireFlow scores your CV against any job description, shows the evidence behind every point, and drafts the cover letter, CV improvements and interview prep you need next.",
  applicationName: "HireFlow",
  keywords: [
    "job application",
    "CV analysis",
    "cover letter",
    "interview prep",
    "ATS",
  ],
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#17151d" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
