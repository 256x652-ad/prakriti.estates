import { getServerSession } from "next-auth";
import { authOptions } from "@/infrastructure/auth/authOptions";
import { prisma } from "@/infrastructure/database/prisma";
import { redirect } from "next/navigation";
import { approvePropertyAction, rejectPropertyAction } from "@/modules/properties/actions/adminPropertyActions";
import { Button } from "@/components/ui/Button";

export default async function PendingPropertiesPage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    redirect("/login?callbackUrl=/admin/properties/pending");
  }

  const userRoles = (session.user as any).roles || [];
  if (!userRoles.includes("ADMIN") && !userRoles.includes("SUPER_ADMIN")) {
    redirect("/");
  }

  // Fetch all listings awaiting approval
  const pendingProperties = await prisma.property.findMany({
    where: { lifecycleStatus: "PENDING_APPROVAL" },
    include: { owner: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="max-w-6xl mx-auto py-10 px-4 space-y-6">
      <div className="flex justify-between items-center pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Pending Property Verifications</h1>
          <p className="text-sm text-slate-500">Review seller listings, verify KYC tier, and publish to the public map.</p>
        </div>
        <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full">
          {pendingProperties.length} Awaiting Approval
        </span>
      </div>

      {pendingProperties.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 text-slate-400">
          <span className="text-4xl block mb-2">🎉</span>
          No pending property approvals in queue. All listings reviewed!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {pendingProperties.map((prop) => (
            <div key={prop.id} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="h-44 rounded-2xl overflow-hidden bg-slate-100 border border-slate-100">
                {prop.images && prop.images[0] ? (
                  <img src={prop.images[0]} alt={prop.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-3xl">🏡</div>
                )}
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-800">
                  {prop.type}
                </span>
                <h3 className="font-bold text-lg text-slate-900 mt-1">{prop.title}</h3>
                <p className="text-xl font-black text-slate-900 mt-1">₹{Number(prop.price).toLocaleString("en-IN")}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1 text-slate-600">
                <p><span className="font-bold">Seller:</span> {prop.owner.firstName} {prop.owner.lastName} ({prop.owner.phoneNumber})</p>
                <p><span className="font-bold">Seller KYC:</span> {prop.owner.kycStatus}</p>
                <p className="truncate"><span className="font-bold">Description:</span> {prop.description}</p>
              </div>

              <div className="pt-2 flex items-center gap-3">
                <form
                  action={async () => {
                    "use server";
                    await approvePropertyAction(prop.id);
                  }}
                  className="flex-1"
                >
                  <Button type="submit" className="w-full">
                    Approve & Publish 🌿
                  </Button>
                </form>

                <form
                  action={async () => {
                    "use server";
                    await rejectPropertyAction(prop.id, "Did not meet listing criteria");
                  }}
                >
                  <Button type="submit" variant="destructive">
                    Reject
                  </Button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
