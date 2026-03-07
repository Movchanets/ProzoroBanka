import { z } from 'zod';

const namePattern = /^[\p{L}' -]+$/u;
const emailSchema = z
  .string()
  .trim()
  .min(1, 'Email є обов\'язковим')
  .max(254, 'Email занадто довгий')
  .email('Невірний формат email');

const passwordSchema = z
  .string()
  .min(8, 'Мінімум 8 символів')
  .max(24, 'Максимум 24 символів')
  .regex(/[a-z]/, 'Мінімум одна мала літера')
  .regex(/[A-Z]/, 'Мінімум одна велика літера')
  .regex(/[0-9]/, 'Мінімум одна цифра')
  .regex(/[^a-zA-Z0-9]/, 'Мінімум один спеціальний символ');

const personNameSchema = z
  .string()
  .trim()
  .min(2, 'Мінімум 2 символи')
  .max(50, 'Максимум 50 символів')
  .regex(namePattern, 'Тільки літери, пробіл, апостроф та дефіс');

// ── Login ──
export const loginSchema = z.object({
  email: emailSchema,
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
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z
      .string()
      .min(1, 'Підтвердження паролю є обов\'язковим'),
    firstName: personNameSchema,
    lastName: personNameSchema,
    turnstileToken: z
      .string()
      .min(1, 'Пройдіть перевірку CAPTCHA'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Паролі не збігаються',
    path: ['confirmPassword'],
  });

export type RegisterFormData = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
  email: emailSchema,
  turnstileToken: z
    .string()
    .min(1, 'Пройдіть перевірку CAPTCHA'),
});

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    email: emailSchema,
    token: z
      .string()
      .trim()
      .min(1, 'Токен скидання є обов\'язковим'),
    newPassword: passwordSchema,
    confirmPassword: z
      .string()
      .min(1, 'Підтвердження паролю є обов\'язковим'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Паролі не збігаються',
    path: ['confirmPassword'],
  });

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export const profileSchema = z.object({
  firstName: z
    .string()
    .min(2, 'Мінімум 2 символи')
    .max(50, 'Максимум 50 символів')
    .regex(/^[\p{L}' -]+$/u, 'Тільки літери, пробіл, апостроф та дефіс'),
  lastName: z
    .string()
    .min(2, 'Мінімум 2 символи')
    .max(50, 'Максимум 50 символів')
    .regex(/^[\p{L}' -]+$/u, 'Тільки літери, пробіл, апостроф та дефіс'),
  phoneNumber: z
    .string()
    .max(32, 'Максимум 32 символи')
    .regex(/^\+?[0-9\s\-()]*$/, 'Телефон містить недопустимі символи')
    .or(z.literal('')),
});

export type ProfileFormData = z.infer<typeof profileSchema>;
