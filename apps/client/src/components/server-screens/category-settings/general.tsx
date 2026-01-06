import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Group } from '@/components/ui/group';
import { Input } from '@/components/ui/input';
import { closeServerScreens } from '@/features/server-screens/actions';
import { useAdminCategoryGeneral } from '@/features/server/admin/hooks';
import { memo } from 'react';

type TGeneralProps = {
  categoryId: number;
};

const General = memo(({ categoryId }: TGeneralProps) => {
  const { category, loading, onChange, submit, errors } =
    useAdminCategoryGeneral(categoryId);

  if (!category) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Category Information</CardTitle>
        <CardDescription>
          Manage your category's basic information
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Group label="Name">
          <Input
            value={category.name}
            onChange={(e) => onChange('name', e.target.value)}
            placeholder="Enter category name"
            error={errors.name}
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
