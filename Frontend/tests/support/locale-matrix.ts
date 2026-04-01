import type { Page } from '@playwright/test';

export type TestLanguage = 'uk' | 'en';

export interface LocaleConfig {
  key: TestLanguage;
  browserLocale: string;
  uiLanguage: TestLanguage;
}

export const TEST_LOCALES: readonly LocaleConfig[] = [
  { key: 'uk', browserLocale: 'uk-UA', uiLanguage: 'uk' },
  { key: 'en', browserLocale: 'en-US', uiLanguage: 'en' },
] as const;

export async function applyLocale(page: Page, locale: TestLanguage): Promise<void> {
  await page.addInitScript((lang) => {
    localStorage.setItem('prozoro-banka-lang', lang);
  }, locale);
}
