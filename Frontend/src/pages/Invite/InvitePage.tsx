import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useInviteInfo, useAcceptInvitation, useDeclineInvitation } from '@/hooks/queries/useInvitations';
import { useAuthStore } from '@/stores/authStore';
import { OrganizationRoleLabel } from '@/types';
import { getImageUrl } from '@/lib/utils';
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

  if (!isAuthenticated) {
    const loginUrl = `/login?next=${encodeURIComponent(`/invite/${token}`)}`;
    navigate(loginUrl, { replace: true });
    return null;
  }

  const handleAccept = async () => {
    if (!token) return;
    setError(null);
    try {
      await acceptInvite.mutateAsync(token);
      setResult('accepted');
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
      <div className="mx-auto flex min-h-screen w-[min(500px,calc(100%-32px))] items-center justify-center">
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
      <div className="mx-auto flex min-h-screen w-[min(500px,calc(100%-32px))] items-center justify-center">
        <Card className="w-full">
          <CardContent className="space-y-4 p-8 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-destructive/10 text-destructive">
              <X className="h-7 w-7" />
            </div>
            <CardTitle>{t('invitations.page.invalidTitle')}</CardTitle>
            <CardDescription>{t('invitations.page.invalidDesc')}</CardDescription>
            <Button variant="outline" onClick={() => navigate('/')}>{t('invitations.page.goHome')}</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (result) {
    return (
      <div className="mx-auto flex min-h-screen w-[min(500px,calc(100%-32px))] items-center justify-center">
        <Card className="w-full">
          <CardContent className="space-y-4 p-8 text-center">
            {result === 'accepted' ? (
              <>
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-success/10 text-success">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
                <CardTitle>{t('invitations.page.successTitle')}</CardTitle>
                <CardDescription>{t('invitations.page.successDesc', { org: info.organizationName })}</CardDescription>
                <Button onClick={() => navigate('/onboarding')}>{t('invitations.page.goDashboard')}</Button>
              </>
            ) : (
              <>
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
                  <X className="h-7 w-7" />
                </div>
                <CardTitle>{t('invitations.page.declinedTitle')}</CardTitle>
                <CardDescription>{t('invitations.page.declinedDesc', { org: info.organizationName })}</CardDescription>
                <Button variant="outline" onClick={() => navigate('/')}>{t('invitations.page.goHome')}</Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen w-[min(500px,calc(100%-32px))] items-center justify-center py-8">
      <Card className="w-full border border-border bg-card/80 shadow-[0_24px_80px_var(--shadow-soft)] backdrop-blur-xl">
        <CardHeader className="items-center text-center pb-2">
          {info.organizationLogoStorageKey ? (
            <img src={getImageUrl(info.organizationLogoStorageKey)} alt={info.organizationName} className="mb-2 h-14 w-14 rounded-2xl object-cover" />
          ) : (
            <div className="mb-2 grid h-14 w-14 place-items-center rounded-2xl bg-linear-to-br from-primary/80 to-primary text-xl font-extrabold text-primary-foreground">
              {info.organizationName.charAt(0).toUpperCase()}
            </div>
          )}
          <CardTitle className="text-xl">{t('invitations.page.inviteTitle', { org: info.organizationName })}</CardTitle>
          <CardDescription className="text-base">
            {t('invitations.page.inviteDesc', { name: info.invitedByName, role: t(OrganizationRoleLabel[info.role]) })}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 pb-8">
          {error && (<Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>)}

          <div className="rounded-xl border border-border/60 bg-muted/30 p-4 text-center text-sm text-muted-foreground">
            {t('invitations.page.validUntil')} {new Date(info.expiresAt).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>

          <div className="flex gap-3">
            <Button className="flex-1" variant="outline" onClick={handleDecline} disabled={declineInvite.isPending || acceptInvite.isPending}>
              {declineInvite.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {t('common.decline')}
            </Button>
            <Button className="flex-1" onClick={handleAccept} disabled={acceptInvite.isPending || declineInvite.isPending}>
              {acceptInvite.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {t('common.accept')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
