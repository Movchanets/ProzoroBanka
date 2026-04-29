import { useDeferredValue, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import {
  ArrowRight,
  CheckCircle2,
  FileSearch,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  Trash2,
  Loader2,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useMyReceipts, useDeleteReceipt, getMyReceiptsOptions } from '@/hooks/queries/useReceipts';
import { useOrganizationMembers, getOrganizationMembersOptions } from '@/hooks/queries/useOrganizations';
import { ensureQueryData } from '@/utils/routerHelpers';
import type { LoaderFunctionArgs } from 'react-router';
import { useAuthStore } from '@/stores/authStore';
import { OrganizationRole, ReceiptPublicationStatus, ReceiptStatus, type ReceiptListItem } from '@/types';

const statusOptions = [
  { value: 'all', label: 'Усі статуси' },
  { value: String(ReceiptStatus.Draft), label: 'Чернетки' },
  { value: String(ReceiptStatus.PendingOcr), label: 'Очікують OCR' },
  { value: String(ReceiptStatus.OcrDeferredMonthlyQuota), label: 'Ліміт OCR вичерпано' },
  { value: String(ReceiptStatus.OcrExtracted), label: 'OCR заповнено' },
  { value: String(ReceiptStatus.PendingStateValidation), label: 'Очікує перевірки' },
  { value: String(ReceiptStatus.StateVerified), label: 'Верифіковані' },
  { value: String(ReceiptStatus.InvalidData), label: 'Потребують правок' },
  { value: String(ReceiptStatus.FailedVerification), label: 'Помилка перевірки' },
] as const;

const statusLabels: Record<number, string> = {
  [ReceiptStatus.PendingOcr]: 'OCR',
  [ReceiptStatus.PendingStateValidation]: 'Очікує перевірки',
  [ReceiptStatus.OcrExtracted]: 'OCR готово',
  [ReceiptStatus.FailedVerification]: 'Помилка',
  [ReceiptStatus.ValidationDeferredRateLimit]: 'Відкладено',
  [ReceiptStatus.Draft]: 'Чернетка',
  [ReceiptStatus.StateVerified]: 'Перевірено',
  [ReceiptStatus.InvalidData]: 'Невалідний',
  [ReceiptStatus.OcrDeferredMonthlyQuota]: 'Квота OCR',
};

function formatAmount(value?: number) {
  if (typeof value !== 'number') {
    return '—';
  }

  const hryvnias = value / 100;

  return new Intl.NumberFormat('uk-UA', {
    style: 'currency',
    currency: 'UAH',
    maximumFractionDigits: 2,
  }).format(hryvnias);
}

function formatDate(value?: string) {
  if (!value) {
    return '—';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '—';
  }

  return parsed.toLocaleDateString('uk-UA');
}

function ReceiptStatusBadge({ receipt }: { receipt: ReceiptListItem }) {
  const variant = receipt.status === ReceiptStatus.StateVerified
    ? 'default'
    : receipt.status === ReceiptStatus.InvalidData || receipt.status === ReceiptStatus.FailedVerification || receipt.status === ReceiptStatus.OcrDeferredMonthlyQuota || receipt.status === ReceiptStatus.ValidationDeferredRateLimit
      ? 'destructive'
      : 'outline';

  return (
    <div className="flex flex-wrap gap-2">
      <Badge variant={variant} className="flex items-center gap-1.5">
        {receipt.status === ReceiptStatus.PendingOcr && (
          <Loader2 className="h-3 w-3 animate-spin" />
        )}
        {statusLabels[receipt.status] ?? `Status ${receipt.status}`}
      </Badge>
      <Badge variant="outline">
        {receipt.publicationStatus === ReceiptPublicationStatus.Active ? 'Публічний' : 'Не опублікований'}
      </Badge>
    </div>
  );
}

 
export async function clientLoader({ params }: LoaderFunctionArgs) {
  const { orgId } = params;
  if (!orgId) return null;

  await Promise.allSettled([
    ensureQueryData(getOrganizationMembersOptions(orgId)),
    ensureQueryData(getMyReceiptsOptions(orgId, { search: '', status: undefined, onlyUnattached: false })),
  ]);

  return null;
}

export default function ReceiptsListPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deleteTarget, setDeleteTarget] = useState<ReceiptListItem | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const deferredSearch = useDeferredValue(search.trim());
  const currentUser = useAuthStore((s) => s.user);
  const { data: members } = useOrganizationMembers(orgId);
  const deleteReceipt = useDeleteReceipt();

  const status = statusFilter === 'all' ? undefined : Number(statusFilter) as ReceiptStatus;
  const {
    data: receipts = [],
    isLoading,
    isError,
    refetch,
  } = useMyReceipts(
    orgId ?? '',
    deferredSearch,
    status,
    false,
    !!orgId,
    (data: any) => {
      if (!Array.isArray(data)) return false;
      return data.some((r: any) => r.status === ReceiptStatus.PendingOcr) ? 3000 : false;
    }
  );

  const stats = useMemo(() => {
    const attachedCount = receipts.filter((receipt) => receipt.campaignId).length;
    const verifiedCount = receipts.filter((receipt) => receipt.status === ReceiptStatus.StateVerified).length;

    return {
      total: receipts.length,
      verified: verifiedCount,
      attached: attachedCount,
    };
  }, [receipts]);

  const currentMember = members?.find((member) => member.userId === currentUser?.id);
  const canDeleteReceipt = currentMember?.role === OrganizationRole.Owner || currentMember?.role === OrganizationRole.Admin;

  const handleConfirmDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    setDeleteError(null);
    try {
      await deleteReceipt.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Не вдалося видалити чек');
    }
  };

  return (
    <div className="space-y-6" data-testid="dashboard-receipts-list-page">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <h2 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Receipt className="h-6 w-6 text-primary" />
            Реєстр чеків
          </h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Тут зібрані всі ваші чеки. Шукайте їх по `alias`, магазину або файлу, відкривайте картку чека і привʼязуйте перевірені чеки до зборів.
          </p>
        </div>

        {orgId ? (
          <Button asChild size="pill" data-testid="dashboard-receipts-list-create-button">
            <Link to={`/dashboard/${orgId}/receipts/new`}>
              <Plus className="h-4 w-4" />
              Створити чек
            </Link>
          </Button>
        ) : null}
      </div>

      {!orgId ? (
        <Alert variant="destructive">
          <AlertTitle>Некоректний маршрут</AlertTitle>
          <AlertDescription>Реєстр чеків потребує `orgId` в URL.</AlertDescription>
        </Alert>
      ) : null}

      {deleteError ? (
        <Alert variant="destructive" data-testid="dashboard-receipts-list-delete-error-alert">
          <AlertDescription>{deleteError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border border-border bg-card/60 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardDescription>Всього чеків</CardDescription>
            <CardTitle className="text-3xl">{isLoading ? '…' : stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border border-border bg-card/60 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardDescription>Готові до attach</CardDescription>
            <CardTitle className="text-3xl">{isLoading ? '…' : stats.verified}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border border-border bg-card/60 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardDescription>Уже прикріплені</CardDescription>
            <CardTitle className="text-3xl">{isLoading ? '…' : stats.attached}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="border border-border bg-card/60 backdrop-blur-sm">
        <CardHeader className="gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-1">
            <CardTitle>Пошук і фільтрація</CardTitle>
            <CardDescription>
              Alias допомагає швидко знайти чек у selector для campaigns attach receipt.
            </CardDescription>
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
            <div className="relative min-w-64 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Пошук по alias, магазину або файлу"
                className="pl-9"
                data-testid="dashboard-receipts-list-search-input"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-56" data-testid="dashboard-receipts-list-status-filter">
                <SelectValue placeholder="Фільтр статусу" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="button" variant="outline" onClick={() => void refetch()} disabled={isLoading} data-testid="dashboard-receipts-list-refresh-button">
              <RefreshCw className="h-4 w-4" />
              Оновити
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : isError ? (
            <Alert variant="destructive">
              <AlertTitle>Не вдалося завантажити чеки</AlertTitle>
              <AlertDescription>Спробуйте оновити список ще раз.</AlertDescription>
            </Alert>
          ) : receipts.length === 0 ? (
            <div className="flex min-h-72 flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-border/70 bg-muted/10 px-6 text-center">
              <FileSearch className="h-10 w-10 text-primary/70" />
              <div className="space-y-1">
                <p className="text-base font-semibold">Поки що тут порожньо</p>
                <p className="max-w-md text-sm text-muted-foreground">
                  Створіть перший чек, задайте йому alias і після верифікації він стане доступним у campaigns attach receipt.
                </p>
              </div>
              {orgId ? (
                <Button asChild>
                  <Link to={`/dashboard/${orgId}/receipts/new`}>
                    <Plus className="h-4 w-4" />
                    Створити чек
                  </Link>
                </Button>
              ) : null}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Чек</TableHead>
                  <TableHead>Автор</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Збір</TableHead>
                  <TableHead>Сума</TableHead>
                  <TableHead>Дата покупки</TableHead>
                  <TableHead className="text-right">Дія</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receipts.map((receipt) => (
                  <TableRow key={receipt.id} data-testid={`dashboard-receipts-list-row-${receipt.id}`}>
                    <TableCell className="min-w-[270px] whitespace-normal">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold" data-testid={`dashboard-receipts-list-alias-${receipt.id}`}>
                            {receipt.alias?.trim() || 'Без alias'}
                          </span>
                          {receipt.status === ReceiptStatus.StateVerified ? (
                            <CheckCircle2 className="h-4 w-4 text-success" />
                          ) : null}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {receipt.merchantName || 'Магазин не визначено'}
                        </p>
                        <p className="truncate text-xs text-muted-foreground" title={receipt.originalFileName}>
                          {receipt.originalFileName}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="min-w-[210px] whitespace-normal">
                      <div className="space-y-1">
                        <p className="text-sm font-medium" data-testid={`dashboard-receipts-list-author-name-${receipt.id}`}>
                          {receipt.authorFullName || '—'}
                        </p>
                        <p className="text-xs text-muted-foreground" data-testid={`dashboard-receipts-list-author-email-${receipt.id}`}>
                          {receipt.authorEmail || '—'}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <ReceiptStatusBadge receipt={receipt} />
                    </TableCell>
                    <TableCell className="min-w-[180px] whitespace-normal">
                      {receipt.campaignId && orgId ? (
                        <Link
                          to={`/dashboard/${orgId}/campaigns/${receipt.campaignId}`}
                          className="text-sm font-medium text-primary hover:underline"
                        >
                          {receipt.campaignTitle || 'Відкрити збір'}
                        </Link>
                      ) : (
                        <span className="text-sm text-muted-foreground">Не прикріплено</span>
                      )}
                    </TableCell>
                    <TableCell>{formatAmount(receipt.totalAmount)}</TableCell>
                    <TableCell>{formatDate(receipt.purchaseDateUtc)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {orgId ? (
                          <Button asChild size="sm" variant="outline" data-testid={`dashboard-receipts-list-open-${receipt.id}`}>
                            <Link to={`/dashboard/${orgId}/receipts/${receipt.id}`}>
                              Відкрити
                              <ArrowRight className="h-4 w-4" />
                            </Link>
                          </Button>
                        ) : null}
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="text-destructive hover:text-destructive"
                          disabled={!canDeleteReceipt || deleteReceipt.isPending}
                          data-testid={`dashboard-receipts-list-delete-${receipt.id}`}
                          onClick={() => setDeleteTarget(receipt)}
                        >
                          {deleteReceipt.isPending && deleteTarget?.id === receipt.id
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : <Trash2 className="h-4 w-4" />}
                          Видалити
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent data-testid="dashboard-receipts-list-delete-dialog">
          <DialogHeader>
            <DialogTitle>Видалити чек?</DialogTitle>
            <DialogDescription>
              Після видалення чек зникне з реєстру.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              data-testid="dashboard-receipts-list-delete-cancel"
            >
              Скасувати
            </Button>
            <Button
              type="button"
              variant="default"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => void handleConfirmDelete()}
              disabled={deleteReceipt.isPending}
              data-testid="dashboard-receipts-list-delete-confirm"
            >
              {deleteReceipt.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Видалити
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
