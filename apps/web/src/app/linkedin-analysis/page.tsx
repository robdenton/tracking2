"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LinkedInAnalysisPage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [pageText, setPageText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [step, setStep] = useState<1 | 2>(1);

  function handleStep1(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmed = url.trim();
    if (!trimmed.includes("linkedin.com/company/")) {
      setError(
        "Please enter a LinkedIn company URL (e.g. https://www.linkedin.com/company/linearapp/)"
      );
      return;
    }

    // Ensure it points at the posts feed
    let feedUrl = trimmed;
    if (!feedUrl.includes("/posts")) {
      feedUrl = feedUrl.replace(/\/$/, "") + "/posts/?feedView=all";
    }

    setUrl(feedUrl);
    setStep(2);

    // Open the LinkedIn page in a new tab for the user
    window.open(feedUrl, "_blank");
  }

  async function handleStep2(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setStatus(null);

    if (pageText.trim().length < 50) {
      setError("The pasted text is too short. Make sure you selected the entire page (Cmd+A) before copying.");
      return;
    }

    setLoading(true);
    setStatus("Parsing posts and categorising with AI...");

    try {
      const res = await fetch("/api/linkedin-analysis/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, pageText: pageText.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "An unexpected error occurred.");
        setLoading(false);
        setStatus(null);
        return;
      }

      if (data.cached) {
        setStatus(
          `Using cached analysis (${data.postCount} posts). Redirecting...`
        );
      } else {
        setStatus(`Categorised ${data.postCount} posts. Redirecting...`);
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
        Analyse a company&#39;s LinkedIn content strategy by categorising their
        recent posts using AI.
      </p>

      {/* Step 1: Enter URL */}
      {step === 1 && (
        <form onSubmit={handleStep1} className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold">
              1
            </span>
            <span className="text-sm font-medium">Enter company URL</span>
          </div>
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
              required
            />
          </div>
          <button
            type="submit"
            disabled={!url.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next →
          </button>
        </form>
      )}

      {/* Step 2: Paste page text */}
      {step === 2 && (
        <form onSubmit={handleStep2} className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold">
              2
            </span>
            <span className="text-sm font-medium">
              Copy &amp; paste the page content
            </span>
          </div>

          <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md text-sm text-blue-700 dark:text-blue-300">
            <p className="font-medium mb-1">
              The LinkedIn page should have opened in a new tab.
            </p>
            <ol className="list-decimal list-inside space-y-1 text-xs">
              <li>Scroll down on the LinkedIn page to load more posts</li>
              <li>
                Select everything on the page:{" "}
                <kbd className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900 rounded text-xs font-mono">
                  Cmd+A
                </kbd>
              </li>
              <li>
                Copy it:{" "}
                <kbd className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900 rounded text-xs font-mono">
                  Cmd+C
                </kbd>
              </li>
              <li>
                Paste it into the box below:{" "}
                <kbd className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900 rounded text-xs font-mono">
                  Cmd+V
                </kbd>
              </li>
            </ol>
          </div>

          <div>
            <label htmlFor="page-text" className="block text-sm font-medium mb-1">
              Page content
            </label>
            <textarea
              id="page-text"
              value={pageText}
              onChange={(e) => setPageText(e.target.value)}
              placeholder="Paste the full LinkedIn page text here..."
              rows={8}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              disabled={loading}
              required
            />
            {pageText.length > 0 && (
              <div className="text-xs text-gray-400 mt-1">
                {pageText.length.toLocaleString()} characters pasted
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setStep(1);
                setPageText("");
                setError(null);
              }}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
              disabled={loading}
            >
              ← Back
            </button>
            <button
              type="submit"
              disabled={loading || pageText.trim().length < 50}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Analysing..." : "Analyse posts"}
            </button>
          </div>
        </form>
      )}

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
          <li>You open the company&#39;s LinkedIn posts page (we open it for you)</li>
          <li>You copy the full page text and paste it here</li>
          <li>Claude Haiku categorises each post by its content type</li>
          <li>Results are saved so you can revisit without re-analysing (24hr cache)</li>
        </ol>
      </div>
    </div>
  );
}
