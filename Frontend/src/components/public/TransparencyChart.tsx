import { useTranslation } from 'react-i18next';
import type { Transparency } from '@/types';

interface TransparencyChartProps {
  data: Transparency;
}

export function TransparencyChart({ data }: TransparencyChartProps) {
  const { t, i18n } = useTranslation();
  const maxAmount = data.categories.length > 0 ? Math.max(...data.categories.map((c) => c.amount)) : 1;
  const formatter = new Intl.NumberFormat(i18n.language);

  return (
    <section data-testid="public-org-transparency-panel" className="rounded-3xl border border-border bg-card p-5">
      <h3 className="text-lg font-semibold text-foreground">{t('organizations.public.transparency.title')}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{t('organizations.public.transparency.totalSpent')} {formatter.format(data.totalSpent)} {t('common.uah')}</p>

      <div className="mt-4 space-y-3">
        {data.categories.map((category) => {
          const widthPercent = Math.max(8, Math.round((category.amount / maxAmount) * 100));
          return (
            <div key={category.name} className="space-y-1" data-testid={`public-org-transparency-category-${category.name.toLowerCase().replace(/\s+/g, '-')}`}>
              <div className="flex items-center justify-between text-sm">
                <span className="text-foreground">{category.name}</span>
                <span className="text-muted-foreground">{formatter.format(category.amount)} {t('common.uah')} · {Math.round(category.percentage)}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted">
                <div className="h-2 rounded-full bg-secondary" style={{ width: `${widthPercent}%` }} />
              </div>
            </div>
          );
        })}

        {data.categories.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-3 text-sm text-muted-foreground" data-testid="public-org-transparency-empty">
            {t('organizations.public.transparency.empty')}
          </p>
        ) : null}
      </div>

      <div className="mt-5 space-y-2" data-testid="public-org-transparency-monthly-list">
        <h4 className="text-sm font-semibold text-foreground">{t('organizations.public.transparency.monthlyDynamics')}</h4>
        {data.monthlySpendings.map((monthly) => (
          <div
            key={monthly.month}
            className="flex items-center justify-between rounded-xl border border-border/70 bg-muted/20 px-3 py-2 text-sm"
            data-testid={`public-org-transparency-month-${monthly.month}`}
          >
            <span className="text-foreground">{monthly.month}</span>
            <span className="font-medium text-foreground">{formatter.format(monthly.amount)} {t('common.uah')}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
