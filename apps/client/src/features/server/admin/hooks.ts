import { requestConfirmation } from '@/features/dialogs/actions';
import { getTRPCClient, type TRouterOutputs } from '@/lib/trpc';
import {
  DELETED_USER_IDENTITY_AND_NAME,
  parseTrpcErrors,
  type TCategory,
  type TChannel,
  type TChannelRolePermission,
  type TChannelUserPermission,
  type TDiskMetrics,
  type TFile,
  type TJoinedEmoji,
  type TJoinedInvite,
  type TJoinedRole,
  type TJoinedSettings,
  type TLogin,
  type TMessage,
  type TPluginInfo,
  type TStorageData,
  type TStorageSettings,
  type TTrpcErrors
} from '@sharkord/shared';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

export type TAdminUser = TRouterOutputs['users']['getAll'][number];
export type TAdminUserInfo = TRouterOutputs['users']['getInfo']['user'];

export const useAdminGeneral = () => {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<
    Omit<TJoinedSettings, 'secretToken'> | undefined
  >(undefined);

  const fetchSettings = useCallback(async () => {
    setLoading(true);

    const trpc = getTRPCClient();

    setSettings(await trpc.others.getSettings.query());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return { settings, refetch: fetchSettings, loading };
};

export const useAdminUpdates = () => {
  const { t } = useTranslation('common');
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

      toast.success(t('common:serverUpdateInitiated'));
    } catch (error) {
      console.error('Error updating server:', error);
      setErrors(parseTrpcErrors(error));
    }
  }, [t]);

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

export const useAdminPlugins = (canManagePlugins: boolean) => {
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<TTrpcErrors>({});
  const [plugins, setPlugins] = useState<TPluginInfo[]>([]);

  const fetchPlugins = useCallback(async () => {
    if (!canManagePlugins) {
      setLoading(false);
      return;
    }

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
  }, [canManagePlugins]);

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

export const useAdminChannelGeneral = (channelId: number) => {
  const [loading, setLoading] = useState(true);
  const [channel, setChannel] = useState<TChannel | undefined>(undefined);

  const fetchChannel = useCallback(async () => {
    setLoading(true);

    const trpc = getTRPCClient();

    setChannel(await trpc.channels.get.query({ channelId }));
    setLoading(false);
  }, [channelId]);

  useEffect(() => {
    fetchChannel();
  }, [fetchChannel]);

  return { channel, refetch: fetchChannel, loading };
};

export const useAdminCategoryGeneral = (categoryId: number) => {
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<TCategory | undefined>(undefined);

  const fetchCategory = useCallback(async () => {
    setLoading(true);

    const trpc = getTRPCClient();

    setCategory(await trpc.categories.get.query({ categoryId }));
    setLoading(false);
  }, [categoryId]);

  useEffect(() => {
    fetchCategory();
  }, [fetchCategory]);

  return { category, refetch: fetchCategory, loading };
};

export const useAdminEmojis = () => {
  const [loading, setLoading] = useState(true);
  const [emojis, setEmojis] = useState<TJoinedEmoji[]>([]);

  const fetchEmojis = useCallback(async () => {
    setLoading(true);

    const trpc = getTRPCClient();

    setEmojis(await trpc.emojis.getAll.query());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchEmojis();
  }, [fetchEmojis]);

  return { emojis, refetch: fetchEmojis, loading };
};

export const useAdminRoles = () => {
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<TJoinedRole[]>([]);

  const fetchRoles = useCallback(async () => {
    setLoading(true);

    const trpc = getTRPCClient();

    setRoles(await trpc.roles.getAll.query());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  return { roles, refetch: fetchRoles, loading };
};

export const useAdminStorage = () => {
  const [loading, setLoading] = useState(true);
  const [storageSettings, setStorageSettings] = useState<
    TStorageSettings | undefined
  >(undefined);
  const [diskMetrics, setDiskMetrics] = useState<TDiskMetrics | undefined>(
    undefined
  );

  const fetchStorageSettings = useCallback(async () => {
    setLoading(true);

    const trpc = getTRPCClient();
    const { storageSettings, diskMetrics } =
      await trpc.others.getStorageSettings.query();

    setStorageSettings(storageSettings);
    setDiskMetrics(diskMetrics);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchStorageSettings();
  }, [fetchStorageSettings]);

  return {
    storageSettings,
    diskMetrics,
    refetch: fetchStorageSettings,
    loading
  };
};

export const useAdminUsers = () => {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<TAdminUser[]>([]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);

    const trpc = getTRPCClient();
    const users = await trpc.users.getAll.query();

    const filteredUsers = users.filter(
      (user) => user.name !== DELETED_USER_IDENTITY_AND_NAME
    );

    setUsers(filteredUsers);
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
      await trpc.channels.getPermissions.query({ channelId });

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
  const [user, setUser] = useState<TAdminUserInfo | null>(null);
  const [logins, setLogins] = useState<TLogin[]>([]);
  const [files, setFiles] = useState<TFile[]>([]);
  const [messages, setMessages] = useState<TMessage[]>([]);
  const [storage, setStorage] = useState<TStorageData & { quota: number }>({
    userId,
    fileCount: 0,
    usedStorage: 0,
    quota: 0
  });

  const fetchUser = useCallback(async () => {
    setLoading(true);

    const trpc = getTRPCClient();
    const { user, logins, files, messages, storage } =
      await trpc.users.getInfo.query({
        userId
      });

    setUser(user);
    setLoading(false);
    setLogins(logins);
    setFiles(files);
    setMessages(messages);
    setStorage(storage);
  }, [userId]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  return {
    user,
    logins,
    files,
    storage,
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
