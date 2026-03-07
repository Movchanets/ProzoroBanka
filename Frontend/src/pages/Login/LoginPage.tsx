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
      <div className="auth-card__header">
        <h2>Увійти</h2>
        <p>Використайте email і пароль, які вказували під час реєстрації.</p>
      </div>

      {serverError && (
        <Alert variant="destructive" aria-live="polite">
          <CircleAlert aria-hidden="true" />
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="auth-form">
        <div className="field field--icon">
          <Label htmlFor="email">Email</Label>
          <div className="field-control">
            <Mail className="field-icon" aria-hidden="true" />
            <Input id="email" type="email" autoComplete="email" inputMode="email" maxLength={254} spellCheck={false} placeholder="volunteer@example.com" {...register('email')} />
          </div>
          <FieldMessages error={errors.email} />
        </div>

        <div className="field field--icon">
          <Label htmlFor="password">Пароль</Label>
          <div className="field-control">
            <KeyRound className="field-icon" aria-hidden="true" />
            <Input id="password" type="password" autoComplete="current-password" maxLength={128} placeholder="••••••••" {...register('password')} />
          </div>
          <FieldMessages error={errors.password} />
        </div>

        <div className="turnstile-box">
          <TurnstileWidget onVerify={handleTurnstileVerify} />
          <FieldMessages error={errors.turnstileToken} />
        </div>

        <Button type="submit" className="primary-button auth-submit" disabled={loginMutation.isPending}>
          {loginMutation.isPending ? 'Вхід…' : 'Увійти'}
        </Button>
      </form>

      <div className="auth-actions-row">
        <Link className="auth-card__subtle-link" to="/forgot-password">
          Забули пароль?
        </Link>
      </div>
    </AuthShell>
  );
}
