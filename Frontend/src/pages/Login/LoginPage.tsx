import { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginFormData } from '../../utils/authSchemas';
import { authService } from '../../services/authService';
import { useAuthStore } from '../../stores/authStore';
import { TurnstileWidget } from '../../components/TurnstileWidget';

export default function LoginPage() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      turnstileToken: '',
    },
  });

  const onTurnstileVerify = useCallback(
    (token: string) => {
      setValue('turnstileToken', token, { shouldValidate: true });
    },
    [setValue]
  );

  const onSubmit = async (data: LoginFormData) => {
    setServerError(null);
    setIsSubmitting(true);

    try {
      const res = await authService.login(data);
      setAuth(res.accessToken, res.refreshToken, res.accessTokenExpiry, res.user);
      // Перенаправлення відбудеться через роутер
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Помилка авторизації');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Вхід</h1>
        <p style={styles.subtitle}>ProzoroBanka — прозора волонтерська звітність</p>

        {serverError && (
          <div style={styles.error}>{serverError}</div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} style={styles.form}>
          <div style={styles.field}>
            <label htmlFor="email" style={styles.label}>Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="volunteer@example.com"
              {...register('email')}
              style={styles.input}
            />
            {errors.email && <span style={styles.fieldError}>{errors.email.message}</span>}
          </div>

          <div style={styles.field}>
            <label htmlFor="password" style={styles.label}>Пароль</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              {...register('password')}
              style={styles.input}
            />
            {errors.password && <span style={styles.fieldError}>{errors.password.message}</span>}
          </div>

          <div style={styles.turnstile}>
            <TurnstileWidget onVerify={onTurnstileVerify} />
            {errors.turnstileToken && (
              <span style={styles.fieldError}>{errors.turnstileToken.message}</span>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              ...styles.button,
              opacity: isSubmitting ? 0.7 : 1,
            }}
          >
            {isSubmitting ? 'Вхід...' : 'Увійти'}
          </button>
        </form>

        <p style={styles.linkText}>
          Немає облікового запису?{' '}
          <a href="/register" style={styles.link}>Зареєструватися</a>
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    background: '#f5f5f5',
    padding: '1rem',
  },
  card: {
    background: '#fff',
    borderRadius: '12px',
    padding: '2.5rem',
    width: '100%',
    maxWidth: '420px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
  },
  title: {
    margin: '0 0 0.25rem',
    fontSize: '1.75rem',
    fontWeight: 700,
    color: '#1a1a2e',
  },
  subtitle: {
    margin: '0 0 1.5rem',
    color: '#666',
    fontSize: '0.9rem',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  label: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#333',
  },
  input: {
    padding: '0.75rem',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '1rem',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  fieldError: {
    color: '#e74c3c',
    fontSize: '0.8rem',
  },
  error: {
    background: '#fef2f2',
    color: '#dc2626',
    padding: '0.75rem',
    borderRadius: '8px',
    fontSize: '0.875rem',
    marginBottom: '1rem',
    border: '1px solid #fecaca',
  },
  turnstile: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.25rem',
  },
  button: {
    padding: '0.75rem',
    background: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.2s',
    marginTop: '0.5rem',
  },
  linkText: {
    textAlign: 'center',
    marginTop: '1.5rem',
    color: '#666',
    fontSize: '0.875rem',
  },
  link: {
    color: '#2563eb',
    textDecoration: 'none',
    fontWeight: 600,
  },
};
