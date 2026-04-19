import { useMemo } from 'react';
import { Download, ExternalLink, FileText, ImageIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

function isPdfLikeSource(src: string, fileName?: string, mimeType?: string) {
  if (mimeType === 'application/pdf') {
    return true;
  }

  const normalizedName = fileName?.toLowerCase() ?? '';
  if (normalizedName.endsWith('.pdf')) {
    return true;
  }

  return src.toLowerCase().includes('.pdf');
}

export interface DocumentPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  src: string | null;
  title: string;
  fileName?: string;
  mimeType?: string;
  description?: string;
  testIdPrefix: string;
}

export function DocumentPreviewDialog({
  open,
  onOpenChange,
  src,
  title,
  fileName,
  mimeType,
  description,
  testIdPrefix,
}: DocumentPreviewDialogProps) {
  const isPdf = useMemo(() => (src ? isPdfLikeSource(src, fileName, mimeType) : false), [fileName, mimeType, src]);

  if (!open || !src) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl gap-5 sm:max-w-5xl" showCloseButton={true} data-testid={`${testIdPrefix}-dialog`}>
        <DialogHeader className="space-y-2 pr-10 text-left">
          <DialogTitle className="flex items-center gap-2 text-xl" data-testid={`${testIdPrefix}-title`}>
            {isPdf ? <FileText className="h-5 w-5 text-primary" aria-hidden="true" /> : <ImageIcon className="h-5 w-5 text-primary" aria-hidden="true" />}
            <span className="truncate">{title}</span>
          </DialogTitle>
          <DialogDescription className="space-y-1 text-sm" data-testid={`${testIdPrefix}-description`}>
            <span className="block truncate">{description || fileName || 'Перегляд документа'}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="flex min-h-[40vh] items-center justify-center overflow-hidden rounded-2xl border border-border/70 bg-muted/20 p-3 sm:min-h-[56vh]" data-testid={`${testIdPrefix}-preview-area`}>
            {isPdf ? (
              <iframe
                src={src}
                title={title}
                className="h-[min(70vh,900px)] w-full rounded-xl border border-border/60 bg-background"
                data-testid={`${testIdPrefix}-preview-pdf`}
              />
            ) : (
              <img
                src={src}
                alt={title}
                className="max-h-[70vh] w-full object-contain"
                data-testid={`${testIdPrefix}-preview-image`}
              />
            )}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button asChild variant="outline" size="sm" data-testid={`${testIdPrefix}-open-button`}>
              <a href={src} target="_blank" rel="noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" aria-hidden="true" />
                Відкрити
              </a>
            </Button>
            <Button asChild variant="outline" size="sm" data-testid={`${testIdPrefix}-download-button`}>
              <a href={src} download={fileName ?? undefined}>
                <Download className="mr-2 h-4 w-4" aria-hidden="true" />
                Завантажити
              </a>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}