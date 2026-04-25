import { CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface VerifiedBadgeProps {
  isVerified: boolean;
  testId?: string;
}

export function VerifiedBadge({ isVerified, testId = 'public-org-verified-badge' }: VerifiedBadgeProps) {
  const { t } = useTranslation();
  if (!isVerified) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge data-testid={testId} variant="secondary" className="inline-flex cursor-default items-center gap-1.5 border-emerald-500/20 bg-emerald-500/15 text-emerald-600 transition-colors duration-300 hover:bg-emerald-500/25">
            <CheckCircle2 className="size-4" aria-hidden="true" />
            {t('common.verified')}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{t('common.verifiedHint')}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
