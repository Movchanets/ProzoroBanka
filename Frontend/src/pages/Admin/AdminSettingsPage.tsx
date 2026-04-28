import { useState, useEffect } from 'react';
import { useSubmit, useNavigation } from 'react-router';
import type { ActionFunctionArgs as ClientActionArgs } from 'react-router';
import {
  useAdminGeneralSettings,
  useAdminPlansSettings,
  getAdminPlansSettingsOptions,
  getAdminGeneralSettingsOptions,
  useAdminOcrModels,
  getAdminOcrModelsOptions,
} from '@/hooks/queries/useAdminQueries';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { AdminGeneralSettingsDto, AdminPlansSettingsDto } from '@/types/admin';
import { adminOcrService } from '@/services/adminOcrService';
import { adminSettingsService } from '@/services/adminSettingsService';
import { queryClient } from '@/services/queryClient';
import type { OcrModelConfig } from '@/types';
import { Loader2 } from 'lucide-react';


export default function AdminSettingsPage() {
  const { t } = useTranslation();
  const {
    data: plansSettings,
    isLoading: isPlansLoading,
    isError: isPlansError,
    error: plansError,
  } = useAdminPlansSettings();
  const {
    data: generalSettings,
    isLoading: isGeneralLoading,
    isError: isGeneralError,
    error: generalError,
  } = useAdminGeneralSettings();

  return (
    <div className="space-y-6" data-testid="admin-settings-page">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('admin.settings.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('admin.settings.subtitle')}
        </p>
      </div>

      <Card data-testid="admin-settings-section-plans">
        <CardHeader>
          <CardTitle>{t('admin.settings.plans.title')}</CardTitle>
          <CardDescription>{t('admin.settings.plans.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isPlansError ? (
            <Alert variant="destructive" data-testid="admin-settings-plans-error-alert">
              <AlertTitle>{t('admin.settings.shared.errorTitle')}</AlertTitle>
              <AlertDescription>
                {plansError instanceof Error ? plansError.message : t('admin.settings.plans.loadError')}
              </AlertDescription>
            </Alert>
          ) : null}

          {isPlansLoading ? (
            <div className="text-sm text-muted-foreground">{t('admin.settings.plans.loading')}</div>
          ) : !plansSettings ? (
            <div className="text-sm text-muted-foreground">{t('admin.settings.plans.notFound')}</div>
          ) : (
            <PlansSettingsForm
              key={`plans-${plansSettings.free.maxCampaigns}-${plansSettings.free.maxMembers}-${plansSettings.free.maxOcrExtractionsPerMonth}-${plansSettings.paid.maxCampaigns}-${plansSettings.paid.maxMembers}-${plansSettings.paid.maxOcrExtractionsPerMonth}`}
              settings={plansSettings}
            />
          )}
        </CardContent>
      </Card>

      <Card data-testid="admin-settings-section-general">
        <CardHeader>
          <CardTitle>{t('admin.settings.general.title')}</CardTitle>
          <CardDescription>{t('admin.settings.general.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isGeneralError ? (
            <Alert variant="destructive" data-testid="admin-settings-general-error-alert">
              <AlertTitle>{t('admin.settings.shared.errorTitle')}</AlertTitle>
              <AlertDescription>
                {generalError instanceof Error ? generalError.message : t('admin.settings.general.loadError')}
              </AlertDescription>
            </Alert>
          ) : null}

          {isGeneralLoading ? (
            <div className="text-sm text-muted-foreground">{t('admin.settings.general.loading')}</div>
          ) : !generalSettings ? (
            <div className="text-sm text-muted-foreground">{t('admin.settings.general.notFound')}</div>
          ) : (
            <GeneralSettingsForm
              key={`general-${generalSettings.maxOwnedOrganizationsForNonAdmin}-${generalSettings.maxJoinedOrganizationsForNonAdmin}`}
              settings={generalSettings}
            />
          )}
        </CardContent>
      </Card>

      <Card data-testid="admin-settings-section-ocr-models">
        <CardHeader>
          <CardTitle>OCR Models</CardTitle>
          <CardDescription>
            Керуйте активними OCR-моделями для MistralNative та OpenRouter. Модель за замовчуванням буде підставлена у формі extract.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OcrModelsSettings />
        </CardContent>
      </Card>
    </div>
  );
}

export async function clientLoader() {
  const { ensureQueryData } = await import('@/utils/routerHelpers');
  await Promise.allSettled([
    ensureQueryData({ queryKey: ['profile'], queryFn: (await import('@/services/profileService')).profileService.getProfile }),
    ensureQueryData(getAdminPlansSettingsOptions()),
    ensureQueryData(getAdminGeneralSettingsOptions()),
    ensureQueryData(getAdminOcrModelsOptions()),
  ]);
  return null;
}

export async function clientAction({ request }: ClientActionArgs) {
  const formData = await request.formData();
  const intent = formData.get('intent');

  try {
    if (intent === 'updatePlans') {
      const payload = {
        free: {
          maxCampaigns: Number(formData.get('freeMaxCampaigns')),
          maxMembers: Number(formData.get('freeMaxMembers')),
          maxOcrExtractionsPerMonth: Number(formData.get('freeMaxOcr')),
        },
        paid: {
          maxCampaigns: Number(formData.get('paidMaxCampaigns')),
          maxMembers: Number(formData.get('paidMaxMembers')),
          maxOcrExtractionsPerMonth: Number(formData.get('paidMaxOcr')),
        },
      };
      await adminSettingsService.updatePlansSettings(payload);
      queryClient.invalidateQueries({ queryKey: getAdminPlansSettingsOptions().queryKey });
      return { success: true, intent: 'updatePlans' };
    }

    if (intent === 'updateGeneral') {
      const payload = {
        maxOwnedOrganizationsForNonAdmin: Number(formData.get('maxOwnedOrganizations')),
        maxJoinedOrganizationsForNonAdmin: Number(formData.get('maxJoinedOrganizations')),
      };
      await adminSettingsService.updateGeneralSettings(payload);
      queryClient.invalidateQueries({ queryKey: getAdminGeneralSettingsOptions().queryKey });
      return { success: true, intent: 'updateGeneral' };
    }

    if (intent === 'addOcrModel') {
      await adminOcrService.add({
        name: String(formData.get('name')),
        modelIdentifier: String(formData.get('modelIdentifier')),
        provider: String(formData.get('provider')),
        isActive: formData.get('isActive') === 'true',
        isDefault: formData.get('isDefault') === 'true',
      });
      queryClient.invalidateQueries({ queryKey: getAdminOcrModelsOptions().queryKey });
      return { success: true, intent: 'addOcrModel' };
    }

    if (intent === 'updateOcrModel') {
      const id = String(formData.get('id'));
      const payload: { isActive?: boolean; isDefault?: boolean } = {};
      if (formData.has('isActive')) payload.isActive = formData.get('isActive') === 'true';
      if (formData.has('isDefault')) payload.isDefault = formData.get('isDefault') === 'true';
      
      await adminOcrService.update(id, payload);
      queryClient.invalidateQueries({ queryKey: getAdminOcrModelsOptions().queryKey });
      return { success: true, intent: 'updateOcrModel' };
    }

    return { error: 'Unknown intent' };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Action failed' };
  }
}

function OcrModelsSettings() {
  const submit = useSubmit();
  const navigation = useNavigation();
  const [name, setName] = useState('');
  const [modelIdentifier, setModelIdentifier] = useState('');
  const [provider, setProvider] = useState('OpenRouter');
  const [isActive, setIsActive] = useState(true);
  const [isDefault, setIsDefault] = useState(false);
  const {
    data: models,
    isLoading,
    isError,
    error,
  } = useAdminOcrModels();

  const isAdding = navigation.state !== 'idle' && navigation.formData?.get('intent') === 'addOcrModel';
  const isUpdating = navigation.state !== 'idle' && navigation.formData?.get('intent') === 'updateOcrModel';

  useEffect(() => {
    // We can use useActionData if we pass it down, or just check navigation
    if (navigation.state === 'idle' && name && !isAdding) {
       // Reset if add was successful - this is a bit tricky with shared actionData
    }
  }, [navigation.state]);

  const onAddModel = () => {
    const normalizedName = name.trim();
    const normalizedIdentifier = modelIdentifier.trim();
    if (!normalizedName || !normalizedIdentifier) return;

    const formData = new FormData();
    formData.append('intent', 'addOcrModel');
    formData.append('name', normalizedName);
    formData.append('modelIdentifier', normalizedIdentifier);
    formData.append('provider', provider);
    formData.append('isActive', String(isActive));
    formData.append('isDefault', String(isDefault));
    submit(formData, { method: 'post' });

    // Optimistic reset
    setName('');
    setModelIdentifier('');
  };

  return (
    <div className="space-y-6" data-testid="admin-settings-ocr-models-panel">
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="admin-ocr-model-name">Display Name</Label>
          <Input
            id="admin-ocr-model-name"
            data-testid="admin-ocr-model-name-input"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Qwen VL Plus"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="admin-ocr-model-identifier">Model Identifier</Label>
          <Input
            id="admin-ocr-model-identifier"
            data-testid="admin-ocr-model-identifier-input"
            value={modelIdentifier}
            onChange={(event) => setModelIdentifier(event.target.value)}
            placeholder="qwen/qwen-vl-plus:free"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="admin-ocr-model-provider">Provider</Label>
          <Input
            id="admin-ocr-model-provider"
            data-testid="admin-ocr-model-provider-input"
            value={provider}
            onChange={(event) => setProvider(event.target.value)}
            placeholder="OpenRouter"
          />
        </div>
        <div className="flex items-center gap-6 pt-6">
          <label className="flex items-center gap-2 text-sm" data-testid="admin-ocr-model-is-active-toggle">
            <input
              type="checkbox"
              data-testid="admin-ocr-model-is-active-checkbox"
              checked={isActive}
              onChange={(event) => setIsActive(event.target.checked)}
            />
            Active
          </label>
          <label className="flex items-center gap-2 text-sm" data-testid="admin-ocr-model-is-default-toggle">
            <input
              type="checkbox"
              data-testid="admin-ocr-model-is-default-checkbox"
              checked={isDefault}
              onChange={(event) => setIsDefault(event.target.checked)}
            />
            Default
          </label>
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          data-testid="admin-ocr-model-add-button"
          onClick={onAddModel}
          disabled={isAdding}
        >
          {isAdding ? 'Adding...' : 'Add OCR model'}
        </Button>
      </div>

      {isError ? (
        <Alert variant="destructive" data-testid="admin-ocr-models-error-alert">
          <AlertTitle>Помилка</AlertTitle>
          <AlertDescription>{error instanceof Error ? error.message : 'Не вдалося завантажити OCR моделі'}</AlertDescription>
        </Alert>
      ) : null}

      {isLoading ? (
        <div className="text-sm text-muted-foreground" data-testid="admin-ocr-models-loading">Завантаження OCR моделей...</div>
      ) : (
        <div className="space-y-2" data-testid="admin-ocr-models-list">
          {(models ?? []).map((model: OcrModelConfig) => (
            <div
              key={model.id}
              className="flex flex-col gap-3 rounded-lg border border-border bg-muted/20 p-3 md:flex-row md:items-center md:justify-between"
              data-testid={`admin-ocr-model-row-${model.id}`}
            >
              <div>
                <p className="font-medium">{model.name}</p>
                <p className="text-xs text-muted-foreground">{model.modelIdentifier}</p>
                <p className="text-xs text-muted-foreground">{model.provider}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  data-testid={`admin-ocr-model-toggle-active-${model.id}`}
                  onClick={() => {
                    const fd = new FormData();
                    fd.append('intent', 'updateOcrModel');
                    fd.append('id', model.id);
                    fd.append('isActive', String(!model.isActive));
                    submit(fd, { method: 'post' });
                  }}
                  disabled={isUpdating}
                >
                  {model.isActive ? 'Deactivate' : 'Activate'}
                </Button>
                <Button
                  variant={model.isDefault ? 'secondary' : 'outline'}
                  size="sm"
                  data-testid={`admin-ocr-model-toggle-default-${model.id}`}
                  onClick={() => {
                    const fd = new FormData();
                    fd.append('intent', 'updateOcrModel');
                    fd.append('id', model.id);
                    fd.append('isDefault', 'true');
                    submit(fd, { method: 'post' });
                  }}
                  disabled={isUpdating || !model.isActive}
                >
                  {model.isDefault ? 'Default' : 'Set default'}
                </Button>
              </div>
            </div>
          ))}
          {(models ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground" data-testid="admin-ocr-models-empty">Наразі OCR моделі не додані.</p>
          ) : null}
        </div>
      )}
    </div>
  );
}

function PlansSettingsForm({ settings }: { settings: AdminPlansSettingsDto }) {
  const { t } = useTranslation();
  const submit = useSubmit();
  const navigation = useNavigation();
  const [freeMaxCampaigns, setFreeMaxCampaigns] = useState(String(settings.free.maxCampaigns));
  const [freeMaxMembers, setFreeMaxMembers] = useState(String(settings.free.maxMembers));
  const [freeMaxOcr, setFreeMaxOcr] = useState(String(settings.free.maxOcrExtractionsPerMonth));

  const [paidMaxCampaigns, setPaidMaxCampaigns] = useState(String(settings.paid.maxCampaigns));
  const [paidMaxMembers, setPaidMaxMembers] = useState(String(settings.paid.maxMembers));
  const [paidMaxOcr, setPaidMaxOcr] = useState(String(settings.paid.maxOcrExtractionsPerMonth));

  const isSaving = navigation.state !== 'idle' && navigation.formData?.get('intent') === 'updatePlans';

  const handleSavePlans = () => {
    const formData = new FormData();
    formData.append('intent', 'updatePlans');
    formData.append('freeMaxCampaigns', freeMaxCampaigns);
    formData.append('freeMaxMembers', freeMaxMembers);
    formData.append('freeMaxOcr', freeMaxOcr);
    formData.append('paidMaxCampaigns', paidMaxCampaigns);
    formData.append('paidMaxMembers', paidMaxMembers);
    formData.append('paidMaxOcr', paidMaxOcr);
    submit(formData, { method: 'post' });
  };

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-xl border border-border bg-muted/25 p-4" data-testid="admin-settings-free-plan-group">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {t('admin.settings.plans.freeTitle')}
          </h3>

          <div className="mt-4 grid gap-3">
            <NumberField
              testId="admin-settings-free-max-campaigns-input"
              label={t('admin.settings.plans.maxCampaigns')}
              value={freeMaxCampaigns}
              onChange={setFreeMaxCampaigns}
            />
            <NumberField
              testId="admin-settings-free-max-members-input"
              label={t('admin.settings.plans.maxMembers')}
              value={freeMaxMembers}
              onChange={setFreeMaxMembers}
            />
            <NumberField
              testId="admin-settings-free-max-ocr-input"
              label={t('admin.settings.plans.maxOcrPerMonth')}
              value={freeMaxOcr}
              onChange={setFreeMaxOcr}
            />
          </div>
        </section>

        <section className="rounded-xl border border-border bg-muted/25 p-4" data-testid="admin-settings-paid-plan-group">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {t('admin.settings.plans.paidTitle')}
          </h3>

          <div className="mt-4 grid gap-3">
            <NumberField
              testId="admin-settings-paid-max-campaigns-input"
              label={t('admin.settings.plans.maxCampaigns')}
              value={paidMaxCampaigns}
              onChange={setPaidMaxCampaigns}
            />
            <NumberField
              testId="admin-settings-paid-max-members-input"
              label={t('admin.settings.plans.maxMembers')}
              value={paidMaxMembers}
              onChange={setPaidMaxMembers}
            />
            <NumberField
              testId="admin-settings-paid-max-ocr-input"
              label={t('admin.settings.plans.maxOcrPerMonth')}
              value={paidMaxOcr}
              onChange={setPaidMaxOcr}
            />
          </div>
        </section>
      </div>

      <div className="flex justify-end">
        <Button
          data-testid="admin-settings-plans-save-button"
          onClick={handleSavePlans}
          disabled={isSaving}
        >
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isSaving ? t('admin.settings.shared.saving') : t('admin.settings.plans.save')}
        </Button>
      </div>
    </>
  );
}

