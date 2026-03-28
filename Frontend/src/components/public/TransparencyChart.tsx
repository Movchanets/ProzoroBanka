import type { Transparency } from '@/types';

interface TransparencyChartProps {
  data: Transparency;
}

export function TransparencyChart({ data }: TransparencyChartProps) {
  const maxAmount = data.categories.length > 0 ? Math.max(...data.categories.map((c) => c.amount)) : 1;

  return (
    <section data-testid="public-org-transparency-panel" className="rounded-3xl border border-border bg-card p-5">
      <h3 className="text-lg font-semibold text-foreground">Прозорість витрат</h3>
      <p className="mt-1 text-sm text-muted-foreground">Всього підтверджено: {new Intl.NumberFormat('uk-UA').format(data.totalSpent)} грн</p>

      <div className="mt-4 space-y-3">
        {data.categories.map((category) => {
          const widthPercent = Math.max(8, Math.round((category.amount / maxAmount) * 100));
          return (
            <div key={category.name} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-foreground">{category.name}</span>
                <span className="text-muted-foreground">{new Intl.NumberFormat('uk-UA').format(category.amount)} грн · {Math.round(category.percentage)}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted">
                <div className="h-2 rounded-full bg-secondary" style={{ width: `${widthPercent}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
