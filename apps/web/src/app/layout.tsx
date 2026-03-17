import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { auth } from "@/lib/auth";
import { UserMenu } from "./components/UserMenu";
import { NavDropdown } from "./components/NavDropdown";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Marketing Activity Impact",
  description: "Deterministic uplift measurement for marketing activities",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div className="min-h-screen bg-background">
          {session?.user && (
            <header className="border-b border-gray-200 dark:border-gray-800 px-6 py-4">
              <div className="max-w-7xl mx-auto flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <a href="/" className="text-lg font-semibold shrink-0">
                    Marketing Activity Impact
                    <span className="ml-2 text-xs font-normal text-gray-500">
                      Phase 0
                    </span>
                  </a>
                  <nav className="flex items-center gap-4 text-sm">
                    <a
                      href="/"
                      className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                    >
                      Overview
                    </a>
                    <NavDropdown
                      label="Channels"
                      items={[
                        { href: "/channels/newsletter", label: "Newsletter" },
                        { href: "/channels/podcast", label: "Podcast" },
                        { href: "/youtube-import", label: "YouTube" },
                        { href: "/linkedin-analysis", label: "LinkedIn" },
                        {
                          href: "/channels/company-linkedin",
                          label: "Company LinkedIn",
                        },
                        {
                          href: "/channels/linkedin-ads",
                          label: "LinkedIn Ads",
                        },
                      ]}
                    />
                    <a
                      href="/build-in-public"
                      className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                    >
                      Build in Public
                    </a>
                    <a
                      href="/dub-links"
                      className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                    >
                      Dub Links
                    </a>
                    <a
                      href="/pipelines"
                      className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                    >
                      Pipelines
                    </a>
                    <a
                      href="/measurement-explained"
                      className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                    >
                      Measurement
                    </a>
                  </nav>
                </div>
                <UserMenu user={session.user} />
              </div>
            </header>
          )}
          <main className="max-w-7xl mx-auto px-6 py-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
