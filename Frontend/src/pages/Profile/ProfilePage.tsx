import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CircleAlert, CircleCheckBig } from 'lucide-react';
import { profileSchema, type ProfileFormData } from '../../utils/authSchemas';
import { useProfileQuery, useUpdateProfileMutation, useUploadAvatarMutation } from '../../hooks/queries/useProfile';
import { useAuthStore } from '../../stores/authStore';
import { FieldMessages } from '../../components/auth/FieldMessages';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function getInitials(firstName?: string, lastName?: string) {
  return `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.trim().toUpperCase() || 'PB';
}

export default function ProfilePage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const updateUser = useAuthStore((state) => state.updateUser);
  const { data: profile, isLoading, error, refetch, isFetching } = useProfileQuery();
  const updateProfileMutation = useUpdateProfileMutation();
  const uploadAvatarMutation = useUploadAvatarMutation();
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    criteriaMode: 'all',
    defaultValues: {
      firstName: '',
      lastName: '',
      phoneNumber: '',
    },
  });

  useEffect(() => {
    if (!profile) {
      return;
    }

    updateUser(profile);
    reset({
      firstName: profile.firstName,
      lastName: profile.lastName,
      phoneNumber: profile.phoneNumber ?? '',
    });
  }, [profile, reset, updateUser]);

  useEffect(() => {
    return () => {
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
      }
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
    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      setAvatarError('Оберіть файл зображення.');
      event.target.value = '';
      return;
    }

    setAvatarError(null);
    const previewUrl = URL.createObjectURL(file);
    setAvatarPreview(previewUrl);

    try {
      await uploadAvatarMutation.mutateAsync(file);
    } catch (uploadError) {
      setAvatarError(uploadError instanceof Error ? uploadError.message : 'Не вдалося завантажити фото.');
    } finally {
      URL.revokeObjectURL(previewUrl);
      setAvatarPreview(null);
      event.target.value = '';
    }
  };

  const activeAvatar = avatarPreview || profile?.profilePhotoUrl;

  return (
    <div className="grid gap-6">
      <Card className="overflow-hidden rounded-[1.75rem] border border-border bg-card/80 shadow-[0_24px_80px_var(--shadow-soft)] backdrop-blur-xl">
        <CardContent className="relative p-7 pt-7 max-sm:p-6 max-sm:pt-6">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top_right,hsl(19_88%_55%/0.10),transparent_55%)]" />
          <div className="relative grid gap-6 lg:grid-cols-[180px_minmax(0,1fr)] lg:items-center">
            <div className="grid justify-items-start gap-3">
            {activeAvatar ? (
                <img className="h-37 w-37 rounded-[36px] object-cover shadow-[0_24px_40px_var(--shadow-soft)]" src={activeAvatar} alt="Фото профілю" />
            ) : (
                <div className="grid h-37 w-37 place-items-center rounded-[36px] bg-linear-to-br from-secondary to-accent text-4xl font-extrabold text-secondary-foreground shadow-[0_24px_40px_var(--shadow-soft)]">
                  {getInitials(profile?.firstName, profile?.lastName)}
                </div>
            )}

            <Button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadAvatarMutation.isPending}
              variant="secondary"
              size="pill"
            >
              {uploadAvatarMutation.isPending ? 'Завантаження…' : 'Оновити фото'}
            </Button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              hidden
              onChange={handleAvatarSelection}
            />

            {avatarError && (
              <Alert variant="destructive" aria-live="polite">
                <CircleAlert aria-hidden="true" />
                <AlertDescription>{avatarError}</AlertDescription>
              </Alert>
            )}
            </div>

            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-card/70 px-3.5 py-2 text-[0.82rem] font-extrabold uppercase tracking-[0.08em] text-primary">
                Профіль
              </span>
              <h2 className="mt-3 text-[clamp(2rem,4vw,3rem)] font-semibold leading-none tracking-tight">
                {profile?.firstName || 'Ваш'} акаунт готовий до роботи
              </h2>
              <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">
                Тут зібрані дані, які підтягуються в авторизований інтерфейс. Email лишається джерелом входу,
                а ім&apos;я, телефон і фото можна редагувати без повторної реєстрації.
              </p>

              <div className="mt-6 grid gap-3 md:grid-cols-3">
                <article className="rounded-[22px] border border-border bg-muted/70 p-4.5">
                  <span className="mb-2 block text-sm text-muted-foreground">Статус сесії</span>
                  <strong className="block wrap-break-word text-base font-semibold text-foreground">
                    {isFetching ? 'Синхронізація' : 'Активна'}
                  </strong>
                </article>
                <article className="rounded-[22px] border border-border bg-muted/70 p-4.5">
                  <span className="mb-2 block text-sm text-muted-foreground">Ролі</span>
                  <strong className="block wrap-break-word text-base font-semibold text-foreground">
                    {profile?.roles?.length ? profile.roles.join(', ') : 'Volunteer'}
                  </strong>
                </article>
                <article className="rounded-[22px] border border-border bg-muted/70 p-4.5">
                  <span className="mb-2 block text-sm text-muted-foreground">Email</span>
                  <strong className="block wrap-break-word text-base font-semibold text-foreground">
                    {profile?.email ?? 'Завантаження...'}
                  </strong>
                </article>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[1.75rem] border border-border bg-card/80 shadow-[0_24px_80px_var(--shadow-soft)] backdrop-blur-xl">
        <CardContent className="p-7 pt-7 max-sm:p-6 max-sm:pt-6">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-3">
              <span className="inline-flex items-center gap-2 rounded-full bg-card/70 px-3.5 py-2 text-[0.82rem] font-extrabold uppercase tracking-[0.08em] text-primary">
                Редагування
              </span>
              <h3 className="text-2xl font-semibold leading-none tracking-tight">Основні дані волонтера</h3>
            </div>
            <Button type="button" size="pill" onClick={() => refetch()} variant="soft">
              Оновити
            </Button>
          </div>

        {isLoading ? (
            <div className="rounded-[20px] border border-border bg-muted/70 p-4.5 text-foreground">
              Завантажую профіль...
            </div>
        ) : error ? (
            <Alert variant="destructive" aria-live="polite">
              <CircleAlert aria-hidden="true" />
              <AlertDescription>{error instanceof Error ? error.message : 'Не вдалося отримати профіль.'}</AlertDescription>
            </Alert>
        ) : (
            <form className="grid gap-4" onSubmit={onSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2.5">
                <Label htmlFor="profile-first-name">Ім&apos;я</Label>
                <Input id="profile-first-name" type="text" {...register('firstName')} />
                <FieldMessages error={errors.firstName} />
                </div>

                <div className="grid gap-2.5">
                <Label htmlFor="profile-last-name">Прізвище</Label>
                <Input id="profile-last-name" type="text" {...register('lastName')} />
                <FieldMessages error={errors.lastName} />
                </div>

                <div className="grid gap-2.5 md:col-span-2">
                <Label htmlFor="profile-email">Email</Label>
                <Input id="profile-email" type="email" value={profile?.email ?? ''} disabled readOnly />
                </div>

                <div className="grid gap-2.5 md:col-span-2">
                <Label htmlFor="profile-phone">Телефон</Label>
                <Input id="profile-phone" type="tel" placeholder="+380 67 123 45 67" {...register('phoneNumber')} />
                <FieldMessages error={errors.phoneNumber} />
                </div>
              </div>

              {updateProfileMutation.error && (
                <Alert variant="destructive" aria-live="polite">
                  <CircleAlert aria-hidden="true" />
                  <AlertDescription>
                    {updateProfileMutation.error instanceof Error
                      ? updateProfileMutation.error.message
                      : 'Не вдалося зберегти профіль.'}
                  </AlertDescription>
                </Alert>
              )}

              {updateProfileMutation.isSuccess && !updateProfileMutation.isPending && (
                <Alert variant="success" aria-live="polite">
                  <CircleCheckBig aria-hidden="true" />
                  <AlertTitle>Профіль оновлено</AlertTitle>
                  <AlertDescription>Зміни збережено і вже застосовано до вашого профілю.</AlertDescription>
                </Alert>
              )}

              <div className="flex justify-end">
                <Button
                  type="submit"
                  size="pill"
                  className="shadow-[0_18px_30px_var(--shadow-strong)]"
                  disabled={updateProfileMutation.isPending || !isDirty}
                >
                {updateProfileMutation.isPending ? 'Зберігаю…' : 'Зберегти зміни'}
                </Button>
              </div>
            </form>
        )}
        </CardContent>
      </Card>
    </div>
  );
}