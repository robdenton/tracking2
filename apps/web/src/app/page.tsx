import { getAllReports } from "@/lib/data";
import { ChannelFilter } from "./channel-filter";
import { ActivityTable } from "./components/ActivityTable";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ channel?: string }>;
}) {
  const { channel } = await searchParams;
  const allReports = await getAllReports();

  // Extract unique channels for the filter
  const channels = Array.from(
    new Set(allReports.map((r) => r.activity.channel)),
  ).sort();

  // Filter by channel if one is selected
  const reports = channel
    ? allReports.filter((r) => r.activity.channel === channel)
    : allReports;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Activity Impact Summary</h1>
      <p className="text-sm text-gray-500 mb-4">
        Baseline window: {process.env.BASELINE_WINDOW_DAYS || 14} days |
        Post window: {process.env.POST_WINDOW_DAYS || 7} days
      </p>

      <ChannelFilter channels={channels} active={channel ?? null} />

      {reports.length === 0 ? (
        <p className="text-gray-500">
          No activities found. Seed the database with{" "}
          <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">
            npm run setup
          </code>
          .
        </p>
      ) : (
        <div className="overflow-x-auto">
          <ActivityTable reports={reports} selectedChannel={channel ?? null} />
        </div>
      )}
    </div>
  );
}
