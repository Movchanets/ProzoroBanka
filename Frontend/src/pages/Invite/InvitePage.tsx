import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  const { token } = useParams<{ token: string }>();

  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { data: info, isLoading, error: fetchError } = useInviteInfo(token);
  const acceptInvite = useAcceptInvitation();
  const declineInvite = useDeclineInvitation();
  const [result, setResult] = useState<'accepted' | 'declined' | null>(null);
  const [error, setError] = useState<string | null>(null);

  // If not authenticated, redirect to login with ?next= param
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
      setError(err instanceof Error ? err.message : 'Не вдалось прийняти запрошення');
    }
  };

  const handleDecline = async () => {
    if (!token) return;
    setError(null);
    try {
      await declineInvite.mutateAsync(token);
      setResult('declined');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка');
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
            <CardTitle>Запрошення недійсне</CardTitle>
            <CardDescription>
              Це запрошення вже не працює — можливо, воно закінчилося або було скасоване.
            </CardDescription>
            <Button variant="outline" onClick={() => navigate('/')}>
              На головну
            </Button>
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
                <CardTitle>Вітаємо!</CardTitle>
                <CardDescription>
                  Ви приєднались до «{info.organizationName}». Перейдіть до дашборду для початку роботи.
                </CardDescription>
                <Button onClick={() => navigate('/onboarding')}>
                  Перейти до дашборду
                </Button>
              </>
            ) : (
              <>
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
                  <X className="h-7 w-7" />
                </div>
                <CardTitle>Запрошення відхилено</CardTitle>
                <CardDescription>
                  Ви відхилили запрошення до «{info.organizationName}».
                </CardDescription>
                <Button variant="outline" onClick={() => navigate('/')}>
                  На головну
                </Button>
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
            <img
              src={getImageUrl(info.organizationLogoStorageKey)}
              alt={info.organizationName}
              className="mb-2 h-14 w-14 rounded-2xl object-cover"
            />
          ) : (
            <div className="mb-2 grid h-14 w-14 place-items-center rounded-2xl bg-linear-to-br from-primary/80 to-primary text-xl font-extrabold text-primary-foreground">
              {info.organizationName.charAt(0).toUpperCase()}
            </div>
          )}
          <CardTitle className="text-xl">
            Запрошення до «{info.organizationName}»
          </CardTitle>
          <CardDescription className="text-base">
            {info.invitedByName} запрошує вас як{' '}
            <strong>{OrganizationRoleLabel[info.role]}</strong>
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 pb-8">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="rounded-xl border border-border/60 bg-muted/30 p-4 text-center text-sm text-muted-foreground">
            Запрошення дійсне до{' '}
            {new Date(info.expiresAt).toLocaleDateString('uk-UA', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </div>

          <div className="flex gap-3">
            <Button
              className="flex-1"
              variant="outline"
              onClick={handleDecline}
              disabled={declineInvite.isPending || acceptInvite.isPending}
            >
              {declineInvite.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Відхилити
            </Button>
            <Button
              className="flex-1"
              onClick={handleAccept}
              disabled={acceptInvite.isPending || declineInvite.isPending}
            >
              {acceptInvite.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Прийняти
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