function GeneralSettingsForm({ settings }: { settings: AdminGeneralSettingsDto }) {
  const { t } = useTranslation();
  const submit = useSubmit();
  const navigation = useNavigation();
  const [maxOwnedOrganizations, setMaxOwnedOrganizations] = useState(String(settings.maxOwnedOrganizationsForNonAdmin));
  const [maxJoinedOrganizations, setMaxJoinedOrganizations] = useState(String(settings.maxJoinedOrganizationsForNonAdmin));

  const isSaving = navigation.state !== 'idle' && navigation.formData?.get('intent') === 'updateGeneral';

  const handleSaveGeneral = () => {
    const formData = new FormData();
    formData.append('intent', 'updateGeneral');
    formData.append('maxOwnedOrganizations', maxOwnedOrganizations);
    formData.append('maxJoinedOrganizations', maxJoinedOrganizations);
    submit(formData, { method: 'post' });
  };

  return (
    <>
      <div className="grid gap-3 md:grid-cols-2">
        <NumberField
          testId="admin-settings-max-owned-orgs-input"
          label={t('admin.settings.general.maxOwnedOrganizations')}
          value={maxOwnedOrganizations}
          onChange={setMaxOwnedOrganizations}
        />
        <NumberField
          testId="admin-settings-max-joined-orgs-input"
          label={t('admin.settings.general.maxJoinedOrganizations')}
          value={maxJoinedOrganizations}
          onChange={setMaxJoinedOrganizations}
        />
      </div>

      <div className="flex justify-end">
        <Button
          data-testid="admin-settings-general-save-button"
          onClick={handleSaveGeneral}
          disabled={isSaving}
        >
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isSaving ? t('admin.settings.shared.saving') : t('admin.settings.general.save')}
        </Button>
      </div>
    </>
  );
}

function NumberField({
  testId,
  label,
  value,
  onChange,
}: {
  testId: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={testId} className="text-xs font-medium text-muted-foreground">
        {label}
      </Label>
      <Input
        id={testId}
        data-testid={testId}
        type="number"
        min={1}
        inputMode="numeric"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
