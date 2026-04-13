import Link from "next/link";

export default function AuthErrorPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const error = searchParams.error;

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-sunken">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-surface p-8 shadow-lg">
        <div>
          <h2 className="text-center text-3xl font-bold tracking-tight text-text-primary">
            Authentication Error
          </h2>
          <div className="mt-4 rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">
              {error === "AccessDenied"
                ? "Access denied. Only @granola.so email addresses are allowed."
                : "An error occurred during authentication. Please try again."}
            </p>
          </div>
        </div>
        <Link
          href="/auth/signin"
          className="flex w-full justify-center rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent"
        >
          Try Again
        </Link>
      </div>
    </div>
  );
}
