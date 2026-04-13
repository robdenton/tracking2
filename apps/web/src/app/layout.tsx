import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { auth } from "@/lib/auth";
import { UserMenu } from "./components/UserMenu";
import { Sidebar } from "./components/Sidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
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
        className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} antialiased`}
      >
        <div className="min-h-screen bg-background">
          {session?.user ? (
            <div className="flex">
              {/* Sidebar */}
              <Sidebar />

              {/* Main content area */}
              <div className="flex-1 ml-[var(--sidebar-width)]">
                {/* Top bar — user menu only */}
                <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-sm border-b border-border-light px-8 py-3">
                  <div className="flex items-center justify-end">
                    <UserMenu user={session.user} />
                  </div>
                </header>

                <main className="px-8 py-6 max-w-[1200px]">{children}</main>
              </div>
            </div>
          ) : (
            <main className="max-w-7xl mx-auto px-6 py-6">{children}</main>
          )}
        </div>
      </body>
    </html>
  );
}
