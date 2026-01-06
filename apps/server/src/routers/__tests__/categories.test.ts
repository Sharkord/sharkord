import { describe, expect, test } from 'bun:test';
import { initTest } from '../../__tests__/helpers';

describe('categories router', () => {
  test('should throw when user lacks permissions (get)', async () => {
    const { caller } = await initTest(2);

    await expect(
      caller.categories.get({
        categoryId: 1
      })
    ).rejects.toThrow('Insufficient permissions');
  });

  test('should throw when user lacks permissions (update)', async () => {
    const { caller } = await initTest(2);

    await expect(
      caller.categories.update({
        categoryId: 1,
        name: 'Updated Category Name'
      })
    ).rejects.toThrow('Insufficient permissions');
  });

  test('should throw when user lacks permissions (delete)', async () => {
    const { caller } = await initTest(2);

    await expect(
      caller.categories.delete({
        categoryId: 1
      })
    ).rejects.toThrow('Insufficient permissions');
  });

  test('should throw when user lacks permissions (create)', async () => {
    const { caller } = await initTest(2);

    await expect(
      caller.categories.add({
        name: 'New Category'
      })
    ).rejects.toThrow('Insufficient permissions');
  });

  test('should throw when user lacks permissions (reorder)', async () => {
    const { caller } = await initTest(2);

    await expect(
      caller.categories.reorder({
        categoryIds: [2, 1]
      })
    ).rejects.toThrow('Insufficient permissions');
  });

  test('should get existing category', async () => {
    const { caller } = await initTest();

    const categories = await caller.categories.get({
      categoryId: 1
    });

    expect(categories).toBeDefined();
    expect(categories.id).toBe(1);
    expect(categories.name).toBe('Text Channels');
  });

  test('should create new category', async () => {
    const { caller } = await initTest();

    const id = await caller.categories.add({
      name: 'New Category'
    });

    const category = await caller.categories.get({
      categoryId: id
    });

    expect(category).toBeDefined();
    expect(category.name).toBe('New Category');
  });

  test('should reorder categories', async () => {
    const { caller } = await initTest();

    await caller.categories.reorder({
      categoryIds: [2, 1]
    });

    const firstCategory = await caller.categories.get({
      categoryId: 1
    });

    const secondCategory = await caller.categories.get({
      categoryId: 2
    });

    expect(firstCategory.position).toBe(2);
    expect(secondCategory.position).toBe(1);
  });

  test('should update existing category', async () => {
    const { caller } = await initTest();

    await caller.categories.update({
      categoryId: 1,
      name: 'Updated Category Name'
    });

    const updatedCategory = await caller.categories.get({
      categoryId: 1
    });

    expect(updatedCategory).toBeDefined();
    expect(updatedCategory.name).toBe('Updated Category Name');
  });

  test('should delete existing category', async () => {
    const { caller } = await initTest();

    await caller.categories.delete({
      categoryId: 1
    });

    await expect(
      caller.categories.get({
        categoryId: 1
      })
    ).rejects.toThrow('Category not found');
  });

  test('should throw error when deleting non-existing category', async () => {
    const { caller } = await initTest();

    await expect(
      caller.categories.delete({
        categoryId: 999
      })
    ).rejects.toThrow('Category not found');
  });

  test('should throw error when updating non-existing category', async () => {
    const { caller } = await initTest();

    await expect(
      caller.categories.update({
        categoryId: 999,
        name: 'Non-existing Category'
      })
    ).rejects.toThrow('Category not found');
  });
});
