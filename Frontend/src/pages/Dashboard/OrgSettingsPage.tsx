import { useState, useRef, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import {
  useDeleteStateRegistryCredential,
  useOrganization,
  useOrganizationStateRegistrySettings,
  useUpdateOrganization,
  useUploadOrgLogo,
  useUpsertStateRegistryCredential,
} from '@/hooks/queries/useOrganizations';
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

export default function OrgSettingsPage() {
  const { t } = useTranslation();
  const { orgId } = useParams<{ orgId: string }>();
  const { data: org, isLoading } = useOrganization(orgId);
  const { data: stateRegistrySettings, isLoading: isLoadingStateRegistry } = useOrganizationStateRegistrySettings(orgId);
  const updateOrg = useUpdateOrganization(orgId!);
  const uploadLogo = useUploadOrgLogo(orgId!);
  const upsertRegistryKey = useUpsertStateRegistryCredential(orgId!);
  const deleteRegistryKey = useDeleteStateRegistryCredential(orgId!);
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [taxServiceKeyInput, setTaxServiceKeyInput] = useState('');
  const [checkGovUaKeyInput, setCheckGovUaKeyInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [localLogoPreview, setLocalLogoPreview] = useState<string | null>(null);

  const schema = useMemo(() => createUpdateOrganizationSchema(t), [t]);

  const { register, handleSubmit, formState: { errors, isDirty } } = useForm<UpdateOrganizationFormData>({
    resolver: zodResolver(schema),
    values: org ? { name: org.name, description: org.description ?? '', website: org.website ?? '', contactEmail: org.contactEmail ?? '', phone: org.phone ?? '' } : undefined,
  });

  const onSubmit = async (data: UpdateOrganizationFormData) => {
    setApiError(null); setSuccessMsg(null);
    try {
      await updateOrg.mutateAsync({ name: data.name, description: data.description || undefined, website: data.website || undefined, contactEmail: data.contactEmail || undefined, phone: data.phone || undefined });
      setSuccessMsg(t('organizations.settings.savedMessage'));
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) { setApiError(err instanceof Error ? err.message : t('organizations.settings.updateError')); }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setApiError(t('organizations.settings.imageFileRequired')); e.target.value = ''; return; }
    if (file.size > 2 * 1024 * 1024) { setApiError(t('organizations.settings.fileTooLarge')); e.target.value = ''; return; }
    setApiError(null);
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
    } catch (err) { setApiError(err instanceof Error ? err.message : t('organizations.settings.uploadError')); setLocalLogoPreview(null); }
    finally { URL.revokeObjectURL(previewUrl); }
  };

  const handleCropDialogClose = (nextOpen: boolean) => {
    if (!nextOpen && cropSrc) { URL.revokeObjectURL(cropSrc); setCropSrc(null); }
    setCropDialogOpen(nextOpen);
  };

  const displayedLogoUrl = localLogoPreview || getImageUrl(org?.logoUrl);
  const isRegistryMutationPending = upsertRegistryKey.isPending || deleteRegistryKey.isPending;

  const saveRegistryKeys = async () => {
    setApiError(null);
    setSuccessMsg(null);

    const tasks: Promise<unknown>[] = [];
    if (taxServiceKeyInput.trim().length > 0) {
      tasks.push(upsertRegistryKey.mutateAsync({ provider: StateRegistryProvider.TaxService, apiKey: taxServiceKeyInput.trim() }));
    }
    if (checkGovUaKeyInput.trim().length > 0) {
      tasks.push(upsertRegistryKey.mutateAsync({ provider: StateRegistryProvider.CheckGovUa, apiKey: checkGovUaKeyInput.trim() }));
    }

    if (tasks.length === 0) {
      setApiError('Вкажіть хоча б один API ключ для збереження.');
      return;
    }

    try {
      await Promise.all(tasks);
      setTaxServiceKeyInput('');
      setCheckGovUaKeyInput('');
      setSuccessMsg('Ключі держреєстрів збережено.');
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Не вдалося зберегти ключі держреєстрів.');
    }
  };

  const clearRegistryInputs = () => {
    setTaxServiceKeyInput('');
    setCheckGovUaKeyInput('');
  };

  const deleteRegistryProviderKey = async (provider: typeof StateRegistryProvider[keyof typeof StateRegistryProvider]) => {
    setApiError(null);
    setSuccessMsg(null);
    try {
      await deleteRegistryKey.mutateAsync(provider);
      setSuccessMsg('Ключ держреєстру видалено.');
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Не вдалося видалити ключ держреєстру.');
    }
  };

  if (isLoading) return (<div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-64 w-full rounded-2xl" /></div>);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">{t('organizations.settings.title')}</h2>
        <p className="text-muted-foreground">{t('organizations.settings.subtitle')}</p>
      </div>

      {successMsg && (<Alert data-testid="org-settings-success-alert" className="border-success/30 bg-success/10 text-success"><CheckCircle2 className="h-4 w-4" /><AlertDescription>{successMsg}</AlertDescription></Alert>)}
      {apiError && (<Alert data-testid="org-settings-error-alert" variant="destructive"><AlertDescription>{apiError}</AlertDescription></Alert>)}

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
            Перший інкремент: UI-скелет керування ключами Tax Service та check.gov.ua.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="tax-service-key">Tax Service API key</Label>
              <Input
                id="tax-service-key"
                data-testid="org-settings-tax-service-key-input"
                placeholder="••••••••••••••••"
                autoComplete="off"
                value={taxServiceKeyInput}
                onChange={(event) => setTaxServiceKeyInput(event.target.value)}
                disabled={isRegistryMutationPending}
              />
              <p className="text-xs text-muted-foreground" data-testid="org-settings-tax-service-key-masked-value">
                {stateRegistrySettings?.taxService.isConfigured
                  ? `Збережений ключ: ${stateRegistrySettings.taxService.maskedKey ?? '********'}`
                  : 'Ключ не налаштовано'}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="check-gov-key">check.gov.ua API key</Label>
              <Input
                id="check-gov-key"
                data-testid="org-settings-check-gov-key-input"
                placeholder="••••••••••••••••"
                autoComplete="off"
                value={checkGovUaKeyInput}
                onChange={(event) => setCheckGovUaKeyInput(event.target.value)}
                disabled={isRegistryMutationPending}
              />
              <p className="text-xs text-muted-foreground" data-testid="org-settings-check-gov-key-masked-value">
                {stateRegistrySettings?.checkGovUa.isConfigured
                  ? `Збережений ключ: ${stateRegistrySettings.checkGovUa.maskedKey ?? '********'}`
                  : 'Ключ не налаштовано'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              data-testid="org-settings-state-keys-save-button"
              onClick={saveRegistryKeys}
              disabled={isRegistryMutationPending}
            >
              {upsertRegistryKey.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Зберегти ключі
            </Button>
            <Button
              type="button"
              variant="outline"
              data-testid="org-settings-state-keys-clear-button"
              onClick={clearRegistryInputs}
              disabled={isRegistryMutationPending}
            >
              Очистити
            </Button>
            <Button
              type="button"
              variant="outline"
              data-testid="org-settings-delete-tax-service-key-button"
              onClick={() => deleteRegistryProviderKey(StateRegistryProvider.TaxService)}
              disabled={isRegistryMutationPending || !stateRegistrySettings?.taxService.isConfigured}
            >
              Видалити Tax Service
            </Button>
            <Button
              type="button"
              variant="outline"
              data-testid="org-settings-delete-check-gov-key-button"
              onClick={() => deleteRegistryProviderKey(StateRegistryProvider.CheckGovUa)}
              disabled={isRegistryMutationPending || !stateRegistrySettings?.checkGovUa.isConfigured}
            >
              Видалити check.gov.ua
            </Button>
          </div>

          <div className="grid gap-3 rounded-xl border border-border/70 bg-muted/20 p-4 sm:grid-cols-2" data-testid="org-settings-usage-quota-card">
            <div>
              <p className="text-sm text-muted-foreground" data-testid="org-settings-usage-state-label">State verification usage</p>
              <p className="text-sm font-medium" data-testid="org-settings-usage-state-value">
                {isLoadingStateRegistry
                  ? 'Завантаження...'
                  : `${stateRegistrySettings?.stateVerificationConfiguredKeys ?? 0} / ${stateRegistrySettings?.stateVerificationMaxKeys ?? 0}`}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground" data-testid="org-settings-usage-ocr-label">OCR usage</p>
              <p className="text-sm font-medium" data-testid="org-settings-usage-ocr-value">
                {isLoadingStateRegistry
                  ? 'Завантаження...'
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
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
              <Button type="submit" data-testid="org-settings-save-button" disabled={updateOrg.isPending || !isDirty}>
                {updateOrg.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
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
