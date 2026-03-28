import { useState } from 'react';
import { useAdminUsers, useAdminRoles, useAdminAssignRoles } from '@/hooks/queries/useAdminQueries';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import type { AdminUserDto, AdminRoleDto } from '@/types/admin';

export default function AdminUsersPage() {
  const [page, setPage] = useState(1);
  const { data: users, isLoading } = useAdminUsers(page);
  const { data: roles } = useAdminRoles();
  const [editingUser, setEditingUser] = useState<AdminUserDto | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Користувачі</h1>
          <p className="text-muted-foreground mt-1 text-sm">Управління користувачами та їхніми ролями.</p>
        </div>
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
            ) : (!users || users.items.length === 0) ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">Немає користувачів</TableCell>
              </TableRow>
            ) : (
              users.items.map((user) => (
                <UserRow key={user.id} user={user} onEditRoles={() => setEditingUser(user)} />
              ))
            )}
          </TableBody>
        </Table>
      </div>
      
      {users && users.totalCount > users.pageSize && (
        <div className="flex justify-center gap-2 mt-4">
          <Button variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>
            Попередня
          </Button>
          <Button variant="outline" disabled={page * users.pageSize >= users.totalCount} onClick={() => setPage(page + 1)}>
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

function UserRow({ user, onEditRoles }: { user: AdminUserDto, onEditRoles: () => void }) {
  const initials = `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.trim().toUpperCase() || 'U';

  return (
    <TableRow>
      <TableCell className="font-medium">
        <div className="flex items-center gap-3">
          {user.profilePhotoUrl ? (
            <img src={user.profilePhotoUrl} className="w-8 h-8 rounded-full border bg-muted" alt="avatar" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
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
        <div className="flex gap-1 flex-wrap">
          {user.roles && user.roles.length > 0 ? user.roles.map(role => (
            <Badge key={role} variant={role === 'Admin' ? 'default' : 'secondary'} className={role === 'Admin' ? 'bg-primary' : ''}>
              {role}
            </Badge>
          )) : (
            <span className="text-xs text-muted-foreground">Немає</span>
          )}
        </div>
      </TableCell>
      <TableCell>
        {user.isActive ? (
          <Badge variant="outline" className="text-green-600 border-green-600">Активний</Badge>
        ) : (
          <Badge variant="outline" className="text-red-600 border-red-600">Заблокований</Badge>
        )}
      </TableCell>
      <TableCell className="text-muted-foreground text-sm">
        {format(new Date(user.createdAt), 'dd.MM.yyyy')}
      </TableCell>
      <TableCell className="text-right">
        <Button variant="outline" size="sm" onClick={onEditRoles}>
          Змінити ролі
        </Button>
      </TableCell>
    </TableRow>
  );
}

function EditRolesDialog({ user, availableRoles, onClose }: { user: AdminUserDto, availableRoles: AdminRoleDto[], onClose: () => void }) {
  const [selectedRoles, setSelectedRoles] = useState<string[]>(user.roles || []);
  const assignRolesMutation = useAdminAssignRoles(user.id);

  const handleToggleRole = (roleName: string) => {
    setSelectedRoles(prev => 
      prev.includes(roleName) ? prev.filter(r => r !== roleName) : [...prev, roleName]
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
          {availableRoles.map(role => (
            <div key={role.name} className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer" onClick={() => handleToggleRole(role.name)}>
              <Checkbox 
                id={`role-${role.name}`} 
                checked={selectedRoles.includes(role.name)}
                onCheckedChange={() => handleToggleRole(role.name)}
              />
              <div className="grid gap-1.5 leading-none">
                <label
                  htmlFor={`role-${role.name}`}
                  className="font-medium text-sm leading-none cursor-pointer"
                >
                  {role.description} ({role.name})
                </label>
                <p className="text-xs text-muted-foreground leading-snug max-h-24 overflow-y-auto">
                  Дозволи: {role.permissions.join(', ')}
                </p>
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
