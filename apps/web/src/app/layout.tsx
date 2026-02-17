import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div className="min-h-screen bg-background">
          <header className="border-b border-gray-200 dark:border-gray-800 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <a href="/" className="text-lg font-semibold">
                  Marketing Activity Impact
                </a>
                <span className="ml-2 text-xs text-gray-500">Phase 0</span>
              </div>
              <nav className="flex gap-4 text-sm">
                <a
                  href="/channels/newsletter"
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Newsletter Analytics
                </a>
                <a
                  href="/youtube-import"
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  YouTube Import
                </a>
              </nav>
            </div>
          </header>
          <main className="px-6 py-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
