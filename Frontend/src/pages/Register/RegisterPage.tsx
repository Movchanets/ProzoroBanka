import { useCallback, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CircleAlert, KeyRound, Mail, UserRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { createRegisterSchema, type RegisterFormData } from '../../utils/authSchemas';
import { useRegisterMutation } from '../../hooks/queries/useAuth';
import { TurnstileWidget } from '../../components/TurnstileWidget';
import { AuthShell } from '../../components/auth/AuthShell';
import { FieldMessages } from '../../components/auth/FieldMessages';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const registerMutation = useRegisterMutation();

  const schema = useMemo(() => createRegisterSchema(t), [t]);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(schema),
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
      setServerError(err instanceof Error ? err.message : t('auth.register.errorDefault'));
    }
  };

  const handleTurnstileVerify = useCallback((token: string) => {
    setValue('turnstileToken', token, { shouldValidate: true });
  }, [setValue]);

  return (
    <AuthShell
      eyebrow={t('auth.register.eyebrow')}
      title={t('auth.register.heroTitle')}
      note={t('auth.register.heroNote')}
      alternateLabel={t('auth.register.altLabel')}
      alternateHref="/login"
      alternateAction={t('auth.register.altAction')}
    >
      <div className="space-y-2">
        <h2 className="text-[2rem] font-semibold leading-none tracking-tight">{t('auth.register.title')}</h2>
        <p className="text-base leading-7 text-muted-foreground">{t('auth.register.subtitle')}</p>
      </div>

      {serverError && (
        <Alert variant="destructive" aria-live="polite">
          <CircleAlert aria-hidden="true" />
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2.5">
            <Label htmlFor="firstName">{t('common.firstName')}</Label>
            <div className="relative">
              <UserRound className="pointer-events-none absolute left-4 top-1/2 z-10 h-4.5 w-4.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input id="firstName" type="text" autoComplete="given-name" maxLength={50} placeholder={t('auth.register.firstNamePlaceholder')} className="pl-14 pr-4" {...register('firstName')} />
            </div>
            <FieldMessages error={errors.firstName} />
          </div>
          <div className="grid gap-2.5">
            <Label htmlFor="lastName">{t('common.lastName')}</Label>
            <div className="relative">
              <UserRound className="pointer-events-none absolute left-4 top-1/2 z-10 h-4.5 w-4.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input id="lastName" type="text" autoComplete="family-name" maxLength={50} placeholder={t('auth.register.lastNamePlaceholder')} className="pl-14 pr-4" {...register('lastName')} />
            </div>
            <FieldMessages error={errors.lastName} />
          </div>
        </div>

        <div className="grid gap-2.5">
          <Label htmlFor="email">{t('common.email')}</Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-4 top-1/2 z-10 h-4.5 w-4.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input id="email" type="email" autoComplete="email" inputMode="email" maxLength={254} spellCheck={false} placeholder="volunteer@example.com" className="pl-14 pr-4" {...register('email')} />
          </div>
          <FieldMessages error={errors.email} />
        </div>

        <div className="grid gap-2.5">
          <Label htmlFor="password">{t('common.password')}</Label>
          <div className="relative">
            <KeyRound className="pointer-events-none absolute left-4 top-1/2 z-10 h-4.5 w-4.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input id="password" type="password" autoComplete="new-password" maxLength={128} placeholder={t('auth.register.passwordPlaceholder')} className="pl-14 pr-4" {...register('password')} />
          </div>
          <FieldMessages error={errors.password} />
          <span className="text-sm leading-5 text-muted-foreground">{t('auth.register.passwordHint')}</span>
        </div>

        <div className="grid gap-2.5">
          <Label htmlFor="confirmPassword">{t('common.confirmPassword')}</Label>
          <div className="relative">
            <KeyRound className="pointer-events-none absolute left-4 top-1/2 z-10 h-4.5 w-4.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input id="confirmPassword" type="password" autoComplete="new-password" maxLength={128} placeholder={t('auth.register.confirmPlaceholder')} className="pl-14 pr-4" {...register('confirmPassword')} />
          </div>
          <FieldMessages error={errors.confirmPassword} />
        </div>

        <div className="grid justify-items-center gap-2.5 rounded-[20px] border border-border bg-muted/70 p-3.5">
          <TurnstileWidget onVerify={handleTurnstileVerify} />
          <FieldMessages error={errors.turnstileToken} />
        </div>

        <Button type="submit" size="pillWide" className="w-full shadow-[0_18px_30px_var(--shadow-strong)]" disabled={registerMutation.isPending}>
          {registerMutation.isPending ? t('auth.register.submitPending') : t('auth.register.submit')}
        </Button>
      </form>
    </AuthShell>
  );
}
