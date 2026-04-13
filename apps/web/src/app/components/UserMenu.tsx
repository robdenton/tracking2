"use client";

import { signOut } from "next-auth/react";

export function UserMenu({ user }: { user: { name?: string | null; email?: string | null; image?: string | null } }) {
  return (
    <div className="flex items-center gap-3">
      <div className="text-right">
        <div className="text-[13px] font-medium text-text-primary">{user.name}</div>
        <div className="text-[11px] text-text-muted">{user.email}</div>
      </div>
      {user.image && (
        <img
          src={user.image}
          alt={user.name || "User"}
          className="h-8 w-8 rounded-full ring-1 ring-border-light"
        />
      )}
      <button
        onClick={() => signOut({ callbackUrl: "/auth/signin" })}
        className="rounded-full border border-border px-3 py-1 text-[12px] font-medium text-text-secondary hover:bg-surface-sunken hover:text-text-primary transition-colors"
      >
        Sign Out
      </button>
    </div>
  );
}
