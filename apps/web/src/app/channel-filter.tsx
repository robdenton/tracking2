"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function ChannelFilter({
  channels,
  active,
}: {
  channels: string[];
  active: string | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function select(channel: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (channel) {
      params.set("channel", channel);
    } else {
      params.delete("channel");
    }
    router.push(`/?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-2 mb-6">
      <button
        onClick={() => select(null)}
        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
          active === null
            ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
            : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
        }`}
      >
        All
      </button>
      {channels.map((ch) => (
        <button
          key={ch}
          onClick={() => select(ch)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors capitalize ${
            active === ch
              ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
          }`}
        >
          {ch}
        </button>
      ))}
    </div>
  );
}
