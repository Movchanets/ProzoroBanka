import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCampaign, useUpdateCampaign } from '@/hooks/queries/useCampaigns';
import { createCampaignSchema, type CreateCampaignFormData } from '@/utils/organizationSchemas';
import { CampaignStatusLabel } from '@/types';
import type { CampaignStatus } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, CheckCircle2, Loader2, Megaphone } from 'lucide-react';

export default function CampaignEditPage() {
  const { orgId, campaignId } = useParams<{ orgId: string; campaignId: string }>();
  const navigate = useNavigate();
  const { data: campaign, isLoading } = useCampaign(orgId, campaignId);
  const updateCampaign = useUpdateCampaign(orgId!, campaignId!);
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<CreateCampaignFormData>({
    resolver: zodResolver(createCampaignSchema),
    values: campaign
      ? {
          title: campaign.title,
          description: campaign.description ?? '',
          goalAmount: campaign.goalAmount / 100,
          deadline: campaign.deadline?.split('T')[0] ?? '',
        }
      : undefined,
  });

  const onSubmit = async (data: CreateCampaignFormData) => {
    setApiError(null);
    setSuccessMsg(null);
    try {
      await updateCampaign.mutateAsync({
        title: data.title,
        description: data.description || undefined,
        goalAmount: Math.round(data.goalAmount * 100),
        deadline: data.deadline || undefined,
      });
      setSuccessMsg('Збережено');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Помилка оновлення');
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    setApiError(null);
    try {
      await updateCampaign.mutateAsync({ status: Number(newStatus) as CampaignStatus });
      setSuccessMsg('Статус оновлено');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Помилка зміни статусу');
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-72 w-full rounded-2xl" />
      </div>
    );
  }

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

      {successMsg && (
        <Alert className="border-success/30 bg-success/10 text-success">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>{successMsg}</AlertDescription>
        </Alert>
      )}
      {apiError && (
        <Alert variant="destructive">
          <AlertDescription>{apiError}</AlertDescription>
        </Alert>
      )}

      {/* Status control */}
      <Card className="border border-border bg-card/60 backdrop-blur-sm">
        <CardContent className="flex items-center justify-between p-5">
          <div className="flex items-center gap-3">
            <Megaphone className="h-5 w-5 text-primary" />
            <span className="font-medium">Статус збору</span>
          </div>
          <Select
            value={String(campaign?.status ?? 0)}
            onValueChange={handleStatusChange}
            disabled={updateCampaign.isPending}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(CampaignStatusLabel).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card className="border border-border bg-card/60 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-xl">Редагувати збір</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Назва *</Label>
              <Input id="edit-title" {...register('title')} />
              {errors.title && (
                <p className="text-sm text-destructive">{errors.title.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-desc">Опис</Label>
              <Textarea id="edit-desc" rows={4} {...register('description')} />
              {errors.description && (
                <p className="text-sm text-destructive">{errors.description.message}</p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-goal">Ціль (₴) *</Label>
                <Input
                  id="edit-goal"
                  type="number"
                  step="0.01"
                  {...register('goalAmount', { valueAsNumber: true })}
                />
                {errors.goalAmount && (
                  <p className="text-sm text-destructive">{errors.goalAmount.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-deadline">Дедлайн</Label>
                <Input id="edit-deadline" type="date" {...register('deadline')} />
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
              <Button type="submit" disabled={updateCampaign.isPending || !isDirty}>
                {updateCampaign.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Зберегти
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
