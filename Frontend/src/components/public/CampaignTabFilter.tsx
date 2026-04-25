import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslation } from 'react-i18next';

interface CampaignTabFilterProps {
  value: 'all' | 'active' | 'completed';
  onChange: (value: 'all' | 'active' | 'completed') => void;
}

export function CampaignTabFilter({ value, onChange }: CampaignTabFilterProps) {
  const { t } = useTranslation();

  return (
    <Tabs data-testid="public-org-campaign-tabs" value={value} onValueChange={(next) => onChange(next as 'all' | 'active' | 'completed')}>
      <TabsList>
        <TabsTrigger value="all" data-testid="public-org-campaign-tab-all">
          {t('home.filters.status.all')}
        </TabsTrigger>
        <TabsTrigger value="active" data-testid="public-org-campaign-tab-active">
          {t('home.filters.status.active')}
        </TabsTrigger>
        <TabsTrigger value="completed" data-testid="public-org-campaign-tab-completed">
          {t('home.filters.status.completed')}
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
