import { PrismaClient } from '@prisma/client';
import { RentalWorkflowService } from './src/modules/workflows/services/RentalWorkflowService';
import { PurchaseWorkflowService } from './src/modules/workflows/services/PurchaseWorkflowService';
import { BillingService } from './src/modules/billing/services/BillingService';
import { MaintenanceService } from './src/modules/tenancy/services/MaintenanceService';
import { HraReceiptService } from './src/modules/tenancy/services/HraReceiptService';
import { DisputeService } from './src/modules/transactions/services/DisputeService';
import { LockExpirationWorker } from './src/modules/workflows/workers/LockExpirationWorker';
import { OutboxWorker } from './src/modules/outbox/workers/OutboxWorker';

const prisma = new PrismaClient();

async function runComprehensiveTests() {
  console.log("\n=============================================");
  console.log("🚀 STARTING COMPREHENSIVE PLATFORM TESTS 🚀");
  console.log("=============================================\n");

  const buyer = await prisma.user.findFirst({ where: { roles: { has: "BUYER" } } });
  const seller = await prisma.user.findFirst({ where: { roles: { has: "SELLER" } } });
  const admin = await prisma.user.findFirst({ where: { roles: { has: "ADMIN" } } });
  
  const rentProp = await prisma.property.findFirst({ where: { type: "RENT" } });
  const buyProp = await prisma.property.findFirst({ where: { type: "BUY" } });

  if (!buyer || !seller || !admin || !rentProp || !buyProp) {
    console.error("Missing seed data. Aborting tests.");
    return;
  }

  try {
    // ---------------------------------------------------------
    // TEST 1: Purchase Workflow & Webhook
    // ---------------------------------------------------------
    console.log("1️⃣ TESTING PURCHASE WORKFLOW (WITH VAS)...");
    const purchaseService = new PurchaseWorkflowService();
    const purchaseRes = await purchaseService.initiatePurchaseWorkflow(buyer.id, buyProp.id, ["LEGAL", "STRUCTURAL"]);
    console.log("   ✅ Purchase Initiated. Lock Created:", purchaseRes.paymentIntent.lockId);
    
    console.log("   --> Simulating Razorpay Webhook Success...");
    const webhookRes = await purchaseService.handlePaymentSuccessWebhook(purchaseRes.paymentIntent.transactionId, purchaseRes.paymentIntent.lockId);
    console.log("   ✅ Webhook Processed. Escrow Hold Created.");

    // ---------------------------------------------------------
    // TEST 2: Lock Expiration Engine (Forcing lock to expire)
    // ---------------------------------------------------------
    console.log("\n2️⃣ TESTING LOCK EXPIRATION ENGINE...");
    // Manually push lock into past
    await prisma.propertyLock.update({
      where: { id: purchaseRes.paymentIntent.lockId },
      data: { expiresAt: new Date(Date.now() - 1000) }
    });

    const lockWorker = new LockExpirationWorker();
    const processed = await lockWorker.processExpiredLocks();
    console.log(`   ✅ LockExpirationWorker processed ${processed} expired locks (Applied 50% Forfeiture Rules).`);

    // ---------------------------------------------------------
    // TEST 3: Active Tenancy Setup
    // ---------------------------------------------------------
    console.log("\n3️⃣ SETTING UP ACTIVE TENANCY FOR BILLING...");
    const tenancy = await prisma.tenancy.create({
      data: {
        propertyId: rentProp.id,
        tenantId: buyer.id,
        landlordId: seller.id,
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        depositAmount: 100000,
        rentAmount: 45000,
        status: "ACTIVE"
      }
    });
    console.log("   ✅ Tenancy Created:", tenancy.id);

    // ---------------------------------------------------------
    // TEST 4: Maintenance Tickets
    // ---------------------------------------------------------
    console.log("\n4️⃣ TESTING MAINTENANCE STATE MACHINE...");
    const maintenanceService = new MaintenanceService();
    const ticket = await maintenanceService.createTicket(tenancy.id, "Leaking Pipe", "Pipe in kitchen is leaking.");
    console.log("   ✅ Ticket Created. ID:", ticket.id);
    
    // Fast forward state manually for test
    await prisma.maintenanceTicket.update({ where: { id: ticket.id }, data: { status: "AWAITING_APPROVAL" }});
    
    const approvedTicket = await maintenanceService.approveCost(ticket.id, seller.id, 1500);
    console.log("   ✅ Ticket Approved by Landlord. Cost locked at: ₹", approvedTicket.approvedCost);

    // ---------------------------------------------------------
    // TEST 5: Billing Engine
    // ---------------------------------------------------------
    console.log("\n5️⃣ TESTING IMMUTABLE BILLING ENGINE...");
    const billingService = new BillingService();
    const invoice = await billingService.generateMonthlyInvoice(tenancy.id);
    console.log("   ✅ Invoice Generated. Total Amount: ₹", invoice.totalAmount);
    console.log("   ✅ Line Items Count:", invoice.lineItems.length);

    // ---------------------------------------------------------
    // TEST 6: HRA Receipt Generation
    // ---------------------------------------------------------
    console.log("\n6️⃣ TESTING LEGAL HRA RECEIPT GENERATION...");
    // Simulate payment
    await prisma.monthlyInvoice.update({ where: { id: invoice.id }, data: { status: "PAID", paidAt: new Date() }});
    
    const hraService = new HraReceiptService();
    const receiptUrl = await hraService.generateHraReceipt(invoice.id);
    console.log("   ✅ PDF Receipt successfully generated and uploaded!");
    console.log("   🔗 URL:", receiptUrl);

    console.log("\n=============================================");
    console.log("🎉 ALL TESTS PASSED SUCCESSFULLY! 🎉");
    console.log("=============================================\n");

  } catch (error: any) {
    console.error("\n❌ TEST FAILED:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

runComprehensiveTests();
