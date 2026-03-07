import type { ReactNode } from 'react';
import { ThemeProvider as NextThemesProvider, type ThemeProviderProps } from 'next-themes';

interface AppThemeProviderProps extends ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children, ...props }: AppThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}