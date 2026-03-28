import { z } from 'zod';
import type { TFunction } from 'i18next';

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function createOrganizationSchema(t: TFunction) {
  return z.object({
    name: z
      .string()
      .trim()
      .min(3, t('validation.orgNameMin'))
      .max(200, t('validation.orgNameMax')),
    slug: z
      .string()
      .trim()
      .max(100, t('validation.slugMax'))
      .regex(slugPattern, t('validation.slugPattern'))
      .optional()
      .or(z.literal('')),
    description: z
      .string()
      .max(1000, t('validation.descriptionMax'))
      .optional()
      .or(z.literal('')),
    website: z
      .string()
      .url(t('validation.urlInvalid'))
      .optional()
      .or(z.literal('')),
  });
}

export type CreateOrganizationFormData = z.infer<ReturnType<typeof createOrganizationSchema>>;

export function createUpdateOrganizationSchema(t: TFunction) {
  return z.object({
    name: z
      .string()
      .trim()
      .min(3, t('validation.orgNameMin'))
      .max(200, t('validation.orgNameMax'))
      .optional(),
    description: z
      .string()
      .max(1000, t('validation.descriptionMax'))
      .optional()
      .or(z.literal('')),
    website: z
      .string()
      .url(t('validation.urlInvalid'))
      .optional()
      .or(z.literal('')),
    contactEmail: z
      .string()
      .email(t('validation.emailInvalid'))
      .optional()
      .or(z.literal('')),
    phone: z
      .string()
      .max(32, t('validation.phoneMax'))
      .regex(/^\+?[0-9\s\-()]*$/, t('validation.phoneInvalid'))
      .optional()
      .or(z.literal('')),
  });
}

export type UpdateOrganizationFormData = z.infer<ReturnType<typeof createUpdateOrganizationSchema>>;

export function createCampaignSchema(t: TFunction) {
  return z.object({
    title: z
      .string()
      .trim()
      .min(3, t('validation.orgNameMin'))
      .max(200, t('validation.orgNameMax')),
    description: z
      .string()
      .max(2000, t('validation.campaignDescMax'))
      .optional()
      .or(z.literal('')),
    goalAmount: z
      .number({ message: t('validation.numberRequired') })
      .positive(t('validation.amountPositive'))
      .max(100_000_000, t('validation.amountMax')),
    deadline: z
      .string()
      .optional()
      .or(z.literal('')),
    sendUrl: z
      .string()
      .url(t('validation.urlInvalid'))
      .max(512, t('validation.urlMax', { defaultValue: 'Посилання занадто довге' }))
      .optional()
      .or(z.literal('')),
  });
}

export type CreateCampaignFormData = z.infer<ReturnType<typeof createCampaignSchema>>;
