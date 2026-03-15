import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Receipt } from 'lucide-react';

export default function ReceiptsPlaceholderPage() {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Receipt className="h-6 w-6 text-primary" />
          {t('receipts.title')}
        </h2>
        <p className="text-muted-foreground">{t('receipts.subtitle')}</p>
      </div>

      <Card className="border-dashed border-2 border-border bg-card/40 backdrop-blur-sm">
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <Receipt className="h-10 w-10 text-muted-foreground/40" />
          <CardTitle className="text-lg">{t('common.soon')}</CardTitle>
          <p className="max-w-sm text-sm text-muted-foreground">{t('receipts.comingSoonDesc')}</p>
        </CardContent>
      </Card>
    </div>
  );
}
