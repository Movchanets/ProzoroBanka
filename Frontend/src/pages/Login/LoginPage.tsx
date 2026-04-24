import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CircleAlert, KeyRound, LoaderCircle, Mail } from 'lucide-react';
import { createLoginSchema, type LoginFormData } from '../../utils/authSchemas';
import { useGoogleLoginMutation, useLoginMutation } from '../../hooks/queries/useAuth';
import { TurnstileWidget } from '../../components/TurnstileWidget';
import { AuthShell } from '../../components/auth/AuthShell';
import { FieldMessages } from '../../components/auth/FieldMessages';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          prompt: () => void;
        };
      };
    };
  }
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim();
const GOOGLE_SCRIPT_ID = 'google-identity-services';

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [serverError, setServerError] = useState<string | null>(null);
  const [googleReady, setGoogleReady] = useState(false);
  const loginMutation = useLoginMutation();
  const googleLoginMutation = useGoogleLoginMutation();
  const googleInitializedRef = useRef(false);

  const schema = useMemo(() => createLoginSchema(t), [t]);
  const nextPath = useMemo(() => {
    const candidate = searchParams.get('next');
    if (!candidate || !candidate.startsWith('/')) {
      return '/dashboard';
    }

    return candidate;
  }, [searchParams]);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(schema),
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

    const widgetToken = document
      .querySelector<HTMLInputElement>('input[name="cf-turnstile-response"]')
      ?.value
      ?.trim();

    const payload: LoginFormData = widgetToken
      ? { ...data, turnstileToken: widgetToken }
      : data;

    try {
      await loginMutation.mutateAsync(payload);
      navigate(nextPath, { replace: true });
    } catch (err) {
      setServerError(err instanceof Error ? err.message : t('auth.login.errorDefault'));
    }
  };

  const handleTurnstileVerify = useCallback((token: string) => {
    setValue('turnstileToken', token, { shouldValidate: true });
  }, [setValue]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      return;
    }

    let cancelled = false;

    const initializeGoogle = () => {
      if (cancelled || !window.google || googleInitializedRef.current) {
        return;
      }

      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async ({ credential }) => {
          if (!credential) {
            setServerError(t('auth.login.googleNoToken'));
            return;
          }

          const turnstileToken = document.querySelector<HTMLInputElement>('input[name="cf-turnstile-response"]')?.value?.trim();
          if (!turnstileToken) {
            setServerError(t('auth.login.googleTurnstileRequired'));
            return;
          }

          setServerError(null);

          try {
            await googleLoginMutation.mutateAsync({ idToken: credential, turnstileToken });
            navigate(nextPath, { replace: true });
          } catch (err) {
            setServerError(err instanceof Error ? err.message : t('auth.login.googleError'));
          }
        },
        cancel_on_tap_outside: true,
      });

      googleInitializedRef.current = true;
      setGoogleReady(true);
    };

    const existingScript = document.getElementById(GOOGLE_SCRIPT_ID) as HTMLScriptElement | null;
    if (existingScript) {
      if (window.google) {
        initializeGoogle();
      } else {
        existingScript.addEventListener('load', initializeGoogle, { once: true });
      }

      return () => {
        cancelled = true;
      };
    }

    const script = document.createElement('script');
    script.id = GOOGLE_SCRIPT_ID;
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.addEventListener('load', initializeGoogle, { once: true });
    document.head.appendChild(script);

    return () => {
      cancelled = true;
    };
  }, [googleLoginMutation, navigate, nextPath, t]);

  const handleGoogleLogin = useCallback(() => {
    if (!GOOGLE_CLIENT_ID) {
      setServerError(t('auth.login.googleNotConfiguredShort'));
      return;
    }

    if (!window.google || !googleReady) {
      setServerError(t('auth.login.googleInitializing'));
      return;
    }

    const turnstileToken = document.querySelector<HTMLInputElement>('input[name="cf-turnstile-response"]')?.value?.trim();
    if (!turnstileToken) {
      setServerError(t('auth.login.googleTurnstileRequired'));
      return;
    }

    setServerError(null);
    setValue('turnstileToken', turnstileToken, { shouldValidate: true });
    window.google.accounts.id.prompt();
  }, [googleReady, setValue, t]);

  return (
    <AuthShell
      eyebrow={t('auth.login.eyebrow')}
      title={t('auth.login.heroTitle')}
      note={t('auth.login.heroNote')}
      alternateLabel={t('auth.login.altLabel')}
      alternateHref="/register"
      alternateAction={t('auth.login.altAction')}
    >
      <div className="space-y-2">
        <h2 className="text-[2rem] font-semibold leading-none tracking-tight">{t('auth.login.title')}</h2>
        <p className="text-base leading-7 text-muted-foreground">
          {t('auth.login.subtitle')}
        </p>
      </div>

      {serverError && (
        <Alert variant="destructive" aria-live="polite" data-testid="login-error-alert">
          <CircleAlert aria-hidden="true" />
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
        <div className="grid gap-2.5">
          <Label htmlFor="email">{t('common.email')}</Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-4 top-1/2 z-10 h-4.5 w-4.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              id="email"
              data-testid="login-email-input"
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
          <Label htmlFor="password">{t('common.password')}</Label>
          <div className="relative">
            <KeyRound className="pointer-events-none absolute left-4 top-1/2 z-10 h-4.5 w-4.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              id="password"
              data-testid="login-password-input"
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

        <Button type="submit" data-testid="login-submit-button" size="pillWide" className="w-full shadow-[0_18px_30px_var(--shadow-strong)]" disabled={loginMutation.isPending}>
          {loginMutation.isPending ? t('auth.login.submitPending') : t('auth.login.submit')}
        </Button>

        <div className="relative py-1.5">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            <span className="bg-background px-3">{t('common.or')}</span>
          </div>
        </div>

        <Button
          type="button"
          data-testid="login-google-button"
          variant="secondary"
          size="pillWide"
          className="w-full"
          onClick={handleGoogleLogin}
          disabled={!GOOGLE_CLIENT_ID || googleLoginMutation.isPending}
        >
          {googleLoginMutation.isPending ? (
            <>
              <LoaderCircle className="animate-spin" aria-hidden="true" />
              {t('auth.login.googlePending')}
            </>
          ) : (
            t('auth.login.google')
          )}
        </Button>

        {!GOOGLE_CLIENT_ID && (
          <p className="text-sm leading-6 text-muted-foreground">
            {t('auth.login.googleNotConfigured')}
          </p>
        )}
      </form>

      <div className="flex justify-end">
        <Link className="inline-flex text-sm font-bold text-accent transition-colors hover:text-accent/80" to="/forgot-password">
          {t('auth.login.forgotPassword')}
        </Link>
      </div>

      <div className="rounded-2xl border border-border bg-muted/50 p-3">
        <p className="text-sm text-muted-foreground">{t('auth.login.publicPrompt')}</p>
        <Button asChild className="mt-2 w-full" data-testid="login-public-pages-link">
          <Link to="/">{t('common.goToPublicPages')}</Link>
        </Button>
      </div>
    </AuthShell>
  );
}
