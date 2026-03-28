import { CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface VerifiedBadgeProps {
  isVerified: boolean;
  testId?: string;
}

export function VerifiedBadge({ isVerified, testId = 'public-org-verified-badge' }: VerifiedBadgeProps) {
  if (!isVerified) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge data-testid={testId} variant="secondary" className="inline-flex items-center gap-1.5 bg-accent/12 text-accent">
            <CheckCircle2 className="size-4" aria-hidden="true" />
            Verified
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>Організація підтверджена платформою</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
