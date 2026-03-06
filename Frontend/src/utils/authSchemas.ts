import { z } from 'zod';

// ── Login ──
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email є обов\'язковим')
    .email('Невірний формат email'),
  password: z
    .string()
    .min(1, 'Пароль є обов\'язковим'),
  turnstileToken: z
    .string()
    .min(1, 'Пройдіть перевірку CAPTCHA'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

// ── Register ──
export const registerSchema = z
  .object({
    email: z
      .string()
      .min(1, 'Email є обов\'язковим')
      .email('Невірний формат email'),
    password: z
      .string()
      .min(8, 'Мінімум 8 символів')
      .regex(/[A-Z]/, 'Потрібна хоча б одна велика літера')
      .regex(/[a-z]/, 'Потрібна хоча б одна мала літера')
      .regex(/\d/, 'Потрібна хоча б одна цифра')
      .regex(/[^A-Za-z0-9]/, 'Потрібен хоча б один спеціальний символ'),
    confirmPassword: z
      .string()
      .min(1, 'Підтвердження паролю є обов\'язковим'),
    firstName: z
      .string()
      .min(2, 'Мінімум 2 символи')
      .max(50, 'Максимум 50 символів')
      .regex(/^[\p{L}'-]+$/u, 'Тільки літери, апостроф та дефіс'),
    lastName: z
      .string()
      .min(2, 'Мінімум 2 символи')
      .max(50, 'Максимум 50 символів')
      .regex(/^[\p{L}'-]+$/u, 'Тільки літери, апостроф та дефіс'),
    turnstileToken: z
      .string()
      .min(1, 'Пройдіть перевірку CAPTCHA'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Паролі не збігаються',
    path: ['confirmPassword'],
  });

export type RegisterFormData = z.infer<typeof registerSchema>;
