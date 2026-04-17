import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from '@/components/language-switcher';
import { ThemeToggle } from '@/components/theme-toggle';
import { useAuthStore } from '@/stores/authStore';

interface PublicPageToolbarProps {
  compact?: boolean;
}

export function PublicPageToolbar({ compact = false }: PublicPageToolbarProps) {
  const { t } = useTranslation();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const entryLabel = isAuthenticated ? t('common.goToOrganizationsMenu') : t('common.volunteerSignIn');

  return (
    <div data-testid="public-page-toolbar" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/80 bg-card/86 px-3 py-2 shadow-[0_12px_30px_var(--shadow-soft)] backdrop-blur-xl">
      <Button
        asChild
        data-testid="public-page-toolbar-entry-link"
        variant="secondary"
        size={compact ? 'sm' : 'default'}
        className="touch-manipulation bg-secondary !text-white shadow-[0_10px_24px_hsl(216_66%_28%_/_0.18)] hover:bg-secondary/90 [&_svg]:!text-white"
      >
        <Link to={isAuthenticated ? '/onboarding' : '/login'} aria-label={entryLabel} className="!text-white">
          <Compass className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">{entryLabel}</span>
          <ArrowRight className="hidden h-4 w-4 sm:inline" aria-hidden="true" />
        </Link>
      </Button>

      <div className="flex items-center gap-2">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>
    </div>
  );
}
