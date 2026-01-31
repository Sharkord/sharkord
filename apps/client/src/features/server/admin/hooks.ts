import { requestConfirmation } from '@/features/dialogs/actions';
import { parseTrpcErrors, type TTrpcErrors } from '@/helpers/parse-trpc-errors';
import { useForm } from '@/hooks/use-form';
import { getTRPCClient } from '@/lib/trpc';
import {
  Permission,
  STORAGE_MAX_FILE_SIZE,
  STORAGE_MAX_QUOTA_PER_USER,
  STORAGE_OVERFLOW_ACTION,
  STORAGE_QUOTA,
  StorageOverflowAction,
  type TCategory,
  type TChannel,
  type TChannelRolePermission,
  type TChannelUserPermission,
  type TDiskMetrics,
  type TFile,
  type TJoinedEmoji,
  type TJoinedInvite,
  type TJoinedRole,
  type TJoinedUser,
  type TLogin,
  type TMessage,
  type TPluginInfo,
  type TRole,
  type TStorageSettings
} from '@sharkord/shared';
import { filesize } from 'filesize';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useCan } from '../hooks';

// TODO: review this whole file for optimizations and improvements

export const useAdminGeneral = () => {
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<TTrpcErrors>({});
  const [settings, setSettings] = useState({
    name: '',
    description: '',
    password: '',
    allowNewUsers: false,
    enablePlugins: false
  });
  const [logo, setLogo] = useState<TFile | null>(null);

  const fetchSettings = useCallback(async () => {
    setLoading(true);

    const trpc = getTRPCClient();
    const settings = await trpc.others.getSettings.query();

    setSettings({
      name: settings.name,
      description: settings.description ?? '',
      password: settings.password ?? '',
      allowNewUsers: settings.allowNewUsers ?? false,
      enablePlugins: settings.enablePlugins ?? false
    });
    setLoading(false);
    setLogo(settings.logo);
  }, []);

  const submit = useCallback(async () => {
    const trpc = getTRPCClient();

    try {
      await trpc.others.updateSettings.mutate({
        name: settings.name,
        description: settings.description,
        password: settings.password || undefined,
        allowNewUsers: settings.allowNewUsers,
        enablePlugins: settings.enablePlugins
      });
      toast.success('Settings updated');
    } catch (error) {
      console.error('Error updating settings:', error);
      setErrors(parseTrpcErrors(error));
    }
  }, [settings]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onChange = useCallback((field: keyof typeof settings, value: any) => {
    setSettings((s) => ({ ...s, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return {
    settings,
    refetch: fetchSettings,
    loading,
    submit,
    errors,
    onChange,
    logo
  };
};

export const useAdminUpdates = () => {
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<TTrpcErrors>({});
  const [hasUpdate, setHasUpdate] = useState(false);
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [currentVersion, setCurrentVersion] = useState<string | null>(null);
  const [canUpdate, setCanUpdate] = useState(false);

  const fetchUpdate = useCallback(async () => {
    setLoading(true);

    const trpc = getTRPCClient();

    try {
      const { hasUpdate, latestVersion, canUpdate, currentVersion } =
        await trpc.others.getUpdate.query();

      setHasUpdate(hasUpdate);
      setLatestVersion(latestVersion);
      setCurrentVersion(currentVersion);
      setCanUpdate(canUpdate);
    } catch (error) {
      console.error('Error fetching update:', error);
      setErrors(parseTrpcErrors(error));
    }

    setLoading(false);
  }, []);

  const update = useCallback(async () => {
    const answer = await requestConfirmation({
      title: 'Are you sure you want to update the server?',
      message:
        'This will download and install the latest version of the server. The server will be restarted during the process, which may cause temporary downtime.',
      confirmLabel: 'Update',
      cancelLabel: 'Cancel'
    });

    if (!answer) return;

    const trpc = getTRPCClient();

    try {
      trpc.others.updateServer.mutate();

      toast.success('Server update initiated');
    } catch (error) {
      console.error('Error updating server:', error);
      setErrors(parseTrpcErrors(error));
    }
  }, []);

  useEffect(() => {
    fetchUpdate();
  }, [fetchUpdate]);

  return {
    refetch: fetchUpdate,
    loading,
    hasUpdate,
    latestVersion,
    currentVersion,
    canUpdate,
    errors,
    update
  };
};

export const useAdminPlugins = () => {
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<TTrpcErrors>({});
  const [plugins, setPlugins] = useState<TPluginInfo[]>([]);

  const fetchPlugins = useCallback(async () => {
    setLoading(true);

    const trpc = getTRPCClient();

    try {
      const { plugins } = await trpc.plugins.get.query();

      // TODO: check this
      // @ts-expect-error - ver esta merda wtf
      setPlugins(plugins);
    } catch (error) {
      console.error('Error fetching plugins:', error);
      setErrors(parseTrpcErrors(error));
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPlugins();
  }, [fetchPlugins]);

  return {
    refetch: fetchPlugins,
    plugins,
    loading,
    errors
  };
};

export const useHasUpdates = () => {
  const can = useCan();
  const [hasUpdates, setHasUpdates] = useState(false);

  const fetchHasUpdates = useCallback(async () => {
    if (!can(Permission.MANAGE_UPDATES)) return;

    const trpc = getTRPCClient();

    try {
      const { hasUpdate } = await trpc.others.getUpdate.query();

      setHasUpdates(hasUpdate);
    } catch (error) {
      console.error('Error fetching update status:', error);
    }
  }, [can]);

  useEffect(() => {
    fetchHasUpdates();
  }, [fetchHasUpdates]);

  return hasUpdates;
};

export const useAdminChannelGeneral = (channelId: number) => {
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<TTrpcErrors>({});
  const [channel, setChannel] = useState<TChannel | undefined>(undefined);

  const fetchChannel = useCallback(async () => {
    setLoading(true);

    const trpc = getTRPCClient();
    const channel = await trpc.channels.get.query({ channelId });

    setChannel(channel);
    setLoading(false);
  }, [channelId]);

  const submit = useCallback(async () => {
    const trpc = getTRPCClient();

    try {
      await trpc.channels.update.mutate({
        channelId,
        name: channel?.name ?? '',
        topic: channel?.topic ?? null,
        private: channel?.private ?? false
      });

      toast.success('Channel updated');
    } catch (error) {
      console.error('Error updating channel:', error);
      setErrors(parseTrpcErrors(error));
    }
  }, [channel, channelId]);

  const onChange = useCallback(
    (field: keyof TChannel, value: string | null | boolean) => {
      if (!channel) return;
      setChannel((c) => (c ? { ...c, [field]: value } : c));
      setErrors((e) => ({ ...e, [field]: undefined }));
    },
    [channel]
  );

  useEffect(() => {
    fetchChannel();
  }, [fetchChannel]);

  return {
    channel,
    refetch: fetchChannel,
    loading,
    errors,
    onChange,
    submit
  };
};

export const useAdminCategoryGeneral = (categoryId: number) => {
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<TTrpcErrors>({});
  const [category, setCategory] = useState<TCategory | undefined>(undefined);

  const fetchCategory = useCallback(async () => {
    setLoading(true);

    const trpc = getTRPCClient();
    const category = await trpc.categories.get.query({ categoryId });

    setCategory(category);
    setLoading(false);
  }, [categoryId]);

  const submit = useCallback(async () => {
    const trpc = getTRPCClient();

    try {
      await trpc.categories.update.mutate({
        categoryId,
        name: category?.name ?? ''
      });

      toast.success('Category updated');
    } catch (error) {
      console.error('Error updating category:', error);
      setErrors(parseTrpcErrors(error));
    }
  }, [category, categoryId]);

  const onChange = useCallback(
    (field: keyof TCategory, value: string | null) => {
      if (!category) return;
      setCategory((c) => (c ? { ...c, [field]: value } : c));
      setErrors((e) => ({ ...e, [field]: undefined }));
    },
    [category]
  );

  useEffect(() => {
    fetchCategory();
  }, [fetchCategory]);

  return {
    category,
    refetch: fetchCategory,
    loading,
    errors,
    onChange,
    submit
  };
};

export const useAdminEmojis = () => {
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<TTrpcErrors>({});
  const [emojis, setEmojis] = useState<TJoinedEmoji[]>([]);

  const fetchEmojis = useCallback(async () => {
    setLoading(true);

    const trpc = getTRPCClient();
    const emojis = await trpc.emojis.getAll.query();

    setEmojis(emojis);
    setLoading(false);
  }, []);

  const onChange = useCallback(
    (field: keyof TJoinedEmoji, value: string | null) => {
      if (!emojis) return;

      setEmojis((c) => (c ? { ...c, [field]: value } : c));
      setErrors((e) => ({ ...e, [field]: undefined }));
    },
    [emojis]
  );

  useEffect(() => {
    fetchEmojis();
  }, [fetchEmojis]);

  return {
    emojis,
    refetch: fetchEmojis,
    loading,
    errors,
    onChange
  };
};

export const useAdminRoles = () => {
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<TTrpcErrors>({});
  const [roles, setRoles] = useState<TJoinedRole[]>([]);

  const fetchRoles = useCallback(async () => {
    setLoading(true);

    const trpc = getTRPCClient();
    const roles = await trpc.roles.getAll.query();

    setRoles(roles);
    setLoading(false);
  }, []);

  const onChange = useCallback(
    (field: keyof TRole, value: string | null) => {
      if (!roles) return;

      setRoles((c) => (c ? { ...c, [field]: value } : c));
      setErrors((e) => ({ ...e, [field]: undefined }));
    },
    [roles]
  );

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  return {
    roles,
    refetch: fetchRoles,
    loading,
    errors,
    onChange
  };
};

export const useAdminStorage = () => {
  const [loading, setLoading] = useState(true);
  const { values, setValues, setTrpcErrors, r, onChange } =
    useForm<TStorageSettings>({
      storageOverflowAction: STORAGE_OVERFLOW_ACTION,
      storageSpaceQuotaByUser: STORAGE_MAX_QUOTA_PER_USER,
      storageUploadEnabled: true,
      storageUploadMaxFileSize: STORAGE_MAX_FILE_SIZE,
      storageQuota: STORAGE_QUOTA
    });
  const [diskMetrics, setDiskMetrics] = useState<TDiskMetrics | undefined>(
    undefined
  );

  const fetchStorageSettings = useCallback(async () => {
    setLoading(true);

    const trpc = getTRPCClient();
    const { storageSettings, diskMetrics } =
      await trpc.others.getStorageSettings.query();

    setValues(storageSettings);
    setDiskMetrics(diskMetrics);
    setLoading(false);
  }, [setValues]);

  const submit = useCallback(async () => {
    const trpc = getTRPCClient();

    try {
      await trpc.others.updateSettings.mutate({
        storageUploadEnabled: values.storageUploadEnabled,
        storageUploadMaxFileSize: values.storageUploadMaxFileSize,
        storageSpaceQuotaByUser: values.storageSpaceQuotaByUser,
        storageOverflowAction:
          values.storageOverflowAction as StorageOverflowAction
      });
      toast.success('Storage settings updated');
    } catch (error) {
      console.error('Error updating storage settings:', error);
      setTrpcErrors(error);
    }
  }, [values, setTrpcErrors]);

  const labels = useMemo(() => {
    return {
      storageUploadMaxFileSize: filesize(
        Number(values.storageUploadMaxFileSize ?? 0),
        {
          output: 'object',
          standard: 'jedec'
        }
      ),
      storageSpaceQuotaByUser: filesize(
        Number(values.storageSpaceQuotaByUser ?? 0),
        {
          output: 'object',
          standard: 'jedec'
        }
      ),
      storageQuota: filesize(Number(values.storageQuota ?? 0), {
        output: 'object',
        standard: 'jedec'
      })
    };
  }, [values]);

  useEffect(() => {
    fetchStorageSettings();
  }, [fetchStorageSettings]);

  return {
    values,
    labels,
    refetch: fetchStorageSettings,
    loading,
    submit,
    r,
    onChange,
    diskMetrics
  };
};

export const useAdminUsers = () => {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<TJoinedUser[]>([]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);

    const trpc = getTRPCClient();
    const users = await trpc.users.getAll.query();

    setUsers(users);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return {
    users,
    refetch: fetchUsers,
    loading
  };
};

export const useAdminChannelPermissions = (channelId: number) => {
  const [loading, setLoading] = useState(true);
  const [rolePermissions, setRolePermissions] = useState<
    TChannelRolePermission[]
  >([]);
  const [userPermissions, setUserPermissions] = useState<
    TChannelUserPermission[]
  >([]);

  const fetchPermissions = useCallback(async () => {
    setLoading(true);

    const trpc = getTRPCClient();
    const { rolePermissions, userPermissions } =
      await trpc.channels.getPermissions.mutate({ channelId });

    setRolePermissions(rolePermissions);
    setUserPermissions(userPermissions);
    setLoading(false);
  }, [channelId]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  return {
    rolePermissions,
    userPermissions,
    refetch: fetchPermissions,
    loading
  };
};

export const useAdminUserInfo = (userId: number) => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<TJoinedUser | null>(null);
  const [logins, setLogins] = useState<TLogin[]>([]);
  const [files, setFiles] = useState<TFile[]>([]);
  const [messages, setMessages] = useState<TMessage[]>([]);

  const fetchUser = useCallback(async () => {
    setLoading(true);

    const trpc = getTRPCClient();
    const { user, logins, files, messages } = await trpc.users.getInfo.query({
      userId
    });

    setUser(user);
    setLoading(false);
    setLogins(logins);
    setFiles(files);
    setMessages(messages);
  }, [userId]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  return {
    user,
    logins,
    files,
    refetch: fetchUser,
    loading,
    messages
  };
};

export const useAdminInvites = () => {
  const [loading, setLoading] = useState(true);
  const [invites, setInvites] = useState<TJoinedInvite[]>([]);

  const fetchInvites = useCallback(async () => {
    setLoading(true);

    const trpc = getTRPCClient();
    const invites = await trpc.invites.getAll.query();

    setInvites(invites);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchInvites();
  }, [fetchInvites]);

  return {
    invites,
    refetch: fetchInvites,
    loading
  };
};
