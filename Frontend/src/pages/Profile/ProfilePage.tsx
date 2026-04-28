import { useEffect, useRef, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { CircleAlert, CircleCheckBig } from 'lucide-react';
import { createProfileSchema, type ProfileFormData } from '../../utils/authSchemas';
import { useProfileQuery, useUpdateProfileMutation, useUploadAvatarMutation } from '../../hooks/queries/useProfile';
import { useAuthStore } from '../../stores/authStore';
import { FieldMessages } from '../../components/auth/FieldMessages';
import { ProfileInvitationsTab } from '../../components/ProfileInvitationsTab';
import { ImageCropDialog } from '@/components/ImageCropDialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AppRoles, getSystemRoleLabelKey } from '@/constants/appRoles';

function getInitials(firstName?: string, lastName?: string) {
  return `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.trim().toUpperCase() || 'PB';
}

export default function ProfilePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const updateUser = useAuthStore((state) => state.updateUser);
  const { data: profile, isLoading, error, refetch, isFetching } = useProfileQuery();
  const updateProfileMutation = useUpdateProfileMutation();
  const uploadAvatarMutation = useUploadAvatarMutation();
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);

  const systemRolesLabel = useMemo(() => {
    const roles = profile?.roles?.length ? profile.roles : [AppRoles.Volunteer];
    return roles
      .map((role) => {
        const labelKey = getSystemRoleLabelKey(role);
        return labelKey.startsWith('systemRoles.') ? t(labelKey) : role;
      })
      .join(', ');
  }, [profile?.roles, t]);

  const schema = useMemo(() => createProfileSchema(t), [t]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(schema),
    criteriaMode: 'all',
    defaultValues: {
      firstName: '',
      lastName: '',
      phoneNumber: '',
    },
  });

  useEffect(() => {
    if (!profile) return;
    updateUser(profile);
    reset({
      firstName: profile.firstName,
      lastName: profile.lastName,
      phoneNumber: profile.phoneNumber ?? '',
    });
  }, [profile, reset, updateUser]);

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  const onSubmit = handleSubmit(async (values) => {
    await updateProfileMutation.mutateAsync({
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      phoneNumber: values.phoneNumber.trim() || null,
    });
  });

  const handleAvatarSelection = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setAvatarError(t('profile.imageFileRequired'));
      event.target.value = '';
      return;
    }

    setAvatarError(null);
    const previewUrl = URL.createObjectURL(file);
    setCropSrc(previewUrl);
    setCropDialogOpen(true);
    event.target.value = '';
  };

  const handleAvatarCropComplete = async (blob: Blob) => {
    setCropDialogOpen(false);
    if (cropSrc) {
      URL.revokeObjectURL(cropSrc);
      setCropSrc(null);
    }

    const previewUrl = URL.createObjectURL(blob);
    setAvatarPreview(previewUrl);

    const croppedFile = new File([blob], 'avatar.webp', { type: 'image/webp' });

    try {
      await uploadAvatarMutation.mutateAsync(croppedFile);
    } catch (uploadError) {
      setAvatarError(uploadError instanceof Error ? uploadError.message : t('profile.uploadError'));
    } finally {
      URL.revokeObjectURL(previewUrl);
      setAvatarPreview(null);
    }
  };

  const handleCropDialogClose = (nextOpen: boolean) => {
    if (!nextOpen && cropSrc) {
      URL.revokeObjectURL(cropSrc);
      setCropSrc(null);
    }
    setCropDialogOpen(nextOpen);
  };

  const activeAvatar = avatarPreview || profile?.profilePhotoUrl;

  return (
    <div className="grid gap-6">
      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="pill"
          data-testid="profile-go-onboarding-button"
          onClick={() => navigate('/dashboard')}
        >
          {t('profile.goOnboarding')}
        </Button>
      </div>

      <Card className="overflow-hidden rounded-[1.75rem] border border-border bg-card/80 shadow-[0_24px_80px_var(--shadow-soft)] backdrop-blur-xl">
        <CardContent className="relative p-7 pt-7 max-sm:p-6 max-sm:pt-6">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top_right,hsl(19_88%_55%/0.10),transparent_55%)]" />
          <div className="relative grid gap-6 lg:grid-cols-[180px_minmax(0,1fr)] lg:items-center">
            <div className="grid justify-items-start gap-3">
              {activeAvatar ? (
                  <img className="h-37 w-37 rounded-[36px] object-cover shadow-[0_24px_40px_var(--shadow-soft)]" src={activeAvatar} alt={t('profile.avatarAlt')} />
              ) : (
                  <div className="grid h-37 w-37 place-items-center rounded-[36px] bg-linear-to-br from-secondary to-accent text-4xl font-extrabold text-secondary-foreground shadow-[0_24px_40px_var(--shadow-soft)]">
                    {getInitials(profile?.firstName, profile?.lastName)}
                  </div>
              )}

              <Button
                type="button"
                data-testid="profile-avatar-update-button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadAvatarMutation.isPending}
                variant="secondary"
                size="pill"
              >
                {uploadAvatarMutation.isPending ? t('profile.avatarLoading') : t('profile.avatarUpdate')}
              </Button>

              <input data-testid="profile-avatar-upload-input" ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={handleAvatarSelection} />

              {avatarError && (
                <Alert data-testid="profile-avatar-error-alert" variant="destructive" aria-live="polite">
                  <CircleAlert aria-hidden="true" />
                  <AlertDescription>{avatarError}</AlertDescription>
                </Alert>
              )}
            </div>

            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-card/70 px-3.5 py-2 text-[0.82rem] font-extrabold uppercase tracking-[0.08em] text-primary">
                {t('profile.badge')}
              </span>
              <h2 className="mt-3 text-[clamp(2rem,4vw,3rem)] font-semibold leading-none tracking-tight">
                {t('profile.title', { name: profile?.firstName || t('profile.titleFallback') })}
              </h2>
              <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">
                {t('profile.subtitle')}
              </p>

              <div className="mt-6 grid gap-3 md:grid-cols-3">
                <article className="rounded-[22px] border border-border bg-muted/70 p-4.5">
                  <span className="mb-2 block text-sm text-muted-foreground">{t('profile.sessionStatus')}</span>
                  <strong className="block wrap-break-word text-base font-semibold text-foreground">
                    {isFetching ? t('profile.sessionSyncing') : t('profile.sessionActive')}
                  </strong>
                </article>
                <article className="rounded-[22px] border border-border bg-muted/70 p-4.5">
                  <span className="mb-2 block text-sm text-muted-foreground">{t('common.roles')}</span>
                  <strong data-testid="profile-system-roles-value" className="block wrap-break-word text-base font-semibold text-foreground">
                    {systemRolesLabel}
                  </strong>
                </article>
                <article className="rounded-[22px] border border-border bg-muted/70 p-4.5">
                  <span className="mb-2 block text-sm text-muted-foreground">{t('common.email')}</span>
                  <strong className="block wrap-break-word text-base font-semibold text-foreground">
                    {profile?.email ?? t('common.loading')}
                  </strong>
                </article>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="details" className="space-y-4" data-testid="profile-tabs">
        <TabsList className="grid w-full grid-cols-2" data-testid="profile-tabs-list">
          <TabsTrigger value="details" data-testid="profile-tab-details">
            {t('profile.tabs.details')}
          </TabsTrigger>
          <TabsTrigger value="invitations" data-testid="profile-tab-invitations">
            {t('profile.tabs.invitations')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" data-testid="profile-tab-content-details">
          <Card className="rounded-[1.75rem] border border-border bg-card/80 shadow-[0_24px_80px_var(--shadow-soft)] backdrop-blur-xl">
            <CardContent className="p-7 pt-7 max-sm:p-6 max-sm:pt-6">
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-3">
                  <span className="inline-flex items-center gap-2 rounded-full bg-card/70 px-3.5 py-2 text-[0.82rem] font-extrabold uppercase tracking-[0.08em] text-primary">
                    {t('profile.editBadge')}
                  </span>
                  <h3 className="text-2xl font-semibold leading-none tracking-tight">{t('profile.editTitle')}</h3>
                </div>
                <Button type="button" data-testid="profile-refresh-button" size="pill" onClick={() => refetch()} variant="soft">
                  {t('common.refresh')}
                </Button>
              </div>

              {isLoading ? (
                <div className="rounded-[20px] border border-border bg-muted/70 p-4.5 text-foreground">
                  {t('profile.loadingProfile')}
                </div>
              ) : error ? (
                <Alert variant="destructive" aria-live="polite">
                  <CircleAlert aria-hidden="true" />
                  <AlertDescription>{error instanceof Error ? error.message : t('profile.fetchError')}</AlertDescription>
                </Alert>
              ) : (
                <form className="grid gap-4" onSubmit={onSubmit}>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="grid gap-2.5">
                      <Label htmlFor="profile-first-name">{t('common.firstName')}</Label>
                      <Input id="profile-first-name" data-testid="profile-first-name-input" type="text" {...register('firstName')} />
                      <FieldMessages error={errors.firstName} />
                    </div>

                    <div className="grid gap-2.5">
                      <Label htmlFor="profile-last-name">{t('common.lastName')}</Label>
                      <Input id="profile-last-name" data-testid="profile-last-name-input" type="text" {...register('lastName')} />
                      <FieldMessages error={errors.lastName} />
                    </div>

                    <div className="grid gap-2.5 md:col-span-2">
                      <Label htmlFor="profile-email">{t('common.email')}</Label>
                      <Input id="profile-email" data-testid="profile-email-input" type="email" value={profile?.email ?? ''} disabled readOnly />
                    </div>

                    <div className="grid gap-2.5 md:col-span-2">
                      <Label htmlFor="profile-phone">{t('common.phone')}</Label>
                      <Input id="profile-phone" data-testid="profile-phone-input" type="tel" placeholder="+380 67 123 45 67" {...register('phoneNumber')} />
                      <FieldMessages error={errors.phoneNumber} />
                    </div>
                  </div>

                  {updateProfileMutation.error && (
                    <Alert data-testid="profile-save-error-alert" variant="destructive" aria-live="polite">
                      <CircleAlert aria-hidden="true" />
                      <AlertDescription>
                        {updateProfileMutation.error instanceof Error
                          ? updateProfileMutation.error.message
                          : t('profile.saveError')}
                      </AlertDescription>
                    </Alert>
                  )}

                  {updateProfileMutation.isSuccess && !updateProfileMutation.isPending && (
                    <Alert data-testid="profile-save-success-alert" variant="success" aria-live="polite">
                      <CircleCheckBig aria-hidden="true" />
                      <AlertTitle>{t('profile.updateSuccessTitle')}</AlertTitle>
                      <AlertDescription>{t('profile.updateSuccessDescription')}</AlertDescription>
                    </Alert>
                  )}

                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      data-testid="profile-save-button"
                      size="pill"
                      className="shadow-[0_18px_30px_var(--shadow-strong)]"
                      disabled={updateProfileMutation.isPending || !isDirty}
                    >
                      {updateProfileMutation.isPending ? t('common.saving') : t('common.saveChanges')}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invitations" data-testid="profile-tab-content-invitations">
          <ProfileInvitationsTab />
        </TabsContent>
      </Tabs>

      {cropSrc && (
        <ImageCropDialog
          open={cropDialogOpen}
          onOpenChange={handleCropDialogClose}
          imageSrc={cropSrc}
          onCropComplete={handleAvatarCropComplete}
          isPending={uploadAvatarMutation.isPending}
          aspectRatio={1}
        />
      )}
    </div>
  );
}