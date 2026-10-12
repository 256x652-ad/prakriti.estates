import { NextRequest, NextResponse } from "next/server";
import { stepUpVerificationService, StepUpAction } from "@/modules/auth/services/StepUpVerificationService";
import { getServerSession } from "next-auth";
import { authOptions } from "@/infrastructure/auth/authOptions";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await req.json();
    const { type, action, otp, userId: requestedUserId } = body;

    // Resolve actor userId from active session or fallback
    const userId = (session?.user as any)?.id || requestedUserId;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Authentication required to initiate transaction verification." },
        { status: 401 }
      );
    }

    if (type === "REQUEST") {
      const challenge = await stepUpVerificationService.requestChallenge(userId, action as StepUpAction);
      return NextResponse.json({ success: true, data: challenge });
    }

    if (type === "VERIFY") {
      if (!otp) {
        return NextResponse.json(
          { success: false, error: "Verification code is required." },
          { status: 400 }
        );
      }

      const result = await stepUpVerificationService.verifyChallenge(
        userId,
        action as StepUpAction,
        String(otp).trim()
      );
      return NextResponse.json({ success: true, data: result });
    }

    return NextResponse.json(
      { success: false, error: "Invalid step-up operation type. Expected 'REQUEST' or 'VERIFY'." },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("[API:StepUpVerification] Error:", error.message);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process transaction verification." },
      { status: 400 }
    );
  }
}
