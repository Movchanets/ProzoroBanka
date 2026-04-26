import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function AppLoadingFallback() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto flex min-h-screen w-[min(1180px,calc(100%-32px))] items-center justify-center py-8 max-sm:w-[min(1180px,calc(100%-20px))]">
      <div className="flex flex-col items-center justify-center gap-4 rounded-4xl border border-border bg-card/80 px-6 py-8 text-sm font-semibold text-muted-foreground shadow-[0_24px_80px_var(--shadow-soft)] backdrop-blur-xl">
        <Loader2 className="h-10 w-10 animate-spin text-primary" aria-hidden="true" />
        <div>{t('common.loadingInterface')}</div>
      </div>
    </div>
  );
}
