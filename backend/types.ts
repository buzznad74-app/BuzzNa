/**
 * BuzzNa D74 - Shared Backend Type Definitions
 * Mirrors frontend types for API contracts
 */

export enum LicenseStatus {
  TRIAL_ACTIVE = 'TRIAL_ACTIVE',
  PAYMENT_DUE = 'PAYMENT_DUE',
  GRACE_PERIOD = 'GRACE_PERIOD',
  SUSPENDED_NON_PAYMENT = 'SUSPENDED_NON_PAYMENT',
  FULLY_ACTIVATED = 'FULLY_ACTIVATED'
}

export enum PaymentMethod {
  CASH = 'CASH',
  MPESA = 'MPESA',
  DEBT = 'DEBT',
  SPLIT = 'SPLIT'
}

export enum VerticalTheme {
  RETAIL = 'retail',
  BUTCHERY = 'butchery',
  MITUMBA = 'mitumba',
  HARDWARE = 'hardware',
  CYBER = 'cyber'
}

export interface Business {
  tenantId: string;
  legalName: string;
  tradeName?: string;
  industry: string;
  country: string;
  currency: string;
  language: string;
  timezone: string;
  licenseStatus: LicenseStatus;
  licenseExpiresAt: string;
  createdAt: string;
}

export interface BusinessSettings {
  tenantId: string;
  chosenTheme: VerticalTheme;
  brandColor: string;
  dailyRevenueTarget: number;
  weeklyRevenueTarget: number;
  monthlyRevenueTarget: number;
  darajaPaybill?: string;
  darajaTillNumber?: string;
  darajaApiKey?: string;
  eodTime?: string;
}

export interface User {
  userId: string;
  tenantId: string;
  role: 'OWNER' | 'MANAGER' | 'CASHIER';
  username: string;
  phoneNumber: string;
  emailAddress?: string;
  isActive: boolean;
  createdAt: string;
  password?: string;
}

export interface Customer {
  customerId: string;
  tenantId: string;
  customerName: string;
  phoneNumber: string;
  emailAddress?: string;
  creditLimit: number;
  existingDebt: number;
  createdAt: string;
}

export interface Product {
  productId: string;
  tenantId: string;
  categoryId: string | null;
  barcode?: string;
  productName: string;
  costFloor: number;
  retailPrice: number;
  currentQuantity: number;
  isSerialized?: boolean;
  expiryDate?: string;
  supplierId?: string;
  imageUrl?: string;
}

export interface SalesTransaction {
  transactionId: string;
  tenantId: string;
  sessionId: string;
  customerId: string | null;
  paymentMethod: PaymentMethod;
  paymentStatus: 'PENDING' | 'PAID' | 'REFUNDED' | 'FAILED';
  grossTotal: number;
  taxAmount: number;
  discountAmount: number;
  terminalTimestamp: string;
  createdAt: string;
}

export interface Expense {
  expenseId: string;
  tenantId: string;
  amount: number;
  category: string;
  description?: string;
  recordedBy?: string;
  createdAt: string;
  expenseName: string;
  incurredDate: string;
}