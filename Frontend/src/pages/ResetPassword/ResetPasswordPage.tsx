import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CircleAlert, CircleCheckBig, KeyRound, Mail, ShieldCheck } from 'lucide-react';
import { AuthShell } from '../../components/auth/AuthShell';
import { useResetPasswordMutation } from '../../hooks/queries/useAuth';
import { resetPasswordSchema, type ResetPasswordFormData } from '../../utils/authSchemas';
import { FieldMessages } from '../../components/auth/FieldMessages';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const REDIRECT_DELAY_SECONDS = 4;

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const resetPasswordMutation = useResetPasswordMutation();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    criteriaMode: 'all',
    defaultValues: {
      email: '',
      token: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    reset({
      email: searchParams.get('email') ?? '',
      token: searchParams.get('token') ?? '',
      newPassword: '',
      confirmPassword: '',
    });
  }, [reset, searchParams]);

  useEffect(() => {
    if (!successMessage) {
      return;
    }

    setRedirectCountdown(REDIRECT_DELAY_SECONDS);

    const countdownInterval = window.setInterval(() => {
      setRedirectCountdown((currentValue) => {
        if (currentValue === null || currentValue <= 1) {
          window.clearInterval(countdownInterval);
          return 0;
        }

        return currentValue - 1;
      });
    }, 1000);

    const redirectTimeout = window.setTimeout(() => {
      navigate('/login', { replace: true });
    }, REDIRECT_DELAY_SECONDS * 1000);

    return () => {
      window.clearInterval(countdownInterval);
      window.clearTimeout(redirectTimeout);
    };
  }, [navigate, successMessage]);

  const hasLinkParams = Boolean(searchParams.get('email') && searchParams.get('token'));

  const onSubmit = handleSubmit(async (values) => {
    const response = await resetPasswordMutation.mutateAsync(values);
    setSuccessMessage(response.message || 'Пароль успішно змінено.');
  });

  return (
    <AuthShell
      eyebrow="Новий пароль"
      title="Завершіть відновлення доступу"
      note="Встановіть новий пароль для акаунта і поверніться до входу без зайвих кроків."
      alternateLabel="Потрібен новий лист?"
      alternateHref="/forgot-password"
      alternateAction="Запросити ще раз"
    >
      <div className="auth-card__header">
        <h2>Встановіть новий пароль</h2>
        <p>
          {hasLinkParams
            ? 'Email і токен вже підставлені з посилання листа.'
            : 'Якщо ви відкрили сторінку без листа, вставте email і токен вручну.'}
        </p>
      </div>

      {successMessage ? (
        <div className="feedback-stack">
          <Alert variant="success" aria-live="polite">
            <CircleCheckBig aria-hidden="true" />
            <AlertTitle>Пароль змінено</AlertTitle>
            <AlertDescription>{successMessage}</AlertDescription>
          </Alert>
          <p className="redirect-note">
            Перенаправлення на вхід через {redirectCountdown ?? REDIRECT_DELAY_SECONDS} c.
          </p>
          <Link className="auth-card__subtle-link" to="/login">
            Перейти до входу зараз
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="auth-form">
          <div className="field field--icon">
            <Label htmlFor="reset-email">Email</Label>
            <div className="field-control">
              <Mail className="field-icon" aria-hidden="true" />
              <Input id="reset-email" type="email" autoComplete="email" inputMode="email" maxLength={254} spellCheck={false} placeholder="volunteer@example.com" {...register('email')} />
            </div>
            <FieldMessages error={errors.email} />
          </div>

          <div className="field field--icon">
            <Label htmlFor="reset-token">Токен скидання</Label>
            <div className="field-control field-control--textarea">
              <ShieldCheck className="field-icon field-icon--textarea" aria-hidden="true" />
              <Textarea id="reset-token" className="auth-textarea" rows={4} placeholder="Вставте токен із листа" {...register('token')} />
            </div>
            <FieldMessages error={errors.token} />
          </div>

          <div className="field field--icon">
            <Label htmlFor="newPassword">Новий пароль</Label>
            <div className="field-control">
              <KeyRound className="field-icon" aria-hidden="true" />
              <Input id="newPassword" type="password" autoComplete="new-password" maxLength={128} placeholder="Мінімум 8 символів" {...register('newPassword')} />
            </div>
            <FieldMessages error={errors.newPassword} />
            <span className="field-hint">Щонайменше 8 символів, велика і мала літера, цифра та спецсимвол.</span>
          </div>

          <div className="field field--icon">
            <Label htmlFor="confirmPassword">Підтвердження паролю</Label>
            <div className="field-control">
              <KeyRound className="field-icon" aria-hidden="true" />
              <Input id="confirmPassword" type="password" autoComplete="new-password" maxLength={128} placeholder="Повторіть пароль" {...register('confirmPassword')} />
            </div>
            <FieldMessages error={errors.confirmPassword} />
          </div>

          {resetPasswordMutation.error && (
            <Alert variant="destructive" aria-live="polite">
              <CircleAlert aria-hidden="true" />
              <AlertDescription>
                {resetPasswordMutation.error instanceof Error
                  ? resetPasswordMutation.error.message
                  : 'Не вдалося оновити пароль.'}
              </AlertDescription>
            </Alert>
          )}

          <Button type="submit" className="primary-button auth-submit" disabled={resetPasswordMutation.isPending}>
            {resetPasswordMutation.isPending ? 'Зберігаю…' : 'Змінити пароль'}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}