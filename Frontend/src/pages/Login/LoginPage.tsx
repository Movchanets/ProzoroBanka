import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { CircleAlert, KeyRound, Mail } from 'lucide-react';
import { loginSchema, type LoginFormData } from '../../utils/authSchemas';
import { useLoginMutation } from '../../hooks/queries/useAuth';
import { TurnstileWidget } from '../../components/TurnstileWidget';
import { AuthShell } from '../../components/auth/AuthShell';
import { FieldMessages } from '../../components/auth/FieldMessages';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function LoginPage() {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const loginMutation = useLoginMutation();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    criteriaMode: 'all',
    defaultValues: {
      email: '',
      password: '',
      turnstileToken: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setServerError(null);

    try {
      await loginMutation.mutateAsync(data);
      navigate('/', { replace: true });
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Помилка авторизації');
    }
  };

  const handleTurnstileVerify = useCallback((token: string) => {
    setValue('turnstileToken', token, { shouldValidate: true });
  }, [setValue]);

  return (
    <AuthShell
      eyebrow="Безпечний вхід"
      title="Поверніться до фінансового кабінету"
      note="Увійдіть, щоб продовжити роботу з профілем і фінансовою звітністю команди."
      alternateLabel="Ще не маєте акаунта?"
      alternateHref="/register"
      alternateAction="Створити профіль"
    >
      <div className="space-y-2">
        <h2 className="text-[2rem] font-semibold leading-none tracking-tight">Увійти</h2>
        <p className="text-base leading-7 text-muted-foreground">
          Використайте email і пароль, які вказували під час реєстрації.
        </p>
      </div>

      {serverError && (
        <Alert variant="destructive" aria-live="polite">
          <CircleAlert aria-hidden="true" />
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
        <div className="grid gap-2.5">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-4 top-1/2 z-10 h-4.5 w-4.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              id="email"
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
          <Label htmlFor="password">Пароль</Label>
          <div className="relative">
            <KeyRound className="pointer-events-none absolute left-4 top-1/2 z-10 h-4.5 w-4.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              maxLength={128}
              placeholder="••••••••"
              className="pl-14 pr-4"
              {...register('password')}
            />
          </div>
          <FieldMessages error={errors.password} />
        </div>

        <div className="grid justify-items-center gap-2.5 rounded-[20px] border border-border bg-muted/70 p-3.5">
          <TurnstileWidget onVerify={handleTurnstileVerify} />
          <FieldMessages error={errors.turnstileToken} />
        </div>

        <Button type="submit" size="pillWide" className="w-full shadow-[0_18px_30px_var(--shadow-strong)]" disabled={loginMutation.isPending}>
          {loginMutation.isPending ? 'Вхід…' : 'Увійти'}
        </Button>
      </form>

      <div className="flex justify-end">
        <Link className="inline-flex text-sm font-bold text-accent transition-colors hover:text-accent/80" to="/forgot-password">
          Забули пароль?
        </Link>
      </div>
    </AuthShell>
  );
}
