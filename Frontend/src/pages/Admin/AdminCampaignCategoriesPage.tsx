import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useAdminCampaignCategories,
  useAdminCreateCampaignCategory,
  useAdminDeleteCampaignCategory,
  useAdminUpdateCampaignCategory,
  getAdminCampaignCategoriesOptions,
} from '@/hooks/queries/useAdminQueries';
import type { AdminCampaignCategoryDto, AdminCampaignCategoryPayload } from '@/types/admin';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Plus, Trash2 } from 'lucide-react';

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function emptyPayload(): AdminCampaignCategoryPayload {
  return {
    nameUk: '',
    nameEn: '',
    slug: '',
    sortOrder: 100,
    isActive: true,
  };
}

export default function AdminCampaignCategoriesPage() {
  const { t } = useTranslation();
  const { data: categories = [], isLoading } = useAdminCampaignCategories(true);
  const createMutation = useAdminCreateCampaignCategory();
  const deleteMutation = useAdminDeleteCampaignCategory();

  const [form, setForm] = useState<AdminCampaignCategoryPayload>(emptyPayload());
  const [editingCategory, setEditingCategory] = useState<AdminCampaignCategoryDto | null>(null);
  const updateMutation = useAdminUpdateCampaignCategory(editingCategory?.id ?? '');

  const submitLabel = useMemo(
    () => (editingCategory ? t('common.save', 'Зберегти') : t('common.create', 'Створити')),
    [editingCategory, t],
  );

  const resetForm = () => {
    setForm(emptyPayload());
    setEditingCategory(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const payload: AdminCampaignCategoryPayload = {
      ...form,
      slug: slugify(form.slug || form.nameEn || form.nameUk),
      sortOrder: Number(form.sortOrder || 0),
    };

    if (editingCategory) {
      await updateMutation.mutateAsync(payload);
      resetForm();
      return;
    }

    await createMutation.mutateAsync(payload);
    resetForm();
  };

  return (
    <div className="space-y-6" data-testid="admin-campaign-categories-page">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" data-testid="admin-campaign-categories-title">
          {t('admin.campaignCategories.title', 'Категорії зборів')}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm" data-testid="admin-campaign-categories-subtitle">
          {t('admin.campaignCategories.subtitle', 'Створення та керування категоріями для публічного каталогу зборів.')}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle data-testid="admin-campaign-categories-form-title">
            {editingCategory
              ? t('admin.campaignCategories.editFormTitle', 'Редагування категорії')
              : t('admin.campaignCategories.createFormTitle', 'Нова категорія')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit} data-testid="admin-campaign-categories-form">
            <div className="space-y-2">
              <Label htmlFor="category-name-uk">{t('admin.campaignCategories.nameUk', 'Назва (uk)')}</Label>
              <Input
                id="category-name-uk"
                value={form.nameUk}
                onChange={(event) => setForm((prev) => ({ ...prev, nameUk: event.target.value }))}
                data-testid="admin-campaign-categories-name-uk-input"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category-name-en">{t('admin.campaignCategories.nameEn', 'Назва (en)')}</Label>
              <Input
                id="category-name-en"
                value={form.nameEn}
                onChange={(event) => setForm((prev) => ({ ...prev, nameEn: event.target.value }))}
                data-testid="admin-campaign-categories-name-en-input"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category-slug">Slug</Label>
              <Input
                id="category-slug"
                value={form.slug}
                onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))}
                data-testid="admin-campaign-categories-slug-input"
                placeholder="medical-aid"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category-sort-order">{t('admin.campaignCategories.sortOrder', 'Порядок')}</Label>
              <Input
                id="category-sort-order"
                type="number"
                value={form.sortOrder}
                onChange={(event) => setForm((prev) => ({ ...prev, sortOrder: Number(event.target.value) }))}
                data-testid="admin-campaign-categories-sort-order-input"
              />
            </div>

            <label className="flex items-center gap-2" data-testid="admin-campaign-categories-active-checkbox-row">
              <Checkbox
                checked={form.isActive}
                onCheckedChange={(checked) => setForm((prev) => ({ ...prev, isActive: checked === true }))}
                data-testid="admin-campaign-categories-active-checkbox"
              />
              <span>{t('admin.campaignCategories.isActive', 'Активна категорія')}</span>
            </label>

            <div className="flex gap-2 md:col-span-2">
              <Button type="submit" data-testid="admin-campaign-categories-submit-button" disabled={createMutation.isPending || updateMutation.isPending}>
                {(createMutation.isPending || updateMutation.isPending) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {submitLabel}
              </Button>
              {editingCategory ? (
                <Button type="button" variant="outline" onClick={resetForm} data-testid="admin-campaign-categories-cancel-edit-button">
                  {t('common.cancel', 'Скасувати')}
                </Button>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle data-testid="admin-campaign-categories-table-title">{t('admin.campaignCategories.listTitle', 'Список категорій')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Slug</TableHead>
                <TableHead>UK</TableHead>
                <TableHead>EN</TableHead>
                <TableHead>{t('admin.campaignCategories.sortOrder', 'Порядок')}</TableHead>
                <TableHead>{t('common.status', 'Статус')}</TableHead>
                <TableHead className="text-right">{t('common.actions', 'Дії')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">{t('common.loading', 'Завантаження...')}</TableCell>
                </TableRow>
              ) : null}

              {!isLoading && categories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">{t('admin.campaignCategories.empty', 'Категорій ще немає')}</TableCell>
                </TableRow>
              ) : null}

              {categories.map((category) => (
                <TableRow key={category.id} data-testid={`admin-campaign-categories-row-${category.slug}`}>
                  <TableCell>{category.slug}</TableCell>
                  <TableCell>{category.nameUk}</TableCell>
                  <TableCell>{category.nameEn}</TableCell>
                  <TableCell>{category.sortOrder}</TableCell>
                  <TableCell>{category.isActive ? t('common.active', 'Активна') : t('common.inactive', 'Неактивна')}</TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingCategory(category);
                          setForm({
                            nameUk: category.nameUk,
                            nameEn: category.nameEn,
                            slug: category.slug,
                            sortOrder: category.sortOrder,
                            isActive: category.isActive,
                          });
                        }}
                        data-testid={`admin-campaign-categories-edit-${category.slug}`}
                      >
                        {t('common.edit', 'Редагувати')}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteMutation.mutate(category.id)}
                        disabled={deleteMutation.isPending}
                        data-testid={`admin-campaign-categories-delete-${category.slug}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export async function clientLoader() {
  const { ensureQueryData } = await import('@/utils/routerHelpers');
  await ensureQueryData(getAdminCampaignCategoriesOptions(true));
  return null;
}
