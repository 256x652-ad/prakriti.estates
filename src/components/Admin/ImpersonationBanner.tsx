"use client";

import React from "react";
import { useSession } from "next-auth/react";
import { stopImpersonationAction } from "@/modules/admin/actions/impersonationActions";

export default function ImpersonationBanner() {
  const { data: session, update } = useSession();

  const user = session?.user as any;
  const impersonatorId = user?.impersonatorId;

  if (!impersonatorId) {
    return null; // Normal operation, hide banner.
  }

  const handleRevert = async () => {
    try {
      await stopImpersonationAction(user.id);
      await update({ revertImpersonation: true });
      window.location.href = "/admin/users";
    } catch (e) {
      console.error("Revert failed", e);
    }
  };

  return (
    <div className="fixed top-0 left-0 w-full z-50 bg-red-600 text-white px-4 py-2 shadow-2xl flex items-center justify-between border-b-2 border-red-800">
      <div className="flex items-center space-x-3">
        <span className="text-xl animate-pulse">⚠️</span>
        <div>
          <p className="font-bold text-xs uppercase tracking-wider">
            SECURITY WARNING: ACTIVE SUPER ADMIN IMPERSONATION SESSION
          </p>
          <p className="text-[11px] text-red-100">
            You are acting as User <span className="font-mono bg-red-900/90 px-1.5 py-0.5 rounded font-bold">{user.id}</span>.
            All mutations are heavily audited under Admin ID <span className="font-mono">{impersonatorId}</span>.
          </p>
        </div>
      </div>
      <button
        onClick={handleRevert}
        className="bg-white hover:bg-red-50 text-red-700 font-extrabold py-1 px-3.5 rounded-lg text-xs transition-colors shadow-md cursor-pointer"
      >
        Revert to Super Admin
      </button>
    </div>
  );
}
