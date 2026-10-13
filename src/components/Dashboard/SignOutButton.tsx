"use client";

import React from "react";
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export default function SignOutButton({ className }: { className?: string }) {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/" })}
      className={
        className ||
        "text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 transition cursor-pointer flex items-center gap-1"
      }
      title="Sign Out of Account"
    >
      <LogOut className="w-3 h-3" />
      <span>Sign Out</span>
    </button>
  );
}
