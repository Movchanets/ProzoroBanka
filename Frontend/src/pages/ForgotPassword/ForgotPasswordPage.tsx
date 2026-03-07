import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { CircleAlert, CircleCheckBig, Mail } from 'lucide-react';
import { TurnstileWidget } from '../../components/TurnstileWidget';
import { AuthShell } from '../../components/auth/AuthShell';
import { useForgotPasswordMutation } from '../../hooks/queries/useAuth';
import { forgotPasswordSchema, type ForgotPasswordFormData } from '../../utils/authSchemas';
import { FieldMessages } from '../../components/auth/FieldMessages';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ForgotPasswordPage() {
  const forgotPasswordMutation = useForgotPasswordMutation();
  const [submitted, setSubmitted] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    criteriaMode: 'all',
    defaultValues: {
      email: '',
      turnstileToken: '',
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    const response = await forgotPasswordMutation.mutateAsync(values);
    setSubmitted(response.message || 'Якщо email існує, інструкції надіслано.');
  });

  const handleTurnstileVerify = useCallback((token: string) => {
    setValue('turnstileToken', token, { shouldValidate: true });
  }, [setValue]);

  return (
    <AuthShell
      eyebrow="Відновлення доступу"
      title="Запросіть лист для скидання пароля"
      note="Введіть email, і ми надішлемо інструкцію для відновлення доступу до акаунта."
      alternateLabel="Згадали пароль?"
      alternateHref="/login"
      alternateAction="Повернутися до входу"
    >
      <div className="space-y-2">
        <h2 className="text-[2rem] font-semibold leading-none tracking-tight">Скидання пароля</h2>
        <p className="text-base leading-7 text-muted-foreground">
          Вкажіть адресу, з якою ви реєструвалися в системі.
        </p>
      </div>

      {submitted ? (
        <Alert variant="success" aria-live="polite">
          <CircleCheckBig aria-hidden="true" />
          <AlertTitle>Лист надіслано</AlertTitle>
          <AlertDescription>{submitted}</AlertDescription>
        </Alert>
      ) : (
        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-2.5">
            <Label htmlFor="forgot-email">Email</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-4 top-1/2 z-10 h-4.5 w-4.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                id="forgot-email"
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

          <div className="grid justify-items-center gap-2.5 rounded-[20px] border border-border bg-muted/70 p-3.5">
            <TurnstileWidget onVerify={handleTurnstileVerify} />
            <FieldMessages error={errors.turnstileToken} />
          </div>

          {forgotPasswordMutation.error && (
            <Alert variant="destructive" aria-live="polite">
              <CircleAlert aria-hidden="true" />
              <AlertDescription>
                {forgotPasswordMutation.error instanceof Error
                  ? forgotPasswordMutation.error.message
                  : 'Не вдалося надіслати лист.'}
              </AlertDescription>
            </Alert>
          )}

          <Button type="submit" size="pillWide" className="w-full shadow-[0_18px_30px_var(--shadow-strong)]" disabled={forgotPasswordMutation.isPending}>
            {forgotPasswordMutation.isPending ? 'Надсилаю…' : 'Надіслати посилання'}
          </Button>
        </form>
      )}

      <Link className="inline-flex text-sm font-bold text-accent transition-colors hover:text-accent/80" to="/reset-password">
        Маєте токен? Перейдіть одразу до встановлення нового пароля
      </Link>
    </AuthShell>
  );
}