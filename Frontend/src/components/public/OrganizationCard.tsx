import { Link } from 'react-router-dom';
import type { PublicOrganization } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { VerifiedBadge } from './VerifiedBadge';

interface OrganizationCardProps {
  organization: PublicOrganization;
}

export function OrganizationCard({ organization }: OrganizationCardProps) {
  return (
    <Card className="h-full transition-transform duration-300 hover:-translate-y-0.5">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar className="size-12 border border-border">
              <AvatarImage src={organization.logoUrl} alt={organization.name} />
              <AvatarFallback>{organization.name.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-xl">{organization.name}</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">{organization.memberCount} учасників</p>
            </div>
          </div>
          <VerifiedBadge isVerified={organization.isVerified} testId="home-org-verified-badge" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="line-clamp-3 min-h-16 text-sm text-muted-foreground">{organization.description || 'Організація ще не додала опис.'}</p>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Активні збори: {organization.activeCampaignCount}</span>
          <span className="font-semibold text-foreground">{new Intl.NumberFormat('uk-UA').format(organization.totalRaised)} грн</span>
        </div>
        <Link data-testid="home-org-card-link" className="inline-flex rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground shadow-[0_8px_20px_hsl(var(--primary)/0.36)] hover:opacity-95" to={`/o/${organization.slug}`}>
          Переглянути організацію
        </Link>
      </CardContent>
    </Card>
  );
}
