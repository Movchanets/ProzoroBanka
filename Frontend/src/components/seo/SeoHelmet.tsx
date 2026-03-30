import { Helmet } from 'react-helmet-async';

type JsonLd = Record<string, unknown> | Array<Record<string, unknown>>;

export interface SeoConfig {
  title: string;
  description: string;
  canonicalPath?: string;
  robots?: string;
  ogType?: 'website' | 'article';
  ogImage?: string;
  twitterCard?: 'summary' | 'summary_large_image';
  jsonLd?: JsonLd;
}

const DEFAULT_OG_IMAGE = '/android-chrome-512x512.png';
const SITE_URL = (import.meta.env.VITE_SITE_URL as string | undefined)?.replace(/\/$/, '');
const LOCALHOST_ORIGIN_REGEX = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;

function resolveSiteOrigin(): string {
  if (SITE_URL) {
    return SITE_URL;
  }

  const runtimeOrigin = window.location.origin;
  return LOCALHOST_ORIGIN_REGEX.test(runtimeOrigin) ? '' : runtimeOrigin;
}

function buildAbsoluteUrl(path: string): string {
  const origin = resolveSiteOrigin();
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return origin ? `${origin}${normalizedPath}` : normalizedPath;
}

export function SeoHelmet(config: SeoConfig) {
  const canonicalPath = config.canonicalPath ?? window.location.pathname;
  const canonicalUrl = buildAbsoluteUrl(canonicalPath);
  const ogImage = buildAbsoluteUrl(config.ogImage ?? DEFAULT_OG_IMAGE);
  const robots = config.robots ?? 'index,follow';
  const ogType = config.ogType ?? 'website';
  const twitterCard = config.twitterCard ?? 'summary_large_image';

  return (
    <Helmet prioritizeSeoTags>
      <title>{config.title}</title>
      <meta name="description" content={config.description} />
      <meta name="robots" content={robots} />
      <link rel="canonical" href={canonicalUrl} />

      <meta property="og:type" content={ogType} />
      <meta property="og:title" content={config.title} />
      <meta property="og:description" content={config.description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={ogImage} />

      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:title" content={config.title} />
      <meta name="twitter:description" content={config.description} />
      <meta name="twitter:image" content={ogImage} />

      {config.jsonLd ? (
        <script type="application/ld+json">{JSON.stringify(config.jsonLd)}</script>
      ) : null}
    </Helmet>
  );
}
