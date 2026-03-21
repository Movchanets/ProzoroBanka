import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCampaign } from '@/hooks/queries/useCampaigns';
import { CampaignStatusLabel } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Calendar, Edit2, Megaphone, ReceiptText, Globe } from 'lucide-react';
import { SelectReceiptDialog } from './SelectReceiptDialog';
import { toast } from 'sonner';

const statusColor: Record<number, string> = {
  0: 'bg-muted text-muted-foreground',
  1: 'bg-success/15 text-success',
  2: 'bg-primary/15 text-primary',
  3: 'bg-secondary/15 text-secondary',
};

export default function CampaignDetailPage() {
  const { t } = useTranslation();
  const { orgId, campaignId } = useParams<{ orgId: string; campaignId: string }>();
  const navigate = useNavigate();
  const { data: campaign, isLoading } = useCampaign(campaignId);

  // Mock state for receipts since backend is not there yet (Phase 3 requirements)
  interface MockAttachedReceipt {
    id: string;
    isPublished: boolean;
    merchantName: string;
    totalAmount: number;
    date: string;
  }
  const [attachedReceipts, setAttachedReceipts] = useState<MockAttachedReceipt[]>([]);
  const [isReceiptDialogOpen, setIsReceiptDialogOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6" data-testid="campaign-detail-loading">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[300px] w-full rounded-2xl" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="mx-auto max-w-4xl space-y-6" data-testid="campaign-detail-not-found-page">
        <Button variant="ghost" onClick={() => navigate(`/dashboard/${orgId}/campaigns`)} data-testid="campaign-detail-back-button">
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('common.back')}
        </Button>
        <div className="text-center py-12 text-muted-foreground" data-testid="campaign-detail-not-found-text">
          {t('campaigns.notFound', 'Збір не знайдено')}
        </div>
      </div>
    );
  }

  const progress = campaign.goalAmount > 0
    ? Math.min(100, Math.round((campaign.currentAmount / campaign.goalAmount) * 100))
    : 0;
  const raised = new Intl.NumberFormat('uk-UA').format(campaign.currentAmount / 100);
  const goal = new Intl.NumberFormat('uk-UA').format(campaign.goalAmount / 100);

  const handleAttachReceipt = (receiptId: string) => {
    // Add mock receipt to attached list
    setAttachedReceipts(prev => [...prev, { id: receiptId, isPublished: false, merchantName: 'Attached Receipt', totalAmount: 125000, date: new Date().toISOString() }]);
    setIsReceiptDialogOpen(false);
    toast.success('Чек прикріплено (чорнетка)');
  };

  const currentCount = typeof campaign.receiptCount === 'number' 
    ? campaign.receiptCount + attachedReceipts.length 
    : attachedReceipts.length;

  return (
    <div className="mx-auto max-w-4xl space-y-6" data-testid="campaign-detail-page">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/dashboard/${orgId}/campaigns`)} data-testid="campaign-detail-back-button">
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('common.back')}
        </Button>
        <Button variant="outline" size="sm" onClick={() => navigate(`/dashboard/${orgId}/campaigns/${campaignId}/edit`)} data-testid="campaign-detail-edit-button">
          <Edit2 className="h-4 w-4 mr-2" />
          {t('common.edit')}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Details */}
        <div className="md:col-span-2 space-y-6">
          <Card className="border border-border bg-card/60 backdrop-blur-sm overflow-hidden">
            {campaign.coverImageUrl && (
              <div className="relative h-64 w-full bg-muted">
                <img 
                  src={campaign.coverImageUrl} 
                  alt={campaign.title} 
                  className="h-full w-full object-cover" 
                />
              </div>
            )}
            <CardHeader className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <CardTitle className="text-2xl font-bold break-all" data-testid="campaign-detail-title">{campaign.title}</CardTitle>
                <Badge className={statusColor[campaign.status]} data-testid="campaign-detail-status-badge">{t(CampaignStatusLabel[campaign.status])}</Badge>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground" data-testid="campaign-detail-amounts">{raised} ₴ <span className="text-muted-foreground/60">/ {goal} ₴</span></span>
                  <span className="font-semibold text-primary" data-testid="campaign-detail-progress-text">{progress}%</span>
                </div>
                <Progress value={progress} className="h-3" data-testid="campaign-detail-progress-bar" />
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {campaign.description && (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  {campaign.description.split('\n').map((paragraph, i) => (
                    <p key={i}>{paragraph}</p>
                  ))}
                </div>
              )}
              
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground border-t border-border/50 pt-4">
                <div className="flex items-center gap-1.5 break-all" data-testid="campaign-detail-short-id">
                  <Megaphone className="h-4 w-4 min-w-[16px]" />
                  ID-збору: {campaign.id.substring(0, 8)}
                </div>
                {campaign.deadline && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    {t('campaigns.deadlinePrefix')} {new Date(campaign.deadline).toLocaleDateString('uk-UA')}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar / Receipts */}
        <div className="space-y-6">
          <Card className="border border-border bg-card/60 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between" data-testid="campaign-detail-receipts-title">
                <div className="flex items-center gap-2">
                  <ReceiptText className="h-5 w-5 text-primary" />
                  Чеки
                </div>
                <Badge variant="secondary" data-testid="campaign-detail-receipts-count">{currentCount}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {attachedReceipts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <div className="rounded-full bg-muted p-3 mb-3">
                    <ReceiptText className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground max-w-[200px]">
                    До цього збору ще не додано жодного чеку
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {attachedReceipts.map((r, i) => (
                    <div key={i} className="flex justify-between items-center bg-muted/30 p-3 rounded-lg border text-sm">
                      <div>
                        <p className="font-medium truncate max-w-[120px]">{r.merchantName}</p>
                        <p className="text-xs text-muted-foreground">{new Intl.NumberFormat('uk-UA').format(r.totalAmount/100)} ₴</p>
                      </div>
                      {r.isPublished ? (
                        <Globe className="h-4 w-4 text-success" />
                      ) : (
                        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => {
                          setAttachedReceipts(prev => prev.map(pr => pr.id === r.id ? { ...pr, isPublished: true } : pr));
                          toast.success('Чек опубліковано!');
                        }}>Публікувати</Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <Button size="sm" className="w-full" onClick={() => setIsReceiptDialogOpen(true)} data-testid="campaign-detail-attach-receipt-button">
                + Прикріпити чек
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <SelectReceiptDialog
        open={isReceiptDialogOpen}
        onOpenChange={setIsReceiptDialogOpen}
        organizationId={orgId!}
        onAttach={handleAttachReceipt}
      />
    </div>
  );
}
