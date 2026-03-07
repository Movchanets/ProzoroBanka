import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
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
    <div className="auth-layout">
      <section className="auth-hero">
        <div className="auth-hero__badge">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{note}</p>

        <div className="auth-hero__meta-row">
          {supportFacts.map((item) => (
            <div key={item} className="auth-hero__meta-chip">
              <CheckCircle2 aria-hidden="true" />
              <span>{item}</span>
            </div>
          ))}
        </div>

        <Card className="auth-hero__panel auth-hero__panel-card">
          <CardContent className="auth-hero__panel-content">
            <span className="auth-hero__panel-title">Що ви зможете зробити</span>
            <ul className="auth-hero__list">
              {featureItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>

      <Card className="auth-card">
        <CardContent className="auth-card__content">
        {children}

        <p className="auth-card__switch">
          {alternateLabel}{' '}
          <Link to={alternateHref}>
            {alternateAction}
            <ArrowRight aria-hidden="true" />
          </Link>
        </p>
        </CardContent>
      </Card>
    </div>
  );
}