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
}

function statusBadge(status: string) {
  const colors: Record<string, string> = {
    ACTIVE: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    PAUSED: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    ARCHIVED:
      "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    COMPLETED:
      "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    DRAFT: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500",
  };
  const cls =
    colors[status] ??
    "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
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
      <p className="text-gray-400 text-sm py-4">No campaigns synced yet.</p>
    );
  }

  return (
    <div className="overflow-x-auto border border-gray-200 dark:border-gray-800 rounded-lg">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-900 text-left">
            <th className="px-4 py-2 font-medium">Campaign</th>
            <th className="px-4 py-2 font-medium">Status</th>
            <th className="px-4 py-2 font-medium text-right">Impressions</th>
            <th className="px-4 py-2 font-medium text-right">Clicks</th>
            <th className="px-4 py-2 font-medium text-right">CTR</th>
            <th className="px-4 py-2 font-medium text-right">Spend</th>
            <th className="px-4 py-2 font-medium text-right">Conversions</th>
          </tr>
        </thead>
        <tbody>
          {campaigns.map((c) => (
            <tr
              key={c.id}
              className="border-t border-gray-100 dark:border-gray-800"
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
                {c.totalConversions.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
