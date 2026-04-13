import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { TiptapContentView } from '@/components/campaigns/TiptapContentView';

export interface PhotoGalleryItem {
  src: string;
  alt: string;
  caption?: string;
  richContentJson?: string;
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
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();
  const hasContent = open && images.length > 0;

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

  useEffect(() => {
    if (!hasContent) {
      return;
    }

    const body = document.body;
    const previousOverflow = body.style.overflow;
    body.style.overflow = 'hidden';
    dialogRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onOpenChange(false);
      }

      if (canNavigate && event.key === 'ArrowLeft') {
        event.preventDefault();
        onIndexChange((safeIndex - 1 + images.length) % images.length);
      }

      if (canNavigate && event.key === 'ArrowRight') {
        event.preventDefault();
        onIndexChange((safeIndex + 1) % images.length);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [canNavigate, hasContent, onIndexChange, onOpenChange, safeIndex, images.length]);

  if (!hasContent) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-black/55 px-3 py-4 sm:px-6 sm:py-6"
      onMouseDown={() => onOpenChange(false)}
      data-testid={`${testIdPrefix}-backdrop`}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        className="relative mx-auto grid h-auto max-h-[calc(100dvh-2rem)] w-full max-w-4xl grid-rows-[auto,1fr] gap-4 overflow-hidden rounded-2xl border border-border/80 bg-card/96 p-4 shadow-2xl outline-none sm:max-h-[calc(100dvh-3rem)] sm:p-6"
        onMouseDown={(event) => event.stopPropagation()}
        data-testid={`${testIdPrefix}-dialog`}
      >
        <div className="grid gap-2 pr-10">
          <h2 id={titleId} className="text-lg font-semibold" data-testid={`${testIdPrefix}-title`}>
            {title}
          </h2>
          <p id={descriptionId} className="text-sm text-muted-foreground" data-testid={`${testIdPrefix}-description`}>
            {description || 'Перегляд фото'}
          </p>
          <button
            type="button"
            className="absolute right-6 top-6 inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/70 bg-background/90 text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => onOpenChange(false)}
            aria-label="Закрити галерею"
            data-testid={`${testIdPrefix}-close-button`}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="grid min-h-0 grid-rows-[auto,auto,auto] gap-3">
          <div className="flex h-[min(56vh,560px)] items-center justify-center overflow-hidden rounded-2xl border border-border/80 bg-muted/20 p-2" data-testid={`${testIdPrefix}-image-wrap`}>
            <img
              src={active.src}
              alt={active.alt}
              className="block h-auto max-h-full max-w-full w-auto object-contain"
              data-testid={`${testIdPrefix}-image`}
            />
          </div>

          <div className="flex min-w-0 items-center justify-between gap-3 text-sm text-muted-foreground">
            <span className="shrink-0" data-testid={`${testIdPrefix}-counter`}>{safeIndex + 1} / {images.length}</span>
            <span className="min-w-0 flex-1 truncate text-right" data-testid={`${testIdPrefix}-caption`}>
              {active.caption || active.alt}
            </span>
          </div>

          {active.richContentJson ? (
            <div className="max-h-28 overflow-y-auto rounded-xl border border-border/70 bg-background/70 p-3" data-testid={`${testIdPrefix}-post-content-wrap`}>
              <TiptapContentView
                contentJson={active.richContentJson}
                fallbackText={active.caption || active.alt}
                testId={`${testIdPrefix}-post-content`}
              />
            </div>
          ) : null}

          {canNavigate ? (
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                className="inline-flex h-10 min-w-24 items-center justify-center gap-2 rounded-full border border-border/70 bg-background px-4 text-sm font-medium text-foreground shadow-[0_12px_28px_var(--shadow-soft)] transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={handlePrev}
                data-testid={`${testIdPrefix}-prev-button`}
                aria-label="Попереднє фото"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                <span>Назад</span>
              </button>
              <button
                type="button"
                className="inline-flex h-10 min-w-24 items-center justify-center gap-2 rounded-full border border-border/70 bg-background px-4 text-sm font-medium text-foreground shadow-[0_12px_28px_var(--shadow-soft)] transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={handleNext}
                data-testid={`${testIdPrefix}-next-button`}
                aria-label="Наступне фото"
              >
                <span>Далі</span>
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
