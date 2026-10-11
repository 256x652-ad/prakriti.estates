export type FinancialState = 
  | "PENDING"          // Initial creation
  | "PAYMENT_PENDING"  // Sent to payment gateway
  | "PAYMENT_SUCCESS"  // Captured successfully
  | "PAYMENT_FAILED"   // Capture failed
  | "ESCROW_HELD"      // Funds locked internally
  | "ESCROW_RELEASED"  // Funds released to seller
  | "REFUND_INITIATED"
  | "REFUNDED"
  | "COMPLETED";

// Mapping of State -> Allowed Next States
const AllowedTransitions: Record<FinancialState, FinancialState[]> = {
  "PENDING": ["PAYMENT_PENDING", "COMPLETED", "PAYMENT_FAILED"],
  "PAYMENT_PENDING": ["PAYMENT_SUCCESS", "PAYMENT_FAILED"],
  "PAYMENT_SUCCESS": ["ESCROW_HELD", "REFUND_INITIATED", "COMPLETED"],
  "PAYMENT_FAILED": ["PENDING"], // Can retry
  "ESCROW_HELD": ["ESCROW_RELEASED", "REFUND_INITIATED"],
  "ESCROW_RELEASED": ["COMPLETED"],
  "REFUND_INITIATED": ["REFUNDED", "ESCROW_HELD"], // If refund fails, it stays held
  "REFUNDED": [], // Terminal State
  "COMPLETED": [] // Terminal State
};

export class TransactionStateMachine {
  
  /**
   * Enforces a strict state transition for financial records.
   * Prevents critical bugs like refunding an already refunded transaction,
   * or releasing escrow for a failed payment.
   */
  public transition(currentState: FinancialState, requestedState: FinancialState): FinancialState {
    const validNextStates = AllowedTransitions[currentState];

    if (!validNextStates || !validNextStates.includes(requestedState)) {
      throw new Error(`[Financial Security Error] Invalid transition attempted from '${currentState}' to '${requestedState}'.`);
    }

    // In a real application, you might check `actor` permissions here.
    // e.g., Only an ADMIN can transition to REFUND_INITIATED.

    return requestedState;
  }
}
