import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { useCreateCampaign } from '@/hooks/queries/useCampaigns';
import { createCampaignSchema, type CreateCampaignFormData } from '@/utils/organizationSchemas';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Loader2, Megaphone } from 'lucide-react';

export default function CampaignCreatePage() {
  const { t } = useTranslation();
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();
  const createCampaign = useCreateCampaign(orgId!);
  const [apiError, setApiError] = useState<string | null>(null);

  const schema = useMemo(() => createCampaignSchema(t), [t]);

  const { register, handleSubmit, formState: { errors } } = useForm<CreateCampaignFormData>({
    resolver: zodResolver(schema),
    defaultValues: { title: '', description: '', goalAmount: 0, deadline: '' },
  });

  const onSubmit = async (data: CreateCampaignFormData) => {
    setApiError(null);
    try {
      await createCampaign.mutateAsync({
        title: data.title,
        description: data.description || undefined,
        goalAmount: Math.round(data.goalAmount * 100),
        deadline: data.deadline || undefined,
      });
      navigate(`/dashboard/${orgId}/campaigns`);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : t('campaigns.createError'));
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6" data-testid="campaign-create-page">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/dashboard/${orgId}/campaigns`)} data-testid="campaign-create-back-button">
          <ArrowLeft className="h-4 w-4" />
          {t('common.back')}
        </Button>
      </div>

      <Card className="border border-border bg-card/60 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl" data-testid="campaign-create-title">
            <Megaphone className="h-5 w-5 text-primary" />
            {t('campaigns.create.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" data-testid="campaign-create-form">
            {apiError && (<Alert variant="destructive" data-testid="campaign-create-api-error"><AlertDescription>{apiError}</AlertDescription></Alert>)}
            <div className="space-y-2">
              <Label htmlFor="campaign-title">{t('campaigns.create.titleLabel')}</Label>
              <Input id="campaign-title" placeholder={t('campaigns.create.titlePlaceholder')} autoFocus {...register('title')} data-testid="campaign-create-title-input" />
              {errors.title && (<p className="text-sm text-destructive" data-testid="campaign-create-title-error">{errors.title.message}</p>)}
            </div>
            <div className="space-y-2">
              <Label htmlFor="campaign-desc">{t('campaigns.create.descriptionLabel')}</Label>
              <Textarea id="campaign-desc" rows={4} placeholder={t('campaigns.create.descriptionPlaceholder')} {...register('description')} data-testid="campaign-create-description-input" />
              {errors.description && (<p className="text-sm text-destructive" data-testid="campaign-create-description-error">{errors.description.message}</p>)}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="campaign-goal">{t('campaigns.create.goalLabel')}</Label>
                <Input id="campaign-goal" type="number" step="0.01" placeholder="50000" {...register('goalAmount', { valueAsNumber: true })} data-testid="campaign-create-goal-input" />
                {errors.goalAmount && (<p className="text-sm text-destructive" data-testid="campaign-create-goal-error">{errors.goalAmount.message}</p>)}
              </div>
              <div className="space-y-2">
                <Label htmlFor="campaign-deadline">{t('campaigns.create.deadlineLabel')}</Label>
                <Input id="campaign-deadline" type="date" {...register('deadline')} data-testid="campaign-create-deadline-input" />
                {errors.deadline && (<p className="text-sm text-destructive" data-testid="campaign-create-deadline-error">{errors.deadline.message}</p>)}
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => navigate(`/dashboard/${orgId}/campaigns`)} data-testid="campaign-create-cancel-button">{t('common.cancel')}</Button>
              <Button type="submit" disabled={createCampaign.isPending} data-testid="campaign-create-submit-button">
                {createCampaign.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {t('common.create')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
