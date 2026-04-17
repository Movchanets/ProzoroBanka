import { useState } from 'react';
import { useParams } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useOrganizationMembers, useUpdateMemberRole, useRemoveMember, useLeaveOrganization } from '@/hooks/queries/useOrganizations';
import { useAuthStore } from '@/stores/authStore';
import { OrganizationRole, OrganizationRoleLabel, type OrganizationMember } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LogOut, Trash2, Users, Shield } from 'lucide-react';
import { InviteDialog } from './Team/InviteDialog';

const roleBadgeVariant: Record<number, 'default' | 'secondary' | 'outline'> = {
  [OrganizationRole.Owner]: 'default',
  [OrganizationRole.Admin]: 'secondary',
  [OrganizationRole.Reporter]: 'outline',
};

export default function TeamPage() {
  const { t } = useTranslation();
  const { orgId } = useParams({ from: '/dashboard/$orgId/team' });
  const currentUser = useAuthStore((s) => s.user);
  const { data: members, isLoading } = useOrganizationMembers(orgId);
  const updateRole = useUpdateMemberRole(orgId!);
  const removeMember = useRemoveMember(orgId!);
  const leaveOrg = useLeaveOrganization();
  const [error, setError] = useState<string | null>(null);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{ type: 'remove' | 'leave'; member?: OrganizationMember } | null>(null);

  const currentMember = members?.find((m) => m.userId === currentUser?.id);
  const isAdminOrOwner = currentMember?.role === OrganizationRole.Owner || currentMember?.role === OrganizationRole.Admin;
  const memberCount = members?.length ?? 0;

  const handleRoleChange = async (userId: string, newRole: string) => {
    setError(null);
    try { await updateRole.mutateAsync({ userId, payload: { role: Number(newRole) as typeof OrganizationRole[keyof typeof OrganizationRole] } }); }
    catch (err) { setError(err instanceof Error ? err.message : t('team.roleChangeError')); }
  };

  const handleConfirm = async () => {
    if (!confirmDialog || !orgId) return;
    setError(null);
    try {
      if (confirmDialog.type === 'remove' && confirmDialog.member) { await removeMember.mutateAsync(confirmDialog.member.userId); }
      else if (confirmDialog.type === 'leave') { await leaveOrg.mutateAsync(orgId); }
      setConfirmDialog(null);
    } catch (err) { setError(err instanceof Error ? err.message : t('common.error')); setConfirmDialog(null); }
  };

  if (isLoading) return (<div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full rounded-2xl" /></div>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight flex items-center gap-2"><Users className="h-6 w-6 text-primary" />{t('team.title')}</h2>
          <p className="text-muted-foreground">
            {t(memberCount === 1 ? 'team.memberCount_one' : 'team.memberCount_other', { count: memberCount })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAdminOrOwner && orgId && (
            <Button
              variant="default"
              size="sm"
              onClick={() => setIsInviteDialogOpen(true)}
              data-testid="team-open-invite-dialog-button"
            >
              {t('team.invite.openDialog')}
            </Button>
          )}
          {currentMember && currentMember.role !== OrganizationRole.Owner && (
            <Button variant="outline" size="sm" onClick={() => setConfirmDialog({ type: 'leave' })} className="text-destructive" data-testid="team-leave-organization-button">
              <LogOut className="h-4 w-4" />{t('common.leave')}
            </Button>
          )}
        </div>
      </div>

      {error && (<Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>)}

      <Card className="border border-border bg-card/60 backdrop-blur-sm overflow-hidden">
        <CardHeader className="pb-0">
          <CardTitle className="text-lg flex items-center gap-2"><Shield className="h-5 w-5 text-muted-foreground" />{t('team.members')}</CardTitle>
        </CardHeader>
        <CardContent className="p-0 pt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('team.memberColumn')}</TableHead>
                <TableHead>{t('common.email')}</TableHead>
                <TableHead>{t('common.roles')}</TableHead>
                <TableHead className="text-right">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members?.map((member) => (
                <TableRow key={member.userId} data-testid={`team-member-row-${member.userId}`}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {member.avatarUrl ? (<img src={member.avatarUrl} alt="" className="h-8 w-8 rounded-lg object-cover" />) : (
                        <span className="grid h-8 w-8 place-items-center rounded-lg bg-linear-to-br from-secondary to-accent text-xs font-extrabold text-secondary-foreground">{member.firstName.charAt(0)}{member.lastName.charAt(0)}</span>
                      )}
                      <span className="font-medium">{member.firstName} {member.lastName}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{member.email}</TableCell>
                  <TableCell>
                    {isAdminOrOwner && member.role !== OrganizationRole.Owner ? (
                      <Select value={String(member.role) as string} onValueChange={(v: string) => handleRoleChange(member.userId, v)} disabled={updateRole.isPending}>
                        <SelectTrigger className="w-32" data-testid={`team-member-role-select-${member.userId}`}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value={String(OrganizationRole.Admin)}>{t(OrganizationRoleLabel[OrganizationRole.Admin])}</SelectItem>
                          <SelectItem value={String(OrganizationRole.Reporter)}>{t(OrganizationRoleLabel[OrganizationRole.Reporter])}</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (<Badge variant={roleBadgeVariant[member.role]}>{t(OrganizationRoleLabel[member.role])}</Badge>)}
                  </TableCell>
                  <TableCell className="text-right">
                    {isAdminOrOwner && member.role !== OrganizationRole.Owner && member.userId !== currentUser?.id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setConfirmDialog({ type: 'remove', member })}
                        className="text-destructive hover:text-destructive"
                        data-testid={`team-remove-member-button-${member.userId}`}
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

      <Dialog open={!!confirmDialog} onOpenChange={(open: boolean) => !open && setConfirmDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmDialog?.type === 'leave' ? t('team.leaveConfirmTitle') : t('team.removeConfirmTitle', { name: `${confirmDialog?.member?.firstName} ${confirmDialog?.member?.lastName}` })}
            </DialogTitle>
            <DialogDescription>
              {confirmDialog?.type === 'leave' ? t('team.leaveConfirmDesc') : t('team.removeConfirmDesc')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog(null)}>{t('common.cancel')}</Button>
            <Button variant="default" className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleConfirm} disabled={removeMember.isPending || leaveOrg.isPending}>
              {confirmDialog?.type === 'leave' ? t('common.leave') : t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {orgId && (
        <InviteDialog
          open={isInviteDialogOpen}
          onOpenChange={setIsInviteDialogOpen}
          orgId={orgId}
        />
      )}
    </div>
  );
}
