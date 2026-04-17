import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createRouter } from '@tanstack/react-router'
import './index.css'
import './i18n'
import App from './App.tsx'
import { ThemeProvider } from '@/components/theme-provider'
import { HelmetProvider } from 'react-helmet-async'
import { routeTree } from './routeTree'

const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange storageKey="prozoro-banka-theme">
        <App router={router} />
      </ThemeProvider>
    </HelmetProvider>
  </StrictMode>,
)
