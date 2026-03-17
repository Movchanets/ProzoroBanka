import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5188';

export function getImageUrl(storageKey?: string | null): string | undefined {
  if (!storageKey) return undefined;
  if (/^https?:\/\//i.test(storageKey)) return storageKey;

  const normalizedKey = storageKey.replace(/^[/\\]+/, '');
  const keyWithoutUploadsPrefix = normalizedKey.replace(/^uploads[/\\]+/i, '');
  const keyPath = keyWithoutUploadsPrefix.replace(/\\+/g, '/');

  return `${API_BASE_URL.replace(/\/$/, '')}/uploads/${keyPath}`;
}