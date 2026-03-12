"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ConnectLinkedInButton({
  isConnected,
  isPending,
}: {
  isConnected: boolean;
  isPending: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  async function handleDisconnect() {
    setLoading(true);
    setError(null);
    try {
      await fetch("/api/unipile/disconnect", { method: "POST" });
      router.refresh();
    } catch {
      setError("Failed to disconnect. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (isConnected) {
    return (
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
          LinkedIn Connected
        </span>
        <button
          onClick={handleDisconnect}
          disabled={loading}
          className="px-3 py-1.5 text-sm text-gray-500 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-50"
        >
          {loading ? "..." : "Disconnect"}
        </button>
      </div>
    );
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
      {isPending && (
        <p className="text-xs text-yellow-600 dark:text-yellow-400">
          Connection in progress... complete the LinkedIn login to finish.
        </p>
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
