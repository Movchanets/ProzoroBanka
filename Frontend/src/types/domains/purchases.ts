export const PurchaseStatus = {
  PaymentSent: 0,
  PartiallyReceived: 1,
  Completed: 2,
  Cancelled: 3,
} as const;

export type PurchaseStatus = (typeof PurchaseStatus)[keyof typeof PurchaseStatus];

export const DocumentType = {
  BankReceipt: 0,
  Waybill: 1,
  Invoice: 2,
  TransferAct: 3,
  Other: 4,
} as const;

export type DocumentType = (typeof DocumentType)[keyof typeof DocumentType];

export const OcrProcessingStatus = {
  NotRequired: 0,
  NotProcessed: 1,
  Processing: 2,
  Success: 3,
  Failed: 4,
} as const;

export type OcrProcessingStatus = (typeof OcrProcessingStatus)[keyof typeof OcrProcessingStatus];

export interface PurchaseListItemDto {
  id: string;
  title: string;
  totalAmount: number;
  status: PurchaseStatus;
  documentCount: number;
  verifiedDocumentCount: number;
  createdAt: string;
}

export interface DocumentDto {
  id: string;
  purchaseId: string;
  uploadedByUserId: string;
  type: DocumentType;
  originalFileName: string;
  fileUrl: string | null;
  documentDate: string | null;
  amount: number | null;
  counterpartyName: string | null;
  ocrProcessingStatus: OcrProcessingStatus;
  isDataVerifiedByUser: boolean;
  items?: DocumentItemDto[] | null;
  createdAt: string;
  edrpou?: string | null;
  payerFullName?: string | null;
  receiptCode?: string | null;
  paymentPurpose?: string | null;
  senderIban?: string | null;
  receiverIban?: string | null;
}

export interface PurchaseDetailDto {
  id: string;
  campaignId: string | null;
  createdByUserId: string;
  title: string;
  description?: string | null;
  totalAmount: number;
  status: PurchaseStatus;
  documents: DocumentDto[];
  createdAt: string;
}

export interface DocumentItemDto {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface CreateDraftPurchaseRequest {
  organizationId: string;
  title: string;
  description?: string | null;
}

export interface AttachPurchaseToCampaignRequest {
  campaignId: string;
}

export interface AddItemToWaybillRequest {
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface UpdateWaybillItemRequest {
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface CreatePurchaseRequest {
  title: string;
  totalAmount: number;
}

export interface UpdatePurchaseRequest {
  title?: string;
  totalAmount?: number;
  status?: PurchaseStatus;
}

export interface UpdateDocumentMetadataRequest {
  amount?: number;
  counterpartyName?: string;
  documentDate?: string;
  edrpou?: string | null;
  payerFullName?: string | null;
  receiptCode?: string | null;
  paymentPurpose?: string | null;
  senderIban?: string | null;
  receiverIban?: string | null;
}

export interface ProcessDocumentOcrRequest {
  confirmReprocess?: boolean;
}
