import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Upload, X } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { TiptapPostEditor } from '@/components/campaigns/TiptapPostEditor';
import { PhotoGalleryDialog, type PhotoGalleryItem } from '@/components/ui/photo-gallery-dialog';

type CampaignPostComposerProps = {
  isSubmitting: boolean;
  onSubmit: (payload: { postContentJson?: string; images: File[] }) => Promise<void>;
};

export function CampaignPostComposer({ isSubmitting, onSubmit }: CampaignPostComposerProps) {
  const { t } = useTranslation();
  const [postContentJson, setPostContentJson] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [isPreviewGalleryOpen, setIsPreviewGalleryOpen] = useState(false);
  const [previewGalleryIndex, setPreviewGalleryIndex] = useState(0);

  const previewUrls = useMemo(
    () => images.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [images],
  );
  const previewGalleryImages: PhotoGalleryItem[] = useMemo(
    () => previewUrls.map(({ file, url }) => ({ src: url, alt: file.name, caption: file.name })),
    [previewUrls],
  );

  useEffect(() => {
    return () => {
      previewUrls.forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, [previewUrls]);

  const handleAddFiles = (fileList: FileList | null) => {
    if (!fileList) {
      return;
    }

    const selected = Array.from(fileList).filter((file) => file.type.startsWith('image/'));
    setImages((prev) => [...prev, ...selected].slice(0, 10));
  };

  const handleRemoveImage = (target: File) => {
    setImages((prev) => prev.filter((file) => file !== target));
  };

  const handleSubmit = async () => {
    await onSubmit({
      postContentJson: postContentJson.trim() || undefined,
      images,
    });
    setPostContentJson('');
    setImages([]);
  };

  const isDisabled = isSubmitting || (postContentJson.trim().length === 0 && images.length === 0);
  const remainingImages = Math.max(0, 10 - images.length);

  return (
    <div className="space-y-3 rounded-2xl border border-border/80 bg-card/70 p-4 shadow-[0_10px_24px_var(--shadow-soft)]" data-testid="campaign-post-composer">
      <div className="space-y-2">
        <Label>{t('campaigns.posts.descriptionLabel', 'Текст поста')}</Label>
        <TiptapPostEditor
          value={postContentJson}
          onChange={setPostContentJson}
          placeholder={t('campaigns.posts.editor.placeholder', 'Додайте новину по збору або короткий звіт')}
          testId="campaign-post-editor"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="campaign-post-images">{t('campaigns.posts.imagesLabel', 'Зображення поста')}</Label>
        <Input
          id="campaign-post-images"
          type="file"
          accept="image/*"
          multiple
          onChange={(event) => handleAddFiles(event.target.files)}
          data-testid="campaign-post-images-input"
        />
        <p className="text-xs text-muted-foreground" data-testid="campaign-post-images-limit-hint">
          {t('campaigns.posts.imagesLimitHint', 'До 10 зображень, поле не є обов\'язковим')}
        </p>
        <div className="flex items-center justify-between text-xs text-muted-foreground" data-testid="campaign-post-images-meta">
          <span>{t('campaigns.posts.imagesCount', { count: images.length })}</span>
          <span>{t('campaigns.posts.imagesRemaining', { count: remainingImages })}</span>
        </div>
      </div>

      {previewUrls.length > 0 ? (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" data-testid="campaign-post-images-preview-grid">
          {previewUrls.map(({ file, url }, index) => (
            <div key={`${file.name}-${index}`} className="relative overflow-hidden rounded-lg border border-border/70 bg-muted/20">
              <button
                type="button"
                className="block h-full w-full cursor-pointer"
                onClick={() => {
                  setPreviewGalleryIndex(index);
                  setIsPreviewGalleryOpen(true);
                }}
                aria-label={t('campaigns.posts.openPreviewImage', 'Відкрити зображення прев\'ю')}
                data-testid={`campaign-post-preview-open-${index}`}
              >
                <img src={url} alt={file.name} className="h-24 w-full object-cover" />
              </button>
              <button
                type="button"
                className="absolute right-1 top-1 rounded-md bg-background/90 p-1"
                onClick={() => handleRemoveImage(file)}
                aria-label={t('campaigns.posts.removeImage', 'Видалити зображення')}
                data-testid={`campaign-post-image-remove-${index}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setImages([])}
            data-testid="campaign-post-clear-images-button"
          >
            {t('campaigns.posts.clearImages', 'Очистити зображення')}
          </Button>
        </div>
      ) : null}

      <Button
        type="button"
        onClick={() => void handleSubmit()}
        disabled={isDisabled}
        data-testid="campaign-post-submit-button"
      >
        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        {t('campaigns.posts.submit', 'Опублікувати пост')}
      </Button>

      <PhotoGalleryDialog
        images={previewGalleryImages}
        open={isPreviewGalleryOpen}
        onOpenChange={setIsPreviewGalleryOpen}
        currentIndex={previewGalleryIndex}
        onIndexChange={setPreviewGalleryIndex}
        title={t('campaigns.posts.previewGalleryTitle', 'Прев\'ю зображень поста')}
        description={t('campaigns.posts.previewGalleryDescription', 'Галерея зображень перед публікацією поста')}
        testIdPrefix="campaign-post-composer-gallery"
      />
    </div>
  );
}
