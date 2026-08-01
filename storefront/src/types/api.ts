export interface ProductOutput {
  id: string;
  name: string;
  priceCents: number;
  discountCents: number | null;
  stock: number;
  weight: number;
  width: number;
  height: number;
  length: number;
  categoryId: string | null;
}

export interface CategoryOutput {
  id: string;
  name: string;
  description: string | null;
}

export interface ProductImageOutput {
  id: string;
  productId: string;
  url: string;
  order: number;
  altText: string | null;
}

export interface AddressInput {
  recipientName: string;
  zipCode: string;
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
  label: string;
}

export interface AddressOutput extends AddressInput {
  id: string;
}

export interface UserOutput {
  id: string;
  email: string;
  username: string;
  fullName: string | null;
  onboardingCompleted: boolean;
  isAdmin: boolean;
}

export interface CompleteOnboardingOutput {
  id: string;
  fullName: string;
  document: string | null;
  onboardingCompleted: boolean;
}

export interface ShippingOption {
  serviceId: number;
  carrierName: string;
  priceCents: number;
  priceDisplay: string;
  deliveryTimeDays: number;
}

export interface OrderItemOutput {
  productId: string;
  productName: string;
  quantity: number;
  priceCents: number;
  priceDisplay: string;
}

export interface OrderOutput {
  id: string;
  status: OrderStatus;
  totalCents: number;
  totalDisplay: string;
  items: OrderItemOutput[];
  paymentId: string | null;
  createdAt: string;
}

export type OrderStatus =
  | "PENDING_PAYMENT"
  | "PAID"
  | "REJECTED"
  | "EXPIRED"
  | "CANCELLED"
  | "REFUNDED"
  | "CHARGEBACK";

export interface CheckoutOrderOutput {
  orderId: string;
  status: OrderStatus;
  totalCents: number;
  totalDisplay: string;
  freightCents: number;
  freightDisplay: string;
  grandTotalCents: number;
  grandTotalDisplay: string;
  qrCode: string;
  qrCodeBase64: string;
  expiresAt: string;
}

export interface PaymentStatusOutput {
  orderId: string;
  status: OrderStatus;
}

export interface ApiErrorBody {
  error: string;
  details?: Record<string, string[]>;
}
