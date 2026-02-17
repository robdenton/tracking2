import { getPendingSearchResults, acceptSearchResult, rejectSearchResult } from "@/lib/data";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

export default async function ReviewPage() {
  const results = await getPendingSearchResults();

  async function handleAccept(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    await acceptSearchResult(id);
    revalidatePath("/youtube-import/review");
  }

  async function handleReject(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    await rejectSearchResult(id);
    revalidatePath("/youtube-import/review");
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Review Search Results</h1>
      <p className="text-sm text-gray-500 mb-6">{results.length} pending videos</p>

      {results.length === 0 && (
        <p className="text-gray-400">No pending results to review</p>
      )}

      <div className="space-y-4">
        {results.map(result => (
          <div key={result.id} className="border border-gray-200 dark:border-gray-800 rounded-lg p-4 flex gap-4">
            {result.thumbnailUrl && (
              <img src={result.thumbnailUrl} alt="" className="w-32 h-24 object-cover rounded" />
            )}
            <div className="flex-1">
              <h3 className="font-semibold mb-1">
                <a href={result.url} target="_blank" className="hover:underline">
                  {result.title}
                </a>
              </h3>
              <p className="text-sm text-gray-500 mb-2">
                {result.channelTitle} • Published {result.publishedAt}
              </p>
              {result.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
                  {result.description}
                </p>
              )}
              <div className="flex gap-2">
                <form action={handleAccept}>
                  <input type="hidden" name="id" value={result.id} />
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                  >
                    Accept
                  </button>
                </form>
                <form action={handleReject}>
                  <input type="hidden" name="id" value={result.id} />
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                  >
                    Reject
                  </button>
                </form>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
