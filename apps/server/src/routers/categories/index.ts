import { t } from '../../utils/trpc';
import { addCategoryRoute } from './add-category';
import { deleteCategoryRoute } from './delete-category';
import {
  onCategoryCreateRoute,
  onCategoryDeleteRoute,
  onCategoryUpdateRoute
} from './events';
import { getCategoryRoute } from './get-category';
import { reorderCategoriesRoute } from './reorder-categories';
import { updateCategoryRoute } from './update-category';

export const categoriesRouter = t.router({
  add: addCategoryRoute,
  update: updateCategoryRoute,
  delete: deleteCategoryRoute,
  get: getCategoryRoute,
  reorder: reorderCategoriesRoute,
  onCreate: onCategoryCreateRoute,
  onDelete: onCategoryDeleteRoute,
  onUpdate: onCategoryUpdateRoute
});
