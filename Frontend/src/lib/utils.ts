import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5188';

export function getImageUrl(storageKey?: string | null): string | undefined {
  if (!storageKey) return undefined;
  if (storageKey.startsWith('http')) return storageKey;
  
  // Backend's LocalFileStorage service saves inside webRoot
  // and we serve the static files with app.UseStaticFiles()
  return `${API_BASE_URL}/${storageKey.replace(/^[/\\]+/, '')}`;
}