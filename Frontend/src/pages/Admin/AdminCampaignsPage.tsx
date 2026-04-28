import { useState } from 'react';
import { useParams, Link } from 'react-router';
import { useAdminOrganizationCampaigns, getAdminOrganizationCampaignsOptions } from '@/hooks/queries/useAdminQueries';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
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
import { MoreVertical, ArrowLeft, Play, Pause, CheckCircle2 } from 'lucide-react';
import { CampaignStatus, CampaignStatusLabel } from '@/types';
import { useTranslation } from 'react-i18next';

export default function AdminCampaignsPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const [page] = useState(1);
  const { data: campaigns, isLoading } = useAdminOrganizationCampaigns(orgId || '', page);

  if (!orgId) return <div>Invalid URL</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild className="shrink-0 -ml-2 text-muted-foreground hover:text-foreground">
          <Link to="/admin">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Збори організації</h1>
          <p className="text-muted-foreground mt-1 text-sm">Перегляд зборів обраної організації та керування їхнім статусом.</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Назва</TableHead>
              <TableHead>Створено</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Кошти</TableHead>
              <TableHead className="text-right">Дії</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">Завантаження...</TableCell>
              </TableRow>
            ) : (!campaigns || campaigns.length === 0) ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">Немає зборів</TableCell>
              </TableRow>
            ) : (
              campaigns.map((camp) => (
                <CampaignRow key={camp.id} campaign={camp} />
              ))
            )}
          </TableBody>
        </Table>
      </div>
      
      {campaigns && campaigns.length === 20 && (
        <div className="flex justify-center gap-2 mt-4">
           {/* If we needed full pagination info, the response should probably have returned totalCount etc. But this api returns IReadOnlyList. Let's just do next/prev loosely. */}
        </div>
      )}
    </div>
  );
}

import { useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/services/api';
import { toast } from 'sonner';
import type { AdminCampaignDto } from '@/types/admin';
import { resolveLocalizedText } from '@/lib/localizedText';

function CampaignRow({ campaign }: { campaign: AdminCampaignDto }) {
  const queryClient = useQueryClient();
  const [isChanging, setIsChanging] = useState(false);
  const { t, i18n } = useTranslation();
  const campaignTitle = resolveLocalizedText(campaign.titleUk, campaign.titleEn, i18n.language);

  const changeStatus = async (newStatus: CampaignStatus) => {
    setIsChanging(true);
    try {
      await apiFetch(`/api/admin/campaigns/${campaign.id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ newStatus })
      });
      toast.success('Статус оновлено');
      queryClient.invalidateQueries({ queryKey: ['admin'] });
    } catch (e: unknown) {
      toast.error((e as Error).message);
    } finally {
      setIsChanging(false);
    }
  };

  const getStatusBadge = (status: CampaignStatus) => {
    switch (status) {
      case CampaignStatus.Active: return <Badge className="bg-green-600">{t(CampaignStatusLabel[status]) || 'Активний'}</Badge>;
      case CampaignStatus.Paused: return <Badge variant="secondary" className="bg-amber-500 text-white">{t(CampaignStatusLabel[status]) || 'На паузі'}</Badge>;
      case CampaignStatus.Completed: return <Badge variant="outline" className="border-green-600 text-green-600 font-semibold">{t(CampaignStatusLabel[status]) || 'Завершено'}</Badge>;
      default: return <Badge variant="outline">{t(CampaignStatusLabel[status] || 'Чернетка')}</Badge>;
    }
  };

  return (
    <TableRow>
      <TableCell className="font-medium">
        <div className="flex items-center gap-3">
          {campaign.coverImageUrl ? (
            <img src={campaign.coverImageUrl} className="w-10 h-10 rounded-md object-cover border bg-muted" />
          ) : (
            <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center font-bold text-xs text-muted-foreground">
              IMG
            </div>
          )}
          <div>
            <div className="font-semibold line-clamp-1" title={campaignTitle}>{campaignTitle}</div>
            <div className="text-xs text-muted-foreground">{campaign.organizationName}</div>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="text-sm">{campaign.createdByName}</div>
        <div className="text-xs text-muted-foreground">{format(new Date(campaign.createdAt), 'dd.MM.yyyy')}</div>
      </TableCell>
      <TableCell>
        {getStatusBadge(campaign.status)}
      </TableCell>
      <TableCell>
        <div className="text-sm font-semibold">{campaign.currentAmount.toLocaleString()} / {campaign.goalAmount.toLocaleString()} ₴</div>
        <div className="text-xs text-muted-foreground whitespace-nowrap">
          {Math.round((campaign.currentAmount / campaign.goalAmount) * 100)}% зібрано
        </div>
      </TableCell>
      <TableCell className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Відкрити меню</span>
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => changeStatus(CampaignStatus.Active)} disabled={isChanging || campaign.status === CampaignStatus.Active}>
              <Play className="mr-2 h-4 w-4 text-green-600" />
              Активувати
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => changeStatus(CampaignStatus.Paused)} disabled={isChanging || campaign.status === CampaignStatus.Paused}>
              <Pause className="mr-2 h-4 w-4 text-amber-500" />
              Призупинити
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => changeStatus(CampaignStatus.Completed)} disabled={isChanging || campaign.status === CampaignStatus.Completed}>
              <CheckCircle2 className="mr-2 h-4 w-4 text-blue-600" />
              Завершити
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

export async function clientLoader({ params, request }: { params: { orgId?: string }; request: Request }) {
  const { ensureQueryData } = await import('@/utils/routerHelpers');
  const url = new URL(request.url);
  const page = Number(url.searchParams.get('page')) || 1;
  const orgId = params.orgId;

  if (orgId) {
    await ensureQueryData(getAdminOrganizationCampaignsOptions(orgId, page));
  }

  return null;
}
