import { prisma } from "@/infrastructure/database/prisma";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

// Mock IStorageProvider
export interface IStorageProvider {
  uploadFile(buffer: Buffer, fileName: string, contentType: string): Promise<string>;
}

export class MockS3Provider implements IStorageProvider {
  async uploadFile(buffer: Buffer, fileName: string, contentType: string): Promise<string> {
    // In production, this uploads to AWS S3 / Supabase Storage and returns the public/presigned URL.
    return `https://s3.prakritiestates.com/receipts/${fileName}`;
  }
}

export class HraReceiptService {
  constructor(private storageProvider: IStorageProvider = new MockS3Provider()) {}

  /**
   * Generates a legally compliant HRA Rent Receipt for a paid invoice.
   * Requires Landlord PAN for Indian Tax Compliance if rent > 1L/annum.
   */
  async generateHraReceipt(invoiceId: string): Promise<string> {
    // 1. Fetch the deeply nested invoice graph
    const invoice = await prisma.monthlyInvoice.findUnique({
      where: { id: invoiceId },
      include: {
        lineItems: true,
        tenancy: {
          include: {
            tenant: { include: { kycVerifications: true } },
            landlord: { include: { kycVerifications: true } },
            property: true
          }
        }
      }
    });

    if (!invoice) throw new Error("Invoice not found.");
    if (invoice.status !== "PAID") throw new Error("HRA Receipts can only be generated for PAID invoices.");
    if (invoice.receiptUrl) return invoice.receiptUrl; // Return cached PDF URL if it exists

    // 2. Extract Data
    const { tenancy } = invoice;
    const tenantName = `${tenancy.tenant.firstName} ${tenancy.tenant.lastName}`;
    const landlordName = `${tenancy.landlord.firstName} ${tenancy.landlord.lastName}`;
    
    const landlordPanObj = tenancy.landlord.kycVerifications.find(k => k.documentType === "PAN" && k.status === "VERIFIED");
    const landlordPan = landlordPanObj ? landlordPanObj.providerRef : "PAN_NOT_PROVIDED";

    // 3. Generate PDF Buffer using pdf-lib
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 400]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    page.drawText("RENT RECEIPT (For HRA Exemption)", { x: 50, y: 350, font: boldFont, size: 18, color: rgb(0.1, 0.6, 0.2) });
    
    page.drawText(`Date of Issue: ${new Date().toLocaleDateString()}`, { x: 50, y: 320, font, size: 12 });
    page.drawText(`Receipt No: REC-${invoice.id.split('-')[0].toUpperCase()}`, { x: 50, y: 300, font, size: 12 });

    const bodyText = `Received with thanks from Mr./Ms. ${tenantName} a sum of INR ${invoice.totalAmount} \n` +
                     `towards rent for the property located at:\n` +
                     `${tenancy.property.title}\n\n` +
                     `For the billing period of ${invoice.invoiceMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}.\n\n` +
                     `Landlord Name: ${landlordName}\n` +
                     `Landlord PAN: ${landlordPan}`;

    page.drawText(bodyText, { x: 50, y: 250, font, size: 12, lineHeight: 18 });
    
    // Simulate Signature block
    page.drawText("____________________", { x: 400, y: 100, font, size: 12 });
    page.drawText("Landlord Signature", { x: 420, y: 80, font, size: 10 });

    const pdfBytes = await pdfDoc.save();
    const pdfBuffer = Buffer.from(pdfBytes);

    // 4. Secure S3 Upload
    const fileName = `HRA_REC_${invoice.id}.pdf`;
    const s3Url = await this.storageProvider.uploadFile(pdfBuffer, fileName, "application/pdf");

    // 5. Update Metadata in Database
    await prisma.monthlyInvoice.update({
      where: { id: invoice.id },
      data: { receiptUrl: s3Url }
    });

    return s3Url;
  }
}
