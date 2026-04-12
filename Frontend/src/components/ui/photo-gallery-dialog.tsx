import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export interface PhotoGalleryItem {
  src: string;
  alt: string;
  caption?: string;
}

interface PhotoGalleryDialogProps {
  images: PhotoGalleryItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentIndex: number;
  onIndexChange: (nextIndex: number) => void;
  title: string;
  description?: string;
  testIdPrefix: string;
}

export function PhotoGalleryDialog({
  images,
  open,
  onOpenChange,
  currentIndex,
  onIndexChange,
  title,
  description,
  testIdPrefix,
}: PhotoGalleryDialogProps) {
  if (images.length === 0) {
    return null;
  }

  const safeIndex = Math.min(Math.max(currentIndex, 0), images.length - 1);
  const active = images[safeIndex];
  const canNavigate = images.length > 1;

  const handlePrev = () => {
    if (!canNavigate) return;
    onIndexChange((safeIndex - 1 + images.length) % images.length);
  };

  const handleNext = () => {
    if (!canNavigate) return;
    onIndexChange((safeIndex + 1) % images.length);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl border-border/80 bg-card/96 p-4 sm:p-6" data-testid={`${testIdPrefix}-dialog`}>
        <DialogHeader>
          <DialogTitle className="text-lg">{title}</DialogTitle>
          <DialogDescription>{description || 'Перегляд фото'}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="group/gallery relative overflow-hidden rounded-2xl border border-border/80 bg-muted/20" data-testid={`${testIdPrefix}-image-wrap`}>
            <img
              src={active.src}
              alt={active.alt}
              className="max-h-[58vh] w-full object-contain"
              data-testid={`${testIdPrefix}-image`}
            />

            {canNavigate ? (
              <>
                <button
                  type="button"
                  className="absolute left-4 top-1/2 z-10 h-9 w-9 -translate-y-1/2 rounded-full border border-border/70 bg-background/90 text-foreground opacity-0 shadow-[0_12px_28px_var(--shadow-soft)] backdrop-blur-sm transition-opacity duration-150 group-hover/gallery:opacity-100 group-hover/gallery:pointer-events-auto focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring pointer-events-none"
                  onClick={handlePrev}
                  data-testid={`${testIdPrefix}-prev-button`}
                  aria-label="Попереднє фото"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="absolute right-4 top-1/2 z-10 h-9 w-9 -translate-y-1/2 rounded-full border border-border/70 bg-background/90 text-foreground opacity-0 shadow-[0_12px_28px_var(--shadow-soft)] backdrop-blur-sm transition-opacity duration-150 group-hover/gallery:opacity-100 group-hover/gallery:pointer-events-auto focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring pointer-events-none"
                  onClick={handleNext}
                  data-testid={`${testIdPrefix}-next-button`}
                  aria-label="Наступне фото"
                >
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </>
            ) : null}
          </div>

          <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
            <span data-testid={`${testIdPrefix}-counter`}>{safeIndex + 1} / {images.length}</span>
            <span className="truncate text-right" data-testid={`${testIdPrefix}-caption`}>
              {active.caption || active.alt}
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
