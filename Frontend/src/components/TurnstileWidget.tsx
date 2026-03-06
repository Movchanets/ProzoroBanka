import { useEffect, useRef, useCallback, useState } from 'react';

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
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(!!window.turnstile);

  const renderWidget = useCallback(() => {
    if (!containerRef.current || !window.turnstile || widgetIdRef.current) return;

    const key = siteKey || import.meta.env.VITE_TURNSTILE_SITE_KEY;
    if (!key) {
      console.warn('Turnstile site key not configured');
      return;
    }

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: key,
      callback: onVerify,
      'expired-callback': onExpire,
      'error-callback': onError,
      theme,
      size,
    });
  }, [siteKey, onVerify, onExpire, onError, theme, size]);

  useEffect(() => {
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

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [renderWidget]);

  useEffect(() => {
    if (isLoaded) {
      renderWidget();
    }
  }, [isLoaded, renderWidget]);

  return <div ref={containerRef} />;
}
