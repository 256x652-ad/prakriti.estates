"use client";

import React, { useState } from "react";
import { impersonateUserAction } from "@/modules/admin/actions/impersonationActions";
import { onboardConsultantAction } from "@/modules/admin/actions/consultantAdminActions";
import { useSession } from "next-auth/react";

interface UserItem {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  roles: string[];
  kycStatus: string;
  propertiesCount: number;
  createdAt: string;
}

export default function UserManagementTable({ users }: { users: UserItem[] }) {
  const { data: session, update } = useSession();
  const [searchTerm, setSearchTerm] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const filteredUsers = users.filter((u) => {
    const q = searchTerm.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.phone.includes(q) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      u.id.includes(q)
    );
  });

  const handleImpersonate = async (targetUser: UserItem) => {
    const reason = prompt(
      `Enter compliance/support reason for impersonating ${targetUser.name} (${targetUser.phone}):`
    );
    if (!reason || !reason.trim()) {
      alert("A valid reason is required for administrative impersonation.");
      return;
    }

    setIsProcessing(true);
    try {
      const result = await impersonateUserAction(targetUser.id, reason);
      if (result.success) {
        // Trigger NextAuth session callback update
        const adminId = (session?.user as any)?.id;
        const adminRole = (session?.user as any)?.roles?.[0] || "ADMIN";

        await update({
          impersonateUserId: targetUser.id,
          impersonateRoles: targetUser.roles,
          impersonatorId: adminId,
          impersonatorRole: adminRole,
        });

        alert(`Now impersonating ${targetUser.name}. A security banner will remain visible.`);
        window.location.href = "/dashboard";
      }
    } catch (err: any) {
      alert("Impersonation failed: " + err.message);
      setIsProcessing(false);
    }
  };

  const handleMakeConsultant = async (userId: string) => {
    if (!confirm("Are you sure you want to onboard this user as a certified Prakriti Consultant?")) {
      return;
    }
    setIsProcessing(true);
    try {
      await onboardConsultantAction(userId);
      window.location.reload();
    } catch (err: any) {
      alert("Failed to onboard consultant: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-3">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by name, phone, email, or user ID..."
          className="w-full sm:max-w-md text-xs p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <span className="text-xs text-slate-500 font-medium">
          Showing {filteredUsers.length} of {users.length} users
        </span>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
              <tr>
                <th className="p-4">User</th>
                <th className="p-4">Roles</th>
                <th className="p-4">KYC Status</th>
                <th className="p-4">Listings</th>
                <th className="p-4">Registered</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    No users matching criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-4">
                      <div className="font-bold text-slate-900">{u.name}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{u.phone}</div>
                      {u.email && <div className="text-[11px] text-slate-400">{u.email}</div>}
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {u.roles.map((r) => (
                          <span
                            key={r}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              r === "ADMIN" || r === "SUPER_ADMIN"
                                ? "bg-purple-100 text-purple-800"
                                : r === "CONSULTANT"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {r}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                          u.kycStatus === "VERIFIED"
                            ? "bg-emerald-100 text-emerald-800"
                            : u.kycStatus === "MANUAL_REVIEW"
                            ? "bg-amber-100 text-amber-800"
                            : u.kycStatus === "REJECTED"
                            ? "bg-red-100 text-red-800"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {u.kycStatus}
                      </span>
                    </td>
                    <td className="p-4 font-bold text-slate-800">{u.propertiesCount}</td>
                    <td className="p-4 text-slate-500">
                      {new Date(u.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="p-4 text-right space-x-2">
                      {!u.roles.includes("CONSULTANT") && (
                        <button
                          disabled={isProcessing}
                          onClick={() => handleMakeConsultant(u.id)}
                          className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-amber-50 text-amber-800 hover:bg-amber-100 transition disabled:opacity-50"
                        >
                          + Consultant
                        </button>
                      )}
                      <button
                        disabled={isProcessing}
                        onClick={() => handleImpersonate(u)}
                        className="px-3 py-1.5 rounded-xl text-[11px] font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-sm transition disabled:opacity-50"
                      >
                        Impersonate 👤
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
