"use client";

import { useState } from "react";

export function ConnectLinkedInAdsButton({
  connection,
}: {
  connection: {
    adAccountName: string | null;
    connectedBy: string;
    expiresAt: string;
  } | null;
}) {
  const [loading, setLoading] = useState(false);

  async function handleConnect() {
    setLoading(true);
    try {
      const res = await fetch("/api/linkedin-ads/connect", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error ?? "Failed to start OAuth flow");
        setLoading(false);
      }
    } catch {
      alert("Failed to connect");
      setLoading(false);
    }
  }

  if (connection) {
    const expiryDate = new Date(connection.expiresAt);
    const daysUntilExpiry = Math.ceil(
      (expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    const isExpired = daysUntilExpiry <= 0;

    return (
      <div className="flex items-center gap-3">
        <div className="text-right text-xs">
          <div className="text-text-secondary">
            {connection.adAccountName ?? "LinkedIn Ads"} &middot;{" "}
            {connection.connectedBy}
          </div>
          <div
            className={
              isExpired
                ? "text-[#B85C38] font-medium"
                : daysUntilExpiry < 14
                  ? "text-amber-500"
                  : "text-accent-strong"
            }
          >
            {isExpired
              ? "Token expired"
              : `Token expires in ${daysUntilExpiry}d`}
          </div>
        </div>
        <button
          onClick={handleConnect}
          disabled={loading}
          className="px-3 py-1.5 rounded-md text-xs font-medium bg-accent-light text-accent-strong hover:bg-accent disabled:opacity-50"
        >
          {loading ? "Connecting..." : isExpired ? "Reconnect" : "Refresh"}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleConnect}
      disabled={loading}
      className="px-4 py-2 rounded-md text-sm font-medium bg-accent-light text-accent-strong hover:bg-accent disabled:opacity-50"
    >
      {loading ? "Connecting..." : "Connect LinkedIn Ads"}
    </button>
  );
}
