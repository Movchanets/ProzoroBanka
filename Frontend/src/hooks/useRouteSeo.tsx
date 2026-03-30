import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { SeoHelmet, type SeoConfig } from '@/components/seo/SeoHelmet';

function isPublicIndexablePath(pathname: string): boolean {
  return pathname === '/' || pathname.startsWith('/o/') || pathname.startsWith('/c/');
}

function resolveRouteSeo(pathname: string, t: (key: string) => string): SeoConfig {
  const appName = 'ProzoroBanka';
  const noIndexConfig = {
    robots: 'noindex,nofollow',
  } as const;

  if (pathname === '/') {
    return {
      title: `${t('appShell.title')} | ${appName}`,
      description: 'Платформа публічної фінансової прозорості для волонтерських організацій і благодійних зборів.',
      canonicalPath: '/',
      robots: 'index,follow',
    };
  }

  if (pathname.startsWith('/o/')) {
    return {
      title: `${t('organizations.title')} | ${appName}`,
      description: 'Профіль організації з перевіркою, активними зборами та публічними показниками прозорості.',
      canonicalPath: pathname,
      robots: 'index,follow',
    };
  }

  if (pathname.startsWith('/c/')) {
    return {
      title: `${t('campaigns.title')} | ${appName}`,
      description: 'Сторінка збору з прогресом, деталями витрат і підтвердженими чеками.',
      canonicalPath: pathname,
      robots: 'index,follow',
    };
  }

  if (pathname.startsWith('/receipt/')) {
    return {
      title: `${t('receipts.title')} | ${appName}`,
      description: 'Публічний перегляд чеку для підтвердження витрат у межах збору.',
      canonicalPath: pathname,
      ...noIndexConfig,
    };
  }

  if (isPublicIndexablePath(pathname)) {
    return {
      title: `${appName}`,
      description: 'Платформа публічної фінансової прозорості для волонтерських ініціатив.',
      canonicalPath: pathname,
      robots: 'index,follow',
    };
  }

  return {
    title: `${appName}`,
    description: 'Сервіс для прозорої звітності волонтерських організацій і кампаній.',
    canonicalPath: pathname,
    ...noIndexConfig,
  };
}

export function RouteSeoSync() {
  const { pathname } = useLocation();
  const { t } = useTranslation();

  return <SeoHelmet {...resolveRouteSeo(pathname, t)} />;
}
