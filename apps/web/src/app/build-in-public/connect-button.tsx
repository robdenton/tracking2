"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface AccountInfo {
  status: string;
  linkedinName?: string | null;
  connectedAt?: string | null;
  lastSyncAt?: string | null;
  lastSyncError?: string | null;
  postCount: number;
}

export function ConnectLinkedInButton({
  account,
}: {
  account: AccountInfo | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<string | null>(null);

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

  async function handleSync() {
    setSyncing(true);
    setError(null);
    setSyncResult(null);
    try {
      const res = await fetch("/api/unipile/sync", { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        setSyncResult(`Synced ${data.synced} posts`);
        router.refresh();
      } else {
        setError(data.error ?? "Sync failed");
      }
    } catch {
      setError("Sync failed. Please try again.");
    } finally {
      setSyncing(false);
    }
  }

  function formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return "Never";
    return new Date(dateStr).toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  // Not connected — show connect button
  if (!account || account.status === "disconnected") {
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

  // Pending — waiting for auth to complete
  if (account.status === "pending") {
    return (
      <div className="flex flex-col items-end gap-1">
        <button
          onClick={handleConnect}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Connecting..." : "Connect LinkedIn"}
        </button>
        <p className="text-xs text-yellow-600 dark:text-yellow-400">
          Connection in progress... complete the LinkedIn login to finish.
        </p>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    );
  }

  // Connected — show status panel
  return (
    <div className="flex items-center gap-4">
      <div className="text-right text-xs text-gray-500 space-y-0.5">
        <div>
          <span className="font-medium text-gray-700 dark:text-gray-300">
            {account.linkedinName ?? "LinkedIn"}
          </span>
          {" · "}
          {account.postCount} posts
        </div>
        <div>
          Last sync: {formatDate(account.lastSyncAt)}
          {account.lastSyncError && (
            <span className="text-red-500 ml-1" title={account.lastSyncError}>
              (error)
            </span>
          )}
        </div>
      </div>
      <button
        onClick={handleSync}
        disabled={syncing}
        className="px-3 py-1.5 text-xs font-medium rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800 disabled:opacity-50"
      >
        {syncing ? "Syncing..." : "Sync Now"}
      </button>
      <button
        onClick={handleDisconnect}
        disabled={loading}
        className="px-3 py-1.5 text-xs text-gray-400 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-50"
      >
        Disconnect
      </button>
      {syncResult && (
        <span className="text-xs text-green-600">{syncResult}</span>
      )}
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}
