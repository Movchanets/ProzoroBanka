import { Suspense, lazy } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider, type AnyRouter } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { queryClient } from './services/queryClient'
import { Toaster } from './components/ui/sonner'

const ReactQueryDevtools = import.meta.env.DEV
  ? lazy(() => import('@tanstack/react-query-devtools').then((module) => ({ default: module.ReactQueryDevtools })))
  : null

function RouteFallback() {
  const { t } = useTranslation()

  return (
    <div className="mx-auto flex min-h-screen w-[min(1180px,calc(100%-32px))] items-center justify-center py-8 max-sm:w-[min(1180px,calc(100%-20px))]">
      <div className="rounded-4xl border border-border bg-card/80 px-6 py-4 text-sm font-semibold text-muted-foreground shadow-[0_24px_80px_var(--shadow-soft)] backdrop-blur-xl">
        {t('common.loadingInterface')}
      </div>
    </div>
  )
}

type AppProps = {
  router: AnyRouter
}

function App({ router }: AppProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={<RouteFallback />}>
        <RouterProvider router={router} />
      </Suspense>
      <Toaster />
      {ReactQueryDevtools ? (
        <Suspense fallback={null}>
          <ReactQueryDevtools initialIsOpen={false} />
        </Suspense>
      ) : null}
    </QueryClientProvider>
  )
}

export default App
