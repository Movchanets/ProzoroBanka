import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useMyInvitations,
  useSentInvitations,
  useAcceptInvitation,
  useDeclineInvitation,
  useCancelInvitation,
} from '@/hooks/queries/useInvitations';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { OrganizationRoleLabel, type Invitation } from '@/types';
import { getImageUrl } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Building2, Check, Clock, Mail, Send, X } from 'lucide-react';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('uk-UA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function IncomingInvitationRow({
  invitation,
  onAccepted,
}: {
  invitation: Invitation;
  onAccepted?: () => void;
}) {
  const { t } = useTranslation();
  const acceptInvite = useAcceptInvitation();
  const declineInvite = useDeclineInvitation();
  const [error, setError] = useState<string | null>(null);

  const handleAccept = async () => {
    setError(null);
    try {
      await acceptInvite.mutateAsync(invitation.token);
      onAccepted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    }
  };

  const handleDecline = async () => {
    setError(null);
    try {
      await declineInvite.mutateAsync(invitation.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    }
  };

  const isPending = acceptInvite.isPending || declineInvite.isPending;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        {invitation.organizationLogoStorageKey ? (
          <img
            src={getImageUrl(invitation.organizationLogoStorageKey)}
            alt=""
            className="h-10 w-10 rounded-xl object-cover"
          />
        ) : (
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-linear-to-br from-primary/80 to-primary text-sm font-extrabold text-primary-foreground">
            {invitation.organizationName.charAt(0).toUpperCase()}
          </span>
        )}
        <div>
          <p className="font-medium">{invitation.organizationName}</p>
          <p className="text-sm text-muted-foreground">
            {invitation.invitedByName} ·{' '}
            <Badge variant="outline" className="ml-1 text-xs">
              {t(OrganizationRoleLabel[invitation.role])}
            </Badge>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="mr-2 text-xs text-muted-foreground">
          {t('invitations.tab.expiresPrefix')} {formatDate(invitation.expiresAt)}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDecline}
          disabled={isPending}
        >
          <X className="h-3.5 w-3.5" />
          {t('invitations.tab.incomingDecline')}
        </Button>
        <Button size="sm" onClick={handleAccept} disabled={isPending}>
          <Check className="h-3.5 w-3.5" />
          {t('invitations.tab.incomingAccept')}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mt-2">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}

function SentInvitationRow({
  invitation,
  orgId,
}: {
  invitation: Invitation;
  orgId: string;
}) {
  const { t } = useTranslation();
  const cancelInvite = useCancelInvitation(orgId);
  const [error, setError] = useState<string | null>(null);

  const handleCancel = async () => {
    setError(null);
    try {
      await cancelInvite.mutateAsync(invitation.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-muted text-muted-foreground">
          <Mail className="h-5 w-5" />
        </span>
        <div>
          <p className="font-medium">{invitation.email ?? t('invitations.tab.sentLink')}</p>
          <p className="text-sm text-muted-foreground">
            <Badge variant="outline" className="text-xs">
              {t(OrganizationRoleLabel[invitation.role])}
            </Badge>
            <span className="ml-2">{formatDate(invitation.createdAt)}</span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="text-xs">
          <Clock className="mr-1 h-3 w-3" />
          {t('invitations.tab.sentPending')}
        </Badge>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCancel}
          disabled={cancelInvite.isPending}
          className="text-destructive hover:text-destructive"
        >
          <X className="h-3.5 w-3.5" />
          {t('invitations.tab.sentCancel')}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mt-2">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}

export function ProfileInvitationsTab() {
  const { t } = useTranslation();
  const { data: incoming, isLoading: incomingLoading } = useMyInvitations();
  const activeOrgId = useWorkspaceStore((s) => s.activeOrgId);
  const { data: sent, isLoading: sentLoading } = useSentInvitations(activeOrgId);

  const pendingIncoming = incoming?.filter((i) => i.status === 0) ?? [];
  const pendingSent = sent?.filter((i) => i.status === 0) ?? [];

  return (
    <div className="space-y-6">
      <Card className="border border-border bg-card/60 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            {t('invitations.tab.incomingTitle')}
            {pendingIncoming.length > 0 && (
              <Badge className="ml-2 bg-primary/15 text-primary">
                {pendingIncoming.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {incomingLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
            </div>
          ) : pendingIncoming.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              {t('invitations.tab.incomingEmpty')}
            </p>
          ) : (
            pendingIncoming.map((inv) => (
              <IncomingInvitationRow key={inv.id} invitation={inv} />
            ))
          )}
        </CardContent>
      </Card>

      {activeOrgId && (
        <>
          <Separator />
          <Card className="border border-border bg-card/60 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Send className="h-5 w-5 text-muted-foreground" />
                {t('invitations.tab.sentTitle')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {sentLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-16 w-full rounded-xl" />
                </div>
              ) : pendingSent.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  {t('invitations.tab.sentEmpty')}
                </p>
              ) : (
                pendingSent.map((inv) => (
                  <SentInvitationRow
                    key={inv.id}
                    invitation={inv}
                    orgId={activeOrgId}
                  />
                ))
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
