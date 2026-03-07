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
    <div className="profile-grid">
      <section className="panel panel--hero">
        <div className="profile-intro">
          <div className="profile-avatar-wrap">
            {activeAvatar ? (
              <img className="profile-avatar" src={activeAvatar} alt="Фото профілю" />
            ) : (
              <div className="profile-avatar profile-avatar--fallback">
                {getInitials(profile?.firstName, profile?.lastName)}
              </div>
            )}

            <Button
              type="button"
              className="secondary-button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadAvatarMutation.isPending}
              variant="default"
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
            <span className="section-label">Профіль</span>
            <h2>{profile?.firstName || 'Ваш'} акаунт готовий до роботи</h2>
            <p>
              Тут зібрані дані, які підтягуються в авторизований інтерфейс. Email лишається джерелом входу,
              а ім&apos;я, телефон і фото можна редагувати без повторної реєстрації.
            </p>

            <div className="stat-row">
              <article className="stat-card">
                <span>Статус сесії</span>
                <strong>{isFetching ? 'Синхронізація' : 'Активна'}</strong>
              </article>
              <article className="stat-card">
                <span>Ролі</span>
                <strong>{profile?.roles?.length ? profile.roles.join(', ') : 'Volunteer'}</strong>
              </article>
              <article className="stat-card">
                <span>Email</span>
                <strong>{profile?.email ?? 'Завантаження...'}</strong>
              </article>
            </div>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel__header">
          <div>
            <span className="section-label">Редагування</span>
            <h3>Основні дані волонтера</h3>
          </div>
          <Button type="button" className="ghost-button" onClick={() => refetch()} variant="ghost">
            Оновити
          </Button>
        </div>

        {isLoading ? (
          <div className="loading-state">Завантажую профіль...</div>
        ) : error ? (
          <Alert variant="destructive" aria-live="polite">
            <CircleAlert aria-hidden="true" />
            <AlertDescription>{error instanceof Error ? error.message : 'Не вдалося отримати профіль.'}</AlertDescription>
          </Alert>
        ) : (
          <form className="profile-form" onSubmit={onSubmit}>
            <div className="form-grid">
              <label className="field">
                <Label htmlFor="profile-first-name">Ім&apos;я</Label>
                <Input id="profile-first-name" type="text" {...register('firstName')} />
                <FieldMessages error={errors.firstName} />
              </label>

              <label className="field">
                <Label htmlFor="profile-last-name">Прізвище</Label>
                <Input id="profile-last-name" type="text" {...register('lastName')} />
                <FieldMessages error={errors.lastName} />
              </label>

              <label className="field field--full">
                <Label htmlFor="profile-email">Email</Label>
                <Input id="profile-email" type="email" value={profile?.email ?? ''} disabled readOnly />
              </label>

              <label className="field field--full">
                <Label htmlFor="profile-phone">Телефон</Label>
                <Input id="profile-phone" type="tel" placeholder="+380 67 123 45 67" {...register('phoneNumber')} />
                <FieldMessages error={errors.phoneNumber} />
              </label>
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

            <div className="form-actions">
              <Button type="submit" className="primary-button" disabled={updateProfileMutation.isPending || !isDirty}>
                {updateProfileMutation.isPending ? 'Зберігаю…' : 'Зберегти зміни'}
              </Button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}