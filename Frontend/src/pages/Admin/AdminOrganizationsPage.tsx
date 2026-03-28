import { useState } from 'react';
import { useAdminOrganizations } from '@/hooks/queries/useAdminQueries';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
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
import { Check, X, Trash, MoreVertical, ExternalLink } from 'lucide-react';
import type { AdminOrganizationDto } from '@/types/admin';

export default function AdminOrganizationsPage() {
  const [page, setPage] = useState(1);
  const [verifiedOnly, setVerifiedOnly] = useState<boolean | undefined>(undefined);

  const { data, isLoading } = useAdminOrganizations(page, verifiedOnly);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Організації</h1>
          <p className="text-muted-foreground mt-1 text-sm">Управління організаціями та верифікацією.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={verifiedOnly === undefined ? 'default' : 'outline'}
            onClick={() => { setPage(1); setVerifiedOnly(undefined); }}
          >
            Всі
          </Button>
          <Button
            variant={verifiedOnly === false ? 'default' : 'outline'}
            onClick={() => { setPage(1); setVerifiedOnly(false); }}
          >
            Не перевірені
          </Button>
          <Button
            variant={verifiedOnly === true ? 'default' : 'outline'}
            onClick={() => { setPage(1); setVerifiedOnly(true); }}
          >
            Верифіковані
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Назва</TableHead>
              <TableHead>Власник</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Збори / Баланс</TableHead>
              <TableHead>Створено</TableHead>
              <TableHead className="text-right">Дії</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">Завантаження...</TableCell>
              </TableRow>
            ) : data?.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">Немає організацій</TableCell>
              </TableRow>
            ) : (
              data?.items.map((org) => (
                <OrganizationRow key={org.id} org={org} />
              ))
            )}
          </TableBody>
        </Table>
      </div>
      
      {data && data.totalCount > data.pageSize && (
        <div className="flex justify-center gap-2 mt-4">
          <Button
            variant="outline"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Попередня
          </Button>
          <Button
            variant="outline"
            disabled={page * data.pageSize >= data.totalCount}
            onClick={() => setPage(page + 1)}
          >
            Наступна
          </Button>
        </div>
      )}
    </div>
  );
}

import { useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/services/api';
import { toast } from 'sonner';

function OrganizationRow({ org }: { org: AdminOrganizationDto }) {
  const queryClient = useQueryClient();
  const [isVerifying, setIsVerifying] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const toggleVerify = async () => {
    if (!window.confirm(`Змінити статус верифікації для ${org.name}?`)) return;
    setIsVerifying(true);
    try {
      await apiFetch(`/api/admin/organizations/${org.id}/verify`, {
        method: 'PUT',
        body: JSON.stringify({ isVerified: !org.isVerified })
      });
      toast.success('Статус оновлено');
      queryClient.invalidateQueries({ queryKey: ['admin', 'organizations'] });
    } catch (e: unknown) {
      toast.error((e as Error).message);
    } finally {
      setIsVerifying(false);
    }
  };

  const deleteOrg = async () => {
    if (!window.prompt(`УВАГА! Це видалить організацію та всі її збори. Введіть назву "${org.name}" для підтвердження:`)?.includes(org.name)) return;
    setIsDeleting(true);
    try {
      await apiFetch(`/api/admin/organizations/${org.id}`, { method: 'DELETE' });
      toast.success('Видалено');
      queryClient.invalidateQueries({ queryKey: ['admin', 'organizations'] });
    } catch (e: unknown) {
      toast.error((e as Error).message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <TableRow>
      <TableCell className="font-medium">
        <div className="flex items-center gap-3">
          {org.logoUrl ? (
            <img src={org.logoUrl} className="w-8 h-8 rounded-full border bg-muted" />
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
        {org.isVerified ? (
          <Badge variant="default" className="bg-green-600">Верифікована</Badge>
        ) : (
          <Badge variant="secondary">Не перевірена</Badge>
        )}
      </TableCell>
      <TableCell>
        <div className="text-sm">{org.campaignCount} зборів</div>
        <div className="text-xs text-muted-foreground">{org.totalRaised.toLocaleString('uk-UA')} ₴</div>
      </TableCell>
      <TableCell className="text-muted-foreground text-sm">
        {format(new Date(org.createdAt), 'dd.MM.yyyy')}
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
            <DropdownMenuItem onClick={toggleVerify} disabled={isVerifying}>
              {org.isVerified ? <X className="mr-2 h-4 w-4" /> : <Check className="mr-2 h-4 w-4" />}
              {org.isVerified ? 'Скасувати верифікацію' : 'Верифікувати'}
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to={`/admin/organizations/${org.id}/campaigns`} className="cursor-pointer">
                <ExternalLink className="mr-2 h-4 w-4" />
                Збори організації
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={deleteOrg} disabled={isDeleting} className="text-destructive focus:bg-destructive/10">
              <Trash className="mr-2 h-4 w-4" />
              Видалити
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}
