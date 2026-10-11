import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/infrastructure/auth/authOptions";
import { hraReceiptPdfService } from "@/modules/rentals/services/HraReceiptPdfService";
import { ApiResponseHelper } from "@/lib/api/response";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return ApiResponseHelper.error("UNAUTHORIZED", "Authentication required", 401);
    }

    const { id } = await context.params;
    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format");

    const result = await hraReceiptPdfService.generateHraReceiptPdf(id);

    // If direct raw PDF binary is requested (e.g. for browser direct preview/download)
    if (format === "pdf") {
      return new NextResponse(Buffer.from(result.pdfBuffer), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="HRA_Receipt_${id.slice(0, 8)}.pdf"`,
        },
      });
    }

    // Default: JSON response with secure pre-signed download URL
    return ApiResponseHelper.success({
      invoiceId: id,
      downloadUrl: result.receiptDownloadUrl,
    });
  } catch (error: any) {
    console.error("[HRA Receipt Error]", error);
    return ApiResponseHelper.error(
      "INTERNAL_SERVER_ERROR",
      error.message || "Failed to generate HRA receipt",
      500
    );
  }
}
