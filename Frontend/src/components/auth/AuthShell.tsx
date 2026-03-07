import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';

interface AuthShellProps {
  eyebrow: string;
  title: string;
  note: string;
  alternateLabel: string;
  alternateHref: string;
  alternateAction: string;
  children: ReactNode;
}

const featureItems = [
  'Один акаунт для входу, профілю та подальшої звітності.',
  'Прості форми без зайвих кроків і з підказками українською.',
  'Швидке відновлення доступу, якщо пароль загубився.',
];

const supportFacts = [
  'Адаптується під системну тему автоматично.',
  'Працює без зайвих переходів між сторінками.',
];

export function AuthShell({
  eyebrow,
  title,
  note,
  alternateLabel,
  alternateHref,
  alternateAction,
  children,
}: AuthShellProps) {
  return (
    <div className="mx-auto grid min-h-screen w-[min(1180px,calc(100%-32px))] grid-cols-1 items-center gap-6 py-8 max-sm:w-[min(1180px,calc(100%-20px))] lg:grid-cols-[minmax(0,1.1fr)_minmax(340px,470px)]">
      <section className="relative overflow-hidden rounded-[2.25rem] border border-border [background:var(--hero-surface)] p-10 shadow-[0_24px_80px_var(--shadow-soft)] backdrop-blur-xl max-sm:rounded-3xl max-sm:p-6">
        <div className="pointer-events-none absolute -bottom-20 -right-10 h-72 w-72 rounded-full bg-primary/15 blur-3xl" />

        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full bg-card/70 px-3.5 py-2 text-[0.82rem] font-extrabold uppercase tracking-[0.08em] text-primary">
            {eyebrow}
          </div>
          <h1 className="mt-4.5 max-w-[10ch] text-balance text-[clamp(2.8rem,6vw,5rem)] font-semibold leading-none tracking-tight">
            {title}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">{note}</p>

          <div className="mt-6 flex flex-wrap gap-3">
          {supportFacts.map((item) => (
            <div
              key={item}
              className="inline-flex items-center gap-2.5 rounded-full border border-border bg-card/80 px-3.5 py-2.5 text-sm text-foreground backdrop-blur-md"
            >
              <CheckCircle2 aria-hidden="true" className="h-4 w-4 text-accent" />
              <span>{item}</span>
            </div>
          ))}
          </div>

          <Card className="mt-7 overflow-hidden rounded-[1.75rem] border border-white/10 [background:var(--hero-panel)] text-(--hero-panel-foreground) shadow-none">
            <CardContent className="space-y-4 p-6 pt-6">
              <span className="font-mono text-xs uppercase tracking-[0.18em] text-(--hero-panel-muted)">
                Що ви зможете зробити
              </span>
              <ul className="grid gap-3 text-sm font-medium leading-6 text-(--hero-panel-foreground)">
              {featureItems.map((item) => (
                <li key={item} className="relative pl-5 before:absolute before:left-0 before:top-2.5 before:h-2 before:w-2 before:rounded-full before:bg-(--hero-dot) before:content-['']">
                  {item}
                </li>
              ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      <Card className="relative overflow-hidden rounded-[1.875rem] border border-border bg-card/80 shadow-[0_24px_80px_var(--shadow-soft)] backdrop-blur-xl max-sm:rounded-3xl">
        <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-card/80 via-transparent to-transparent" />
        <CardContent className="relative space-y-6 p-8 pt-8 max-sm:p-6 max-sm:pt-6">
          {children}

          <p className="text-sm leading-6 text-muted-foreground">
            {alternateLabel}{' '}
            <Link
              to={alternateHref}
              className={cn(
                'inline-flex items-center gap-2 font-bold text-accent transition-colors hover:text-accent/80',
              )}
            >
              {alternateAction}
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}