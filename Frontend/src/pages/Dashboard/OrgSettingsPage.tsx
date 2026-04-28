import { useState, useRef, useMemo, useEffect } from 'react';
import { useParams, useSubmit, useActionData, useNavigation } from 'react-router';
import type { ActionFunctionArgs } from 'react-router';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import {
  useOrganization,
  useOrganizationStateRegistrySettings,
  useUploadOrgLogo,
} from '@/hooks/queries/useOrganizations';
import { organizationService } from '@/services/organizationService';
import { StateRegistryProvider } from '@/types';
import { createUpdateOrganizationSchema, type UpdateOrganizationFormData } from '@/utils/organizationSchemas';
import { getImageUrl } from '@/lib/utils';
import { ImageCropDialog } from '@/components/ImageCropDialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Building2, CheckCircle2, Loader2, Upload } from 'lucide-react';
import { queryClient } from '@/services/queryClient';
import { orgKeys } from '@/hooks/queries/useOrganizations';

export async function clientAction({ request, params }: ActionFunctionArgs) {
  const { orgId } = params;
  if (!orgId) throw new Error('Organization ID is required');

  const formData = await request.formData();
  const intent = formData.get('intent');

  try {
    if (intent === 'updateProfile') {
      const data = Object.fromEntries(formData) as unknown as UpdateOrganizationFormData;
      await organizationService.update(orgId, {
        name: data.name,
        description: data.description || undefined,
        website: data.website || undefined,
        contactEmail: data.contactEmail || undefined,
        phone: data.phone || undefined,
      });
      queryClient.invalidateQueries({ queryKey: orgKeys.detail(orgId) });
      return { success: true, message: 'organizations.settings.savedMessage' };
    }

    if (intent === 'upsertRegistryKey') {
      const apiKey = String(formData.get('apiKey'));
      await Promise.all([
        organizationService.upsertStateRegistryCredential(orgId, StateRegistryProvider.TaxService, apiKey),
        organizationService.upsertStateRegistryCredential(orgId, StateRegistryProvider.CheckGovUa, apiKey),
      ]);
      queryClient.invalidateQueries({ queryKey: orgKeys.stateRegistrySettings(orgId) });
      return { success: true, message: 'Ключ держреєстрів збережено.' };
    }

    if (intent === 'deleteRegistryKey') {
      await Promise.all([
        organizationService.deleteStateRegistryCredential(orgId, StateRegistryProvider.TaxService),
        organizationService.deleteStateRegistryCredential(orgId, StateRegistryProvider.CheckGovUa),
      ]);
      queryClient.invalidateQueries({ queryKey: orgKeys.stateRegistrySettings(orgId) });
      return { success: true, message: 'Ключ держреєстрів видалено.' };
    }

    return { error: 'Unknown intent' };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Action failed' };
  }
}

