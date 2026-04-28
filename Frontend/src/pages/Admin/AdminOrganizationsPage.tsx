import { useEffect, useMemo, useState } from 'react';
import {
  useAdminOrganizations,
  useAdminOrganizationPlanUsage,
  useAdminSetOrganizationPlan,
  useAdminBlockOrganization,
  useAdminUnblockOrganization,
  useAdminDeleteOrganization,
  getAdminOrganizationsOptions,
  getAdminOrganizationPlanUsageOptions,
} from '@/hooks/queries/useAdminQueries';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { Link } from 'react-router';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/services/api';
import { toast } from 'sonner';
import { Check, X, Trash, MoreVertical, ExternalLink, ShieldAlert, ShieldCheck } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useTranslation } from 'react-i18next';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import type { AdminOrganizationDto, OrganizationPlanType, OrganizationPlanUsageDto } from '@/types/admin';
import { OrganizationPlanType as PlanTypeEnum } from '@/types/admin';

export default function AdminOrganizationsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [verifiedOnly, setVerifiedOnly] = useState<boolean | undefined>(undefined);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(null);
  const [pendingPlanOrgId, setPendingPlanOrgId] = useState<string | null>(null);
  const [pendingPlanType, setPendingPlanType] = useState<OrganizationPlanType>(PlanTypeEnum.Free);

  // Dialog states
  const [actingOrg, setActingOrg] = useState<AdminOrganizationDto | null>(null);
  const [isVerifyDialogOpen, setIsVerifyDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isBlockDialogOpen, setIsBlockDialogOpen] = useState(false);
  const [isUnblockDialogOpen, setIsUnblockDialogOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [blockReason, setBlockReason] = useState('');

  const {
    data,
    isLoading,
    isError,
    error,
  } = useAdminOrganizations(page, verifiedOnly, search);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);

    return () => clearTimeout(timeout);
  }, [searchInput]);

  const effectiveSelectedOrganizationId = useMemo(() => {
    if (!data?.items.length) return null;
    if (selectedOrganizationId && data.items.some((org) => org.id === selectedOrganizationId)) {
      return selectedOrganizationId;
    }

    return data.items[0].id;
  }, [data, selectedOrganizationId]);

  const selectedOrganization = useMemo(
    () => data?.items.find((org) => org.id === effectiveSelectedOrganizationId) ?? null,
    [data, effectiveSelectedOrganizationId],
  );

  const {
    data: usageResponse,
    isLoading: isUsageLoading,
    isError: isUsageError,
    error: usageError,
  } = useAdminOrganizationPlanUsage(selectedOrganization?.id ?? null);
  const setPlanMutation = useAdminSetOrganizationPlan(selectedOrganization?.id ?? null);

  const usage = (usageResponse as { payload?: OrganizationPlanUsageDto; data?: OrganizationPlanUsageDto } | undefined)?.payload
    ?? usageResponse?.data;

  const effectivePendingPlanType = selectedOrganization
    ? (pendingPlanOrgId === selectedOrganization.id ? pendingPlanType : selectedOrganization.planType)
    : PlanTypeEnum.Free;

  const applyPlanType = async () => {
    if (!selectedOrganization) return;
    await setPlanMutation.mutateAsync(effectivePendingPlanType);
  };

  const planLabel = (planType: OrganizationPlanType) =>
    planType === PlanTypeEnum.Paid ? t('admin.organizations.plan.paid') : t('admin.organizations.plan.free');

  const deleteMutation = useAdminDeleteOrganization(actingOrg?.id || '');
  const blockMutation = useAdminBlockOrganization(actingOrg?.id || '');
  const unblockMutation = useAdminUnblockOrganization(actingOrg?.id || '');

  const handleOpenVerify = (org: AdminOrganizationDto) => {
    setActingOrg(org);
    setIsVerifyDialogOpen(true);
  };

  const handleOpenDelete = (org: AdminOrganizationDto) => {
    setActingOrg(org);
    setDeleteConfirmation('');
    setIsDeleteDialogOpen(true);
  };

  const handleOpenBlockToggle = (org: AdminOrganizationDto) => {
    setActingOrg(org);
    if (org.isBlocked) {
      setIsUnblockDialogOpen(true);
    } else {
      setBlockReason('');
      setIsBlockDialogOpen(true);
    }
  };

  const onConfirmVerify = async () => {
    if (!actingOrg) return;
    try {
      await apiFetch(`/api/admin/organizations/${actingOrg.id}/verify`, {
        method: 'PUT',
        body: JSON.stringify({ isVerified: !actingOrg.isVerified })
      });
      toast.success(t('admin.organizations.actions.statusUpdated'));
      queryClient.invalidateQueries({ queryKey: ['admin', 'organizations'] });
    } catch (e: unknown) {
      toast.error((e as Error).message);
    } finally {
      setIsVerifyDialogOpen(false);
    }
  };

  const onConfirmDelete = async () => {
    if (!actingOrg) return;
    await deleteMutation.mutateAsync();
    setIsDeleteDialogOpen(false);
  };

  const onConfirmBlock = async () => {
    if (!actingOrg || !blockReason.trim()) return;
    await blockMutation.mutateAsync(blockReason.trim());
    setIsBlockDialogOpen(false);
  };

  const onConfirmUnblock = async () => {
    if (!actingOrg) return;
    await unblockMutation.mutateAsync();
    setIsUnblockDialogOpen(false);
  };

  return (
    <div className="space-y-6" data-testid="admin-organizations-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('admin.organizations.title')}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{t('admin.organizations.subtitle')}</p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_auto]" data-testid="admin-organizations-filters">
        <Input
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder={t('admin.organizations.filters.searchPlaceholder')}
          data-testid="admin-organizations-search-input"
        />
        <div className="flex items-center gap-2" data-testid="admin-organizations-verified-filter-group">
          <Button
            variant={verifiedOnly === undefined ? 'default' : 'outline'}
            onClick={() => { setPage(1); setVerifiedOnly(undefined); }}
            data-testid="admin-organizations-filter-all"
          >
            {t('admin.organizations.filters.all')}
          </Button>
          <Button
            variant={verifiedOnly === false ? 'default' : 'outline'}
            onClick={() => { setPage(1); setVerifiedOnly(false); }}
            data-testid="admin-organizations-filter-unverified"
          >
            {t('admin.organizations.filters.unverified')}
          </Button>
          <Button
            variant={verifiedOnly === true ? 'default' : 'outline'}
            onClick={() => { setPage(1); setVerifiedOnly(true); }}
            data-testid="admin-organizations-filter-verified"
          >
            {t('admin.organizations.filters.verified')}
          </Button>
        </div>
      </div>

      {isError ? (
        <Alert variant="destructive" data-testid="admin-organizations-error-alert">
          <AlertTitle>{t('admin.organizations.errorTitle')}</AlertTitle>
          <AlertDescription data-testid="admin-organizations-error-message">
            {error instanceof Error ? error.message : t('admin.organizations.errorDefault')}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="rounded-xl border border-border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('admin.organizations.table.name')}</TableHead>
              <TableHead>{t('admin.organizations.table.owner')}</TableHead>
              <TableHead>{t('admin.organizations.table.status')}</TableHead>
              <TableHead>{t('admin.organizations.table.plan')}</TableHead>
              <TableHead>{t('admin.organizations.table.campaignsAndBalance')}</TableHead>
              <TableHead>{t('admin.organizations.table.createdAt')}</TableHead>
              <TableHead className="text-right">{t('admin.organizations.table.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center" data-testid="admin-organizations-loading-cell">{t('admin.organizations.loading')}</TableCell>
              </TableRow>
            ) : data?.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center" data-testid="admin-organizations-empty-cell">{t('admin.organizations.empty')}</TableCell>
              </TableRow>
            ) : (
              data?.items.map((org) => (
                <OrganizationRow
                  key={org.id}
                  org={org}
                  onSelect={(id, planType) => {
                    setSelectedOrganizationId(id);
                    setPendingPlanOrgId(id);
                    setPendingPlanType(planType);
                  }}
                  isSelected={org.id === effectiveSelectedOrganizationId}
                  planLabel={planLabel}
                  onVerify={() => handleOpenVerify(org)}
                  onDelete={() => handleOpenDelete(org)}
                  onBlockToggle={() => handleOpenBlockToggle(org)}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-4" data-testid="admin-organizations-plan-panel">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold" data-testid="admin-organizations-plan-panel-title">Керування тарифом</h2>
            <p className="text-sm text-muted-foreground" data-testid="admin-organizations-plan-panel-subtitle">
              {selectedOrganization
                ? t('admin.organizations.planPanel.organizationLabel', { name: selectedOrganization.name })
                : t('admin.organizations.planPanel.selectOrganization')}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={effectivePendingPlanType === PlanTypeEnum.Free ? 'default' : 'outline'}
              onClick={() => {
                if (!selectedOrganization) return;
                setPendingPlanOrgId(selectedOrganization.id);
                setPendingPlanType(PlanTypeEnum.Free);
              }}
              disabled={!selectedOrganization || setPlanMutation.isPending}
              data-testid="admin-organizations-plan-free-button"
            >
              {t('admin.organizations.plan.free')}
            </Button>
            <Button
              type="button"
              variant={effectivePendingPlanType === PlanTypeEnum.Paid ? 'default' : 'outline'}
              onClick={() => {
                if (!selectedOrganization) return;
                setPendingPlanOrgId(selectedOrganization.id);
                setPendingPlanType(PlanTypeEnum.Paid);
              }}
              disabled={!selectedOrganization || setPlanMutation.isPending}
              data-testid="admin-organizations-plan-paid-button"
            >
              {t('admin.organizations.plan.paid')}
            </Button>
            <Button
              type="button"
              onClick={applyPlanType}
              disabled={!selectedOrganization || setPlanMutation.isPending || effectivePendingPlanType === selectedOrganization?.planType}
              data-testid="admin-organizations-plan-apply-button"
            >
              {setPlanMutation.isPending ? t('admin.organizations.planPanel.saving') : t('admin.organizations.planPanel.apply')}
            </Button>
          </div>
        </div>

        {selectedOrganization ? (
          <div className="text-sm text-muted-foreground" data-testid="admin-organizations-current-plan-label">
            {t('admin.organizations.planPanel.currentPlan')}: <span className="font-medium text-foreground">{planLabel(selectedOrganization.planType)}</span>
          </div>
        ) : null}

        {isUsageError ? (
          <Alert variant="destructive" data-testid="admin-organizations-usage-error-alert">
            <AlertTitle>{t('admin.organizations.usage.errorTitle')}</AlertTitle>
            <AlertDescription data-testid="admin-organizations-usage-error-message">
              {usageError instanceof Error ? usageError.message : t('admin.organizations.usage.errorDefault')}
            </AlertDescription>
          </Alert>
        ) : null}

        {isUsageLoading ? (
          <div className="text-sm text-muted-foreground" data-testid="admin-organizations-usage-loading">{t('admin.organizations.usage.loading')}</div>
        ) : null}

        {usage ? (
          <div className="grid gap-3 sm:grid-cols-3" data-testid="admin-organizations-usage-cards">
            <UsageCard
              testId="admin-organizations-usage-campaigns"
              title={t('admin.organizations.usage.campaigns')}
              current={usage.currentCampaigns}
              max={usage.maxCampaigns}
            />
            <UsageCard
              testId="admin-organizations-usage-members"
              title={t('admin.organizations.usage.members')}
              current={usage.currentMembers}
              max={usage.maxMembers}
            />
            <UsageCard
              testId="admin-organizations-usage-ocr"
              title={t('admin.organizations.usage.ocr')}
              current={usage.currentOcrExtractionsPerMonth}
              max={usage.maxOcrExtractionsPerMonth}
            />
          </div>
        ) : null}
      </div>
      
      {data && data.totalCount > data.pageSize && (
        <div className="flex justify-center gap-2 mt-4" data-testid="admin-organizations-pagination">
          <Button
            variant="outline"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
            data-testid="admin-organizations-pagination-prev"
          >
            {t('admin.organizations.pagination.previous')}
          </Button>
          <div className="flex items-center px-2 text-sm text-muted-foreground" data-testid="admin-organizations-pagination-current">
            {t('admin.organizations.pagination.page', { page })}
          </div>
          <Button
            variant="outline"
            disabled={page * data.pageSize >= data.totalCount}
            onClick={() => setPage(page + 1)}
            data-testid="admin-organizations-pagination-next"
          >
            {t('admin.organizations.pagination.next')}
          </Button>
        </div>
      )}

      {/* Verify Dialog */}
      <AlertDialog open={isVerifyDialogOpen} onOpenChange={setIsVerifyDialogOpen}>
        <AlertDialogContent data-testid="admin-organizations-verify-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actingOrg?.isVerified
                ? t('admin.organizations.actions.unverify')
                : t('admin.organizations.actions.verify')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('admin.organizations.actions.verifyConfirm', { name: actingOrg?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirmVerify} data-testid="admin-organizations-verify-confirm">
              {t('common.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent data-testid="admin-organizations-delete-dialog">
          <DialogHeader>
            <DialogTitle>{t('admin.organizations.actions.delete')}</DialogTitle>
            <DialogDescription>
              {t('admin.organizations.actions.deleteConfirm', { name: actingOrg?.name })}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <Label htmlFor="delete-confirm">
              Введіть <strong>{actingOrg?.name}</strong> для підтвердження:
            </Label>
            <Input
              id="delete-confirm"
              value={deleteConfirmation}
              onChange={(e) => setDeleteConfirmation(e.target.value)}
              placeholder={actingOrg?.name}
              data-testid="admin-organizations-delete-input"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              disabled={deleteConfirmation !== actingOrg?.name || deleteMutation.isPending}
              onClick={onConfirmDelete}
              data-testid="admin-organizations-delete-confirm"
            >
              {deleteMutation.isPending ? t('common.deleting') : t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Block Dialog */}
      <Dialog open={isBlockDialogOpen} onOpenChange={setIsBlockDialogOpen}>
        <DialogContent data-testid="admin-organizations-block-dialog">
          <DialogHeader>
            <DialogTitle>Заблокувати організацію</DialogTitle>
            <DialogDescription>
              Введіть причину блокування для організації {actingOrg?.name}. Це обмежить доступ для всіх учасників.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <Label htmlFor="block-reason">Причина блокування:</Label>
            <Input
              id="block-reason"
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              placeholder="Причина..."
              data-testid="admin-organizations-block-input"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBlockDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              disabled={!blockReason.trim() || blockMutation.isPending}
              onClick={onConfirmBlock}
              data-testid="admin-organizations-block-confirm"
            >
              {blockMutation.isPending ? 'Блокування...' : 'Заблокувати'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unblock Dialog */}
      <AlertDialog open={isUnblockDialogOpen} onOpenChange={setIsUnblockDialogOpen}>
        <AlertDialogContent data-testid="admin-organizations-unblock-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Розблокувати організацію</AlertDialogTitle>
            <AlertDialogDescription>
              Ви впевнені, що хочете розблокувати організацію {actingOrg?.name}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={onConfirmUnblock}
              disabled={unblockMutation.isPending}
              data-testid="admin-organizations-unblock-confirm"
            >
              {unblockMutation.isPending ? 'Розблокування...' : 'Розблокувати'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function OrganizationRow({
  org,
  onSelect,
  isSelected,
  planLabel,
  onVerify,
  onDelete,
  onBlockToggle,
}: {
  org: AdminOrganizationDto;
  onSelect: (id: string, planType: OrganizationPlanType) => void;
  isSelected: boolean;
  planLabel: (planType: OrganizationPlanType) => string;
  onVerify: () => void;
  onDelete: () => void;
  onBlockToggle: () => void;
}) {
  const { t } = useTranslation();

  return (
    <TableRow data-testid={`admin-organizations-row-${org.id}`} className={isSelected ? 'bg-primary/5' : ''}>
      <TableCell className="font-medium">
        <div className="flex items-center gap-3">
          {org.logoUrl ? (
            <img src={org.logoUrl} className="w-8 h-8 rounded-full border bg-muted" alt={org.name} />
          ) : (
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
              {org.name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <div className="font-semibold">{org.name}</div>
            <div className="text-xs text-muted-foreground">{org.slug}</div>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="text-sm">{org.ownerName}</div>
        <div className="text-xs text-muted-foreground">{org.ownerEmail}</div>
      </TableCell>
      <TableCell>
        <div className="flex gap-2">
          {org.isVerified ? (
            <Badge variant="default" className="bg-green-600" data-testid={`admin-organizations-verified-${org.id}`}>{t('admin.organizations.status.verified')}</Badge>
          ) : (
            <Badge variant="secondary" data-testid={`admin-organizations-unverified-${org.id}`}>{t('admin.organizations.status.unverified')}</Badge>
          )}
          {org.isBlocked ? (
            <Badge variant="destructive" title={org.blockReason} data-testid={`admin-organizations-blocked-${org.id}`}>Заблок.</Badge>
          ) : null}
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="outline" data-testid={`admin-organizations-plan-${org.id}`}>{planLabel(org.planType)}</Badge>
      </TableCell>
      <TableCell>
        <div className="text-sm" data-testid={`admin-organizations-campaigns-${org.id}`}>{t('admin.organizations.row.campaignsCount', { count: org.campaignCount })}</div>
        <div className="text-xs text-muted-foreground" data-testid={`admin-organizations-raised-${org.id}`}>{org.totalRaised.toLocaleString('uk-UA')} ₴</div>
      </TableCell>
      <TableCell className="text-muted-foreground text-sm">
        {format(new Date(org.createdAt), 'dd.MM.yyyy')}
      </TableCell>
      <TableCell className="text-right">
        <div className="inline-flex items-center gap-2">
          <Button
            type="button"
            variant={isSelected ? 'default' : 'outline'}
            size="sm"
            onClick={() => onSelect(org.id, org.planType)}
            data-testid={`admin-organizations-select-${org.id}`}
          >
            {t('admin.organizations.actions.plan')}
          </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0" data-testid={`admin-organizations-actions-${org.id}`}>
              <span className="sr-only">{t('admin.organizations.actions.openMenu')}</span>
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onVerify} data-testid={`admin-organizations-verify-${org.id}`}>
              {org.isVerified ? <X className="mr-2 h-4 w-4" /> : <Check className="mr-2 h-4 w-4" />}
              {org.isVerified ? t('admin.organizations.actions.unverify') : t('admin.organizations.actions.verify')}
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to={`/admin/organizations/${org.id}/campaigns`} className="cursor-pointer" data-testid={`admin-organizations-campaigns-link-${org.id}`}>
                <ExternalLink className="mr-2 h-4 w-4" />
                {t('admin.organizations.actions.organizationCampaigns')}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={onBlockToggle} 
              className={org.isBlocked ? "" : "text-destructive focus:bg-destructive/10"}
              data-testid={`admin-organizations-block-${org.id}`}
            >
              {org.isBlocked ? (
                <>
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  Розблокувати
                </>
              ) : (
                <>
                  <ShieldAlert className="mr-2 h-4 w-4" />
                  Заблокувати
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDelete} className="text-destructive focus:bg-destructive/10" data-testid={`admin-organizations-delete-${org.id}`}>
              <Trash className="mr-2 h-4 w-4" />
              {t('admin.organizations.actions.delete')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        </div>
      </TableCell>
    </TableRow>
  );
}

function UsageCard({
  title,
  current,
  max,
  testId,
}: {
  title: string;
  current: number;
  max: number;
  testId: string;
}) {
  const { t } = useTranslation();
  const isNearLimit = max > 0 && current / max >= 0.8;
  const isOverLimit = max > 0 && current >= max;

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2" data-testid={testId}>
      <div className="text-sm font-medium">{title}</div>
      <div className="text-lg font-semibold" data-testid={`${testId}-value`}>{current} / {max}</div>
      <div className="text-xs text-muted-foreground" data-testid={`${testId}-status`}>
        {isOverLimit
          ? t('admin.organizations.usage.status.limitReached')
          : isNearLimit
            ? t('admin.organizations.usage.status.nearLimit')
            : t('admin.organizations.usage.status.withinLimit')}
      </div>
    </div>
  );
}

export async function clientLoader({ request }: { request: Request }) {
  const { ensureQueryData } = await import('@/utils/routerHelpers');
  const url = new URL(request.url);
  const page = Number(url.searchParams.get('page')) || 1;
  const verifiedOnlyParam = url.searchParams.get('verifiedOnly');
  const verifiedOnly = verifiedOnlyParam === 'true' ? true : verifiedOnlyParam === 'false' ? false : undefined;
  const search = url.searchParams.get('search') || '';

  const orgs = await ensureQueryData(getAdminOrganizationsOptions(page, verifiedOnly, search));

  // Prefetch usage for the first organization if it exists
  if (orgs.items.length > 0) {
    await ensureQueryData(getAdminOrganizationPlanUsageOptions(orgs.items[0].id));
  }

  return null;
}
