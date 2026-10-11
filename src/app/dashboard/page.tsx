import { getServerSession } from "next-auth";
import { authOptions } from "@/infrastructure/auth/authOptions";
import { redirect } from "next/navigation";
import { prisma } from "@/infrastructure/database/prisma";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect("/login?callbackUrl=/dashboard");
  }

  const userId = (session.user as any).id;

  // Query user's dashboard records
  const [user, locks, transactions, savedProperties] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        phoneNumber: true,
        firstName: true,
        lastName: true,
        roles: true,
        kycStatus: true,
        createdAt: true,
      },
    }),
    prisma.propertyLock.findMany({
      where: { userId },
      include: { property: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.ledgerTransaction.findMany({
      where: { userId },
      include: { property: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.savedProperty.findMany({
      where: { userId },
      include: { property: true },
      take: 5,
    }),
  ]);

  const userRoles = user?.roles || [];
  const isAdmin = userRoles.includes("ADMIN") || userRoles.includes("SUPER_ADMIN");

  return (
    <main className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Top Header Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-3xl">👋</span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                Welcome back, {user?.firstName || "Member"}!
              </h1>
            </div>
            <p className="text-sm text-slate-500 font-mono">
              Phone: {user?.phoneNumber} | Member since:{" "}
              {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "2026"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Roles Badges */}
            {userRoles.map((role) => (
              <span
                key={role}
                className="text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200"
              >
                {role}
              </span>
            ))}

            {/* KYC Status Badge */}
            <span
              className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                user?.kycStatus === "VERIFIED"
                  ? "bg-green-100 text-green-800 border border-green-200"
                  : "bg-amber-100 text-amber-800 border border-amber-200"
              }`}
            >
              KYC: {user?.kycStatus}
            </span>

            {/* Admin Portal Quicklink if authorized */}
            {isAdmin && (
              <Link
                href="/admin"
                className="text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-200 hover:bg-purple-200 transition"
              >
                Super Admin Portal →
              </Link>
            )}
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
            <span className="text-xs font-bold uppercase text-slate-400">Active Token Locks</span>
            <p className="text-3xl font-black text-slate-900">{locks.length}</p>
            <span className="text-xs text-emerald-600 font-medium">Escrow protected</span>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
            <span className="text-xs font-bold uppercase text-slate-400">Ledger Transactions</span>
            <p className="text-3xl font-black text-slate-900">{transactions.length}</p>
            <span className="text-xs text-slate-500 font-medium">Deposits & fees</span>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
            <span className="text-xs font-bold uppercase text-slate-400">Saved Properties</span>
            <p className="text-3xl font-black text-slate-900">{savedProperties.length}</p>
            <span className="text-xs text-slate-500 font-medium">Watchlist items</span>
          </div>
        </div>

        {/* Active Property Locks Table */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-900">Your Escrow Property Locks</h2>
            <Link href="/search" className="text-xs font-bold text-emerald-700 hover:underline">
              Find New Properties →
            </Link>
          </div>

          {locks.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              <span className="text-4xl block mb-2">🔒</span>
              You have no active token locks. Explore listings on the marketplace to lock a property.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {locks.map((lock) => (
                <div key={lock.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-slate-900">
                      {lock.property.title}
                    </h3>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                      Lock Ref: {lock.id} | Amount: ₹{lock.amount.toString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                        lock.status === "ACTIVE"
                          ? "bg-green-100 text-green-800"
                          : lock.status === "REQUESTED"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {lock.status}
                    </span>
                    <Link
                      href={`/property/${lock.property.slug || lock.property.id}`}
                      className="text-xs font-semibold text-emerald-700 hover:underline"
                    >
                      View Listing →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
