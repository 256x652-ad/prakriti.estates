export interface PaymentOrderRequest {
  amount: number; // In smallest currency unit (e.g., paise for INR)
  currency: string;
  receiptId: string;
  notes?: Record<string, string>;
}

export interface PaymentOrderResponse {
  orderId: string;
  provider: string; // e.g. "RAZORPAY"
  amount: number;
  currency: string;
  status: string;
}

export interface RefundRequest {
  paymentId: string;
  amount: number;
  reason?: string;
}

export interface IPaymentService {
  createOrder(request: PaymentOrderRequest): Promise<PaymentOrderResponse>;
  verifySignature(payload: string, signature: string, secret: string): boolean;
  fetchPayment(paymentId: string): Promise<any>;
}

export interface IEscrowService {
  holdFunds(transactionId: string, amount: number): Promise<boolean>;
  releaseFunds(transactionId: string, targetAccountId: string): Promise<boolean>;
}

export interface IRefundService {
  initiateRefund(request: RefundRequest): Promise<boolean>;
  checkRefundStatus(refundId: string): Promise<string>;
}
