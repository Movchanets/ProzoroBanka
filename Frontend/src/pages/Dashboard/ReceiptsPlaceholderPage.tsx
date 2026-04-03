import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  AlertCircle,
  CheckCircle2,
  FileDigit,
  Loader2,
  Receipt,
  RefreshCw,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  useActivateReceipt,
  useExtractReceiptData,
  useGetMyReceipt,
  useRetryReceiptProcessing,
  useUploadReceiptDraft,
  useVerifyReceipt,
} from '@/hooks/queries/useReceipts';
import {
  ReceiptPublicationStatus,
  type ReceiptPipeline,
  ReceiptStatus,
} from '@/types';

const statusLabelMap: Record<number, string> = {
  [ReceiptStatus.PendingOcr]: 'Pending OCR',
  [ReceiptStatus.PendingStateValidation]: 'Pending state validation',
  [ReceiptStatus.OcrExtracted]: 'OCR extracted',
  [ReceiptStatus.FailedVerification]: 'Failed verification',
  [ReceiptStatus.ValidationDeferredRateLimit]: 'Deferred (rate limit)',
  [ReceiptStatus.Draft]: 'Draft',
  [ReceiptStatus.StateVerified]: 'State verified',
  [ReceiptStatus.InvalidData]: 'Invalid data',
  [ReceiptStatus.OcrDeferredMonthlyQuota]: 'Deferred (monthly quota)',
};

const publicationLabelMap: Record<number, string> = {
  [ReceiptPublicationStatus.Draft]: 'Draft',
  [ReceiptPublicationStatus.Active]: 'Active',
};

