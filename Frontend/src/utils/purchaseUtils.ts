import type { TFunction } from 'i18next';
import { PurchaseStatus, DocumentType } from '@/types';

export function getPurchaseStatusLabel(status: PurchaseStatus, t: TFunction) {
  switch (status) {
    case PurchaseStatus.PaymentSent:
      return t('purchases.status.paymentSent', 'Оплату проведено');
    case PurchaseStatus.PartiallyReceived:
      return t('purchases.status.partiallyReceived', 'Частково отримано');
    case PurchaseStatus.Completed:
      return t('purchases.status.completed', 'Завершено');
    case PurchaseStatus.Cancelled:
      return t('purchases.status.cancelled', 'Скасовано');
    default:
      return t('purchases.status.fallback', 'Статус {{status}}').replace('{{status}}', String(status));
  }
}

export function getDocumentTypeLabel(type: DocumentType, t: TFunction) {
  switch (type) {
    case DocumentType.BankReceipt:
      return t('purchases.docType.bankReceipt', 'Банківська квитанція');
    case DocumentType.Waybill:
      return t('purchases.docType.waybill', 'Видаткова накладна');
    case DocumentType.Invoice:
      return t('purchases.docType.invoice', 'Рахунок-фактура (Invoice)');
    case DocumentType.TransferAct:
      return t('purchases.docType.transferAct', 'Акт приймання-передачі');
    default:
      return t('purchases.docType.other', 'Інший документ');
  }
}
