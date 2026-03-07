import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CircleAlert, KeyRound, Mail, UserRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { registerSchema, type RegisterFormData } from '../../utils/authSchemas';
import { useRegisterMutation } from '../../hooks/queries/useAuth';
import { TurnstileWidget } from '../../components/TurnstileWidget';
import { AuthShell } from '../../components/auth/AuthShell';
import { FieldMessages } from '../../components/auth/FieldMessages';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const registerMutation = useRegisterMutation();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    criteriaMode: 'all',
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      firstName: '',
      lastName: '',
      turnstileToken: '',
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    setServerError(null);

    try {
      await registerMutation.mutateAsync(data);
      navigate('/', { replace: true });
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Помилка реєстрації');
    }
  };

  const handleTurnstileVerify = useCallback((token: string) => {
    setValue('turnstileToken', token, { shouldValidate: true });
  }, [setValue]);

  return (
    <AuthShell
      eyebrow="Новий доступ"
      title="Створіть профіль для команди збору"
      note="Створіть акаунт, щоб команда могла швидко почати роботу зі звітністю та профілем волонтера."
      alternateLabel="Вже маєте акаунт?"
      alternateHref="/login"
      alternateAction="Увійти"
    >
      <div className="auth-card__header">
        <h2>Реєстрація</h2>
        <p>Заповніть основні дані. Email стане вашим постійним логіном у системі.</p>
      </div>

      {serverError && (
        <Alert variant="destructive" aria-live="polite">
          <CircleAlert aria-hidden="true" />
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="auth-form">
        <div className="form-grid">
          <div className="field field--icon">
            <Label htmlFor="firstName">Ім&apos;я</Label>
            <div className="field-control">
              <UserRound className="field-icon" aria-hidden="true" />
              <Input id="firstName" type="text" autoComplete="given-name" maxLength={50} placeholder="Олександр" {...register('firstName')} />
            </div>
            <FieldMessages error={errors.firstName} />
          </div>

          <div className="field field--icon">
            <Label htmlFor="lastName">Прізвище</Label>
            <div className="field-control">
              <UserRound className="field-icon" aria-hidden="true" />
              <Input id="lastName" type="text" autoComplete="family-name" maxLength={50} placeholder="Шевченко" {...register('lastName')} />
            </div>
            <FieldMessages error={errors.lastName} />
          </div>
        </div>

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
            <Input id="password" type="password" autoComplete="new-password" maxLength={128} placeholder="Мінімум 8 символів" {...register('password')} />
          </div>
          <FieldMessages error={errors.password} />
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

        <div className="turnstile-box">
          <TurnstileWidget onVerify={handleTurnstileVerify} />
          <FieldMessages error={errors.turnstileToken} />
        </div>

        <Button type="submit" className="primary-button auth-submit" disabled={registerMutation.isPending}>
          {registerMutation.isPending ? 'Реєстрація…' : 'Створити акаунт'}
        </Button>
      </form>
    </AuthShell>
  );
}
