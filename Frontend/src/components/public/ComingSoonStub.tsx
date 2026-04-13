import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ComingSoonStubProps {
  title: string;
  description: string;
  testId: string;
}

export function ComingSoonStub({ title, description, testId }: ComingSoonStubProps) {
  return (
    <Card data-testid={testId} className="border-dashed border-border/80 bg-card/72 shadow-[0_12px_30px_var(--shadow-soft)]">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">{title}</CardTitle>
          <Badge variant="outline">Скоро</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
