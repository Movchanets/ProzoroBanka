import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Users, Megaphone, Wallet } from 'lucide-react';
import type { PublicOrganization } from '@/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { VerifiedBadge } from './VerifiedBadge';

interface OrganizationCardProps {
  organization: PublicOrganization;
}

export function OrganizationCard({ organization }: OrganizationCardProps) {
  const { t, i18n } = useTranslation();
  const formatter = new Intl.NumberFormat(i18n.language);

  return (
    <Card className="group flex h-full flex-col overflow-hidden rounded-3xl border-border/80 bg-card/95 shadow-[0_16px_40px_var(--shadow-soft)] transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_24px_60px_var(--shadow-soft)]">
      <CardHeader className="p-6 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar className="size-12 border border-border/80 shadow-[0_10px_20px_var(--shadow-soft)] transition-transform duration-500 group-hover:scale-105">
              <AvatarImage src={organization.logoUrl} alt={organization.name} />
              <AvatarFallback>{organization.name.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-xl">{organization.name}</CardTitle>
            </div>
          </div>
          <VerifiedBadge isVerified={organization.isVerified} testId="home-org-verified-badge" />
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-4 p-6 pt-0">
        <p className="line-clamp-3 min-h-16 text-sm leading-6 text-muted-foreground">{organization.description || t('organizations.public.card.descriptionFallback')}</p>

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-border/60 bg-muted/30 p-2.5 text-center">
            <Users className="mx-auto mb-1 h-4 w-4 text-muted-foreground" />
            <p className="text-base font-semibold text-foreground">{organization.memberCount}</p>
            <p className="text-[11px] leading-tight text-muted-foreground">{t('organizations.public.card.members')}</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-muted/30 p-2.5 text-center">
            <Megaphone className="mx-auto mb-1 h-4 w-4 text-muted-foreground" />
            <p className="text-base font-semibold text-foreground">{organization.activeCampaignCount}</p>
            <p className="text-[11px] leading-tight text-muted-foreground">{t('organizations.public.card.activeCampaigns')}</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-muted/30 p-2.5 text-center">
            <Wallet className="mx-auto mb-1 h-4 w-4 text-muted-foreground" />
            <p className="text-base font-semibold text-foreground">{formatter.format(organization.totalRaised)}</p>
            <p className="text-[11px] leading-tight text-muted-foreground">{t('common.uah')}</p>
          </div>
        </div>
      </CardContent>

      <CardFooter className="mt-auto p-0">
        <Link
          data-testid="home-org-card-link"
          className="flex w-full items-center justify-between border-t border-border/60 px-6 py-3.5 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:bg-muted/40 hover:text-foreground"
          to={`/o/${organization.slug}`}
        >
          {t('organizations.public.card.viewOrganization')}
          <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
        </Link>
      </CardFooter>
    </Card>
  );
}
