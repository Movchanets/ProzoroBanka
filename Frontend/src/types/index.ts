export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  profilePhotoUrl?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiry: string;
  user: User;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiry: string;
  refreshTokenExpiry: string;
}

export interface ApiError {
  error?: string;
  type?: string;
  title?: string;
  status?: number;
  errors?: Record<string, string[]>;
}

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

export interface MonobankTransaction {
  id: string;
  amount: number;
  time: string;
  description: string;
  merchantName?: string;
  mcc: number;
}
