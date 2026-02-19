"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LinkedInAnalysisPage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setStatus(null);

    const trimmed = url.trim();
    if (!trimmed) return;

    if (!trimmed.includes("linkedin.com/company/")) {
      setError("Please enter a LinkedIn company URL (e.g. https://www.linkedin.com/company/linearapp/)");
      return;
    }

    setLoading(true);
    setStatus("Launching browser and scraping posts...");

    try {
      const res = await fetch("/api/linkedin-analysis/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "An unexpected error occurred.");
        setLoading(false);
        setStatus(null);
        return;
      }

      if (data.cached) {
        setStatus(`Using cached analysis from ${new Date(data.scrapedAt).toLocaleString()}. Redirecting...`);
      } else {
        setStatus(`Analysed ${data.postCount} posts. Redirecting...`);
      }

      router.push(`/linkedin-analysis/${data.companySlug}`);
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
      setStatus(null);
    }
  }

  return (
    <div className="max-w-2xl mx-auto mt-12">
      <h1 className="text-2xl font-semibold mb-2">LinkedIn Content Analyser</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-8 text-sm">
        Enter a LinkedIn company page URL to scrape their recent posts and
        automatically categorise the content using AI.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="linkedin-url"
            className="block text-sm font-medium mb-1"
          >
            LinkedIn company URL
          </label>
          <input
            id="linkedin-url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.linkedin.com/company/linearapp/"
            className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading || !url.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Analysing..." : "Analyse posts"}
        </button>
      </form>

      {status && (
        <div className="mt-4 text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
          {loading && (
            <span className="inline-block w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          )}
          {status}
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="mt-10 border-t border-gray-200 dark:border-gray-700 pt-6">
        <h2 className="text-sm font-medium text-gray-500 mb-3">How it works</h2>
        <ol className="space-y-2 text-sm text-gray-600 dark:text-gray-400 list-decimal list-inside">
          <li>A headless browser scrapes the company&#39;s recent posts feed</li>
          <li>Claude Haiku categorises each post by its content type</li>
          <li>Results are saved so you can revisit without re-scraping (cached for 24 hours)</li>
        </ol>
        <p className="mt-3 text-xs text-gray-400">
          Note: LinkedIn&#39;s public feed is scraped without authentication. If the
          company&#39;s posts are behind a login wall you will see an error.
        </p>
      </div>
    </div>
  );
}
