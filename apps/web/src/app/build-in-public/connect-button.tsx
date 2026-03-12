"use client";

import { useState } from "react";

export function ConnectLinkedInButton({
  isConnected,
  isPending,
}: {
  isConnected: boolean;
  isPending: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isConnected) {
    return (
      <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
        LinkedIn Connected
      </span>
    );
  }

  if (isPending) {
    return (
      <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
        Connection Pending...
      </span>
    );
  }

  async function handleConnect() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/unipile/connect", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error ?? "Failed to generate connection link");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleConnect}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Connecting..." : "Connect LinkedIn"}
      </button>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
