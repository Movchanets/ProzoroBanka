export function resolveLocalizedText(
  valueUk: string | null | undefined,
  valueEn: string | null | undefined,
  language: string,
): string {
  const isUkrainian = language.toLowerCase().startsWith('uk');
  const primary = isUkrainian ? valueUk : valueEn;
  const fallback = isUkrainian ? valueEn : valueUk;

  return (primary?.trim() || fallback?.trim() || '').trim();
}
