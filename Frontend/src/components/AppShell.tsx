import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useLogoutMutation } from '../hooks/queries/useAuth';
import { useMyOrganizations } from '../hooks/queries/useOrganizations';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ThemeToggle } from './theme-toggle';
import { LanguageSwitcher } from './language-switcher';

function getInitials(firstName?: string, lastName?: string) {
  return `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.trim().toUpperCase() || 'PB';
}

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logoutMutation = useLogoutMutation();
  const { data: orgs } = useMyOrganizations();
  const hasOrgs = orgs && orgs.length > 0;

  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
    navigate('/login', { replace: true });
  };

  return (
    <div className="relative mx-auto min-h-screen w-[min(1180px,calc(100%-32px))] py-6 pb-10 max-sm:w-[min(1180px,calc(100%-20px))]">
      <div className="fixed right-4 top-4 z-50 flex gap-2 sm:right-6 sm:top-6 lg:right-10 lg:top-10">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>
      <Card className="mb-6 rounded-[1.75rem] border border-border bg-card/80 shadow-[0_24px_80px_var(--shadow-soft)] backdrop-blur-xl max-sm:rounded-3xl">
        <CardContent className="flex flex-col gap-6 p-7 pt-7 lg:flex-row lg:items-center lg:justify-between max-sm:p-6 max-sm:pt-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full bg-card/70 px-3.5 py-2 text-[0.82rem] font-extrabold uppercase tracking-[0.08em] text-primary">
                ProzoroBanka
              </span>
              {hasOrgs && (
                <Button variant="outline" size="sm" onClick={() => navigate(`/dashboard/${orgs[0].id}`)} className="h-8 rounded-full px-4 text-xs shadow-none">
                  <ArrowLeft className="mr-2 h-3.5 w-3.5" />
                  {t('common.goToDashboard')}
                </Button>
              )}
            </div>
            <div className="space-y-4">
              <h1 className="text-[clamp(2.1rem,3vw,3rem)] font-semibold leading-none tracking-tight">
                {t('appShell.title')}
              </h1>
              <p className="max-w-3xl text-base leading-7 text-muted-foreground">
                {t('appShell.subtitle')}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          {user?.profilePhotoUrl ? (
              <img className="h-[72px] w-[72px] rounded-[24px] object-cover" src={user.profilePhotoUrl} alt={t('appShell.avatarAlt')} />
          ) : (
              <div className="grid h-[72px] w-[72px] place-items-center rounded-[24px] bg-linear-to-br from-secondary to-accent text-xl font-extrabold text-secondary-foreground">
                {getInitials(user?.firstName, user?.lastName)}
              </div>
          )}

            <div className="grid gap-1">
              <strong className="text-base font-semibold text-foreground">
                {user?.firstName} {user?.lastName}
              </strong>
              <span className="text-sm text-muted-foreground">{user?.email}</span>
            </div>

            <Button type="button" size="pill" onClick={handleLogout} disabled={logoutMutation.isPending} variant="soft">
              {logoutMutation.isPending ? t('nav.logoutPending') : t('nav.logout')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <main>{children}</main>
    </div>
  );
}