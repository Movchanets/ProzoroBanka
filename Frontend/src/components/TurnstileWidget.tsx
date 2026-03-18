import { useEffect, useRef, useCallback, useState } from 'react';
import { useTheme } from 'next-themes';

const TEST_TURNSTILE_SITE_KEY = '1x00000000000000000000AA';
const TEST_TURNSTILE_TOKEN = 'playwright-test-turnstile-token';

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
  const [isLoaded, setIsLoaded] = useState(!!window.turnstile);
  const effectiveTheme = theme === 'auto' ? (resolvedTheme === 'dark' ? 'dark' : 'light') : theme;
  const effectiveSiteKey = siteKey || import.meta.env.VITE_TURNSTILE_SITE_KEY;
  const isTestTurnstile = effectiveSiteKey === TEST_TURNSTILE_SITE_KEY;
  const token = isTestTurnstile ? TEST_TURNSTILE_TOKEN : '';

  useEffect(() => {
    callbackRefs.current = { onVerify, onExpire, onError };
  }, [onVerify, onExpire, onError]);

  useEffect(() => {
    if (!isTestTurnstile) {
      return;
    }

    callbackRefs.current.onVerify(TEST_TURNSTILE_TOKEN);
  }, [isTestTurnstile]);

  const renderWidget = useCallback(() => {
    if (isTestTurnstile) {
      return;
    }

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
  }, [effectiveSiteKey, effectiveTheme, isTestTurnstile, size]);

  useEffect(() => {
    if (isTestTurnstile) {
      return;
    }

    if (window.turnstile) {
      renderWidget();
      return;
    }

    // Динамічне завантаження скрипта Turnstile
    const existingScript = document.querySelector(
      'script[src*="challenges.cloudflare.com/turnstile"]'
    );

    if (!existingScript) {
      window.onTurnstileLoad = () => {
        setIsLoaded(true);
      };

      const script = document.createElement('script');
      script.src =
        'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

  }, [isTestTurnstile, renderWidget]);

  useEffect(() => {
    if (isTestTurnstile) {
      return;
    }

    if (isLoaded) {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
      renderWidget();
    }
  }, [isLoaded, isTestTurnstile, renderWidget]);

  useEffect(() => {
    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, []);

  return (
    <>
      {isTestTurnstile && (
        <input type="hidden" name="cf-turnstile-response" value={token} readOnly aria-hidden="true" />
      )}
      <div ref={containerRef} />
    </>
  );
}
