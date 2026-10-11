import { prisma } from "@/infrastructure/database/prisma";

/**
 * MOCK NEXTAUTH / AUTH.JS ENGINE
 * This demonstrates the specific JWT callback manipulation required 
 * to securely implement User Impersonation.
 */

export const authOptions = {
  // ... standard providers (Credentials, Google, etc)
  callbacks: {
    /**
     * JWT Callback: This is where the magic happens.
     * When an Admin hits the /api/admin/impersonate route, we mutate the token.
     */
    async jwt({ token, user, trigger, session }: any) {
      
      // 1. Initial Login
      if (user) {
        token.id = user.id;
        token.roles = user.roles;
      }

      // 2. Triggering Impersonation
      if (trigger === "update" && session?.impersonateUserId) {
        // Strict security check: Ensure the current token actually belongs to an Admin
        if (!token.roles.includes("ADMIN")) {
          throw new Error("SECURITY BREACH: Non-admin attempted impersonation.");
        }

        // Create the Audit Log in the database before proceeding
        await prisma.impersonationAuditLog.create({
          data: {
            adminUserId: token.id,
            targetUserId: session.impersonateUserId,
            reason: session.reason || "Admin Debugging Session",
          }
        });

        // Store the original Admin ID so we can render the warning banner and allow reverting
        token.impersonatorId = token.id;
        
        // Mutate the token to become the target user
        token.id = session.impersonateUserId;
        token.roles = ["USER"]; // Downgrade roles to standard user to match target
      }

      // 3. Reverting Impersonation
      if (trigger === "update" && session?.revertImpersonation) {
        if (!token.impersonatorId) {
          throw new Error("Cannot revert: No active impersonation session.");
        }

        // Restore Admin privileges
        token.id = token.impersonatorId;
        token.roles = ["ADMIN"];
        delete token.impersonatorId;

        // In a real app, update the ImpersonationAuditLog to set endedAt = now()
      }

      return token;
    },

    /**
     * Session Callback: Passes the JWT claims down to the Client Components
     */
    async session({ session, token }: any) {
      session.user.id = token.id;
      session.user.roles = token.roles;
      
      // Expose this claim to the frontend so the <ImpersonationBanner /> can render!
      if (token.impersonatorId) {
        session.user.impersonatorId = token.impersonatorId;
      }

      return session;
    }
  }
};
