import { useActionData, useNavigate } from 'react-router';
import type { ActionFunctionArgs } from 'react-router';
import { useTranslation } from 'react-i18next';
import { CreateOrganizationDialog } from '@/components/CreateOrganizationDialog';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { LanguageSwitcher } from '@/components/language-switcher';
import { Sparkles, Users, FileCheck2, ArrowRight, LogOut } from 'lucide-react';
import { useLogoutMutation } from '@/hooks/queries/useAuth';
import { organizationService } from '@/services/organizationService';
import { queryClient } from '@/services/queryClient';
import { orgKeys } from '@/hooks/queries/useOrganizations';
import { toast } from 'sonner';
import { useEffect, useState } from 'react';

export async function clientAction({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = formData.get('intent');

  if (intent === 'createOrganization') {
    const name = String(formData.get('name'));
    const slug = formData.get('slug') ? String(formData.get('slug')) : undefined;
    const description = formData.get('description') ? String(formData.get('description')) : undefined;
    const website = formData.get('website') ? String(formData.get('website')) : undefined;

    try {
      const org = await organizationService.create({ name, slug, description, website });
      queryClient.invalidateQueries({ queryKey: orgKeys.all });
      return { success: true, orgId: org.id };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Failed to create organization' };
    }
  }

  return { error: 'Unknown intent' };
}

export default function OnboardingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const logoutMutation = useLogoutMutation();
  const actionData = useActionData() as { success?: boolean; orgId?: string; error?: string } | undefined;

  useEffect(() => {
    if (actionData?.success && actionData.orgId) {
      toast.success(t('organizations.create.success', 'Організацію створено'));
      navigate(`/dashboard/${actionData.orgId}`);
    } else if (actionData?.error) {
      toast.error(actionData.error);
    }
  }, [actionData, navigate, t]);

  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
    navigate('/login', { replace: true });
  };

  return (
    <div className="relative mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-8 px-4 py-12">
      <div className="fixed right-4 top-4 z-50 flex items-center gap-2 sm:right-6 sm:top-6 lg:right-10 lg:top-10">
        <LanguageSwitcher />
        <ThemeToggle />
        <Button variant="ghost" size="sm" onClick={handleLogout} disabled={logoutMutation.isPending} className="text-muted-foreground ml-2">
          <LogOut className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">{logoutMutation.isPending ? t('nav.logoutPending') : t('nav.logout')}</span>
        </Button>
      </div>
      <Sparkles className="h-12 w-12 text-primary" />
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">{t('onboarding.welcome')}</h1>
        <p className="text-muted-foreground">{t('onboarding.subtitle')}</p>
      </div>

      <div className="grid w-full gap-4">
        <Card className="border border-border bg-card/60 backdrop-blur-sm">
          <CardContent className="flex items-start gap-4 p-5">
            <Users className="mt-0.5 h-6 w-6 shrink-0 text-primary" />
            <div>
              <CardTitle className="text-base">{t('onboarding.organizeTeam')}</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">{t('onboarding.organizeTeamDesc')}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-border bg-card/60 backdrop-blur-sm">
          <CardContent className="flex items-start gap-4 p-5">
            <FileCheck2 className="mt-0.5 h-6 w-6 shrink-0 text-primary" />
            <div>
              <CardTitle className="text-base">{t('onboarding.transparentReports')}</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">{t('onboarding.transparentReportsDesc')}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Button data-testid="onboarding-create-organization-button" size="pillWide" onClick={() => setDialogOpen(true)} className="gap-2">
        {t('onboarding.createOrganization')}
        <ArrowRight className="h-4 w-4" />
      </Button>

      <Button
        data-testid="onboarding-go-profile-button"
        variant="outline"
        size="pillWide"
        onClick={() => navigate('/profile')}
      >
        {t('onboarding.goProfile')}
      </Button>

      <CreateOrganizationDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
