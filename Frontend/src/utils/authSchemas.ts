import { z } from 'zod';
import type { TFunction } from 'i18next';

const namePattern = /^[\p{L}' -]+$/u;

function emailSchema(t: TFunction) {
  return z
    .string()
    .trim()
    .min(1, t('validation.emailRequired'))
    .max(254, t('validation.emailTooLong'))
    .email(t('validation.emailInvalid'));
}

function passwordSchema(t: TFunction) {
  return z
    .string()
    .min(8, t('validation.passwordMin'))
    .max(24, t('validation.passwordMax'))
    .regex(/[a-z]/, t('validation.passwordLowercase'))
    .regex(/[A-Z]/, t('validation.passwordUppercase'))
    .regex(/[0-9]/, t('validation.passwordDigit'))
    .regex(/[^a-zA-Z0-9]/, t('validation.passwordSpecial'));
}

function personNameSchema(t: TFunction) {
  return z
    .string()
    .trim()
    .min(2, t('validation.nameMin'))
    .max(50, t('validation.nameMax'))
    .regex(namePattern, t('validation.namePattern'));
}

// ── Login ──
export function createLoginSchema(t: TFunction) {
  return z.object({
    email: emailSchema(t),
    password: z
      .string()
      .min(1, t('validation.passwordRequired')),
    turnstileToken: z
      .string()
      .min(1, t('validation.captchaRequired')),
  });
}

export type LoginFormData = z.infer<ReturnType<typeof createLoginSchema>>;

// ── Register ──
export function createRegisterSchema(t: TFunction) {
  return z
    .object({
      email: emailSchema(t),
      password: passwordSchema(t),
      confirmPassword: z
        .string()
        .min(1, t('validation.confirmPasswordRequired')),
      firstName: personNameSchema(t),
      lastName: personNameSchema(t),
      turnstileToken: z
        .string()
        .min(1, t('validation.captchaRequired')),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t('validation.passwordsMismatch'),
      path: ['confirmPassword'],
    });
}

export type RegisterFormData = z.infer<ReturnType<typeof createRegisterSchema>>;

export function createForgotPasswordSchema(t: TFunction) {
  return z.object({
    email: emailSchema(t),
    turnstileToken: z
      .string()
      .min(1, t('validation.captchaRequired')),
  });
}

export type ForgotPasswordFormData = z.infer<ReturnType<typeof createForgotPasswordSchema>>;

export function createResetPasswordSchema(t: TFunction) {
  return z
    .object({
      email: emailSchema(t),
      token: z
        .string()
        .trim()
        .min(1, t('validation.tokenRequired')),
      newPassword: passwordSchema(t),
      confirmPassword: z
        .string()
        .min(1, t('validation.confirmPasswordRequired')),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: t('validation.passwordsMismatch'),
      path: ['confirmPassword'],
    });
}

export type ResetPasswordFormData = z.infer<ReturnType<typeof createResetPasswordSchema>>;

export function createProfileSchema(t: TFunction) {
  return z.object({
    firstName: z
      .string()
      .min(2, t('validation.nameMin'))
      .max(50, t('validation.nameMax'))
      .regex(/^[\p{L}' -]+$/u, t('validation.namePattern')),
    lastName: z
      .string()
      .min(2, t('validation.nameMin'))
      .max(50, t('validation.nameMax'))
      .regex(/^[\p{L}' -]+$/u, t('validation.namePattern')),
    phoneNumber: z
      .string()
      .max(32, t('validation.phoneMax'))
      .regex(/^\+?[0-9\s\-()]*$/, t('validation.phoneInvalid'))
      .or(z.literal('')),
  });
}

export type ProfileFormData = z.infer<ReturnType<typeof createProfileSchema>>;
