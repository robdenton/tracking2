interface EmployeeRow {
  name: string | null;
  email: string;
  image: string | null;
  postCount: number;
  totalImpressions: number;
  totalReactions: number;
  totalComments: number;
  totalReposts: number;
}

export function EmployeeTable({ employees }: { employees: EmployeeRow[] }) {
  if (employees.length === 0) {
    return (
      <p className="text-gray-400 text-sm">No connected employees yet.</p>
    );
  }

  return (
    <div className="overflow-x-auto border border-gray-200 dark:border-gray-800 rounded-lg">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
            <th className="text-left py-2 px-3 font-medium">Employee</th>
            <th className="text-right py-2 px-3 font-medium">Posts</th>
            <th className="text-right py-2 px-3 font-medium">Impressions</th>
            <th className="text-right py-2 px-3 font-medium">Reactions</th>
            <th className="text-right py-2 px-3 font-medium">Comments</th>
            <th className="text-right py-2 px-3 font-medium">Reposts</th>
            <th className="text-right py-2 px-3 font-medium">Engagement</th>
          </tr>
        </thead>
        <tbody>
          {employees.map((emp) => {
            const engagement =
              emp.totalReactions + emp.totalComments + emp.totalReposts;
            return (
              <tr
                key={emp.email}
                className="border-b border-gray-100 dark:border-gray-900"
              >
                <td className="py-2 px-3 flex items-center gap-2">
                  {emp.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={emp.image}
                      alt=""
                      className="h-6 w-6 rounded-full"
                    />
                  )}
                  <span>{emp.name ?? emp.email}</span>
                </td>
                <td className="text-right py-2 px-3 font-mono">
                  {emp.postCount}
                </td>
                <td className="text-right py-2 px-3 font-mono">
                  {emp.totalImpressions.toLocaleString()}
                </td>
                <td className="text-right py-2 px-3 font-mono">
                  {emp.totalReactions.toLocaleString()}
                </td>
                <td className="text-right py-2 px-3 font-mono">
                  {emp.totalComments.toLocaleString()}
                </td>
                <td className="text-right py-2 px-3 font-mono">
                  {emp.totalReposts.toLocaleString()}
                </td>
                <td className="text-right py-2 px-3 font-mono font-semibold">
                  {engagement.toLocaleString()}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
