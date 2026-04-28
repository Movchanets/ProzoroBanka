import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useSearchParams, useSubmit, useActionData, useNavigation } from 'react-router';
import type { ActionFunctionArgs } from 'react-router';
import { useTranslation } from 'react-i18next';
import { CircleAlert, CircleCheckBig, KeyRound, Mail, ShieldCheck } from 'lucide-react';
import { AuthShell } from '../../components/auth/AuthShell';
import { authService } from '../../services/authService';
import { createResetPasswordSchema, type ResetPasswordFormData } from '../../utils/authSchemas';
import { FieldMessages } from '../../components/auth/FieldMessages';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export async function clientAction({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const data = Object.fromEntries(formData) as unknown as ResetPasswordFormData;

  try {
    const response = await authService.resetPassword(data);
    return { success: true, message: response.message };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to reset password' };
  }
}

const REDIRECT_DELAY_SECONDS = 4;

export default function ResetPasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const submit = useSubmit();
  const actionData = useActionData() as { success?: boolean; message?: string; error?: string } | undefined;
  const navigation = useNavigation();
  const successMessage = actionData?.success ? actionData.message || t('auth.resetPassword.successDefault') : null;
  const serverError = actionData?.error;
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);

  const schema = useMemo(() => createResetPasswordSchema(t), [t]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    criteriaMode: 'all',
    defaultValues: { email: '', token: '', newPassword: '', confirmPassword: '' },
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
    if (!successMessage) return;
    const countdownInterval = window.setInterval(() => {
      setRedirectCountdown((v) => {
        if (v === null || v <= 1) { window.clearInterval(countdownInterval); return 0; }
        return v - 1;
      });
    }, 1000);
    const redirectTimeout = window.setTimeout(() => {
      navigate('/login', { replace: true });
    }, REDIRECT_DELAY_SECONDS * 1000);
    return () => { window.clearInterval(countdownInterval); window.clearTimeout(redirectTimeout); };
  }, [navigate, successMessage]);

  const hasLinkParams = Boolean(searchParams.get('email') && searchParams.get('token'));

  const onSubmit = handleSubmit((values) => {
    submit(values as any, { method: 'post' });
  });

  const isPending = navigation.state !== 'idle';

  useEffect(() => {
    if (actionData?.success && redirectCountdown === null) {
      setRedirectCountdown(REDIRECT_DELAY_SECONDS);
    }
  }, [actionData, redirectCountdown]);

  return (
    <AuthShell
      eyebrow={t('auth.resetPassword.eyebrow')}
      title={t('auth.resetPassword.heroTitle')}
      note={t('auth.resetPassword.heroNote')}
      alternateLabel={t('auth.resetPassword.altLabel')}
      alternateHref="/forgot-password"
      alternateAction={t('auth.resetPassword.altAction')}
    >
      <div className="space-y-2">
        <h2 className="text-[2rem] font-semibold leading-none tracking-tight">{t('auth.resetPassword.title')}</h2>
        <p className="text-base leading-7 text-muted-foreground">
          {hasLinkParams ? t('auth.resetPassword.subtitleWithLink') : t('auth.resetPassword.subtitleManual')}
        </p>
      </div>

      {successMessage ? (
        <div className="grid gap-3">
          <Alert variant="success" aria-live="polite">
            <CircleCheckBig aria-hidden="true" />
            <AlertTitle>{t('auth.resetPassword.successTitle')}</AlertTitle>
            <AlertDescription>{successMessage}</AlertDescription>
          </Alert>
          <p className="m-0 text-sm leading-6 text-muted-foreground">
            {t('auth.resetPassword.redirecting', { count: redirectCountdown ?? REDIRECT_DELAY_SECONDS })}
          </p>
          <Link className="inline-flex text-sm font-bold text-accent transition-colors hover:text-accent/80" to="/login">
            {t('auth.resetPassword.goToLogin')}
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-2.5">
            <Label htmlFor="reset-email">{t('common.email')}</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-4 top-1/2 z-10 h-4.5 w-4.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input id="reset-email" type="email" autoComplete="email" inputMode="email" maxLength={254} spellCheck={false} placeholder="volunteer@example.com" className="pl-14 pr-4" {...register('email')} />
            </div>
            <FieldMessages error={errors.email} />
          </div>

          <div className="grid gap-2.5">
            <Label htmlFor="reset-token">{t('auth.resetPassword.tokenLabel')}</Label>
            <div className="relative">
              <ShieldCheck className="pointer-events-none absolute left-4 top-5 z-10 h-4.5 w-4.5 text-muted-foreground" aria-hidden="true" />
              <Textarea id="reset-token" className="min-h-28 resize-y pl-14 pt-4" rows={4} placeholder={t('auth.resetPassword.tokenPlaceholder')} {...register('token')} />
            </div>
            <FieldMessages error={errors.token} />
          </div>

          <div className="grid gap-2.5">
            <Label htmlFor="newPassword">{t('auth.resetPassword.newPasswordLabel')}</Label>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-4 top-1/2 z-10 h-4.5 w-4.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input id="newPassword" type="password" autoComplete="new-password" maxLength={128} placeholder={t('auth.resetPassword.passwordPlaceholder')} className="pl-14 pr-4" {...register('newPassword')} />
            </div>
            <FieldMessages error={errors.newPassword} />
            <span className="text-sm leading-5 text-muted-foreground">{t('auth.resetPassword.passwordHint')}</span>
          </div>

          <div className="grid gap-2.5">
            <Label htmlFor="confirmPassword">{t('common.confirmPassword')}</Label>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-4 top-1/2 z-10 h-4.5 w-4.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input id="confirmPassword" type="password" autoComplete="new-password" maxLength={128} placeholder={t('auth.resetPassword.confirmPlaceholder')} className="pl-14 pr-4" {...register('confirmPassword')} />
            </div>
            <FieldMessages error={errors.confirmPassword} />
          </div>

          {serverError && (
            <Alert variant="destructive" aria-live="polite">
              <CircleAlert aria-hidden="true" />
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" size="pillWide" className="w-full shadow-[0_18px_30px_var(--shadow-strong)]" disabled={isPending}>
            {isPending ? t('auth.resetPassword.submitPending') : t('auth.resetPassword.submit')}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}