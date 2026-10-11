"use client";

import React from "react";
// import { useSession, update } from "next-auth/react";

/**
 * Global component rendered in the RootLayout.
 * It constantly monitors the session object. If `impersonatorId` exists,
 * it forces a red, un-dismissible banner across the entire application to prevent
 * the Admin from forgetting they are acting on behalf of a user.
 */
export default function ImpersonationBanner() {
  // MOCKING SESSION HOOK FOR DEMONSTRATION
  // const { data: session } = useSession();
  const session = {
    user: {
      id: "user_123",
      impersonatorId: "admin_999" // Assuming an active impersonation
    }
  };

  if (!session?.user?.impersonatorId) {
    return null; // Normal operation, hide banner.
  }

  const handleRevert = async () => {
    // Await NextAuth update to revert the token
    // await update({ revertImpersonation: true });
    console.log("Reverting back to Admin Identity...");
    alert("Reverting to Admin...");
  };

  return (
    <div className="fixed top-0 left-0 w-full z-50 bg-red-600 text-white px-4 py-2 shadow-lg flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <span className="text-xl animate-pulse">⚠️</span>
        <div>
          <p className="font-bold text-sm">SECURITY WARNING: ACTIVE IMPERSONATION SESSION</p>
          <p className="text-xs text-red-100">
            You are currently viewing and acting as User <span className="font-mono bg-red-800 px-1 rounded">{session.user.id}</span>.
            All actions are being audited.
          </p>
        </div>
      </div>
      <button 
        onClick={handleRevert}
        className="bg-white text-red-700 hover:bg-red-50 font-bold py-1.5 px-4 rounded text-sm transition-colors shadow"
      >
        Revert to Admin
      </button>
    </div>
  );
}
