import { Progress } from '@/components/ui/progress';

interface CampaignProgressBarProps {
  currentAmount: number;
  goalAmount: number;
  documentedAmount?: number;
  documentationPercent?: number;
  testId?: string;
}

export function CampaignProgressBar({
  currentAmount,
  goalAmount,
  documentedAmount = 0,
  documentationPercent,
  testId = 'public-campaign-progress-panel',
}: CampaignProgressBarProps) {
  const raisedProgress = goalAmount <= 0 ? 0 : Math.min(100, (currentAmount / goalAmount) * 100);
  const boundedDocumentedAmount = Math.min(Math.max(documentedAmount, 0), Math.max(currentAmount, 0));
  const documentedProgress = goalAmount <= 0
    ? 0
    : Math.min(100, (boundedDocumentedAmount / goalAmount) * 100);
  const documentedShare = documentationPercent !== undefined
    ? Math.min(100, Math.max(0, documentationPercent))
    : (currentAmount <= 0 ? 0 : Math.min(100, (boundedDocumentedAmount / currentAmount) * 100));
  const formatter = new Intl.NumberFormat('uk-UA');

  return (
    <div data-testid={testId} className="group space-y-4 rounded-3xl border border-border/80 bg-card p-6 shadow-sm transition-all duration-300 hover:shadow-md">
      <div className="space-y-2">
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Зібрано</span>
            <span data-testid={`${testId}-raised-percent`}>{Math.round(raisedProgress)}%</span>
          </div>
          <Progress value={raisedProgress} className="h-3 [&>div]:duration-1000 [&>div]:ease-out group-hover:[&>div]:opacity-90" data-testid={`${testId}-raised-progress`} />
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Задокументовано</span>
            <span data-testid={`${testId}-documented-percent`}>{Math.round(documentedProgress)}%</span>
          </div>
          <Progress value={documentedProgress} className="h-3 [&>div]:bg-secondary [&>div]:duration-1000 [&>div]:ease-out group-hover:[&>div]:opacity-90" data-testid={`${testId}-documented-progress`} />
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="font-semibold text-foreground">{formatter.format(currentAmount)} грн</span>
        <span className="text-muted-foreground">ціль: {formatter.format(goalAmount)} грн</span>
      </div>
      <p className="text-sm font-medium text-foreground" data-testid={`${testId}-documented-amount`}>
        Задокументовано: {formatter.format(boundedDocumentedAmount)} грн
      </p>
      <p className="text-xs text-muted-foreground" data-testid={`${testId}-documented-share`}>
        Документовано {Math.round(documentedShare)}% від зібраного
      </p>
    </div>
  );
}
