"use client";

import { signOut } from "next-auth/react";

export function UserMenu({ user }: { user: { name?: string | null; email?: string | null; image?: string | null } }) {
  return (
    <div className="flex items-center gap-4">
      <div className="text-right text-sm">
        <div className="font-medium">{user.name}</div>
        <div className="text-xs text-gray-500">{user.email}</div>
      </div>
      {user.image && (
        <img
          src={user.image}
          alt={user.name || "User"}
          className="h-8 w-8 rounded-full"
        />
      )}
      <button
        onClick={() => signOut({ callbackUrl: "/auth/signin" })}
        className="rounded-md bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-200"
      >
        Sign Out
      </button>
    </div>
  );
}
