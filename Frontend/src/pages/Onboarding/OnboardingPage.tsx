import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMyOrganizations } from '@/hooks/queries/useOrganizations';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { CreateOrganizationDialog } from '@/components/CreateOrganizationDialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Building2, ArrowRight, Plus, Sparkles } from 'lucide-react';

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { data: orgs, isLoading } = useMyOrganizations();
  const activeOrgId = useWorkspaceStore((s) => s.activeOrgId);
  const setActiveOrg = useWorkspaceStore((s) => s.setActiveOrg);
  const [dialogOpen, setDialogOpen] = useState(false);

  // If user already has orgs, redirect to dashboard
  useEffect(() => {
    if (!isLoading && orgs && orgs.length > 0) {
      const targetOrg = activeOrgId && orgs.find((o) => o.id === activeOrgId)
        ? activeOrgId
        : orgs[0].id;
      setActiveOrg(targetOrg);
      navigate(`/dashboard/${targetOrg}`, { replace: true });
    }
  }, [isLoading, orgs, activeOrgId, setActiveOrg, navigate]);

  if (isLoading) {
    return (
      <div className="mx-auto flex min-h-screen w-[min(600px,calc(100%-32px))] items-center justify-center">
        <div className="w-full space-y-4 text-center">
          <Skeleton className="mx-auto h-16 w-16 rounded-2xl" />
          <Skeleton className="mx-auto h-6 w-64" />
          <Skeleton className="mx-auto h-4 w-48" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen w-[min(600px,calc(100%-32px))] items-center justify-center py-8 max-sm:w-[min(600px,calc(100%-20px))]">
      <Card className="w-full border border-border bg-card/80 shadow-[0_24px_80px_var(--shadow-soft)] backdrop-blur-xl">
        <CardHeader className="items-center text-center pb-2">
          <div className="mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-linear-to-br from-primary/80 to-primary text-primary-foreground shadow-lg">
            <Building2 className="h-8 w-8" />
          </div>
          <CardTitle className="text-2xl">Ласкаво просимо!</CardTitle>
          <CardDescription className="max-w-sm text-base">
            Створіть вашу першу організацію, щоб почати збирати кошти та відстежувати витрати.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pb-8">
          <div className="mx-auto max-w-sm space-y-3">
            <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/30 p-4">
              <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div className="space-y-1">
                <p className="text-sm font-semibold">Організуйте команду</p>
                <p className="text-sm text-muted-foreground">
                  Запрошуйте волонтерів, розподіляйте ролі, слідкуйте за зборами.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/30 p-4">
              <ArrowRight className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
              <div className="space-y-1">
                <p className="text-sm font-semibold">Прозорі звіти</p>
                <p className="text-sm text-muted-foreground">
                  Завантажуйте чеки, порівнюйте з банківськими виписками автоматично.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-center pt-4">
            <Button size="pillWide" onClick={() => setDialogOpen(true)}>
              <Plus className="h-5 w-5" />
              Створити організацію
            </Button>
          </div>
        </CardContent>
      </Card>

      <CreateOrganizationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        redirectAfterCreate={true}
      />
    </div>
  );
}
