"use client";

import React from "react";
import { signOut, useSession } from "next-auth/react";
import { LogOut } from "lucide-react";

export default function AdminHeaderActions() {
  const { data: session } = useSession();
  const userName = session?.user?.name || "Super Admin";

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-800 font-black text-xs">
          SA
        </div>
        <div className="text-left hidden sm:block">
          <span className="block text-xs font-bold text-slate-800 leading-tight">
            {userName}
          </span>
          <span className="block text-[10px] text-slate-400">Prakriti Operations</span>
        </div>
      </div>
      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
        title="Sign Out of Admin Console"
      >
        <LogOut className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Sign Out</span>
      </button>
    </div>
  );
}
