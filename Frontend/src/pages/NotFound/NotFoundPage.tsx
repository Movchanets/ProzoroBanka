import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { MetaDescriptor } from 'react-router';

 
export function meta(): MetaDescriptor[] {
  return [
    { title: 'Сторінку не знайдено | ProzoroBanka' },
    {
      name: 'description',
      content: 'Запитану сторінку не знайдено. Перейдіть на головну або відкрийте публічний каталог зборів та організацій.',
    },
    { name: 'robots', content: 'noindex,nofollow' },
  ];
}

export default function NotFoundPage() {
  return (
    <main className="mx-auto flex min-h-[70vh] w-[min(900px,calc(100%-24px))] items-center py-6 sm:w-[min(900px,calc(100%-40px))]">
      <Card className="w-full rounded-[1.75rem] border border-border/80 bg-card/92 shadow-[0_24px_80px_var(--shadow-soft)] backdrop-blur-xl">
        <CardHeader>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">404</p>
          <CardTitle className="text-2xl font-bold text-foreground">Сторінку не знайдено</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            Можливо, посилання застаріло або сторінку було переміщено. Ви можете повернутися на головну і знайти потрібну кампанію
            або організацію через публічний каталог.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild data-testid="notfound-home-link-button">
              <Link to="/">На головну</Link>
            </Button>
            <Button asChild variant="secondary" data-testid="notfound-public-org-example-link-button">
              <Link to="/login">Вхід для волонтера</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