function formatAmount(value?: number) {
  if (typeof value !== 'number') return '—';
  return new Intl.NumberFormat('uk-UA', {
    style: 'currency',
    currency: 'UAH',
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('uk-UA');
}

export default function ReceiptsPlaceholderPage() {
  const { t } = useTranslation();
  const { orgId } = useParams<{ orgId: string }>();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [receiptIdInput, setReceiptIdInput] = useState('');
  const [receipt, setReceipt] = useState<ReceiptPipeline | null>(null);

  const uploadDraftMutation = useUploadReceiptDraft();
  const extractMutation = useExtractReceiptData();
  const verifyMutation = useVerifyReceipt();
  const activateMutation = useActivateReceipt();
  const retryMutation = useRetryReceiptProcessing();
  const getReceiptMutation = useGetMyReceipt();

  const activeReceiptId = useMemo(
    () => receipt?.id ?? receiptIdInput.trim(),
    [receipt?.id, receiptIdInput],
  );

  const isBusy = uploadDraftMutation.isPending
    || extractMutation.isPending
    || verifyMutation.isPending
    || activateMutation.isPending
    || retryMutation.isPending
    || getReceiptMutation.isPending;

  const applyReceipt = (next: ReceiptPipeline) => {
    setReceipt(next);
    setReceiptIdInput(next.id);
  };

  const onUploadDraft = async () => {
    if (!selectedFile) {
      toast.error('Оберіть файл чека для завантаження');
      return;
    }

    try {
      const result = await uploadDraftMutation.mutateAsync(selectedFile);
      applyReceipt(result);
      toast.success('Чернетку чека завантажено');
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const onExtract = async () => {
    if (!orgId) {
      toast.error('Не визначено організацію в URL');
      return;
    }

    if (!activeReceiptId) {
      toast.error('Вкажіть ID чека');
      return;
    }

    if (!selectedFile) {
      toast.error('Оберіть той самий файл для OCR етапу');
      return;
    }

    try {
      const result = await extractMutation.mutateAsync({
        receiptId: activeReceiptId,
        organizationId: orgId,
        file: selectedFile,
      });
      applyReceipt(result);
      toast.success('OCR етап виконано');
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const onVerify = async () => {
    if (!orgId) {
      toast.error('Не визначено організацію в URL');
      return;
    }

    if (!activeReceiptId) {
      toast.error('Вкажіть ID чека');
      return;
    }

    try {
      const result = await verifyMutation.mutateAsync({
        receiptId: activeReceiptId,
        organizationId: orgId,
      });
      applyReceipt(result);
      toast.success('Державна верифікація завершена');
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const onActivate = async () => {
    if (!activeReceiptId) {
      toast.error('Вкажіть ID чека');
      return;
    }

    try {
      const result = await activateMutation.mutateAsync(activeReceiptId);
      applyReceipt(result);
      toast.success('Чек опубліковано');
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const onRetry = async () => {
    if (!activeReceiptId) {
      toast.error('Вкажіть ID чека');
      return;
    }

    try {
      const result = await retryMutation.mutateAsync(activeReceiptId);
      applyReceipt(result);
      toast.success('Запущено повторну обробку');
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const onRefresh = async () => {
    if (!activeReceiptId) {
      toast.error('Вкажіть ID чека');
      return;
    }

    try {
      const result = await getReceiptMutation.mutateAsync(activeReceiptId);
      applyReceipt(result);
      toast.success('Стан чека оновлено');
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  return (
    <div className="space-y-6" data-testid="dashboard-receipts-page">
      <div>
        <h2 className="flex items-center gap-2 text-2xl font-semibold tracking-tight" data-testid="dashboard-receipts-title">
          <Receipt className="h-6 w-6 text-primary" />
          {t('receipts.title')}
        </h2>
        <p className="text-muted-foreground" data-testid="dashboard-receipts-subtitle">{t('receipts.subtitle')}</p>
      </div>

      {!orgId ? (
        <Alert variant="destructive" data-testid="dashboard-receipts-no-org-alert">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Некоректний маршрут</AlertTitle>
          <AlertDescription>Сторінка чеків потребує orgId в URL.</AlertDescription>
        </Alert>
      ) : null}

      <Card className="border border-border bg-card/60 backdrop-blur-sm" data-testid="dashboard-receipts-upload-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileDigit className="h-5 w-5 text-primary" />
            Завантаження чека
          </CardTitle>
          <CardDescription>Перший етап pipeline: upload draft.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="receipt-file">Файл чека</Label>
            <Input
              id="receipt-file"
              type="file"
              accept="image/*,application/pdf"
              data-testid="dashboard-receipts-upload-file-input"
              onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
            />
          </div>
          <Button
            onClick={onUploadDraft}
            disabled={!selectedFile || isBusy}
            data-testid="dashboard-receipts-upload-button"
          >
            {uploadDraftMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Завантажити чернетку
          </Button>
        </CardContent>
      </Card>

      <Card className="border border-border bg-card/60 backdrop-blur-sm" data-testid="dashboard-receipts-actions-card">
        <CardHeader>
          <CardTitle className="text-lg">Керування pipeline</CardTitle>
          <CardDescription>Extract, verify, activate, retry та ручне оновлення статусу.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="receipt-id">ID чека</Label>
            <Input
              id="receipt-id"
              value={receiptIdInput}
              onChange={(event) => setReceiptIdInput(event.target.value)}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              data-testid="dashboard-receipts-id-input"
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
            <Button
              onClick={onExtract}
              disabled={!orgId || !activeReceiptId || !selectedFile || isBusy}
              data-testid="dashboard-receipts-extract-button"
            >
              Extract
            </Button>
            <Button
              onClick={onVerify}
              disabled={!orgId || !activeReceiptId || isBusy}
              data-testid="dashboard-receipts-verify-button"
            >
              Verify
            </Button>
            <Button
              onClick={onActivate}
              disabled={!activeReceiptId || isBusy}
              data-testid="dashboard-receipts-activate-button"
            >
              Activate
            </Button>
            <Button
              variant="outline"
              onClick={onRetry}
              disabled={!activeReceiptId || isBusy}
              data-testid="dashboard-receipts-retry-button"
            >
              Retry
            </Button>
            <Button
              variant="outline"
              onClick={onRefresh}
              disabled={!activeReceiptId || isBusy}
              data-testid="dashboard-receipts-refresh-button"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border bg-card/60 backdrop-blur-sm" data-testid="dashboard-receipts-state-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            Поточний стан
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {receipt ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Badge data-testid="dashboard-receipts-status-badge">
                  {statusLabelMap[receipt.status] ?? `Status ${receipt.status}`}
                </Badge>
                <Badge variant="outline" data-testid="dashboard-receipts-publication-badge">
                  {publicationLabelMap[receipt.publicationStatus] ?? `Publication ${receipt.publicationStatus}`}
                </Badge>
              </div>

              <dl className="grid gap-2 sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">ID</dt>
                  <dd data-testid="dashboard-receipts-state-id" className="break-all font-medium">{receipt.id}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Файл</dt>
                  <dd data-testid="dashboard-receipts-state-filename" className="font-medium">{receipt.originalFileName || '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Магазин</dt>
                  <dd data-testid="dashboard-receipts-state-merchant" className="font-medium">{receipt.merchantName || '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Сума</dt>
                  <dd data-testid="dashboard-receipts-state-total" className="font-medium">{formatAmount(receipt.totalAmount)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Дата покупки</dt>
                  <dd data-testid="dashboard-receipts-state-purchase-date" className="font-medium">{formatDate(receipt.purchaseDateUtc)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Створено</dt>
                  <dd data-testid="dashboard-receipts-state-created-at" className="font-medium">{formatDate(receipt.createdAt)}</dd>
                </div>
              </dl>

              {receipt.verificationFailureReason ? (
                <Alert variant="destructive" data-testid="dashboard-receipts-state-failure-reason">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Причина помилки верифікації</AlertTitle>
                  <AlertDescription>{receipt.verificationFailureReason}</AlertDescription>
                </Alert>
              ) : null}
            </>
          ) : (
            <p className="text-muted-foreground" data-testid="dashboard-receipts-state-empty">
              Ще немає активного чека. Завантажте файл або вставте ID та натисніть Refresh.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
