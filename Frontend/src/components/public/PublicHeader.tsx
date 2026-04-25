import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from '@/components/language-switcher';
import { ThemeToggle } from '@/components/theme-toggle';
import { Compass, ArrowRight } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

export function PublicHeader() {
  const { t } = useTranslation();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const entryLabel = isAuthenticated ? t('common.goToDashboard') : t('common.volunteerSignIn');

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl" data-testid="public-page-toolbar">
      <div className="mx-auto flex h-16 w-[min(1200px,calc(100%-24px))] items-center justify-between sm:w-[min(1200px,calc(100%-40px))]">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2 transition-opacity hover:opacity-90">
            <span className="text-xl font-extrabold tracking-tight text-primary">ProzoroBanka</span>
          </Link>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Button asChild variant="ghost" size="sm" className="hidden sm:flex rounded-full" data-testid="public-page-toolbar-campaigns-anchor">
            <Link to="/#campaigns">{t('home.tabs.campaigns')}</Link>
          </Button>
          <Button asChild variant="ghost" size="sm" className="hidden sm:flex rounded-full" data-testid="public-page-toolbar-organizations-anchor">
            <Link to="/#organizations">{t('home.tabs.organizations')}</Link>
          </Button>

          <LanguageSwitcher />
          <ThemeToggle />

          <Button
            asChild
            variant="secondary"
            size="sm"
            className="touch-manipulation bg-secondary text-white! shadow-[0_4px_14px_hsl(216_66%_28%/0.18)] hover:bg-secondary/90 [&_svg]:text-white! sm:ml-1"
            data-testid="public-page-toolbar-entry-link"
          >
            <Link to={isAuthenticated ? '/dashboard' : '/login'} aria-label={entryLabel} className="text-white!">
              <Compass className="h-4 w-4" aria-hidden="true" />
              <span className="hidden lg:inline">{entryLabel}</span>
              <ArrowRight className="hidden h-4 w-4 lg:inline" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
