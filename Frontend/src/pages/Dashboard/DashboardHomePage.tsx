import { useParams } from 'react-router-dom';
import { useOrganization, useOrganizationMembers } from '@/hooks/queries/useOrganizations';
import { useCampaigns } from '@/hooks/queries/useCampaigns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Megaphone, Receipt, TrendingUp } from 'lucide-react';

function StatCard({
  label,
  value,
  icon: Icon,
  isLoading,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  isLoading: boolean;
}) {
  return (
    <Card className="border border-border bg-card/60 backdrop-blur-sm">
      <CardContent className="flex items-center gap-4 p-5">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          {isLoading ? (
            <Skeleton className="h-7 w-12" />
          ) : (
            <p className="text-2xl font-bold tracking-tight">{value}</p>
          )}
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardHomePage() {
  const { orgId } = useParams<{ orgId: string }>();
  const { data: org, isLoading: orgLoading } = useOrganization(orgId);
  const { data: members, isLoading: membersLoading } = useOrganizationMembers(orgId);
  const { data: campaigns, isLoading: campaignsLoading } = useCampaigns(orgId);

  const activeCampaigns = campaigns?.filter((c) => c.status === 1)?.length ?? 0;
  const totalRaised = campaigns?.reduce((sum, c) => sum + c.currentAmount, 0) ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          {orgLoading ? <Skeleton className="h-8 w-48 inline-block" /> : `Вітаю в ${org?.name}!`}
        </h2>
        <p className="mt-1 text-muted-foreground">
          Огляд основних показників організації
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Учасників"
          value={members?.length ?? org?.memberCount ?? 0}
          icon={Users}
          isLoading={membersLoading}
        />
        <StatCard
          label="Активних зборів"
          value={activeCampaigns}
          icon={Megaphone}
          isLoading={campaignsLoading}
        />
        <StatCard
          label="Зібрано (₴)"
          value={new Intl.NumberFormat('uk-UA').format(totalRaised / 100)}
          icon={TrendingUp}
          isLoading={campaignsLoading}
        />
        <StatCard
          label="Чеків"
          value="—"
          icon={Receipt}
          isLoading={false}
        />
      </div>

      <Card className="border border-border bg-card/60 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg">Швидкий старт</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <ul className="space-y-2">
            <li className="flex items-center gap-2">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">1</span>
              Запросіть волонтерів через вкладку «Команда»
            </li>
            <li className="flex items-center gap-2">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">2</span>
              Створіть перший збір у розділі «Збори»
            </li>
            <li className="flex items-center gap-2">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">3</span>
              Завантажуйте чеки для автоматичного звітування
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
