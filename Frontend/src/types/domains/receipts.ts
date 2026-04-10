export const ReceiptStatus = {
  PendingOcr: 0,
  PendingStateValidation: 1,
  OcrExtracted: 2,
  FailedVerification: 3,
  ValidationDeferredRateLimit: 4,
  Draft: 5,
  StateVerified: 6,
  InvalidData: 7,
  OcrDeferredMonthlyQuota: 8,
  Uploaded: 0,
  Parsing: 1,
  Parsed: 2,
  ParseFailed: 3,
  Matched: 4,
  Verified: 6,
} as const;

export type ReceiptStatus = typeof ReceiptStatus[keyof typeof ReceiptStatus];

export interface OcrModelConfig {
  id: string;
  name: string;
  modelIdentifier: string;
  provider: string;
  isActive: boolean;
  isDefault: boolean;
}

export interface Receipt {
  id: string;
  storageKey: string;
  originalFileName?: string;
  merchantName?: string;
  totalAmount?: number;
  transactionDate?: string;
  status: ReceiptStatus;
  parsedByModel?: string;
  matchedTransactionId?: string;
  createdAt: string;
}

export const ReceiptPublicationStatus = {
  Draft: 0,
  Active: 1,
} as const;

export type ReceiptPublicationStatus = typeof ReceiptPublicationStatus[keyof typeof ReceiptPublicationStatus];

export interface ReceiptPipeline {
  id: string;
  originalFileName: string;
  receiptImageUrl?: string;
  alias?: string;
  merchantName?: string;
  totalAmount?: number;
  purchaseDateUtc?: string;
  status: ReceiptStatus;
  publicationStatus: ReceiptPublicationStatus;
  verificationFailureReason?: string;
  createdAt: string;
  campaignId?: string;
  campaignTitle?: string;
  fiscalNumber?: string;
  receiptCode?: string;
  currency?: string;
  purchasedItemName?: string;
  items?: ReceiptItem[];
  itemPhotos?: ReceiptItemPhoto[];
  ocrStructuredPayloadJson?: string;
  rawOcrJson?: string;
  verificationUrl?: string;
  isConfirmed?: boolean;
}

export interface ReceiptItem {
  id: string;
  name: string;
  quantity?: number;
  unitPrice?: number;
  totalPrice?: number;
  barcode?: string;
  vatRate?: number;
  vatAmount?: number;
  sortOrder: number;
}

export interface ReceiptListItem {
  id: string;
  originalFileName: string;
  alias?: string;
  merchantName?: string;
  authorFullName?: string;
  authorEmail?: string;
  totalAmount?: number;
  purchaseDateUtc?: string;
  status: ReceiptStatus;
  publicationStatus: ReceiptPublicationStatus;
  campaignId?: string;
  campaignTitle?: string;
  createdAt: string;
}

export interface ReceiptItemPhoto {
  id: string;
  originalFileName: string;
  photoUrl: string;
  sortOrder: number;
  receiptItemId?: string;
}

export interface AddReceiptItemRequest {
  name: string;
  quantity?: number;
  unitPrice?: number;
  totalPrice?: number;
  barcode?: string;
  vatRate?: number;
  vatAmount?: number;
  photoIds?: string[];
}

export interface UpdateReceiptItemRequest {
  name: string;
  quantity?: number;
  unitPrice?: number;
  totalPrice?: number;
  barcode?: string;
  vatRate?: number;
  vatAmount?: number;
}

export interface LinkReceiptItemPhotoRequest {
  receiptItemId?: string;
}

export interface UpdateReceiptOcrDraftRequest {
  alias?: string;
  merchantName?: string;
  totalAmount?: number | null;
  purchaseDateUtc?: string | null;
  fiscalNumber?: string;
  receiptCode?: string;
  currency?: string;
  purchasedItemName?: string;
  ocrStructuredPayloadJson?: string;
}

export interface ReorderReceiptItemPhotosRequest {
  photoIds: string[];
}

export interface MonobankTransaction {
  id: string;
  amount: number;
  time: string;
  description: string;
  merchantName?: string;
  mcc: number;
}
