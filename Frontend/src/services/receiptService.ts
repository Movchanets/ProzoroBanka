import { apiFetch } from './api';
import type {
  AddReceiptItemRequest,
  LinkReceiptItemPhotoRequest,
  ReceiptListItem,
  ReceiptPipeline,
  ReorderReceiptItemPhotosRequest,
  ReceiptStatus,
  UpdateReceiptItemRequest,
  UpdateReceiptOcrDraftRequest,
} from '@/types';

export const receiptService = {
  uploadOrganizationDraft: (organizationId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiFetch<ReceiptPipeline>(`/api/organizations/${organizationId}/receipts/draft`, {
      method: 'POST',
      body: formData,
    });
  },

  uploadDraft: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiFetch<ReceiptPipeline>('/api/receipts/draft', {
      method: 'POST',
      body: formData,
    });
  },

  updateDraft: (receiptId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiFetch<ReceiptPipeline>(`/api/receipts/${receiptId}/draft`, {
      method: 'PUT',
      body: formData,
    });
  },

  extract: (receiptId: string, organizationId: string, file?: File, modelIdentifier?: string) => {
    const formData = new FormData();
    formData.append('organizationId', organizationId);
    if (file) {
      formData.append('file', file);
    }
    if (modelIdentifier) {
      formData.append('modelIdentifier', modelIdentifier);
    }

    return apiFetch<ReceiptPipeline>(`/api/receipts/${receiptId}/extract`, {
      method: 'POST',
      body: formData,
    });
  },

  verify: (receiptId: string, organizationId: string) =>
    apiFetch<ReceiptPipeline>(`/api/receipts/${receiptId}/verify`, {
      method: 'POST',
      body: JSON.stringify({ organizationId }),
    }),

  updateOcrDraft: (receiptId: string, payload: UpdateReceiptOcrDraftRequest) =>
    apiFetch<ReceiptPipeline>(`/api/receipts/${receiptId}/ocr-draft`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  activate: (receiptId: string) =>
    apiFetch<ReceiptPipeline>(`/api/receipts/${receiptId}/activate`, {
      method: 'POST',
    }),

  retry: (receiptId: string) =>
    apiFetch<ReceiptPipeline>(`/api/receipts/${receiptId}/retry`, {
      method: 'POST',
    }),

  delete: (receiptId: string) =>
    apiFetch<{ message: string }>(`/api/receipts/${receiptId}`, {
      method: 'DELETE',
    }),

  addItemPhotos: (receiptId: string, files: File[]) => {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));

    return apiFetch<ReceiptPipeline>(`/api/receipts/${receiptId}/item-photos`, {
      method: 'POST',
      body: formData,
    });
  },

  replaceItemPhoto: (receiptId: string, photoId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    return apiFetch<ReceiptPipeline>(`/api/receipts/${receiptId}/item-photos/${photoId}`, {
      method: 'PUT',
      body: formData,
    });
  },

  reorderItemPhotos: (receiptId: string, payload: ReorderReceiptItemPhotosRequest) =>
    apiFetch<ReceiptPipeline>(`/api/receipts/${receiptId}/item-photos/order`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  deleteItemPhoto: (receiptId: string, photoId: string) =>
    apiFetch<ReceiptPipeline>(`/api/receipts/${receiptId}/item-photos/${photoId}`, {
      method: 'DELETE',
    }),

  linkItemPhoto: (receiptId: string, photoId: string, payload: LinkReceiptItemPhotoRequest) =>
    apiFetch<ReceiptPipeline>(`/api/receipts/${receiptId}/item-photos/${photoId}/link`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  addItem: (receiptId: string, payload: AddReceiptItemRequest) =>
    apiFetch<ReceiptPipeline>(`/api/receipts/${receiptId}/items`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateItem: (receiptId: string, itemId: string, payload: UpdateReceiptItemRequest) =>
    apiFetch<ReceiptPipeline>(`/api/receipts/${receiptId}/items/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  deleteItem: (receiptId: string, itemId: string) =>
    apiFetch<ReceiptPipeline>(`/api/receipts/${receiptId}/items/${itemId}`, {
      method: 'DELETE',
    }),

  importTaxXml: (receiptId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    return apiFetch<ReceiptPipeline>(`/api/receipts/${receiptId}/import-tax-xml`, {
      method: 'POST',
      body: formData,
    });
  },

  list: (params?: {
    search?: string;
    status?: ReceiptStatus;
    onlyUnattached?: boolean;
  }) => {
    const searchParams = new URLSearchParams();

    if (params?.search?.trim()) {
      searchParams.set('search', params.search.trim());
    }

    if (params?.status !== undefined) {
      searchParams.set('status', String(params.status));
    }

    if (params?.onlyUnattached) {
      searchParams.set('onlyUnattached', 'true');
    }

    const query = searchParams.toString();
    return apiFetch<ReceiptListItem[]>(`/api/receipts${query ? `?${query}` : ''}`);
  },

  listByOrganization: (organizationId: string, params?: {
    search?: string;
    status?: ReceiptStatus;
    onlyUnattached?: boolean;
  }) => {
    const searchParams = new URLSearchParams();

    if (params?.search?.trim()) {
      searchParams.set('search', params.search.trim());
    }

    if (params?.status !== undefined) {
      searchParams.set('status', String(params.status));
    }

    if (params?.onlyUnattached) {
      searchParams.set('onlyUnattached', 'true');
    }

    const query = searchParams.toString();
    return apiFetch<ReceiptListItem[]>(`/api/organizations/${organizationId}/receipts${query ? `?${query}` : ''}`);
  },

  getById: (receiptId: string) => apiFetch<ReceiptPipeline>(`/api/receipts/${receiptId}`),

  getByIdInOrganization: (organizationId: string, receiptId: string) =>
    apiFetch<ReceiptPipeline>(`/api/organizations/${organizationId}/receipts/${receiptId}`),
};
