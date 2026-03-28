import { Progress } from '@/components/ui/progress';

interface CampaignProgressBarProps {
  currentAmount: number;
  goalAmount: number;
  testId?: string;
}

export function CampaignProgressBar({ currentAmount, goalAmount, testId = 'public-campaign-progress-panel' }: CampaignProgressBarProps) {
  const progress = goalAmount <= 0 ? 0 : Math.min(100, (currentAmount / goalAmount) * 100);
  const formatter = new Intl.NumberFormat('uk-UA');

  return (
    <div data-testid={testId} className="space-y-3 rounded-3xl border border-border bg-card p-5">
      <Progress value={progress} className="h-3" />
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="font-semibold text-foreground">{formatter.format(currentAmount)} грн</span>
        <span className="text-muted-foreground">ціль: {formatter.format(goalAmount)} грн</span>
      </div>
      <p className="text-sm font-medium text-foreground">{Math.round(progress)}% зібрано</p>
    </div>
  );
}
