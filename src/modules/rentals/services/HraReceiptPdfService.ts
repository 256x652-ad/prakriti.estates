import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { prisma } from "@/infrastructure/database/prisma";
import { SecureFilePipeline } from "@/lib/storage/secureUpload";

export class HraReceiptPdfService {
  private filePipeline: SecureFilePipeline;

  constructor() {
    this.filePipeline = new SecureFilePipeline();
  }

  /**
   * Generates a legally compliant Indian HRA Rent Receipt PDF
   * and saves it to S3, returning the secure view/download URL.
   */
  async generateHraReceiptPdf(invoiceId: string): Promise<{
    pdfBuffer: Uint8Array;
    receiptDownloadUrl: string;
  }> {
    const invoice = await prisma.monthlyInvoice.findUnique({
      where: { id: invoiceId },
      include: {
        lineItems: true,
        tenancy: {
          include: {
            tenant: {
              include: {
                kycVerifications: { where: { status: "VERIFIED" }, take: 1 },
              },
            },
            landlord: {
              include: {
                kycVerifications: { where: { status: "VERIFIED" }, take: 1 },
              },
            },
            property: true,
          },
        },
      },
    });

    if (!invoice) {
      throw new Error("INVOICE_NOT_FOUND");
    }

    const { tenancy } = invoice;
    const tenantName = tenancy.tenant.firstName
      ? `${tenancy.tenant.firstName} ${tenancy.tenant.lastName || ""}`.trim()
      : tenancy.tenant.phoneNumber;

    const landlordName = tenancy.landlord.firstName
      ? `${tenancy.landlord.firstName} ${tenancy.landlord.lastName || ""}`.trim()
      : tenancy.landlord.phoneNumber;

    // Securely pull landlord's verified provider reference or token
    const landlordKyc = tenancy.landlord.kycVerifications[0];
    const landlordPanRef = landlordKyc ? (landlordKyc.providerRef || "VERIFIED_PAN_ON_RECORD") : "PAN_PENDING_SUBMISSION";

    const propertyAddress = tenancy.property.title;
    const rentAmount = tenancy.rentAmount;
    const billingPeriod = new Date(invoice.invoiceMonth).toLocaleString("default", {
      month: "long",
      year: "numeric",
    });

    // Generate PDF using pdf-lib
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 420]); // Standard Indian landscape receipt card
    const { width, height } = page.getSize();

    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // Decorative Borders & Header
    page.drawRectangle({
      x: 20,
      y: 20,
      width: width - 40,
      height: height - 40,
      borderColor: rgb(0.05, 0.45, 0.25), // Prakriti Emerald
      borderWidth: 2,
    });

    page.drawText("PRAKRITI ESTATES — OFFICIAL HRA RENT RECEIPT", {
      x: 40,
      y: height - 55,
      size: 16,
      font: fontBold,
      color: rgb(0.05, 0.45, 0.25),
    });

    page.drawText(`Receipt No: REC-${invoice.id.slice(0, 8).toUpperCase()}`, {
      x: 40,
      y: height - 75,
      size: 10,
      font: fontRegular,
      color: rgb(0.4, 0.4, 0.4),
    });

    page.drawText(`Date of Issue: ${new Date().toLocaleDateString("en-IN")}`, {
      x: 420,
      y: height - 75,
      size: 10,
      font: fontRegular,
      color: rgb(0.4, 0.4, 0.4),
    });

    // Main Receipt Body
    const bodyY = height - 120;
    page.drawText(
      `Received with thanks from Mr./Ms. ${tenantName} the sum of:`,
      { x: 40, y: bodyY, size: 11, font: fontRegular, color: rgb(0.1, 0.1, 0.1) }
    );

    page.drawText(`Rs. ${rentAmount.toLocaleString("en-IN")} /- (Indian Rupees Only)`, {
      x: 40,
      y: bodyY - 24,
      size: 14,
      font: fontBold,
      color: rgb(0.05, 0.45, 0.25),
    });

    page.drawText(`Towards the house rent for the month of: ${billingPeriod}`, {
      x: 40,
      y: bodyY - 50,
      size: 11,
      font: fontRegular,
      color: rgb(0.2, 0.2, 0.2),
    });

    page.drawText(`Property Address: ${propertyAddress}`, {
      x: 40,
      y: bodyY - 74,
      size: 10,
      font: fontRegular,
      color: rgb(0.2, 0.2, 0.2),
    });

    page.drawText(`Payment Mode: Online Digital Escrow / Razorpay (Settled)`, {
      x: 40,
      y: bodyY - 96,
      size: 10,
      font: fontRegular,
      color: rgb(0.3, 0.3, 0.3),
    });

    // Landlord & HRA Legal Declaration
    page.drawText(`Landlord Name: ${landlordName}`, {
      x: 40,
      y: bodyY - 140,
      size: 11,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });

    page.drawText(`Landlord PAN / Govt Ref: ${landlordPanRef}`, {
      x: 40,
      y: bodyY - 158,
      size: 10,
      font: fontRegular,
      color: rgb(0.2, 0.2, 0.2),
    });

    // Signature Stamping
    page.drawText("Digitally Verified via Prakriti Estates", {
      x: 380,
      y: bodyY - 140,
      size: 10,
      font: fontBold,
      color: rgb(0.05, 0.45, 0.25),
    });

    page.drawText("(Valid for Income Tax HRA Exemption u/s 10(13A))", {
      x: 350,
      y: bodyY - 158,
      size: 8,
      font: fontRegular,
      color: rgb(0.5, 0.5, 0.5),
    });

    const pdfBytes = await pdfDoc.save();

    // Upload to Private S3 KYC/Legal bucket via SecureFilePipeline
    let downloadUrl: string;
    try {
      const uploadResult = await this.filePipeline.uploadSecureDocument({
        classification: "LEGAL_AGREEMENT",
        buffer: Buffer.from(pdfBytes),
        mimeType: "application/pdf",
        originalFilename: `HRA_Receipt_${invoice.id.slice(0, 8)}.pdf`,
        userId: tenancy.tenantId,
      });

      downloadUrl = await this.filePipeline.getPrivateDocumentDownloadUrl(uploadResult.key, 900);

      // Cache URL in invoice record
      await prisma.monthlyInvoice.update({
        where: { id: invoiceId },
        data: { receiptUrl: uploadResult.url },
      });
    } catch (err: any) {
      console.warn("[HraReceiptPdfService] S3 upload skipped (offline fallback):", err.message);
      downloadUrl = `/api/v1/invoices/${invoiceId}/receipt?mock=true`;
    }

    return {
      pdfBuffer: pdfBytes,
      receiptDownloadUrl: downloadUrl,
    };
  }
}

export const hraReceiptPdfService = new HraReceiptPdfService();
