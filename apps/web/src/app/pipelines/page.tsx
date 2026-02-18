import { getPipelineStatuses } from "@/lib/data";
import { PipelineCard } from "./PipelineCard";

export const dynamic = "force-dynamic";

export default async function PipelinesPage() {
  const pipelines = await getPipelineStatuses();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Pipelines</h1>
        <p className="text-sm text-gray-500 mt-1">
          Data collection pipelines running daily on Vercel. All times in UTC.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {pipelines.map((pipeline) => (
          <PipelineCard key={pipeline.config.taskName} pipeline={pipeline} />
        ))}
      </div>
    </div>
  );
}
