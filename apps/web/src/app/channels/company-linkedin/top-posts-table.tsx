interface CompanyPost {
  id: string;
  postText: string | null;
  postDate: string;
  shareUrl: string | null;
  impressions: number;
  reactions: number;
  comments: number;
  reposts: number;
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen).trimEnd() + "...";
}

export function CompanyTopPostsTable({ posts }: { posts: CompanyPost[] }) {
  return (
    <div className="overflow-x-auto border border-gray-200 dark:border-gray-800 rounded-lg">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
            <th className="text-left py-2 px-3 font-medium">Post</th>
            <th className="text-left py-2 px-3 font-medium">Date</th>
            <th className="text-right py-2 px-3 font-medium">Impressions</th>
            <th className="text-right py-2 px-3 font-medium">Reactions</th>
            <th className="text-right py-2 px-3 font-medium">Comments</th>
            <th className="text-right py-2 px-3 font-medium">Reposts</th>
          </tr>
        </thead>
        <tbody>
          {posts.map((post) => (
            <tr
              key={post.id}
              className="border-b border-gray-100 dark:border-gray-900"
            >
              <td className="py-2 px-3 max-w-xs">
                {post.shareUrl ? (
                  <a
                    href={post.shareUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {post.postText
                      ? truncate(post.postText, 80)
                      : "View post"}
                  </a>
                ) : post.postText ? (
                  truncate(post.postText, 80)
                ) : (
                  <span className="text-gray-400">No text</span>
                )}
              </td>
              <td className="py-2 px-3 whitespace-nowrap text-gray-500">
                {post.postDate}
              </td>
              <td className="text-right py-2 px-3 font-mono">
                {post.impressions.toLocaleString()}
              </td>
              <td className="text-right py-2 px-3 font-mono">
                {post.reactions.toLocaleString()}
              </td>
              <td className="text-right py-2 px-3 font-mono">
                {post.comments.toLocaleString()}
              </td>
              <td className="text-right py-2 px-3 font-mono">
                {post.reposts.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
