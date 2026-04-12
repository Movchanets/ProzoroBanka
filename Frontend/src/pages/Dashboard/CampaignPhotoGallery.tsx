import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ImageIcon, Loader2, MoreVertical, Plus, Trash2, Edit, ArrowUp, ArrowDown, Star } from 'lucide-react';
import { toast } from 'sonner';

import { useAddCampaignPhoto, useCampaignPhotos, useDeleteCampaignPhoto, useUpdateCampaignPhoto, useReorderCampaignPhotos } from '@/hooks/queries/useCampaigns';
import type { CampaignPhoto } from '@/types';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface CampaignPhotoGalleryProps {
  campaignId: string;
}

export function CampaignPhotoGallery({ campaignId }: CampaignPhotoGalleryProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: photos, isLoading, isError, refetch } = useCampaignPhotos(campaignId);
  const addPhotoMutation = useAddCampaignPhoto(campaignId);
  const deletePhotoMutation = useDeleteCampaignPhoto(campaignId);
  const updatePhotoMutation = useUpdateCampaignPhoto(campaignId);
  const reorderPhotosMutation = useReorderCampaignPhotos(campaignId);

  const [editPhoto, setEditPhoto] = useState<CampaignPhoto | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [deletePhotoId, setDeletePhotoId] = useState<string | null>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      await addPhotoMutation.mutateAsync({ file });
      toast.success(t('campaigns.gallery.uploadSuccess', 'Фото додано'));
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : t('campaigns.gallery.uploadError', 'Не вдалося додати фото');
      toast.error(msg);
    }
  };

  const handleUpdateDescription = async () => {
    if (!editPhoto) return;
    try {
      await updatePhotoMutation.mutateAsync({
        photoId: editPhoto.id,
        payload: { description: editDescription || undefined },
      });
      toast.success(t('campaigns.gallery.updateSuccess', 'Фото оновлено'));
      setEditPhoto(null);
    } catch (error) {
      const msg = error instanceof Error ? error.message : t('campaigns.gallery.updateError', 'Не вдалося оновити фото');
      toast.error(msg);
    }
  };

  const handleSetAsCover = async (photo: CampaignPhoto) => {
    try {
      await updatePhotoMutation.mutateAsync({
        photoId: photo.id,
        payload: {
          description: photo.description ?? undefined,
          setAsCover: true,
        },
      });
      toast.success(t('campaigns.gallery.coverUpdated', 'Основне зображення оновлено'));
    } catch (error) {
      const msg = error instanceof Error ? error.message : t('campaigns.gallery.coverUpdateError', 'Не вдалося оновити основне зображення');
      toast.error(msg);
    }
  };

  const handleDelete = async () => {
    if (!deletePhotoId) return;
    try {
      await deletePhotoMutation.mutateAsync(deletePhotoId);
      toast.success(t('campaigns.gallery.deleteSuccess', 'Фото видалено'));
      setDeletePhotoId(null);
    } catch (error) {
      const msg = error instanceof Error ? error.message : t('campaigns.gallery.deleteError', 'Не вдалося видалити фото');
      toast.error(msg);
    }
  };

  const handleReorder = async (currentIndex: number, direction: 'up' | 'down') => {
    if (!photos) return;
    const newPhotos = [...photos];
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    
    if (newIndex < 0 || newIndex >= newPhotos.length) return;
    
    const temp = newPhotos[currentIndex];
    newPhotos[currentIndex] = newPhotos[newIndex];
    newPhotos[newIndex] = temp;
    
    try {
      await reorderPhotosMutation.mutateAsync({
        photoIds: newPhotos.map(p => p.id)
      });
      toast.success(t('campaigns.gallery.reorderSuccess', 'Порядок змінено'));
    } catch (error) {
      const msg = error instanceof Error ? error.message : t('campaigns.gallery.reorderError', 'Не вдалося змінити порядок');
      toast.error(msg);
    }
  };

  const openEditDialog = (photo: CampaignPhoto) => {
    setEditPhoto(photo);
    setEditDescription(photo.description || '');
  };

  return (
    <Card className="border border-border bg-card/60 backdrop-blur-sm" data-testid="campaign-gallery-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <ImageIcon className="h-5 w-5 text-primary" />
          {t('campaigns.gallery.title', 'Звітні фотографії')}
        </CardTitle>
        <Button
          size="sm"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={addPhotoMutation.isPending}
        >
          {addPhotoMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
          {t('campaigns.gallery.addPhoto', 'Додати фото')}
        </Button>
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*"
          onChange={handleFileChange}
        />
      </CardHeader>
      <CardContent>
        {isError && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription className="space-y-3">
              <span>{t('campaigns.gallery.loadError', 'Не вдалося завантажити фотографії')}</span>
              <Button variant="outline" size="sm" className="w-full" onClick={() => void refetch()}>
                {t('common.refresh')}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="aspect-square w-full rounded-md" />)}
          </div>
        ) : photos?.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/70 p-8 text-center bg-muted/10">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <ImageIcon className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-sm font-semibold">{t('campaigns.gallery.emptyTitle', 'Немає фотографій')}</h3>
            <p className="mt-2 text-xs text-muted-foreground">
              {t('campaigns.gallery.emptyDesc', 'Додайте фотографії чеків або звітів про витрати.')}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {photos?.map((photo, index) => (
              <div key={photo.id} className="group relative aspect-square overflow-hidden rounded-md border bg-muted">
                <img
                  src={photo.photoUrl}
                  alt={photo.description || photo.originalFileName}
                  className="object-cover w-full h-full transition-transform group-hover:scale-105"
                />
                {photo.isCover && (
                  <div className="absolute left-2 top-2 z-10 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-1 text-[10px] font-semibold text-primary-foreground" data-testid={`campaign-gallery-photo-cover-badge-${photo.id}`}>
                    <Star className="h-3 w-3 fill-current" />
                    {t('campaigns.gallery.coverBadge', 'Обкладинка')}
                  </div>
                )}
                
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                  <div className="flex justify-end gap-1">
                    {index > 0 && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 bg-black/20 text-white hover:bg-black/40 hover:text-white" onClick={() => handleReorder(index, 'up')} disabled={reorderPhotosMutation.isPending}>
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                    )}
                    {index < photos.length - 1 && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 bg-black/20 text-white hover:bg-black/40 hover:text-white" onClick={() => handleReorder(index, 'down')} disabled={reorderPhotosMutation.isPending}>
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 bg-black/20 text-white hover:bg-black/40 hover:text-white">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" sideOffset={6} collisionPadding={12}>
                        <DropdownMenuItem onClick={() => void handleSetAsCover(photo)} disabled={photo.isCover || updatePhotoMutation.isPending}>
                          <Star className="mr-2 h-4 w-4" />
                          {t('campaigns.gallery.setAsCover', 'Зробити основним')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEditDialog(photo)}>
                          <Edit className="mr-2 h-4 w-4" />
                          {t('common.edit', 'Редагувати')}
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive focus:bg-destructive/10" onClick={() => setDeletePhotoId(photo.id)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          {t('common.delete', 'Видалити')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  {photo.description && (
                    <div className="bg-black/60 text-white text-xs p-1.5 rounded line-clamp-2">
                      {photo.description}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={!!editPhoto} onOpenChange={(open) => !open && setEditPhoto(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('campaigns.gallery.editTitle', 'Редагувати фото')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="photo-desc">{t('campaigns.gallery.descLabel', 'Опис')}</Label>
              <Input
                id="photo-desc"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPhoto(null)}>{t('common.cancel', 'Скасувати')}</Button>
            <Button onClick={handleUpdateDescription} disabled={updatePhotoMutation.isPending}>
              {updatePhotoMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('common.save', 'Зберегти')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deletePhotoId} onOpenChange={(open) => !open && setDeletePhotoId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('campaigns.gallery.deleteConfirmTitle', 'Видалити фото?')}</DialogTitle>
            <DialogDescription>
              {t('campaigns.gallery.deleteConfirmDesc', 'Ця дія не може бути скасована. Фотографія буде видалена назавжди.')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletePhotoId(null)}>{t('common.cancel', 'Скасувати')}</Button>
            <Button className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDelete} disabled={deletePhotoMutation.isPending}>
              {deletePhotoMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('common.delete', 'Видалити')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
