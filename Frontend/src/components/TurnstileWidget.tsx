import { useEffect, useRef, useCallback, useState } from 'react';
import { useTheme } from 'next-themes';

interface TurnstileWidgetProps {
  siteKey?: string;
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
  theme?: 'light' | 'dark' | 'auto';
  size?: 'normal' | 'compact';
}

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
    onTurnstileLoad?: () => void;
  }
}

/**
 * Компонент Cloudflare Turnstile CAPTCHA.
 */
export function TurnstileWidget({
  siteKey,
  onVerify,
  onExpire,
  onError,
  theme = 'auto',
  size = 'normal',
}: TurnstileWidgetProps) {
  const { resolvedTheme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const callbackRefs = useRef({ onVerify, onExpire, onError });
  const [isLoaded, setIsLoaded] = useState(() => typeof window !== 'undefined' && !!window.turnstile);
  const effectiveTheme = theme === 'auto' ? (resolvedTheme === 'dark' ? 'dark' : 'light') : theme;
  const effectiveSiteKey = siteKey || import.meta.env.VITE_TURNSTILE_SITE_KEY;

  useEffect(() => {
    callbackRefs.current = { onVerify, onExpire, onError };
  }, [onVerify, onExpire, onError]);

  const renderWidget = useCallback(() => {
    if (!containerRef.current || !window.turnstile || widgetIdRef.current) return;

    const key = effectiveSiteKey;
    if (!key) {
      console.warn('Turnstile site key not configured');
      return;
    }

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: key,
      callback: (token: string) => callbackRefs.current.onVerify(token),
      'expired-callback': () => callbackRefs.current.onExpire?.(),
      'error-callback': () => callbackRefs.current.onError?.(),
      theme: effectiveTheme,
      size,
    });
  }, [effectiveSiteKey, effectiveTheme, size]);

  useEffect(() => {
    if (window.turnstile) {
      renderWidget();
      return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[src*="challenges.cloudflare.com/turnstile"]'
    );

    if (existingScript) {
      let cancelled = false;

      const waitForTurnstile = () => {
        if (cancelled) {
          return;
        }

        if (window.turnstile) {
          setIsLoaded(true);
          return;
        }

        window.setTimeout(waitForTurnstile, 100);
      };

      waitForTurnstile();

      return () => {
        cancelled = true;
      };
    }

    const script = document.createElement('script');
    const handleLoad = () => setIsLoaded(true);
    const handleError = () => callbackRefs.current.onError?.();

    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    script.addEventListener('load', handleLoad, { once: true });
    script.addEventListener('error', handleError, { once: true });
    document.head.appendChild(script);

    return () => {
      script.removeEventListener('load', handleLoad);
      script.removeEventListener('error', handleError);
    };
  }, [renderWidget]);

  useEffect(() => {
    if (isLoaded) {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
      renderWidget();
    }
  }, [isLoaded, renderWidget]);

  useEffect(() => {
    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, []);

  return <div ref={containerRef} />;
}
