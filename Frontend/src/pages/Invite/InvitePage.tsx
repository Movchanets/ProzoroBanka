import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useInviteInfo, useAcceptInvitation, useDeclineInvitation } from '@/hooks/queries/useInvitations';
import { useAuthStore } from '@/stores/authStore';
import { OrganizationRoleLabel } from '@/types';
import { getImageUrl } from '@/lib/utils';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, Loader2, X } from 'lucide-react';

export default function InvitePage() {
  const { t } = useTranslation();
  const { token } = useParams<{ token: string }>();

  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { data: info, isLoading, error: fetchError } = useInviteInfo(token);
  const acceptInvite = useAcceptInvitation();
  const declineInvite = useDeclineInvitation();
  const [result, setResult] = useState<'accepted' | 'declined' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const inviterName = useMemo(
    () => info
      ? (`${info.inviterFirstName ?? ''} ${info.inviterLastName ?? ''}`.trim() || info.invitedByName || '')
      : '',
    [info],
  );

  useEffect(() => {
    if (!token || isAuthenticated) {
      return;
    }

    navigate(`/login?next=${encodeURIComponent(`/invite/${token}`)}`, { replace: true });
  }, [isAuthenticated, navigate, token]);

  if (!token) {
    return null;
  }

  if (!isAuthenticated) {
    return null;
  }

  const handleAccept = async () => {
    if (!token) return;
    setError(null);
    try {
      await acceptInvite.mutateAsync(token);
      setResult('accepted');
      toast.success(t('invitations.page.acceptedTitle'));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('invitations.page.acceptError'));
    }
  };

  const handleDecline = async () => {
    if (!token) return;
    setError(null);
    try {
      await declineInvite.mutateAsync(token);
      setResult('declined');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto flex min-h-screen w-[min(500px,calc(100%-32px))] items-center justify-center" data-testid="invite-page-loading-state">
        <Card className="w-full">
          <CardContent className="space-y-4 p-8 text-center">
            <Skeleton className="mx-auto h-14 w-14 rounded-2xl" />
            <Skeleton className="mx-auto h-6 w-48" />
            <Skeleton className="mx-auto h-4 w-64" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (fetchError || !info) {
    return (
      <div className="mx-auto flex min-h-screen w-[min(500px,calc(100%-32px))] items-center justify-center" data-testid="invite-page-invalid-state">
        <Card className="w-full">
          <CardContent className="space-y-4 p-8 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-destructive/10 text-destructive">
              <X className="h-7 w-7" />
            </div>
            <CardTitle>{t('invitations.page.invalidTitle')}</CardTitle>
            <CardDescription>{t('invitations.page.invalidDesc')}</CardDescription>
            <Button variant="outline" onClick={() => navigate('/')} data-testid="invite-page-go-home-button">{t('common.goHome')}</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (result) {
    return (
      <div className="mx-auto flex min-h-screen w-[min(500px,calc(100%-32px))] items-center justify-center" data-testid={`invite-page-${result}-state`}>
        <Card className="w-full">
          <CardContent className="space-y-4 p-8 text-center">
            {result === 'accepted' ? (
              <>
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-success/10 text-success">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
                <CardTitle>{t('invitations.page.acceptedTitle')}</CardTitle>
                <CardDescription>{t('invitations.page.acceptedDesc', { name: info.organizationName })}</CardDescription>
                <Button onClick={() => navigate('/onboarding')} data-testid="invite-page-go-dashboard-button">{t('common.goToDashboard')}</Button>
              </>
            ) : (
              <>
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
                  <X className="h-7 w-7" />
                </div>
                <CardTitle>{t('invitations.page.declinedTitle')}</CardTitle>
                <CardDescription>{t('invitations.page.declinedDesc', { name: info.organizationName })}</CardDescription>
                <Button variant="outline" onClick={() => navigate('/')} data-testid="invite-page-go-home-button">{t('common.goHome')}</Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen w-[min(500px,calc(100%-32px))] items-center justify-center py-8" data-testid="invite-page-container">
      <Card className="w-full border border-border bg-card/80 shadow-[0_24px_80px_var(--shadow-soft)] backdrop-blur-xl" data-testid="invite-page-card">
        <CardHeader className="items-center text-center pb-2">
          {info.organizationLogoUrl ? (
            <img src={getImageUrl(info.organizationLogoUrl)} alt={info.organizationName} className="mb-2 h-14 w-14 rounded-2xl object-cover" data-testid="invite-page-org-logo" />
          ) : (
            <div className="mb-2 grid h-14 w-14 place-items-center rounded-2xl bg-linear-to-br from-primary/80 to-primary text-xl font-extrabold text-primary-foreground" data-testid="invite-page-org-initial">
              {info.organizationName.charAt(0).toUpperCase()}
            </div>
          )}
          <CardTitle className="text-xl" data-testid="invite-page-org-title">{t('invitations.page.title', { name: info.organizationName })}</CardTitle>
          <CardDescription className="text-base" data-testid="invite-page-inviter-and-role">
            {t('invitations.page.invitedBy', { name: inviterName })} {t(OrganizationRoleLabel[info.role])}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 pb-8">
          {error && (
            <Alert variant="destructive" data-testid="invite-page-error-alert">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="rounded-xl border border-border/60 bg-muted/30 p-4 text-center text-sm text-muted-foreground" data-testid="invite-page-expiry">
            {t('invitations.page.validUntil')} {new Date(info.expiresAt).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>

          <div className="flex gap-3">
            <Button className="flex-1" variant="outline" onClick={handleDecline} disabled={declineInvite.isPending || acceptInvite.isPending} data-testid="invite-page-decline-button">
              {declineInvite.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {t('common.decline')}
            </Button>
            <Button className="flex-1" onClick={handleAccept} disabled={acceptInvite.isPending || declineInvite.isPending} data-testid="invite-page-accept-button">
              {acceptInvite.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {t('common.accept')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
