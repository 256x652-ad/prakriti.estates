export interface ISmsProvider {
  sendSms(to: string, message: string): Promise<boolean>;
  sendOtp(to: string, otp: string): Promise<boolean>;
  verifyOtp(to: string, otp: string): Promise<boolean>;
}
