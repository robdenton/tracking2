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
    <div className="overflow-x-auto border border-border-light rounded-lg">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border-light bg-surface-sunken">
            <th className="text-left py-2 px-3 font-medium">Post</th>
            <th className="text-left py-2 px-3 font-medium">Date</th>
            <th className="text-right py-2 px-3 font-medium">Reactions</th>
            <th className="text-right py-2 px-3 font-medium">Comments</th>
            <th className="text-right py-2 px-3 font-medium">Reposts</th>
            <th className="text-right py-2 px-3 font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          {posts.map((post) => {
            const total = post.reactions + post.comments + post.reposts;
            return (
              <tr
                key={post.id}
                className="border-b border-border-light900"
              >
                <td className="py-2 px-3 max-w-xs">
                  {post.shareUrl ? (
                    <a
                      href={post.shareUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent-strong hover:underline"
                    >
                      {post.postText
                        ? truncate(post.postText, 80)
                        : "View post"}
                    </a>
                  ) : post.postText ? (
                    truncate(post.postText, 80)
                  ) : (
                    <span className="text-text-muted">No text</span>
                  )}
                </td>
                <td className="py-2 px-3 whitespace-nowrap text-text-secondary">
                  {post.postDate}
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
                <td className="text-right py-2 px-3 font-mono font-semibold">
                  {total.toLocaleString()}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
