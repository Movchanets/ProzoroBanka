import { Link, useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PublicPageToolbar } from '@/components/public/PublicPageToolbar';

export default function PublicReceiptPlaceholderPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  return (
    <main className="mx-auto flex w-[min(900px,calc(100%-24px))] flex-col gap-6 py-8 sm:w-[min(900px,calc(100%-40px))]">
      <PublicPageToolbar compact />

      <Card data-testid="public-receipt-placeholder-page" className="overflow-hidden rounded-4xl border border-border/80">
        <CardHeader className="space-y-3 bg-[linear-gradient(135deg,hsl(var(--hero-panel)/0.22),transparent_70%)]">
          <Badge variant="outline" className="w-fit">Скоро</Badge>
          <CardTitle className="text-2xl">Детальна сторінка чека в роботі</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-5">
          <p className="text-sm text-muted-foreground">
            Переходи з публічних зборів уже підготовлені, а розширений перегляд чека з OCR-даними та перевіркою
            транзакцій буде додано в найближчому релізі.
          </p>
          <p data-testid="public-receipt-placeholder-id" className="rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm">
            ID чека: {id}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild data-testid="public-receipt-placeholder-home-link">
              <Link to="/">На головну</Link>
            </Button>
            <Button variant="outline" data-testid="public-receipt-placeholder-back-link" onClick={() => navigate(-1)}>
              Назад
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
