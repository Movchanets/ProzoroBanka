import { readFileSync } from 'node:fs';

import type { Page } from '@playwright/test';

type Locale = 'uk' | 'en';

type LocaleTree = Record<string, unknown>;

const locales: Record<Locale, LocaleTree> = {
  uk: readLocale('../../src/i18n/locales/uk.json'),
  en: readLocale('../../src/i18n/locales/en.json'),
};

function readLocale(relativePath: string): LocaleTree {
  return JSON.parse(readFileSync(new URL(relativePath, import.meta.url), 'utf8')) as LocaleTree;
}

function resolveKey(tree: LocaleTree, key: string): string {
  let current: unknown = tree;

  for (const part of key.split('.')) {
    if (typeof current !== 'object' || current === null || !(part in current)) {
      throw new Error(`Missing i18n key: ${key}`);
    }

    current = (current as LocaleTree)[part];
  }

  if (typeof current !== 'string') {
    throw new Error(`i18n key does not resolve to a string: ${key}`);
  }

  return current;
}

export function t(key: string, locale: Locale = 'uk'): string {
  return resolveKey(locales[locale], key);
}

export async function setTestLanguage(page: Page, locale: Locale = 'uk'): Promise<void> {
  await page.addInitScript((language) => {
    localStorage.setItem('prozoro-banka-lang', language);
  }, locale);
}