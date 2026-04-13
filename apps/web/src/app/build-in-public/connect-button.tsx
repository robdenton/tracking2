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
          className="px-4 py-2 bg-accent-light text-accent-strong rounded-md text-sm font-medium hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Connecting..." : "Connect LinkedIn"}
        </button>
        {error && <p className="text-xs text-[#B85C38]">{error}</p>}
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
          className="px-4 py-2 bg-accent-light text-accent-strong rounded-md text-sm font-medium hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Connecting..." : "Connect LinkedIn"}
        </button>
        <p className="text-xs text-[#92400E]">
          Connection in progress... complete the LinkedIn login to finish.
        </p>
        {error && <p className="text-xs text-[#B85C38]">{error}</p>}
      </div>
    );
  }

  // Connected — show status panel
  return (
    <div className="flex items-center gap-4">
      <div className="text-right text-xs text-text-secondary space-y-0.5">
        <div>
          <span className="font-medium text-text-primary">
            {account.linkedinName ?? "LinkedIn"}
          </span>
          {" · "}
          {account.postCount} posts
        </div>
        <div>
          Last sync: {formatDate(account.lastSyncAt)}
          {account.lastSyncError && (
            <span className="text-[#B85C38] ml-1" title={account.lastSyncError}>
              (error)
            </span>
          )}
        </div>
      </div>
      <button
        onClick={handleSync}
        disabled={syncing}
        className="px-3 py-1.5 text-xs font-medium rounded-md border border-border text-text-primary hover:bg-surface-sunken 800 disabled:opacity-50"
      >
        {syncing ? "Syncing..." : "Sync Now"}
      </button>
      <button
        onClick={handleDisconnect}
        disabled={loading}
        className="px-3 py-1.5 text-xs text-text-muted hover:text-[#B85C38]400 disabled:opacity-50"
      >
        Disconnect
      </button>
      {syncResult && (
        <span className="text-xs text-accent-strong">{syncResult}</span>
      )}
      {error && <span className="text-xs text-[#B85C38]">{error}</span>}
    </div>
  );
}
