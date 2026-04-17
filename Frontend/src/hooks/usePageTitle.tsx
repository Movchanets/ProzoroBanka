import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from '@tanstack/react-router';

function resolvePageTitle(pathname: string, t: (key: string) => string): string {
  if (pathname === '/login') {
    return t('auth.login.title');
  }

  if (pathname === '/register') {
    return t('auth.register.title');
  }

  if (pathname === '/forgot-password') {
    return t('auth.forgotPassword.title');
  }

  if (pathname === '/reset-password') {
    return t('auth.resetPassword.title');
  }

  if (pathname === '/onboarding') {
    return t('onboarding.welcome');
  }

  if (pathname === '/profile') {
    return t('profile.badge');
  }

  if (pathname.startsWith('/invite/')) {
    return t('invitations.page.browserTitle');
  }

  if (pathname.startsWith('/dashboard/')) {
    const segments = pathname.split('/').filter(Boolean);
    const section = segments[2] ?? '';
    const nested = segments[3] ?? '';
    const tail = segments[4] ?? '';

    if (section === 'settings') {
      return t('organizations.settings.title');
    }

    if (section === 'team') {
      return t('team.title');
    }

    if (section === 'receipts') {
      return t('receipts.title');
    }

    if (section === 'campaigns' && nested === 'new') {
      return t('campaigns.create.title');
    }

    if (section === 'campaigns' && tail === 'edit') {
      return t('campaigns.edit.title');
    }

    if (section === 'campaigns') {
      return t('campaigns.title');
    }

    return t('nav.dashboard');
  }

  return t('appShell.title');
}

function usePageTitle(): void {
  const { pathname } = useLocation();
  const { t } = useTranslation();

  useEffect(() => {
    const appName = 'ProzoroBanka';
    const pageTitle = resolvePageTitle(pathname, t);

    document.title = `${pageTitle} • ${appName}`;
  }, [pathname, t]);
}

export function PageTitleSync() {
  usePageTitle();
  return null;
}
