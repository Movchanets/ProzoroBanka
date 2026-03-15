import { useState, useRef, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { useOrganization, useUpdateOrganization, useUploadOrgLogo } from '@/hooks/queries/useOrganizations';
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
  const updateOrg = useUpdateOrganization(orgId!);
  const uploadLogo = useUploadOrgLogo(orgId!);
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
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

  const displayedLogoUrl = localLogoPreview || getImageUrl(org?.logoStorageKey);

  if (isLoading) return (<div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-64 w-full rounded-2xl" /></div>);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">{t('organizations.settings.title')}</h2>
        <p className="text-muted-foreground">{t('organizations.settings.subtitle')}</p>
      </div>

      {successMsg && (<Alert className="border-success/30 bg-success/10 text-success"><CheckCircle2 className="h-4 w-4" /><AlertDescription>{successMsg}</AlertDescription></Alert>)}
      {apiError && (<Alert variant="destructive"><AlertDescription>{apiError}</AlertDescription></Alert>)}

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
            <Label htmlFor="logo-upload" className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-muted">
              <Upload className="h-4 w-4" />
              {uploadLogo.isPending ? t('organizations.settings.uploadPending') : t('organizations.settings.uploadChange')}
            </Label>
            <input id="logo-upload" ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleFileSelect} disabled={uploadLogo.isPending} />
            <p className="mt-1.5 text-xs text-muted-foreground">{t('organizations.settings.uploadHint')}</p>
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
              <Input id="settings-name" {...register('name')} />
              {errors.name && (<p className="text-sm text-destructive">{errors.name.message}</p>)}
            </div>
            <div className="space-y-2">
              <Label htmlFor="settings-description">{t('common.description')}</Label>
              <Textarea id="settings-description" rows={3} {...register('description')} />
              {errors.description && (<p className="text-sm text-destructive">{errors.description.message}</p>)}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="settings-website">{t('common.website')}</Label>
                <Input id="settings-website" placeholder="https://…" {...register('website')} />
                {errors.website && (<p className="text-sm text-destructive">{errors.website.message}</p>)}
              </div>
              <div className="space-y-2">
                <Label htmlFor="settings-email">{t('organizations.settings.contactEmail')}</Label>
                <Input id="settings-email" placeholder="info@org.ua" {...register('contactEmail')} />
                {errors.contactEmail && (<p className="text-sm text-destructive">{errors.contactEmail.message}</p>)}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="settings-phone">{t('common.phone')}</Label>
              <Input id="settings-phone" placeholder="+380 XX XXX XX XX" {...register('phone')} />
              {errors.phone && (<p className="text-sm text-destructive">{errors.phone.message}</p>)}
            </div>
            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={updateOrg.isPending || !isDirty}>
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
