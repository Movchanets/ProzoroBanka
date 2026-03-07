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
    setRedirectCountdown(REDIRECT_DELAY_SECONDS);
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
      <div className="space-y-2">
        <h2 className="text-[2rem] font-semibold leading-none tracking-tight">Встановіть новий пароль</h2>
        <p className="text-base leading-7 text-muted-foreground">
          {hasLinkParams
            ? 'Email і токен вже підставлені з посилання листа.'
            : 'Якщо ви відкрили сторінку без листа, вставте email і токен вручну.'}
        </p>
      </div>

      {successMessage ? (
        <div className="grid gap-3">
          <Alert variant="success" aria-live="polite">
            <CircleCheckBig aria-hidden="true" />
            <AlertTitle>Пароль змінено</AlertTitle>
            <AlertDescription>{successMessage}</AlertDescription>
          </Alert>
          <p className="m-0 text-sm leading-6 text-muted-foreground">
            Перенаправлення на вхід через {redirectCountdown ?? REDIRECT_DELAY_SECONDS} c.
          </p>
          <Link className="inline-flex text-sm font-bold text-accent transition-colors hover:text-accent/80" to="/login">
            Перейти до входу зараз
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-2.5">
            <Label htmlFor="reset-email">Email</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-4 top-1/2 z-10 h-4.5 w-4.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                id="reset-email"
                type="email"
                autoComplete="email"
                inputMode="email"
                maxLength={254}
                spellCheck={false}
                placeholder="volunteer@example.com"
                className="pl-14 pr-4"
                {...register('email')}
              />
            </div>
            <FieldMessages error={errors.email} />
          </div>

          <div className="grid gap-2.5">
            <Label htmlFor="reset-token">Токен скидання</Label>
            <div className="relative">
              <ShieldCheck className="pointer-events-none absolute left-4 top-5 z-10 h-4.5 w-4.5 text-muted-foreground" aria-hidden="true" />
              <Textarea
                id="reset-token"
                className="min-h-28 resize-y pl-14 pt-4"
                rows={4}
                placeholder="Вставте токен із листа"
                {...register('token')}
              />
            </div>
            <FieldMessages error={errors.token} />
          </div>

          <div className="grid gap-2.5">
            <Label htmlFor="newPassword">Новий пароль</Label>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-4 top-1/2 z-10 h-4.5 w-4.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                maxLength={128}
                placeholder="Мінімум 8 символів"
                className="pl-14 pr-4"
                {...register('newPassword')}
              />
            </div>
            <FieldMessages error={errors.newPassword} />
            <span className="text-sm leading-5 text-muted-foreground">
              Щонайменше 8 символів, велика і мала літера, цифра та спецсимвол.
            </span>
          </div>

          <div className="grid gap-2.5">
            <Label htmlFor="confirmPassword">Підтвердження паролю</Label>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-4 top-1/2 z-10 h-4.5 w-4.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                maxLength={128}
                placeholder="Повторіть пароль"
                className="pl-14 pr-4"
                {...register('confirmPassword')}
              />
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

          <Button type="submit" size="pillWide" className="w-full shadow-[0_18px_30px_var(--shadow-strong)]" disabled={resetPasswordMutation.isPending}>
            {resetPasswordMutation.isPending ? 'Зберігаю…' : 'Змінити пароль'}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}