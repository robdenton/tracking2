interface Campaign {
  id: string;
  campaignUrn: string;
  name: string;
  status: string;
  type: string | null;
  costType: string | null;
  totalImpressions: number;
  totalClicks: number;
  totalSpend: number;
  totalConversions: number;
  ctr: number;
  cpm: number;
}

function statusBadge(status: string) {
  const colors: Record<string, string> = {
    ACTIVE: "bg-accent-light text-accent-strong",
    PAUSED: "bg-[#FEF3C7] text-[#92400E]900300",
    ARCHIVED:
      "bg-surface-sunken text-text-secondary",
    COMPLETED:
      "bg-accent-light text-accent-strong",
    DRAFT: "bg-surface-sunken text-text-secondary",
  };
  const cls =
    colors[status] ??
    "bg-surface-sunken text-text-secondary";
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}
    >
      {status.toLowerCase()}
    </span>
  );
}

export function CampaignsTable({ campaigns }: { campaigns: Campaign[] }) {
  if (campaigns.length === 0) {
    return (
      <p className="text-text-muted text-sm py-4">No campaigns synced yet.</p>
    );
  }

  return (
    <div className="overflow-x-auto border border-border-light rounded-lg">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-surface-sunken text-left">
            <th className="px-4 py-2 font-medium">Campaign</th>
            <th className="px-4 py-2 font-medium">Status</th>
            <th className="px-4 py-2 font-medium text-right">Impressions</th>
            <th className="px-4 py-2 font-medium text-right">Clicks</th>
            <th className="px-4 py-2 font-medium text-right">CTR</th>
            <th className="px-4 py-2 font-medium text-right">Spend</th>
            <th className="px-4 py-2 font-medium text-right">CPM</th>
            <th className="px-4 py-2 font-medium text-right">Conversions</th>
          </tr>
        </thead>
        <tbody>
          {campaigns.map((c) => (
            <tr
              key={c.id}
              className="border-t border-border-light"
            >
              <td className="px-4 py-2 max-w-[300px] truncate" title={c.name}>
                {c.name}
              </td>
              <td className="px-4 py-2">{statusBadge(c.status)}</td>
              <td className="px-4 py-2 text-right font-mono">
                {c.totalImpressions.toLocaleString()}
              </td>
              <td className="px-4 py-2 text-right font-mono">
                {c.totalClicks.toLocaleString()}
              </td>
              <td className="px-4 py-2 text-right font-mono">
                {(c.ctr * 100).toFixed(2)}%
              </td>
              <td className="px-4 py-2 text-right font-mono">
                ${c.totalSpend.toFixed(2)}
              </td>
              <td className="px-4 py-2 text-right font-mono">
                ${c.cpm.toFixed(2)}
              </td>
              <td className="px-4 py-2 text-right font-mono">
                {c.totalConversions.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
