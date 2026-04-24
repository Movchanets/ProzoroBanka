import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  useAdminUsers,
  useAdminRoles,
  useAdminAssignRoles,
  useAdminDeleteUser,
  useAdminImpersonateUser,
  useAdminSetUserLockout,
  useAdminUserDetails,
  useAdminRemoveUserOrganizationLink,
  useAdminUpdateUserOrganizationLink,
} from '@/hooks/queries/useAdminQueries';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { AppRoles } from '@/constants/appRoles';
import { OrganizationPermissions, OrganizationRole } from '@/types/domains/organizations';
import type { AdminUserDto, AdminRoleDto, AdminUserOrganizationLinkDto } from '@/types/admin';
import { useAuthStore } from '@/stores/authStore';

type StatusFilter = 'all' | 'active' | 'locked';

const organizationPermissionOptions = [
  { flag: OrganizationPermissions.ManageOrganization, label: 'Керування організацією' },
  { flag: OrganizationPermissions.ManageMembers, label: 'Учасники' },
  { flag: OrganizationPermissions.ManageInvitations, label: 'Запрошення' },
  { flag: OrganizationPermissions.ManageReceipts, label: 'Чеки' },
  { flag: OrganizationPermissions.ViewReports, label: 'Звіти' },
  { flag: OrganizationPermissions.UploadLogo, label: 'Логотип' },
  { flag: OrganizationPermissions.ManageCampaigns, label: 'Збори' },
] as const;

function parseStatusFilter(value: string | null): StatusFilter {
  if (value === 'active' || value === 'locked') {
    return value;
  }

  return 'all';
}

function hasPermission(value: number, flag: number) {
  return (value & flag) === flag;
}

function roleLabel(role: OrganizationRole) {
  switch (role) {
    case OrganizationRole.Owner:
      return 'Owner';
    case OrganizationRole.Admin:
      return 'Admin';
    default:
      return 'Reporter';
  }
}

function planLabel(planType: 1 | 2) {
  return planType === 2 ? 'Paid' : 'Free';
}

export default function AdminUsersPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentUserRoles = useAuthStore((state) => state.user?.roles ?? []);
  const currentUserId = useAuthStore((state) => state.user?.id ?? null);

  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1);
  const statusFilter = parseStatusFilter(searchParams.get('status'));
  const roleFilter = searchParams.get('role') ?? 'all';
  const searchFromUrl = searchParams.get('search') ?? '';

  const [searchInput, setSearchInput] = useState(searchFromUrl);
  const [editingUser, setEditingUser] = useState<AdminUserDto | null>(null);
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);

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

  const canImpersonateUsers = useMemo(() => {
    if (!roles || currentUserRoles.length === 0) {
      return false;
    }

    const normalizedCurrentRoles = new Set(currentUserRoles.map((role) => role.trim().toLowerCase()));

    return roles.some((role) =>
      normalizedCurrentRoles.has(role.name.trim().toLowerCase())
      && role.permissions.some((permission) => permission.trim().toLowerCase() === 'users.impersonate'));
  }, [currentUserRoles, roles]);

  const impersonateMutation = useAdminImpersonateUser();

  const handleImpersonate = useCallback(async (user: AdminUserDto) => {
    const confirmed = window.confirm(
      `Ви увійдете в систему як ${user.email}. Щоб повернутись до адмін-акаунта, потрібно виконати вихід і авторизуватись повторно. Продовжити?`,
    );

    if (!confirmed) {
      return;
    }

    await impersonateMutation.mutateAsync(user.id);
    navigate('/onboarding', { replace: true });
  }, [impersonateMutation, navigate]);

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
          <p className="mt-1 text-sm text-muted-foreground">Керування ролями, блокуванням та membership-зв&apos;язками користувачів.</p>
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
                  onOpenProfile={() => setViewingUserId(user.id)}
                  onEditRoles={() => setEditingUser(user)}
                  onImpersonate={() => handleImpersonate(user)}
                  canImpersonate={canImpersonateUsers && currentUserId !== user.id}
                  isImpersonating={impersonateMutation.isPending && impersonateMutation.variables === user.id}
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

      {viewingUserId && (
        <UserDetailsDialog
          userId={viewingUserId}
          onClose={() => setViewingUserId(null)}
          onEditRoles={(user) => setEditingUser(user)}
        />
      )}
    </div>
  );
}

