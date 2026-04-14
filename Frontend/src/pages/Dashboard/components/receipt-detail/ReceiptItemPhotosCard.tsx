import type { ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowDown, ArrowUp, Crop, FileImage, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ReceiptItemOption {
  id: string;
  name: string;
}

interface ItemPhotoAsset {
  id: string;
  previewUrl: string;
  originalFileName: string;
  cropped: boolean;
  source: 'local' | 'server';
  receiptItemId?: string;
}

interface ReceiptItemPhotosCardProps {
  itemPhotos: ItemPhotoAsset[];
  receiptItems: ReceiptItemOption[];
  onItemPhotosSelected: (event: ChangeEvent<HTMLInputElement>) => void;
  onMoveItemPhoto: (index: number, direction: -1 | 1) => void;
  onRecropItemPhoto: (itemId: string) => void;
  onRemoveItemPhoto: (itemId: string) => void;
  onLinkPhotoToItem: (photoId: string, receiptItemId?: string) => void;
}

export function ReceiptItemPhotosCard({
  itemPhotos,
  receiptItems,
  onItemPhotosSelected,
  onMoveItemPhoto,
  onRecropItemPhoto,
  onRemoveItemPhoto,
  onLinkPhotoToItem,
}: ReceiptItemPhotosCardProps) {
  const { t } = useTranslation();

  return (
    <Card className="border border-border bg-card/60 backdrop-blur-sm" data-testid="dashboard-receipts-items-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileImage className="h-5 w-5 text-primary" />
          {t('receipts.detail.itemPhotos.title')}
        </CardTitle>
        <CardDescription>{t('receipts.detail.itemPhotos.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="item-photos">{t('receipts.detail.itemPhotos.inputLabel')}</Label>
          <Input
            id="item-photos"
            type="file"
            accept="image/*"
            multiple
            data-testid="dashboard-receipts-items-files-input"
            onChange={onItemPhotosSelected}
          />
        </div>

        {itemPhotos.length > 0 ? (
          <ul className="space-y-2" data-testid="dashboard-receipts-items-files-list">
            {itemPhotos.map((photo, index) => (
              <li key={photo.id} className="overflow-hidden rounded-2xl border border-border/70 p-3" data-testid={`dashboard-receipts-items-file-${index}`}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-border/60 bg-muted/10 sm:h-20 sm:w-20">
                    <img src={photo.previewUrl} alt={photo.originalFileName} className="h-full w-full object-cover" />
                    <span className="absolute left-1.5 top-1.5 rounded-full bg-background/90 px-1.5 py-0.5 text-[10px] font-semibold">#{index + 1}</span>
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <div>
                      <p className="break-all text-sm font-medium" title={photo.originalFileName}>{photo.originalFileName}</p>
                      <p className="text-xs text-muted-foreground" data-testid={`dashboard-receipts-items-source-${index}`}>
                        {photo.source === 'server'
                          ? t('receipts.detail.itemPhotos.sourceSaved')
                          : photo.cropped
                            ? t('receipts.detail.itemPhotos.sourceCropped')
                            : t('receipts.detail.itemPhotos.sourcePending')}
                      </p>
                    </div>
                    <div className="grid gap-2 sm:flex sm:flex-wrap">
                      <Button type="button" size="sm" variant="outline" className="w-full sm:w-auto" disabled={index === 0} onClick={() => onMoveItemPhoto(index, -1)}>
                        <ArrowUp className="h-4 w-4" />
                        {t('receipts.detail.itemPhotos.moveUp')}
                      </Button>
                      <Button type="button" size="sm" variant="outline" className="w-full sm:w-auto" disabled={index === itemPhotos.length - 1} onClick={() => onMoveItemPhoto(index, 1)}>
                        <ArrowDown className="h-4 w-4" />
                        {t('receipts.detail.itemPhotos.moveDown')}
                      </Button>
                      <Button type="button" size="sm" variant="outline" className="w-full sm:w-auto" onClick={() => onRecropItemPhoto(photo.id)}>
                        <Crop className="h-4 w-4" />
                        {photo.source === 'server' ? t('receipts.detail.itemPhotos.recrop') : t('receipts.detail.itemPhotos.crop')}
                      </Button>
                      <Button type="button" variant="ghost" size="sm" className="w-full sm:w-auto" onClick={() => onRemoveItemPhoto(photo.id)} data-testid={`dashboard-receipts-items-remove-${index}`}>
                        <X className="h-4 w-4" />
                        {t('common.delete')}
                      </Button>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`dashboard-receipts-photo-item-link-${index}`}>{t('receipts.detail.itemPhotos.linkToItem')}</Label>
                      <Select
                        value={photo.receiptItemId ?? 'none'}
                        onValueChange={(value) => {
                          if (photo.source !== 'server') {
                            return;
                          }

                          onLinkPhotoToItem(photo.id, value === 'none' ? undefined : value);
                        }}
                        disabled={photo.source !== 'server' || !receiptItems.length}
                      >
                        <SelectTrigger id={`dashboard-receipts-photo-item-link-${index}`} data-testid={`dashboard-receipts-photo-item-link-${index}`}>
                          <SelectValue placeholder={t('receipts.detail.itemPhotos.notLinked')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">{t('receipts.detail.itemPhotos.notLinked')}</SelectItem>
                          {receiptItems.map((item) => (
                            <SelectItem
                              key={item.id}
                              value={item.id}
                              data-testid={`dashboard-receipts-photo-item-option-${item.id}`}
                            >
                              {item.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p
            className="text-sm text-muted-foreground"
            data-testid="dashboard-receipts-item-photos-empty-hint"
          >
            {t('receipts.detail.itemPhotos.emptyHint')}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
