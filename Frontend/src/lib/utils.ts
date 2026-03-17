import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getImageUrl(urlOrStorageKey?: string | null): string | undefined {
  if (!urlOrStorageKey) return undefined;
  if (/^https?:\/\//i.test(urlOrStorageKey)) return urlOrStorageKey;

  const normalizedKey = urlOrStorageKey.replace(/^[/\\]+/, '');
  const keyWithoutUploadsPrefix = normalizedKey.replace(/^uploads[/\\]+/i, '');
  const keyPath = keyWithoutUploadsPrefix.replace(/\\+/g, '/');

  return `/uploads/${keyPath}`;
}