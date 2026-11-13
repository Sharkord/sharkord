import { Dialog } from '@/components/dialogs/dialogs';
import { openDialog, requestConfirmation } from '@/features/dialogs/actions';
import { cn } from '@/lib/utils';
import type { TPluginInfo } from '@sharkord/shared';
import { TestId } from '@sharkord/shared';
import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  IconButton,
  Switch,
  Tooltip
} from '@sharkord/ui';
import {
  Download,
  ExternalLink,
  MoreHorizontal,
  Settings,
  Trash2
} from 'lucide-react';
import { memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettingsNavigate } from '../../settings-shell/context';
import { PluginLogo } from './plugin-logo';

type TInstalledPluginRowProps = {
  plugin: TPluginInfo;
  updateVersion?: string;
  isManual: boolean;
  onToggle: (pluginId: string, enabled: boolean) => Promise<void>;
  onRemove: (pluginId: string) => Promise<void>;
  onUpdate: (plugin: TPluginInfo, version: string) => Promise<void>;
};

const InstalledPluginRow = memo(
  ({
    plugin,
    updateVersion,
    isManual,
    onToggle,
    onRemove,
    onUpdate
  }: TInstalledPluginRowProps) => {
    const { t } = useTranslation('settings');
    const navigate = useSettingsNavigate();
    const [isBusy, setIsBusy] = useState(false);

    const handleToggle = useCallback(
      async (checked: boolean) => {
        setIsBusy(true);

        try {
          await onToggle(plugin.id, checked);
        } finally {
          setIsBusy(false);
        }
      },
      [plugin.id, onToggle]
    );

    const handleRemove = useCallback(async () => {
      const confirmed = await requestConfirmation({
        title: t('removePluginTitle'),
        message: t('removePluginConfirm', { name: plugin.name }),
        confirmLabel: t('removeBtn'),
        variant: 'danger'
      });

      if (!confirmed) return;

      setIsBusy(true);

      try {
        await onRemove(plugin.id);
      } finally {
        setIsBusy(false);
      }
    }, [plugin.id, plugin.name, onRemove, t]);

    const performUpdate = useCallback(async () => {
      if (!updateVersion) return;

      setIsBusy(true);

      try {
        await onUpdate(plugin, updateVersion);
      } finally {
        setIsBusy(false);
      }
    }, [plugin, updateVersion, onUpdate]);

    const handleUpdate = useCallback(() => {
      openDialog(Dialog.PLUGIN_INSTALL_CONFIRM, {
        pluginName: plugin.name,
        onConfirm: performUpdate
      });
    }, [plugin.name, performUpdate]);

    const handleOpen = useCallback(() => {
      navigate(`plugin-${plugin.id}`);
    }, [navigate, plugin.id]);

    const handleOpenHomepage = useCallback(() => {
      window.open(plugin.homepage, '_blank', 'noopener,noreferrer');
    }, [plugin.homepage]);

    const openButton = plugin.loadError ? (
      <Button variant="outline" size="sm" onClick={handleOpen}>
        {t('pluginViewLogs')}
      </Button>
    ) : (
      <Tooltip content={t('pluginConfigure')}>
        <IconButton
          icon={Settings}
          variant="ghost"
          size="sm"
          onClick={handleOpen}
          aria-label={t('pluginConfigure')}
        />
      </Tooltip>
    );

    return (
      <div
        data-testid={TestId.INSTALLED_PLUGIN_ITEM}
        className="flex items-center gap-3 px-4 py-3"
      >
        <PluginLogo
          src={plugin.logo}
          hasError={!!plugin.loadError}
          dimmed={!plugin.enabled}
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'truncate text-sm font-medium',
                !plugin.enabled && 'text-muted-foreground'
              )}
            >
              {plugin.name}
            </span>
            {plugin.version && (
              <span className="shrink-0 font-mono text-xs text-muted-foreground">
                v{plugin.version}
              </span>
            )}
            {isManual && (
              <Tooltip content={t('pluginManualTooltip')}>
                <Badge variant="outline" className="text-[10px]">
                  {t('pluginManualBadge')}
                </Badge>
              </Tooltip>
            )}
          </div>
          <p
            className={cn(
              'truncate text-xs',
              plugin.loadError ? 'text-destructive' : 'text-muted-foreground'
            )}
            title={plugin.loadError ?? plugin.description}
          >
            {plugin.loadError ?? plugin.description}
          </p>
        </div>

        {updateVersion && (
          <Button
            variant="secondary"
            size="sm"
            onClick={handleUpdate}
            disabled={isBusy}
          >
            <Download className="h-4 w-4" />
            {t('pluginUpdateTo', { version: updateVersion })}
          </Button>
        )}

        {plugin.enabled && openButton}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <IconButton
              icon={MoreHorizontal}
              variant="ghost"
              size="sm"
              aria-label={t('pluginMoreActions')}
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {plugin.author && (
              <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                {t('pluginByAuthor', { author: plugin.author })}
              </DropdownMenuLabel>
            )}
            {plugin.homepage && (
              <DropdownMenuItem onClick={handleOpenHomepage}>
                <ExternalLink className="h-4 w-4" />
                {t('pluginHomepage')}
              </DropdownMenuItem>
            )}
            {(plugin.author || plugin.homepage) && <DropdownMenuSeparator />}
            <DropdownMenuItem
              onClick={handleRemove}
              disabled={isBusy}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              {t('removeBtn')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Switch
          checked={plugin.enabled}
          onCheckedChange={handleToggle}
          disabled={isBusy}
          aria-label={plugin.name}
        />
      </div>
    );
  }
);

export { InstalledPluginRow };
