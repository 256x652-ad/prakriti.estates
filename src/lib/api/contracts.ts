import { ApiResponse, PaginationMeta } from "./response";

// ========================================================
// 1. PROPERTY SEARCH API CONTRACT (/api/v1/properties/search)
// ========================================================

export type PropertyListingType = "BUY" | "RENT" | "STAY";

export interface PropertySearchQuery {
  type?: PropertyListingType;
  minPrice?: number;
  maxPrice?: number;
  isPrakritiCertified?: boolean;
  q?: string;
  // Spatial bounding box: [minLng, minLat, maxLng, maxLat]
  bounds?: [number, number, number, number];
  // Proximity radius search
  radius?: {
    lng: number;
    lat: number;
    distanceMeters: number;
  };
  // Cursor-based pagination for infinite scrolling on mobile
  cursor?: string;
  limit?: number;
}

export interface PropertySummaryDTO {
  id: string;
  title: string;
  price: number;
  type: PropertyListingType;
  isPrakritiCertified: boolean;
  coordinates: {
    lng: number;
    lat: number;
  };
  thumbnailUrl?: string;
  locality?: string;
  bhk?: number;
}

export type PropertySearchResponse = ApiResponse<PropertySummaryDTO[]>;

// ========================================================
// 2. TOKEN BOOKING API CONTRACT (/api/v1/bookings/token)
// ========================================================

export type VasServiceOption = "LEGAL" | "VASTU" | "STRUCTURAL" | "LOAN" | "PRAKRITI_CERTIFIED";

export interface InitiateBookingRequest {
  propertyId: string;
  bookingType: "RENTAL_TOKEN" | "PURCHASE_TOKEN";
  // Value-added services requested by buyer
  selectedVas?: VasServiceOption[];
  // Callback/Redirect URL for mobile deep linking (e.g. prakriti://payment-callback)
  deepLinkRedirectUrl?: string;
}

export interface InitiateBookingResponseData {
  lockId: string;
  transactionId: string;
  lockExpiresAt: string; // ISO 8601
  paymentGateway: {
    provider: "RAZORPAY" | "STRIPE";
    orderId: string;
    amountInPaise: number;
    currency: "INR";
  };
  feeBreakdown: {
    baseAmount: number;
    platformFee: number;
    gstAmount: number;
    escrowDepositAmount: number;
    totalPayable: number;
  };
}

export type InitiateBookingResponse = ApiResponse<InitiateBookingResponseData>;

// ========================================================
// 3. USER PROFILE API CONTRACT (/api/v1/user/profile)
// ========================================================

export type KycVerificationState = "PENDING" | "SUBMITTED" | "VERIFIED" | "REJECTED";
export type UserRole = "BUYER" | "SELLER" | "TENANT" | "LANDLORD" | "ADMIN" | "CONSULTANT";

export interface UserProfileDTO {
  id: string;
  phoneNumber: string;
  firstName: string;
  lastName: string;
  roles: UserRole[];
  kyc: {
    status: KycVerificationState;
    verifiedAt?: string;
    documentsAvailable: ("AADHAAR" | "PAN")[];
  };
  activeBookingsCount: number;
  activeTenanciesCount: number;
  isPrakritiConsultant: boolean;
  themePreference?: {
    primaryColor: string;
    isDarkMode: boolean;
  };
}

export type UserProfileResponse = ApiResponse<UserProfileDTO>;
