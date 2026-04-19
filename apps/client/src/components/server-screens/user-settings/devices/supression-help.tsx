import { memo } from 'react';
import { useTranslation } from 'react-i18next';

const SupressionHelp = memo(() => {
  const { t } = useTranslation('settings');

  return (
    <div className="max-w-2xl">
      <div className="mb-3">
        <p className="font-medium">{t('noiseSuppressionInfoTitle')}</p>
        <p className="mt-1 text-background/80">
          {t('noiseSuppressionInfoDescription')}
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-xl border-collapse text-left text-xs">
          <thead className="text-background/80">
            <tr className="border-b border-background/20">
              <th className="px-2 py-2 font-medium">
                {t('noiseSuppressionTechniqueColumn')}
              </th>
              <th className="px-2 py-2 font-medium">
                {t('noiseSuppressionMemoryUsageColumn')}
              </th>
              <th className="px-2 py-2 font-medium">
                {t('noiseSuppressionCpuUsageColumn')}
              </th>
              <th className="px-2 py-2 font-medium">
                {t('noiseSuppressionVoiceQualityColumn')}
              </th>
              <th className="px-2 py-2 font-medium">
                {t('noiseSuppressionNotesColumn')}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-background/10 align-top">
              <td className="px-2 py-2 font-medium">
                {t('noiseSuppressionStandardName')}
              </td>
              <td className="px-2 py-2">
                {t('noiseSuppressionStandardMemoryUsage')}
              </td>
              <td className="px-2 py-2">
                {t('noiseSuppressionStandardCpuUsage')}
              </td>
              <td className="px-2 py-2">
                {t('noiseSuppressionStandardVoiceQuality')}
              </td>
              <td className="px-2 py-2">
                {t('noiseSuppressionStandardNotes')}
              </td>
            </tr>
            <tr className="border-b border-background/10 align-top">
              <td className="px-2 py-2 font-medium">
                {t('noiseSuppressionRnnoiseName')}
              </td>
              <td className="px-2 py-2">
                {t('noiseSuppressionRnnoiseMemoryUsage')}
              </td>
              <td className="px-2 py-2">
                {t('noiseSuppressionRnnoiseCpuUsage')}
              </td>
              <td className="px-2 py-2">
                {t('noiseSuppressionRnnoiseVoiceQuality')}
              </td>
              <td className="px-2 py-2">{t('noiseSuppressionRnnoiseNotes')}</td>
            </tr>
            <tr className="align-top">
              <td className="px-2 py-2 font-medium">
                {t('noiseSuppressionDtlnName')}
              </td>
              <td className="px-2 py-2">
                {t('noiseSuppressionDtlnMemoryUsage')}
              </td>
              <td className="px-2 py-2">{t('noiseSuppressionDtlnCpuUsage')}</td>
              <td className="px-2 py-2">
                {t('noiseSuppressionDtlnVoiceQuality')}
              </td>
              <td className="px-2 py-2">{t('noiseSuppressionDtlnNotes')}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-[11px] text-background/80">
        {t('noiseSuppressionExperimentalWarning')}
      </p>
    </div>
  );
});

export { SupressionHelp };
