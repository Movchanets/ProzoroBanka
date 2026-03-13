import { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  useOrganizationMembers,
  useUpdateMemberRole,
  useRemoveMember,
  useLeaveOrganization,
} from '@/hooks/queries/useOrganizations';
import { useAuthStore } from '@/stores/authStore';
import {
  OrganizationRole,
  OrganizationRoleLabel,
  type OrganizationMember,
} from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LogOut, Trash2, Users, Shield } from 'lucide-react';

const roleBadgeVariant: Record<number, 'default' | 'secondary' | 'outline'> = {
  [OrganizationRole.Owner]: 'default',
  [OrganizationRole.Admin]: 'secondary',
  [OrganizationRole.Reporter]: 'outline',
};

export default function TeamPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const currentUser = useAuthStore((s) => s.user);
  const { data: members, isLoading } = useOrganizationMembers(orgId);
  const updateRole = useUpdateMemberRole(orgId!);
  const removeMember = useRemoveMember(orgId!);
  const leaveOrg = useLeaveOrganization();
  const [error, setError] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    type: 'remove' | 'leave';
    member?: OrganizationMember;
  } | null>(null);

  const currentMember = members?.find((m) => m.userId === currentUser?.id);
  const isAdminOrOwner =
    currentMember?.role === OrganizationRole.Owner ||
    currentMember?.role === OrganizationRole.Admin;

  const handleRoleChange = async (userId: string, newRole: string) => {
    setError(null);
    try {
      await updateRole.mutateAsync({
        userId,
        payload: { role: Number(newRole) as typeof OrganizationRole[keyof typeof OrganizationRole] },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалось змінити роль');
    }
  };

  const handleConfirm = async () => {
    if (!confirmDialog || !orgId) return;
    setError(null);
    try {
      if (confirmDialog.type === 'remove' && confirmDialog.member) {
        await removeMember.mutateAsync(confirmDialog.member.userId);
      } else if (confirmDialog.type === 'leave') {
        await leaveOrg.mutateAsync(orgId);
      }
      setConfirmDialog(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка');
      setConfirmDialog(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Команда
          </h2>
          <p className="text-muted-foreground">
            {members?.length ?? 0} {members?.length === 1 ? 'учасник' : 'учасників'}
          </p>
        </div>

        {currentMember && currentMember.role !== OrganizationRole.Owner && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setConfirmDialog({ type: 'leave' })}
            className="text-destructive"
          >
            <LogOut className="h-4 w-4" />
            Покинути
          </Button>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className="border border-border bg-card/60 backdrop-blur-sm overflow-hidden">
        <CardHeader className="pb-0">
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5 text-muted-foreground" />
            Учасники
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 pt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Учасник</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Роль</TableHead>
                <TableHead className="text-right">Дії</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members?.map((member) => (
                <TableRow key={member.userId}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {member.avatarUrl ? (
                        <img
                          src={member.avatarUrl}
                          alt=""
                          className="h-8 w-8 rounded-lg object-cover"
                        />
                      ) : (
                        <span className="grid h-8 w-8 place-items-center rounded-lg bg-linear-to-br from-secondary to-accent text-xs font-extrabold text-secondary-foreground">
                          {member.firstName.charAt(0)}
                          {member.lastName.charAt(0)}
                        </span>
                      )}
                      <span className="font-medium">
                        {member.firstName} {member.lastName}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {member.email}
                  </TableCell>
                  <TableCell>
                    {isAdminOrOwner && member.role !== OrganizationRole.Owner ? (
                      <Select
                        value={String(member.role) as string}
                        onValueChange={(v: string) => handleRoleChange(member.userId, v)}
                        disabled={updateRole.isPending}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={String(OrganizationRole.Admin)}>
                            {OrganizationRoleLabel[OrganizationRole.Admin]}
                          </SelectItem>
                          <SelectItem value={String(OrganizationRole.Reporter)}>
                            {OrganizationRoleLabel[OrganizationRole.Reporter]}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant={roleBadgeVariant[member.role]}>
                        {OrganizationRoleLabel[member.role]}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {isAdminOrOwner &&
                      member.role !== OrganizationRole.Owner &&
                      member.userId !== currentUser?.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setConfirmDialog({ type: 'remove', member })
                          }
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog
        open={!!confirmDialog}
        onOpenChange={(open: boolean) => !open && setConfirmDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmDialog?.type === 'leave'
                ? 'Покинути організацію?'
                : `Видалити ${confirmDialog?.member?.firstName} ${confirmDialog?.member?.lastName}?`}
            </DialogTitle>
            <DialogDescription>
              {confirmDialog?.type === 'leave'
                ? 'Ви втратите доступ до цієї організації. Щоб повернутись, вам знадобиться нове запрошення.'
                : 'Цей учасник більше не матиме доступу до організації.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog(null)}>
              Скасувати
            </Button>
            <Button
              variant="default"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleConfirm}
              disabled={removeMember.isPending || leaveOrg.isPending}
            >
              {confirmDialog?.type === 'leave' ? 'Покинути' : 'Видалити'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
