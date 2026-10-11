import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Database for Prakriti Estates...');

  // 1. Clean Database (Optional for dev)
  await prisma.outboxEvent.deleteMany();
  await prisma.financialLedgerEntry.deleteMany();
  await prisma.ledgerTransaction.deleteMany();
  await prisma.invoiceLineItem.deleteMany();
  await prisma.monthlyInvoice.deleteMany();
  await prisma.maintenanceTicket.deleteMany();
  await prisma.meterReading.deleteMany();
  await prisma.tenancy.deleteMany();
  await prisma.propertyLock.deleteMany();
  await prisma.serviceRequest.deleteMany();
  await prisma.kycVerification.deleteMany();
  await prisma.property.deleteMany();
  await prisma.feeConfiguration.deleteMany();
  await prisma.user.deleteMany();

  // 2. Create Users
  const admin = await prisma.user.create({
    data: {
      phoneNumber: '+919999999999',
      firstName: 'Admin',
      lastName: 'Prakriti',
      roles: ['ADMIN'],
      kycStatus: 'VERIFIED',
    }
  });

  const seller = await prisma.user.create({
    data: {
      phoneNumber: '+918888888888',
      firstName: 'Rahul',
      lastName: 'Sharma',
      roles: ['SELLER'],
      kycStatus: 'VERIFIED',
      kycVerifications: {
        create: {
          provider: 'AADHAAR_API',
          providerRef: 'AADHAAR-TOKEN-123',
          documentType: 'AADHAAR',
          status: 'VERIFIED'
        }
      }
    }
  });

  const buyer = await prisma.user.create({
    data: {
      phoneNumber: '+917777777777',
      firstName: 'Priya',
      lastName: 'Patel',
      roles: ['BUYER'],
      kycStatus: 'VERIFIED',
      kycVerifications: {
        create: {
          provider: 'PAN_API',
          providerRef: 'PAN-TOKEN-456',
          documentType: 'PAN',
          status: 'VERIFIED'
        }
      }
    }
  });

  // 3. Setup Fee Configurations
  await prisma.feeConfiguration.createMany({
    data: [
      {
        type: 'BUYER_PLATFORM_FEE',
        method: 'FLAT_AMOUNT',
        value: 9999, // ₹9,999 flat fee
        effectiveFrom: new Date()
      },
      {
        type: 'SELLER_SUCCESS_FEE',
        method: 'PERCENTAGE',
        value: 1.5, // 1.5% success fee
        effectiveFrom: new Date()
      },
      {
        type: 'RENTAL_TOKEN',
        method: 'FLAT_AMOUNT',
        value: 50000, // ₹50,000 token
        effectiveFrom: new Date()
      }
    ]
  });

  // 4. Create Properties with PostGIS Points (Raw SQL required for PostGIS)
  // We will create them via Prisma and then update the geospatial data.

  const prop1 = await prisma.property.create({
    data: {
      title: 'Luxury 4BHK Villa in Noida',
      description: 'Stunning villa with modern amenities.',
      type: 'BUY',
      price: 25000000,
      ownerId: seller.id,
      lifecycleStatus: 'PUBLISHED',
      isPrakritiCertified: true
    }
  });
  await prisma.$executeRaw`UPDATE "Property" SET location = ST_SetSRID(ST_MakePoint(77.3910, 28.5355), 4326) WHERE id = ${prop1.id}`;

  const prop2 = await prisma.property.create({
    data: {
      title: 'Cozy 2BHK in South Delhi',
      description: 'Perfect for small families. Near Metro.',
      type: 'RENT',
      price: 45000,
      ownerId: seller.id,
      lifecycleStatus: 'PUBLISHED',
      isPrakritiCertified: false
    }
  });
  await prisma.$executeRaw`UPDATE "Property" SET location = ST_SetSRID(ST_MakePoint(77.2090, 28.5245), 4326) WHERE id = ${prop2.id}`;

  const prop3 = await prisma.property.create({
    data: {
      title: 'Weekend Farmhouse Stay',
      description: 'Escape the city with this organic farmhouse.',
      type: 'STAY',
      price: 15000,
      ownerId: seller.id,
      lifecycleStatus: 'PUBLISHED',
      isPrakritiCertified: true
    }
  });
  await prisma.$executeRaw`UPDATE "Property" SET location = ST_SetSRID(ST_MakePoint(77.0266, 28.4595), 4326) WHERE id = ${prop3.id}`;

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
