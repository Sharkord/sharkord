import { closeServerScreens } from '@/features/server-screens/actions';
import { useAdminGeneral } from '@/features/server/admin/hooks';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Group,
  Input,
  LoadingCard,
  Switch,
  Textarea
} from '@sharkord/ui';
import { memo } from 'react';
import { LogoManager } from './logo-manager';

const General = memo(() => {
  const { settings, logo, loading, onChange, submit, errors, refetch } =
    useAdminGeneral();

  if (loading) {
    return <LoadingCard className="h-[600px]" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Server Information</CardTitle>
        <CardDescription>
          Manage your server's basic information
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Group label="Name">
          <Input
            value={settings.name}
            onChange={(e) => onChange('name', e.target.value)}
            placeholder="Enter server name"
            error={errors.name}
          />
        </Group>

        <Group label="Description">
          <Textarea
            value={settings.description}
            onChange={(e) => onChange('description', e.target.value)}
            placeholder="Enter server description"
            rows={4}
          />
        </Group>

        <Group label="Password">
          <Input
            value={settings.password}
            onChange={(e) => onChange('password', e.target.value)}
            placeholder="Leave empty for no password"
            error={errors.password}
          />
        </Group>

        <LogoManager logo={logo} refetch={refetch} />

        <Group
          label="Allow New Users"
          description="Allow anyone to register and join your server. If disabled, only users you invite can join."
        >
          <Switch
            checked={settings.allowNewUsers}
            onCheckedChange={(checked) => onChange('allowNewUsers', checked)}
          />
        </Group>

        <Group
          label="Enable Plugins"
          description="Enable or disable plugins for your server."
        >
          <Switch
            checked={settings.enablePlugins}
            onCheckedChange={(checked) => onChange('enablePlugins', checked)}
          />
        </Group>

        <Group
          label="Enable Direct Messages"
          description="Allow users to open and use direct messages."
        >
          <Switch
            checked={settings.directMessagesEnabled}
            onCheckedChange={(checked) =>
              onChange('directMessagesEnabled', checked)
            }
          />
        </Group>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={closeServerScreens}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={loading}>
            Save Changes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});

export { General };