export default function OrgSettingsPage() {
  const { t } = useTranslation();
  const { orgId } = useParams<{ orgId: string }>();
  const submit = useSubmit();
  const actionData = useActionData() as { success?: boolean; message?: string; error?: string } | undefined;
  const navigation = useNavigation();

  const { data: org, isLoading } = useOrganization(orgId);
  const {
    data: stateRegistrySettings,
    isLoading: isLoadingStateRegistry,
    isError: isStateRegistryError,
  } = useOrganizationStateRegistrySettings(orgId);
  const uploadLogo = useUploadOrgLogo(orgId!);
  
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [stateRegistryUnifiedKeyInput, setStateRegistryUnifiedKeyInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [localLogoPreview, setLocalLogoPreview] = useState<string | null>(null);

  const schema = useMemo(() => createUpdateOrganizationSchema(t), [t]);

  const { register, handleSubmit, formState: { errors, isDirty } } = useForm<UpdateOrganizationFormData>({
    resolver: zodResolver(schema),
    values: org ? { name: org.name, description: org.description ?? '', website: org.website ?? '', contactEmail: org.contactEmail ?? '', phone: org.phone ?? '' } : undefined,
  });

  useEffect(() => {
    if (actionData?.success && actionData.message) {
      setSuccessMsg(actionData.message.startsWith('organizations.') ? t(actionData.message) : actionData.message);
      const timer = setTimeout(() => setSuccessMsg(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [actionData, t]);


  const onProfileSubmit = handleSubmit((data) => {
    const formData = new FormData();
    formData.append('intent', 'updateProfile');
    Object.entries(data).forEach(([key, value]) => formData.append(key, String(value)));
    submit(formData, { method: 'post' });
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error(t('organizations.settings.imageFileRequired')); e.target.value = ''; return; }
    if (file.size > 2 * 1024 * 1024) { toast.error(t('organizations.settings.fileTooLarge')); e.target.value = ''; return; }
    const url = URL.createObjectURL(file);
    setCropSrc(url); setCropDialogOpen(true); e.target.value = '';
  };

  const handleCropComplete = async (blob: Blob) => {
    setCropDialogOpen(false);
    if (cropSrc) { URL.revokeObjectURL(cropSrc); setCropSrc(null); }
    const previewUrl = URL.createObjectURL(blob);
    setLocalLogoPreview(previewUrl);
    const file = new File([blob], 'logo.webp', { type: 'image/webp' });
    try {
      await uploadLogo.mutateAsync(file);
      setSuccessMsg(t('organizations.settings.logoUpdated'));
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) { toast.error(err instanceof Error ? err.message : t('organizations.settings.uploadError')); setLocalLogoPreview(null); }
    finally { URL.revokeObjectURL(previewUrl); }
  };

  const handleCropDialogClose = (nextOpen: boolean) => {
    if (!nextOpen && cropSrc) { URL.revokeObjectURL(cropSrc); setCropSrc(null); }
    setCropDialogOpen(nextOpen);
  };

  const displayedLogoUrl = localLogoPreview || getImageUrl(org?.logoUrl);
  const isPending = navigation.state !== 'idle';
  const serverError = actionData?.error;

  const saveRegistryKeys = () => {
    const normalizedKey = stateRegistryUnifiedKeyInput.trim();
    if (!normalizedKey) return;

    const formData = new FormData();
    formData.append('intent', 'upsertRegistryKey');
    formData.append('apiKey', normalizedKey);
    submit(formData, { method: 'post' });
    setStateRegistryUnifiedKeyInput('');
  };

  const deleteUnifiedRegistryKey = () => {
    const formData = new FormData();
    formData.append('intent', 'deleteRegistryKey');
    submit(formData, { method: 'post' });
  };

  const unifiedMaskedKey = stateRegistrySettings?.taxService.maskedKey
    ?? stateRegistrySettings?.checkGovUa.maskedKey
    ?? null;
  const hasUnifiedKeyConfigured = Boolean(stateRegistrySettings?.taxService.isConfigured || stateRegistrySettings?.checkGovUa.isConfigured);

  if (isLoading) return (<div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-64 w-full rounded-2xl" /></div>);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">{t('organizations.settings.title')}</h2>
        <p className="text-muted-foreground">{t('organizations.settings.subtitle')}</p>
      </div>

      {successMsg && (<Alert data-testid="org-settings-success-alert" className="border-success/30 bg-success/10 text-success"><CheckCircle2 className="h-4 w-4" /><AlertDescription>{successMsg}</AlertDescription></Alert>)}
      {serverError && (<Alert data-testid="org-settings-error-alert" variant="destructive"><AlertDescription>{serverError}</AlertDescription></Alert>)}

      <Card className="border border-border bg-card/60 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg">{t('organizations.settings.logoTitle')}</CardTitle>
          <CardDescription>{t('organizations.settings.logoDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-6">
          {displayedLogoUrl ? (<img src={displayedLogoUrl} alt={org?.name ?? t('organizations.settings.logoAlt')} className="h-20 w-20 rounded-2xl object-cover" />) : (
            <div className="grid h-20 w-20 place-items-center rounded-2xl bg-linear-to-br from-primary/80 to-primary text-2xl font-extrabold text-primary-foreground">{org?.name.charAt(0).toUpperCase()}</div>
          )}
          <div>
            <Label htmlFor="logo-upload" data-testid="org-settings-logo-upload-button" className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-muted">
              <Upload className="h-4 w-4" />
              {uploadLogo.isPending ? t('organizations.settings.uploadPending') : t('organizations.settings.uploadChange')}
            </Label>
            <input id="logo-upload" data-testid="org-settings-logo-upload-input" ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleFileSelect} disabled={uploadLogo.isPending} />
            <p className="mt-1.5 text-xs text-muted-foreground">{t('organizations.settings.uploadHint')}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border bg-card/60 backdrop-blur-sm" data-testid="org-settings-plan-placeholder-card">
        <CardHeader>
          <CardTitle className="text-lg" data-testid="org-settings-plan-placeholder-title">Зміна тарифу</CardTitle>
          <CardDescription data-testid="org-settings-plan-placeholder-description">
            Керування тарифом скоро буде доступне в налаштуваннях організації. Поки що для зміни тарифу зверніться до адміністратора платформи.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card className="border border-border bg-card/60 backdrop-blur-sm" data-testid="org-settings-state-api-keys-card">
        <CardHeader>
          <CardTitle className="text-lg" data-testid="org-settings-state-api-keys-title">Ключі держреєстрів</CardTitle>
          <CardDescription data-testid="org-settings-state-api-keys-description">
            Єдиний ключ використовується для Tax Service та check.gov.ua.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="state-registry-key">API key</Label>
            <Input
              id="state-registry-key"
              data-testid="org-settings-state-registry-key-input"
              placeholder="••••••••••••••••"
              autoComplete="off"
              value={stateRegistryUnifiedKeyInput}
              onChange={(event) => setStateRegistryUnifiedKeyInput(event.target.value)}
              disabled={isPending}
            />
            <p className="text-xs text-muted-foreground" data-testid="org-settings-state-registry-key-masked-value">
              {hasUnifiedKeyConfigured
                ? `Збережений ключ: ${unifiedMaskedKey ?? '********'}`
                : 'Ключ не налаштовано'}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              data-testid="org-settings-state-keys-save-button"
              onClick={saveRegistryKeys}
              disabled={isPending}
            >
              {isPending && navigation.formData?.get('intent') === 'upsertRegistryKey' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Зберегти ключ
            </Button>
            <Button
              type="button"
              variant="outline"
              data-testid="org-settings-state-keys-clear-button"
              onClick={() => setStateRegistryUnifiedKeyInput('')}
              disabled={isPending}
            >
              Очистити
            </Button>
            <Button
              type="button"
              variant="outline"
              data-testid="org-settings-delete-state-registry-key-button"
              onClick={deleteUnifiedRegistryKey}
              disabled={isPending || !hasUnifiedKeyConfigured}
            >
              Видалити ключ
            </Button>
          </div>

          <div className="grid gap-3 rounded-xl border border-border/70 bg-muted/20 p-4 sm:grid-cols-2" data-testid="org-settings-usage-quota-card">
            <div>
              <p className="text-sm text-muted-foreground" data-testid="org-settings-usage-state-label">State verification usage</p>
              <p className="text-sm font-medium" data-testid="org-settings-usage-state-value">
                {isLoadingStateRegistry
                  ? 'Завантаження...'
                  : isStateRegistryError
                    ? 'Недоступно'
                    : `${stateRegistrySettings?.stateVerificationConfiguredKeys ?? 0} / ${stateRegistrySettings?.stateVerificationMaxKeys ?? 0}`}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground" data-testid="org-settings-usage-ocr-label">OCR usage</p>
              <p className="text-sm font-medium" data-testid="org-settings-usage-ocr-value">
                {isLoadingStateRegistry
                  ? 'Завантаження...'
                  : isStateRegistryError
                    ? 'Недоступно'
                    : `${stateRegistrySettings?.currentOcrExtractionsPerMonth ?? 0} / ${stateRegistrySettings?.maxOcrExtractionsPerMonth ?? 0}`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      <Card className="border border-border bg-card/60 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><Building2 className="h-5 w-5 text-primary" />{t('organizations.settings.orgProfile')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onProfileSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="settings-name">{t('common.name')}</Label>
              <Input id="settings-name" data-testid="org-settings-name-input" {...register('name')} />
              {errors.name && (<p className="text-sm text-destructive">{errors.name.message}</p>)}
            </div>
            <div className="space-y-2">
              <Label htmlFor="settings-description">{t('common.description')}</Label>
              <Textarea id="settings-description" data-testid="org-settings-description-input" rows={3} {...register('description')} />
              {errors.description && (<p className="text-sm text-destructive">{errors.description.message}</p>)}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="settings-website">{t('common.website')}</Label>
                <Input id="settings-website" data-testid="org-settings-website-input" placeholder="https://…" {...register('website')} />
                {errors.website && (<p className="text-sm text-destructive">{errors.website.message}</p>)}
              </div>
              <div className="space-y-2">
                <Label htmlFor="settings-email">{t('organizations.settings.contactEmail')}</Label>
                <Input id="settings-email" data-testid="org-settings-email-input" placeholder="info@org.ua" {...register('contactEmail')} />
                {errors.contactEmail && (<p className="text-sm text-destructive">{errors.contactEmail.message}</p>)}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="settings-phone">{t('common.phone')}</Label>
              <Input id="settings-phone" data-testid="org-settings-phone-input" placeholder="+380 XX XXX XX XX" {...register('phone')} />
              {errors.phone && (<p className="text-sm text-destructive">{errors.phone.message}</p>)}
            </div>
            <div className="flex justify-end pt-2">
              <Button type="submit" data-testid="org-settings-save-button" disabled={isPending || !isDirty}>
                {isPending && navigation.formData?.get('intent') === 'updateProfile' && <Loader2 className="h-4 w-4 animate-spin" />}
                {t('common.save')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {cropSrc && (
        <ImageCropDialog open={cropDialogOpen} onOpenChange={handleCropDialogClose} imageSrc={cropSrc} onCropComplete={handleCropComplete} isPending={uploadLogo.isPending} aspectRatio={1}
          title={t('organizations.settings.cropTitle')} description={t('organizations.settings.cropDescription')} />
      )}
    </div>
  );
}
