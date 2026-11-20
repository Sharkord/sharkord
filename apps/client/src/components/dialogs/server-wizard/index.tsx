import { ImagePicker } from '@/components/image-picker';
import { useAdminGeneral } from '@/features/server/admin/hooks';
import { getFileUrl } from '@/helpers/get-file-url';
import { useForm } from '@/hooks/use-form';
import type { TPickedImage } from '@/hooks/use-pick-image';
import { getTRPCClient } from '@/lib/trpc';
import { getTrpcError } from '@sharkord/shared';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Group,
  Input,
  LoadingCard,
  Stepper,
  Textarea
} from '@sharkord/ui';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type { TDialogBaseProps } from '../types';
import { Choice } from './choice';
import { ServerWizardDone } from './done';

type TServerWizardDialogProps = TDialogBaseProps;

type TServerWizardValues = {
  name: string;
  description: string;
  passwordEnabled: boolean;
  password: string;
  allowNewUsers: boolean;
  directMessagesEnabled: boolean;
  storageUploadEnabled: boolean;
  enablePlugins: boolean;
  storageImageOptimizationEnabled: boolean;
  storageSignedUrlsEnabled: boolean;
  storageMediaProxyEnabled: boolean;
  // undefined means untouched, null means remove
  logo?: TPickedImage | null;
};

const STEP_COUNT = 4;

