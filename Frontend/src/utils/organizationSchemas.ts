import { z } from 'zod';

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const createOrganizationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, 'Мінімум 3 символи')
    .max(200, 'Максимум 200 символів'),
  slug: z
    .string()
    .trim()
    .max(100, 'Максимум 100 символів')
    .regex(slugPattern, 'Тільки малі літери, цифри та дефіс')
    .optional()
    .or(z.literal('')),
  description: z
    .string()
    .max(1000, 'Максимум 1000 символів')
    .optional()
    .or(z.literal('')),
  website: z
    .string()
    .url('Невірний формат URL')
    .optional()
    .or(z.literal('')),
});

export type CreateOrganizationFormData = z.infer<typeof createOrganizationSchema>;

export const updateOrganizationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, 'Мінімум 3 символи')
    .max(200, 'Максимум 200 символів')
    .optional(),
  description: z
    .string()
    .max(1000, 'Максимум 1000 символів')
    .optional()
    .or(z.literal('')),
  website: z
    .string()
    .url('Невірний формат URL')
    .optional()
    .or(z.literal('')),
  contactEmail: z
    .string()
    .email('Невірний формат email')
    .optional()
    .or(z.literal('')),
  phone: z
    .string()
    .max(32, 'Максимум 32 символи')
    .regex(/^\+?[0-9\s\-()]*$/, 'Телефон містить недопустимі символи')
    .optional()
    .or(z.literal('')),
});

export type UpdateOrganizationFormData = z.infer<typeof updateOrganizationSchema>;

export const createCampaignSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'Мінімум 3 символи')
    .max(200, 'Максимум 200 символів'),
  description: z
    .string()
    .max(2000, 'Максимум 2000 символів')
    .optional()
    .or(z.literal('')),
  goalAmount: z
    .number({ message: 'Введіть число' })
    .positive('Сума має бути додатньою')
    .max(100_000_000, 'Максимум 100 000 000'),
  deadline: z
    .string()
    .optional()
    .or(z.literal('')),
});

export type CreateCampaignFormData = z.infer<typeof createCampaignSchema>;
