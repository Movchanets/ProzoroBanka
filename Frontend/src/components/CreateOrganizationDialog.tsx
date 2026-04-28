import { useState, useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSubmit, useNavigation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { createOrganizationSchema, type CreateOrganizationFormData } from '@/utils/organizationSchemas';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Building2, Loader2 } from 'lucide-react';

interface CreateOrganizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  redirectAfterCreate?: boolean;
}

function toSlug(name: string): string {
  const cyr: Record<string, string> = {
    а: 'a', б: 'b', в: 'v', г: 'h', ґ: 'g', д: 'd', е: 'e', є: 'ye',
    ж: 'zh', з: 'z', и: 'y', і: 'i', ї: 'yi', й: 'y', к: 'k', л: 'l',
    м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u',
    ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch', ь: '',
    ю: 'yu', я: 'ya', ё: 'yo', э: 'e', ъ: '', ы: 'y',
  };

  return name
    .toLowerCase()
    .split('')
    .map((ch) => cyr[ch] ?? ch)
    .join('')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100);
}

export function CreateOrganizationDialog({ open, onOpenChange, redirectAfterCreate = true }: CreateOrganizationDialogProps) {
  const { t } = useTranslation();
  if (redirectAfterCreate) {
    // console.log('Will redirect');
  }
  const submit = useSubmit();
  const navigation = useNavigation();
  const [slugEdited, setSlugEdited] = useState(false);

  const schema = useMemo(() => createOrganizationSchema(t), [t]);

  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm<CreateOrganizationFormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', slug: '', description: '', website: '' },
  });

  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!slugEdited) {
        setValue('slug', toSlug(e.target.value), { shouldValidate: true });
      }
    },
    [slugEdited, setValue],
  );

  const onSubmit = async (data: CreateOrganizationFormData) => {
    const formData = new FormData();
    formData.append('intent', 'createOrganization');
    formData.append('name', data.name);
    if (data.slug) formData.append('slug', data.slug);
    if (data.description) formData.append('description', data.description);
    if (data.website) formData.append('website', data.website);

    submit(formData, { method: 'post' });
  };

  const isPending = navigation.state !== 'idle' && navigation.formData?.get('intent') === 'createOrganization';

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      reset();
      setSlugEdited(false);
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-2xl bg-linear-to-br from-primary/80 to-primary text-primary-foreground">
            <Building2 className="h-6 w-6" />
          </div>
          <DialogTitle className="text-center">{t('organizations.create.title')}</DialogTitle>
          <DialogDescription className="text-center">
            {t('organizations.create.description')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">

          <div className="space-y-2">
            <Label htmlFor="org-name">{t('common.name')} *</Label>
            <Input id="org-name" data-testid="create-org-name-input" placeholder={t('organizations.create.namePlaceholder')} autoFocus {...register('name', { onChange: handleNameChange })} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="org-slug">{t('organizations.create.slugLabel')}</Label>
            <Input id="org-slug" data-testid="create-org-slug-input" placeholder="blagod-fond-promin" {...register('slug', { onChange: () => setSlugEdited(true) })} />
            {errors.slug && <p className="text-sm text-destructive">{errors.slug.message}</p>}
            <p className="text-xs text-muted-foreground">{t('organizations.create.slugHint')}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="org-description">{t('common.description')}</Label>
            <Textarea id="org-description" data-testid="create-org-description-input" placeholder={t('organizations.create.descriptionPlaceholder')} rows={3} {...register('description')} />
            {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="org-website">{t('common.website')}</Label>
            <Input id="org-website" data-testid="create-org-website-input" placeholder="https://example.org" {...register('website')} />
            {errors.website && <p className="text-sm text-destructive">{errors.website.message}</p>}
          </div>

          <DialogFooter>
            <Button type="button" data-testid="create-org-cancel-button" variant="outline" onClick={() => handleOpenChange(false)}>{t('common.cancel')}</Button>
            <Button type="submit" data-testid="create-org-submit-button" disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {t('common.create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