const ServerWizardDialog = memo(
  ({ isOpen, close }: TServerWizardDialogProps) => {
    const { t } = useTranslation('dialogs');
    const { settings, loading } = useAdminGeneral();
    const [step, setStep] = useState(0);
    const [saving, setSaving] = useState(false);
    const [done, setDone] = useState(false);
    const { r, values, setValues, onChange, setTrpcErrors } =
      useForm<TServerWizardValues>({
        name: '',
        description: '',
        passwordEnabled: false,
        password: '',
        allowNewUsers: false,
        directMessagesEnabled: true,
        storageUploadEnabled: true,
        enablePlugins: false,
        storageImageOptimizationEnabled: false,
        storageSignedUrlsEnabled: false,
        storageMediaProxyEnabled: true
      });

    useEffect(() => {
      if (!settings) return;

      setValues({
        name: settings.name,
        description: settings.description ?? '',
        passwordEnabled: !!settings.password,
        password: settings.password ?? '',
        allowNewUsers: settings.allowNewUsers,
        directMessagesEnabled: settings.directMessagesEnabled,
        storageUploadEnabled: settings.storageUploadEnabled,
        enablePlugins: settings.enablePlugins,
        storageImageOptimizationEnabled:
          settings.storageImageOptimizationEnabled,
        storageSignedUrlsEnabled: settings.storageSignedUrlsEnabled,
        storageMediaProxyEnabled: settings.storageMediaProxyEnabled
      });
    }, [settings, setValues]);

    const steps = useMemo(
      () => [
        { label: t('serverWizardStepIdentity') },
        { label: t('serverWizardStepAccess') },
        { label: t('serverWizardStepFeatures') },
        { label: t('serverWizardStepStorage') }
      ],
      [t]
    );

    const onSkip = useCallback(async () => {
      try {
        const trpc = getTRPCClient();

        await trpc.others.updateSettings.mutate({
          serverWizardCompleted: true
        });

        close();
      } catch (error) {
        toast.error(getTrpcError(error, t('serverWizardSaveError')));
      }
    }, [close, t]);

    const onBack = useCallback(() => setStep((s) => s - 1), []);
    const onNext = useCallback(() => setStep((s) => s + 1), []);

    const onFinish = useCallback(async () => {
      setSaving(true);

      try {
        const trpc = getTRPCClient();

        // the logo goes first so a failed upload keeps the wizard open instead of marking it done
        if (values.logo !== undefined) {
          await trpc.others.changeLogo.mutate({ fileId: values.logo?.fileId });
        }

        await trpc.others.updateSettings.mutate({
          name: values.name.trim(),
          description: values.description.trim(),
          password: values.passwordEnabled ? values.password : null,
          allowNewUsers: values.allowNewUsers,
          directMessagesEnabled: values.directMessagesEnabled,
          storageUploadEnabled: values.storageUploadEnabled,
          enablePlugins: values.enablePlugins,
          storageImageOptimizationEnabled:
            values.storageImageOptimizationEnabled,
          storageSignedUrlsEnabled: values.storageSignedUrlsEnabled,
          storageMediaProxyEnabled: values.storageMediaProxyEnabled,
          serverWizardCompleted: true
        });

        setDone(true);
      } catch (error) {
        setTrpcErrors(error);
        toast.error(getTrpcError(error, t('serverWizardSaveError')));
      } finally {
        setSaving(false);
      }
    }, [setTrpcErrors, t, values]);

    const onLogoChange = useCallback(
      (picked: TPickedImage | null) => onChange('logo', picked),
      [onChange]
    );

    const onAllowNewUsersChange = useCallback(
      (value: boolean) => onChange('allowNewUsers', value),
      [onChange]
    );

    const onPasswordEnabledChange = useCallback(
      (value: boolean) => onChange('passwordEnabled', value),
      [onChange]
    );

    const onDirectMessagesChange = useCallback(
      (value: boolean) => onChange('directMessagesEnabled', value),
      [onChange]
    );

    const onUploadsChange = useCallback(
      (value: boolean) => onChange('storageUploadEnabled', value),
      [onChange]
    );

    const onPluginsChange = useCallback(
      (value: boolean) => onChange('enablePlugins', value),
      [onChange]
    );

    const onImageOptimizationChange = useCallback(
      (value: boolean) => onChange('storageImageOptimizationEnabled', value),
      [onChange]
    );

    const onSignedUrlsChange = useCallback(
      (value: boolean) => onChange('storageSignedUrlsEnabled', value),
      [onChange]
    );

    const onMediaProxyChange = useCallback(
      (value: boolean) => onChange('storageMediaProxyEnabled', value),
      [onChange]
    );

    const nameValid = values.name.trim().length >= 2;
    const passwordValid = !values.passwordEnabled || !!values.password;
    const canContinue = [nameValid, passwordValid, true, true][step];
    const isLastStep = step === STEP_COUNT - 1;

    let content = <LoadingCard className="h-[300px]" />;

    if (!loading && step === 0) {
      content = (
        <>
          <Group label={t('serverWizardNameLabel')}>
            <Input
              placeholder={t('serverWizardNamePlaceholder')}
              maxLength={24}
              {...r('name')}
            />
          </Group>
          <Group label={t('serverWizardDescriptionLabel')}>
            <Textarea
              rows={3}
              maxLength={128}
              placeholder={t('serverWizardDescriptionPlaceholder')}
              {...r('description')}
            />
          </Group>
          <ImagePicker
            label={t('serverWizardLogoLabel')}
            description={t('serverWizardLogoDesc')}
            className="h-24 w-80 object-scale-down"
            currentUrl={getFileUrl(settings?.logo)}
            draft={values.logo}
            onChange={onLogoChange}
          />
        </>
      );
    } else if (!loading && step === 1) {
      content = (
        <>
          <Choice
            question={t('serverWizardAllowNewUsersQuestion')}
            enableDescription={t('serverWizardAllowNewUsersEnable')}
            disableDescription={t('serverWizardAllowNewUsersDisable')}
            value={values.allowNewUsers}
            onChange={onAllowNewUsersChange}
          />
          <Choice
            question={t('serverWizardPasswordQuestion')}
            enableDescription={t('serverWizardPasswordEnable')}
            disableDescription={t('serverWizardPasswordDisable')}
            value={values.passwordEnabled}
            onChange={onPasswordEnabledChange}
          >
            {values.passwordEnabled && (
              <Input
                placeholder={t('serverWizardPasswordPlaceholder')}
                maxLength={32}
                {...r('password', 'password')}
              />
            )}
          </Choice>
        </>
      );
    } else if (!loading && step === 2) {
      content = (
        <>
          <Choice
            question={t('serverWizardDirectMessagesQuestion')}
            enableDescription={t('serverWizardDirectMessagesEnable')}
            disableDescription={t('serverWizardDirectMessagesDisable')}
            value={values.directMessagesEnabled}
            onChange={onDirectMessagesChange}
          />
          <Choice
            question={t('serverWizardPluginsQuestion')}
            enableDescription={t('serverWizardPluginsEnable')}
            disableDescription={t('serverWizardPluginsDisable')}
            value={values.enablePlugins}
            onChange={onPluginsChange}
          />
        </>
      );
    } else if (!loading) {
      content = (
        <>
          <Choice
            question={t('serverWizardUploadsQuestion')}
            enableDescription={t('serverWizardUploadsEnable')}
            disableDescription={t('serverWizardUploadsDisable')}
            value={values.storageUploadEnabled}
            onChange={onUploadsChange}
          />
          <Choice
            question={t('serverWizardImageOptimizationQuestion')}
            enableDescription={t('serverWizardImageOptimizationEnable')}
            disableDescription={t('serverWizardImageOptimizationDisable')}
            value={values.storageImageOptimizationEnabled}
            onChange={onImageOptimizationChange}
          />
          <Choice
            question={t('serverWizardSignedUrlsQuestion')}
            enableDescription={t('serverWizardSignedUrlsEnable')}
            disableDescription={t('serverWizardSignedUrlsDisable')}
            value={values.storageSignedUrlsEnabled}
            onChange={onSignedUrlsChange}
          />
          <Choice
            question={t('serverWizardMediaProxyQuestion')}
            enableDescription={t('serverWizardMediaProxyEnable')}
            disableDescription={t('serverWizardMediaProxyDisable')}
            value={values.storageMediaProxyEnabled}
            onChange={onMediaProxyChange}
          />
        </>
      );
    }

    if (done) {
      return (
        <Dialog open={isOpen}>
          <ServerWizardDone serverName={values.name.trim()} close={close} />
        </Dialog>
      );
    }

    return (
      <Dialog open={isOpen}>
        <DialogContent close={onSkip} className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t('serverWizardTitle')}</DialogTitle>
            <DialogDescription>{t('serverWizardDesc')}</DialogDescription>
          </DialogHeader>

          <Stepper steps={steps} current={step} onStepClick={setStep} />

          <div className="flex max-h-[60vh] flex-col gap-6 overflow-y-auto py-2">
            {content}
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            <Button variant="ghost" onClick={onSkip} disabled={saving}>
              {t('serverWizardSkip')}
            </Button>
            <div className="flex gap-2">
              {step > 0 && (
                <Button variant="outline" onClick={onBack} disabled={saving}>
                  {t('serverWizardBack')}
                </Button>
              )}
              {isLastStep ? (
                <Button onClick={onFinish} disabled={saving || loading}>
                  {t('serverWizardFinish')}
                </Button>
              ) : (
                <Button onClick={onNext} disabled={!canContinue || loading}>
                  {t('serverWizardNext')}
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
);

export { ServerWizardDialog };
