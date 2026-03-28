import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface CampaignTabFilterProps {
  value: 'all' | 'active' | 'completed';
  onChange: (value: 'all' | 'active' | 'completed') => void;
}

export function CampaignTabFilter({ value, onChange }: CampaignTabFilterProps) {
  return (
    <Tabs data-testid="public-org-campaign-tabs" value={value} onValueChange={(next) => onChange(next as 'all' | 'active' | 'completed')}>
      <TabsList>
        <TabsTrigger value="all" data-testid="public-org-campaign-tab-all">Усі</TabsTrigger>
        <TabsTrigger value="active" data-testid="public-org-campaign-tab-active">Активні</TabsTrigger>
        <TabsTrigger value="completed" data-testid="public-org-campaign-tab-completed">Завершені</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
