import { useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import ReactCrop, { centerCrop, makeAspectCrop, type Crop, type PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Crop as CropIcon } from 'lucide-react';

interface ImageCropDialogProps {
  open: boolean; onOpenChange: (open: boolean) => void; imageSrc: string;
  onCropComplete: (croppedBlob: Blob) => void; isPending?: boolean; aspectRatio?: number;
  title?: string; description?: string;
}

function centerAspectCrop(mediaWidth: number, mediaHeight: number, aspect: number): Crop {
  return centerCrop(makeAspectCrop({ unit: '%', width: 80 }, aspect, mediaWidth, mediaHeight), mediaWidth, mediaHeight);
}

async function getCroppedBlob(image: HTMLImageElement, crop: PixelCrop, mimeType = 'image/webp'): Promise<Blob> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context not available');
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  const pixelRatio = window.devicePixelRatio || 1;
  canvas.width = Math.floor(crop.width * scaleX * pixelRatio);
  canvas.height = Math.floor(crop.height * scaleY * pixelRatio);
  ctx.scale(pixelRatio, pixelRatio);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, crop.x * scaleX, crop.y * scaleY, crop.width * scaleX, crop.height * scaleY, 0, 0, crop.width * scaleX, crop.height * scaleY);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => { if (blob) resolve(blob); else reject(new Error('Canvas empty')); }, mimeType, 0.9);
  });
}

export function ImageCropDialog({ open, onOpenChange, imageSrc, onCropComplete, isPending = false, aspectRatio = 1, title, description }: ImageCropDialogProps) {
  const { t } = useTranslation();
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    setCrop(centerAspectCrop(width, height, aspectRatio));
  }, [aspectRatio]);

  const handleConfirm = async () => {
    if (!imgRef.current || !completedCrop) return;
    try { const blob = await getCroppedBlob(imgRef.current, completedCrop); onCropComplete(blob); } catch { /* parent handles errors */ }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="mx-auto mb-2 grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary"><CropIcon className="h-5 w-5" /></div>
          <DialogTitle className="text-center">{title ?? t('imageCrop.defaultTitle')}</DialogTitle>
          <DialogDescription className="text-center">{description ?? t('imageCrop.defaultDescription')}</DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-center overflow-hidden rounded-xl bg-muted/30 p-2">
          <ReactCrop crop={crop} onChange={(c) => setCrop(c)} onComplete={(c) => setCompletedCrop(c)} aspect={aspectRatio} circularCrop={aspectRatio === 1} className="max-h-[60vh]">
            <img ref={imgRef} src={imageSrc} alt="Crop preview" onLoad={onImageLoad} className="max-h-[60vh] object-contain" crossOrigin="anonymous" />
          </ReactCrop>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>{t('common.cancel')}</Button>
          <Button type="button" onClick={handleConfirm} disabled={isPending || !completedCrop}>
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
