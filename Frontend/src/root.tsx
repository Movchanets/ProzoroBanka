import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./services/queryClient";
import { Toaster } from "./components/ui/sonner";
import { ThemeProvider } from "./components/theme-provider";
import { AppLoadingFallback } from "./components/AppLoadingFallback";
import "./i18n";

import "./index.css";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uk" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body
        className="min-h-screen bg-background font-sans antialiased"
        suppressHydrationWarning
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
          storageKey="prozoro-banka-theme"
        >
          <QueryClientProvider client={queryClient}>
            {children}
            <Toaster />
          </QueryClientProvider>
        </ThemeProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function HydrateFallback() {
  return <AppLoadingFallback />;
}

export function ErrorBoundary({ error }: { error: unknown }) {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-destructive">App Error</h1>
      <pre className="mt-4 rounded bg-muted p-4 overflow-auto">
        {error instanceof Error ? error.message : String(error)}
      </pre>
    </div>
  );
}
