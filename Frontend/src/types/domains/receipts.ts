export const ReceiptStatus = {
  Uploaded: 0,
  Parsing: 1,
  Parsed: 2,
  ParseFailed: 3,
  Matched: 4,
  Draft: 5,
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

export interface MonobankTransaction {
  id: string;
  amount: number;
  time: string;
  description: string;
  merchantName?: string;
  mcc: number;
}
