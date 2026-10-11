import { PrismaClient } from '@prisma/client';
import { RentalWorkflowService } from './src/modules/workflows/services/RentalWorkflowService';
import { PurchaseWorkflowService } from './src/modules/workflows/services/PurchaseWorkflowService';

const prisma = new PrismaClient();

async function runTests() {
  console.log("\n--- STARTING WORKFLOW TESTS ---\n");
  
  // Get test users from the seed
  const buyer = await prisma.user.findFirst({ where: { roles: { has: "BUYER" } } });
  const rentProp = await prisma.property.findFirst({ where: { type: "RENT" } });
  const buyProp = await prisma.property.findFirst({ where: { type: "BUY" } });

  if (!buyer || !rentProp || !buyProp) {
    console.error("Missing seed data. Did you run the seed script?");
    return;
  }

  try {
    console.log(`1. Testing Rental Workflow (User: ${buyer.firstName}, Property: ${rentProp.title})`);
    const rentalService = new RentalWorkflowService();
    const rentalResult = await rentalService.initiateRentalWorkflow(buyer.id, rentProp.id);
    console.log("SUCCESS! Result:", JSON.stringify(rentalResult, null, 2));

    console.log(`\n2. Testing Purchase Workflow with VAS (User: ${buyer.firstName}, Property: ${buyProp.title})`);
    const purchaseService = new PurchaseWorkflowService();
    const purchaseResult = await purchaseService.initiatePurchaseWorkflow(buyer.id, buyProp.id, ["LEGAL", "VASTU"]);
    console.log("SUCCESS! Result:", JSON.stringify(purchaseResult, null, 2));

  } catch (error: any) {
    console.error("\nTEST FAILED:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