function UserRow({
  user,
  onOpenProfile,
  onEditRoles,
  onImpersonate,
  canImpersonate,
  isImpersonating,
}: {
  user: AdminUserDto;
  onOpenProfile: () => void;
  onEditRoles: () => void;
  onImpersonate: () => Promise<void>;
  canImpersonate: boolean;
  isImpersonating: boolean;
}) {
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
            data-testid={`admin-users-profile-${user.id}`}
            variant="outline"
            size="sm"
            onClick={onOpenProfile}
            disabled={lockoutMutation.isPending || deleteMutation.isPending}
          >
            Профіль
          </Button>

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
            disabled={lockoutMutation.isPending || deleteMutation.isPending || isImpersonating}
          >
            {lockoutMutation.isPending ? 'Оновлення...' : user.isActive ? 'Заблокувати (бан)' : 'Зняти локаут'}
          </Button>

          {canImpersonate ? (
            <Button
              data-testid={`admin-users-impersonate-${user.id}`}
              variant="outline"
              size="sm"
              onClick={() => {
                void onImpersonate();
              }}
              disabled={lockoutMutation.isPending || deleteMutation.isPending || isImpersonating}
            >
              {isImpersonating ? 'Перемикання...' : 'Увійти як'}
            </Button>
          ) : null}

          <Button
            data-testid={`admin-users-delete-${user.id}`}
            variant="soft"
            size="sm"
            onClick={handleDelete}
            disabled={lockoutMutation.isPending || deleteMutation.isPending || isImpersonating}
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

function UserDetailsDialog({
  userId,
  onClose,
  onEditRoles,
}: {
  userId: string;
  onClose: () => void;
  onEditRoles: (user: AdminUserDto) => void;
}) {
  const { data: user, isLoading } = useAdminUserDetails(userId);

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Профіль користувача</DialogTitle>
          <DialogDescription>
            Перегляд профілю, організацій та редагування membership-зв&apos;язків.
          </DialogDescription>
        </DialogHeader>

        {isLoading || !user ? (
          <div className="py-8 text-sm text-muted-foreground">Завантаження профілю...</div>
        ) : (
          <ScrollArea className="max-h-[70vh] pr-4">
            <div className="space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-border bg-muted/20 p-4">
                <div className="flex items-center gap-4">
                  {user.profilePhotoUrl ? (
                    <img src={user.profilePhotoUrl} alt="avatar" className="h-16 w-16 rounded-2xl object-cover" />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-lg font-semibold text-primary">
                      {(user.firstName[0] ?? '')}{(user.lastName[0] ?? '')}
                    </div>
                  )}
                  <div className="space-y-1">
                    <div className="text-lg font-semibold">{user.firstName} {user.lastName}</div>
                    <div className="text-sm text-muted-foreground">{user.email}</div>
                    <div className="text-sm text-muted-foreground">
                      Телефон: {user.phoneNumber?.trim() ? user.phoneNumber : 'не вказано'}
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-right">
                  <div>
                    <Badge variant={user.isActive ? 'outline' : 'secondary'}>
                      {user.isActive ? 'Активний' : 'Заблокований'}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Зареєстровано {format(new Date(user.createdAt), 'dd.MM.yyyy')}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEditRoles({
                      id: user.id,
                      domainUserId: user.domainUserId,
                      email: user.email,
                      firstName: user.firstName,
                      lastName: user.lastName,
                      profilePhotoUrl: user.profilePhotoUrl,
                      isActive: user.isActive,
                      createdAt: user.createdAt,
                      roles: user.roles,
                    })}
                  >
                    Редагувати системні ролі
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-sm font-medium">Системні ролі</div>
                <div className="flex flex-wrap gap-2">
                  {user.roles.length > 0 ? user.roles.map((role) => (
                    <Badge key={role} variant={role === AppRoles.Admin ? 'default' : 'secondary'}>
                      {role}
                    </Badge>
                  )) : (
                    <span className="text-sm text-muted-foreground">Немає ролей</span>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium">Організації користувача</div>
                    <div className="text-xs text-muted-foreground">
                      Тут можна переглянути профіль організацій і відредагувати membership-зв&apos;язки.
                    </div>
                  </div>
                  <Badge variant="outline">{user.organizations.length} організацій</Badge>
                </div>

                {user.organizations.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                    У користувача ще немає зв&apos;язків з організаціями.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {user.organizations.map((organization) => (
                      <OrganizationMembershipCard
                        key={`${organization.organizationId}-${organization.role}-${organization.permissions}`}
                        userId={user.id}
                        organization={organization}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}

function OrganizationMembershipCard({
  userId,
  organization,
}: {
  userId: string;
  organization: AdminUserOrganizationLinkDto;
}) {
  const updateMembershipMutation = useAdminUpdateUserOrganizationLink(userId);
  const removeMembershipMutation = useAdminRemoveUserOrganizationLink(userId);
  const [role, setRole] = useState<OrganizationRole>(organization.role);
  const [permissions, setPermissions] = useState<number>(organization.permissions);

  const handleTogglePermission = (flag: number) => {
    setPermissions((previous) => (hasPermission(previous, flag) ? previous & ~flag : previous | flag));
  };

  const handleSave = async () => {
    await updateMembershipMutation.mutateAsync({
      organizationId: organization.organizationId,
      role,
      permissions,
    });
  };

  const handleRemove = async () => {
    if (!window.confirm(`Видалити зв'язок користувача з організацією "${organization.organizationName}"?`)) {
      return;
    }

    await removeMembershipMutation.mutateAsync(organization.organizationId);
  };

  return (
    <div className="rounded-xl border border-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-semibold">{organization.organizationName}</div>
          <div className="text-xs text-muted-foreground">/{organization.organizationSlug}</div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="outline">{planLabel(organization.planType)}</Badge>
            <Badge variant={organization.isVerified ? 'default' : 'secondary'}>
              {organization.isVerified ? 'Верифікована' : 'Не верифікована'}
            </Badge>
            {organization.isOwner && <Badge>Owner</Badge>}
          </div>
        </div>

        <div className="text-right text-xs text-muted-foreground">
          <div>Приєднався: {format(new Date(organization.joinedAt), 'dd.MM.yyyy')}</div>
          <div>Поточна роль: {roleLabel(organization.role)}</div>
        </div>
      </div>

      {organization.isOwner ? (
        <div className="mt-4 text-sm text-muted-foreground">
          Це власник організації. Для безпечності цей зв&apos;язок лише переглядається.
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="grid gap-2 md:grid-cols-[220px_1fr] md:items-center">
            <div className="text-sm font-medium">Роль в організації</div>
            <Select value={String(role)} onValueChange={(value) => setRole(Number(value) as OrganizationRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={String(OrganizationRole.Admin)}>Admin</SelectItem>
                <SelectItem value={String(OrganizationRole.Reporter)}>Reporter</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {organizationPermissionOptions.map((permission) => (
              <label
                key={permission.flag}
                className="flex cursor-pointer items-center gap-3 rounded-lg border border-border px-3 py-2 text-sm"
              >
                <Checkbox
                  checked={hasPermission(permissions, permission.flag)}
                  onCheckedChange={() => handleTogglePermission(permission.flag)}
                />
                <span>{permission.label}</span>
              </label>
            ))}
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={handleSave}
              disabled={updateMembershipMutation.isPending || removeMembershipMutation.isPending}
            >
              {updateMembershipMutation.isPending ? 'Збереження...' : 'Зберегти зв&apos;язок'}
            </Button>
            <Button
              variant="soft"
              className="text-destructive hover:bg-destructive/10"
              onClick={handleRemove}
              disabled={updateMembershipMutation.isPending || removeMembershipMutation.isPending}
            >
              {removeMembershipMutation.isPending ? 'Видалення...' : 'Видалити зв&apos;язок'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
