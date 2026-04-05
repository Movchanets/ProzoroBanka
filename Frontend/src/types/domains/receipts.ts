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

export const OcrProvider = {
  AzureDocumentIntelligence: 0,
  MistralOcr: 1,
  Manual: 2,
} as const;

export type OcrProvider = typeof OcrProvider[keyof typeof OcrProvider];

export interface Receipt {
  id: string;
  storageKey: string;
  originalFileName?: string;
  merchantName?: string;
  totalAmount?: number;
  transactionDate?: string;
  status: ReceiptStatus;
  parsedBy?: OcrProvider;
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
  merchantName?: string;
  totalAmount?: number;
  purchaseDateUtc?: string;
  status: ReceiptStatus;
  publicationStatus: ReceiptPublicationStatus;
  verificationFailureReason?: string;
  createdAt: string;
  fiscalNumber?: string;
  receiptCode?: string;
  currency?: string;
  purchasedItemName?: string;
  ocrStructuredPayloadJson?: string;
  rawOcrJson?: string;
}

export interface UpdateReceiptOcrDraftRequest {
  merchantName?: string;
  totalAmount?: number | null;
  purchaseDateUtc?: string | null;
  fiscalNumber?: string;
  receiptCode?: string;
  currency?: string;
  purchasedItemName?: string;
  ocrStructuredPayloadJson?: string;
}

export interface MonobankTransaction {
  id: string;
  amount: number;
  time: string;
  description: string;
  merchantName?: string;
  mcc: number;
}
