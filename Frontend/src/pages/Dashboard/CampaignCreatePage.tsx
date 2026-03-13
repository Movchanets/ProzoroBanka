import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();
  const createCampaign = useCreateCampaign(orgId!);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateCampaignFormData>({
    resolver: zodResolver(createCampaignSchema),
    defaultValues: { title: '', description: '', goalAmount: 0, deadline: '' },
  });

  const onSubmit = async (data: CreateCampaignFormData) => {
    setApiError(null);
    try {
      await createCampaign.mutateAsync({
        title: data.title,
        description: data.description || undefined,
        goalAmount: Math.round(data.goalAmount * 100), // Convert UAH → kopecks
        deadline: data.deadline || undefined,
      });
      navigate(`/dashboard/${orgId}/campaigns`);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Помилка створення збору');
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/dashboard/${orgId}/campaigns`)}
        >
          <ArrowLeft className="h-4 w-4" />
          Назад
        </Button>
      </div>

      <Card className="border border-border bg-card/60 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Megaphone className="h-5 w-5 text-primary" />
            Новий збір
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {apiError && (
              <Alert variant="destructive">
                <AlertDescription>{apiError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="campaign-title">Назва *</Label>
              <Input
                id="campaign-title"
                placeholder="Збір на дрони для 72 бригади"
                autoFocus
                {...register('title')}
              />
              {errors.title && (
                <p className="text-sm text-destructive">{errors.title.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="campaign-desc">Опис</Label>
              <Textarea
                id="campaign-desc"
                rows={4}
                placeholder="Детальний опис збору…"
                {...register('description')}
              />
              {errors.description && (
                <p className="text-sm text-destructive">{errors.description.message}</p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="campaign-goal">Ціль (₴) *</Label>
                <Input
                  id="campaign-goal"
                  type="number"
                  step="0.01"
                  placeholder="50000"
                  {...register('goalAmount', { valueAsNumber: true })}
                />
                {errors.goalAmount && (
                  <p className="text-sm text-destructive">{errors.goalAmount.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="campaign-deadline">Дедлайн</Label>
                <Input
                  id="campaign-deadline"
                  type="date"
                  {...register('deadline')}
                />
                {errors.deadline && (
                  <p className="text-sm text-destructive">{errors.deadline.message}</p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(`/dashboard/${orgId}/campaigns`)}
              >
                Скасувати
              </Button>
              <Button type="submit" disabled={createCampaign.isPending}>
                {createCampaign.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Створити
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
