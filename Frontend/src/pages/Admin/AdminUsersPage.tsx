import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  useAdminUsers,
  useAdminRoles,
  useAdminAssignRoles,
  useAdminDeleteUser,
  useAdminSetUserLockout,
} from '@/hooks/queries/useAdminQueries';
import { useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { AppRoles } from '@/constants/appRoles';
import type { AdminUserDto, AdminRoleDto } from '@/types/admin';

type StatusFilter = 'all' | 'active' | 'locked';

function parseStatusFilter(value: string | null): StatusFilter {
  if (value === 'active' || value === 'locked') {
    return value;
  }

  return 'all';
}

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1);
  const statusFilter = parseStatusFilter(searchParams.get('status'));
  const roleFilter = searchParams.get('role') ?? 'all';
  const searchFromUrl = searchParams.get('search') ?? '';

  const [searchInput, setSearchInput] = useState(searchFromUrl);
  const [editingUser, setEditingUser] = useState<AdminUserDto | null>(null);

  useEffect(() => {
    setSearchInput(searchFromUrl);
  }, [searchFromUrl]);

  const updateSearchParams = useCallback((
    updater: (params: URLSearchParams) => void,
    options?: { replace?: boolean },
  ) => {
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      updater(next);

      if ((next.get('page') ?? '1') === '1') {
        next.delete('page');
      }

      return next;
    }, { replace: options?.replace ?? false });
  }, [setSearchParams]);

  const applyFilters = useCallback((next: {
    search?: string;
    status?: StatusFilter;
    role?: string;
  }) => {
    updateSearchParams((params) => {
      if (next.search !== undefined) {
        const normalized = next.search.trim();
        if (normalized) {
          params.set('search', normalized);
        } else {
          params.delete('search');
        }
      }

      if (next.status !== undefined) {
        if (next.status === 'all') {
          params.delete('status');
        } else {
          params.set('status', next.status);
        }
      }

      if (next.role !== undefined) {
        if (next.role === 'all') {
          params.delete('role');
        } else {
          params.set('role', next.role);
        }
      }

      params.delete('page');
    });
  }, [updateSearchParams]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (searchInput === searchFromUrl) {
        return;
      }

      applyFilters({ search: searchInput });
    }, 350);

    return () => window.clearTimeout(timer);
    }, [searchInput, searchFromUrl, applyFilters]);

  const filters = useMemo(
    () => ({
      search: searchFromUrl.trim() || undefined,
      isActive: statusFilter === 'all' ? undefined : statusFilter === 'active',
      role: roleFilter === 'all' ? undefined : roleFilter,
    }),
    [searchFromUrl, statusFilter, roleFilter],
  );

  const { data: users, isLoading } = useAdminUsers(page, filters);
  const { data: roles } = useAdminRoles();

  const resetFilters = () => {
    setSearchInput('');
    updateSearchParams((params) => {
      params.delete('search');
      params.delete('status');
      params.delete('role');
      params.delete('page');
    });
  };

  const hasFilters = Boolean(filters.search || filters.role || typeof filters.isActive === 'boolean');

  return (
    <div className="space-y-6" data-testid="admin-users-page">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Користувачі</h1>
          <p className="mt-1 text-sm text-muted-foreground">Керування ролями, блокуванням та видаленням користувачів.</p>
        </div>
      </div>

      <div className="grid gap-3 rounded-xl border border-border bg-card p-4 md:grid-cols-[1fr_220px_220px_auto_auto]" data-testid="admin-users-filters">
        <Input
          data-testid="admin-users-search-input"
          placeholder="Пошук за email або ПІБ"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
        />

        <Select
          value={statusFilter}
          onValueChange={(value: StatusFilter) => applyFilters({ status: value })}
        >
          <SelectTrigger data-testid="admin-users-status-filter" className="w-full">
            <SelectValue placeholder="Статус" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Всі статуси</SelectItem>
            <SelectItem value="active">Активні</SelectItem>
            <SelectItem value="locked">Заблоковані</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={roleFilter}
          onValueChange={(value) => applyFilters({ role: value })}
        >
          <SelectTrigger data-testid="admin-users-role-filter" className="w-full">
            <SelectValue placeholder="Роль" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Всі ролі</SelectItem>
            {(roles ?? []).map((role) => (
              <SelectItem key={role.name} value={role.name}>
                {role.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          data-testid="admin-users-refresh-button"
          variant="outline"
          onClick={() => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })}
        >
          Оновити
        </Button>

        <Button
          data-testid="admin-users-reset-filters-button"
          variant="ghost"
          onClick={resetFilters}
          disabled={!hasFilters}
        >
          Скинути
        </Button>
      </div>

      <div className="flex flex-wrap gap-2" data-testid="admin-users-quick-presets">
        <Button
          data-testid="admin-users-preset-admins"
          variant="outline"
          size="sm"
          onClick={() => {
            setSearchInput('');
            applyFilters({ search: '', status: 'all', role: AppRoles.Admin });
          }}
        >
          Тільки адміни
        </Button>
        <Button
          data-testid="admin-users-preset-locked"
          variant="outline"
          size="sm"
          onClick={() => {
            setSearchInput('');
            applyFilters({ search: '', status: 'locked', role: 'all' });
          }}
        >
          Тільки заблоковані
        </Button>
        <Button
          data-testid="admin-users-preset-volunteers-active"
          variant="outline"
          size="sm"
          onClick={() => {
            setSearchInput('');
            applyFilters({ search: '', status: 'active', role: AppRoles.Volunteer });
          }}
        >
          Активні волонтери
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Користувач</TableHead>
              <TableHead>Ролі</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Зареєстровано</TableHead>
              <TableHead className="text-right">Дії</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">Завантаження...</TableCell>
              </TableRow>
            ) : !users || users.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">Немає користувачів</TableCell>
              </TableRow>
            ) : (
              users.items.map((user) => (
                <UserRow
                  key={user.id}
                  user={user}
                  onEditRoles={() => setEditingUser(user)}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {users && users.totalCount > users.pageSize && (
        <div className="mt-4 flex justify-center gap-2">
          <Button
            data-testid="admin-users-prev-page-button"
            variant="outline"
            disabled={page === 1}
            onClick={() => {
              updateSearchParams((params) => {
                params.set('page', String(page - 1));
              });
            }}
          >
            Попередня
          </Button>
          <Button
            data-testid="admin-users-next-page-button"
            variant="outline"
            disabled={page * users.pageSize >= users.totalCount}
            onClick={() => {
              updateSearchParams((params) => {
                params.set('page', String(page + 1));
              });
            }}
          >
            Наступна
          </Button>
        </div>
      )}

      {editingUser && roles && (
        <EditRolesDialog
          user={editingUser}
          availableRoles={roles}
          onClose={() => setEditingUser(null)}
        />
      )}
    </div>
  );
}

function UserRow({ user, onEditRoles }: { user: AdminUserDto; onEditRoles: () => void }) {
  const initials = `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.trim().toUpperCase() || 'U';
  const lockoutMutation = useAdminSetUserLockout(user.id);
  const deleteMutation = useAdminDeleteUser(user.id);

  const handleToggleLockout = async () => {
    const shouldLock = user.isActive;
    const action = shouldLock ? 'заблокувати' : 'розблокувати';
    if (!window.confirm(`Підтвердьте: ${action} користувача ${user.email}?`)) {
      return;
    }

    await lockoutMutation.mutateAsync(shouldLock);
  };

  const handleDelete = async () => {
    const confirmation = window.prompt(`Щоб видалити користувача, введіть email: ${user.email}`);
    if (confirmation?.trim().toLowerCase() !== user.email.toLowerCase()) {
      return;
    }

    await deleteMutation.mutateAsync();
  };

  return (
    <TableRow data-testid={`admin-users-row-${user.id}`}>
      <TableCell className="font-medium">
        <div className="flex items-center gap-3">
          {user.profilePhotoUrl ? (
            <img src={user.profilePhotoUrl} className="h-8 w-8 rounded-full border bg-muted" alt="avatar" />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              {initials}
            </div>
          )}
          <div>
            <div className="font-semibold">{user.firstName} {user.lastName}</div>
            <div className="text-xs text-muted-foreground">{user.email}</div>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1">
          {user.roles && user.roles.length > 0 ? user.roles.map((role) => (
            <Badge key={role} variant={role === AppRoles.Admin ? 'default' : 'secondary'} className={role === AppRoles.Admin ? 'bg-primary' : ''}>
              {role}
            </Badge>
          )) : (
            <span className="text-xs text-muted-foreground">Немає</span>
          )}
        </div>
      </TableCell>
      <TableCell>
        {user.isActive ? (
          <Badge data-testid={`admin-users-status-${user.id}`} variant="outline" className="border-green-600 text-green-600">Активний</Badge>
        ) : (
          <Badge data-testid={`admin-users-status-${user.id}`} variant="outline" className="border-red-600 text-red-600">Заблокований</Badge>
        )}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {format(new Date(user.createdAt), 'dd.MM.yyyy')}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Button
            data-testid={`admin-users-edit-roles-${user.id}`}
            variant="outline"
            size="sm"
            onClick={onEditRoles}
            disabled={lockoutMutation.isPending || deleteMutation.isPending}
          >
            Змінити ролі
          </Button>

          <Button
            data-testid={`admin-users-lockout-${user.id}`}
            variant={user.isActive ? 'outline' : 'secondary'}
            size="sm"
            onClick={handleToggleLockout}
            disabled={lockoutMutation.isPending || deleteMutation.isPending}
          >
            {lockoutMutation.isPending ? 'Оновлення...' : user.isActive ? 'Заблокувати (бан)' : 'Зняти локаут'}
          </Button>

          <Button
            data-testid={`admin-users-delete-${user.id}`}
            variant="soft"
            size="sm"
            onClick={handleDelete}
            disabled={lockoutMutation.isPending || deleteMutation.isPending}
            className="text-destructive hover:bg-destructive/10"
          >
            {deleteMutation.isPending ? 'Видалення...' : 'Видалити'}
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

function EditRolesDialog({ user, availableRoles, onClose }: { user: AdminUserDto; availableRoles: AdminRoleDto[]; onClose: () => void }) {
  const [selectedRoles, setSelectedRoles] = useState<string[]>(user.roles || []);
  const assignRolesMutation = useAdminAssignRoles(user.id);

  const handleToggleRole = (roleName: string) => {
    setSelectedRoles((prev) =>
      prev.includes(roleName) ? prev.filter((role) => role !== roleName) : [...prev, roleName],
    );
  };

  const handleSave = async () => {
    await assignRolesMutation.mutateAsync(selectedRoles);
    onClose();
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Управління дозволами ({user.firstName} {user.lastName})</DialogTitle>
          <DialogDescription>
            Оберіть ролі для цього користувача. Вони визначають його дозволи в системі.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {availableRoles.map((role) => (
            <div
              key={role.name}
              className="cursor-pointer rounded-lg border p-3 hover:bg-muted/50"
              onClick={() => handleToggleRole(role.name)}
            >
              <div className="flex items-start space-x-3">
                <Checkbox
                  id={`role-${role.name}`}
                  checked={selectedRoles.includes(role.name)}
                  onCheckedChange={() => handleToggleRole(role.name)}
                />
                <div className="grid gap-1.5 leading-none">
                  <label
                    htmlFor={`role-${role.name}`}
                    className="cursor-pointer text-sm font-medium leading-none"
                  >
                    {role.description} ({role.name})
                  </label>
                  <p className="max-h-24 overflow-y-auto text-xs leading-snug text-muted-foreground">
                    Дозволи: {role.permissions.join(', ')}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={assignRolesMutation.isPending}>
            Скасувати
          </Button>
          <Button onClick={handleSave} disabled={assignRolesMutation.isPending}>
            {assignRolesMutation.isPending ? 'Збереження...' : 'Зберегти'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
