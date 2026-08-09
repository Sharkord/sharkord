import { inArray, sql } from 'drizzle-orm';
import { db } from '..';
import { categories, channels } from '../schema';

type TPositionedTable = typeof categories | typeof channels;

const mergeOrder = (existingIds: number[], requestedIds: number[]) => {
  const existing = new Set(existingIds);
  const taken = new Set<number>();
  const order: number[] = [];

  for (const id of requestedIds) {
    if (existing.has(id) && !taken.has(id)) {
      taken.add(id);
      order.push(id);
    }
  }

  return [...order, ...existingIds.filter((id) => !taken.has(id))];
};

const reorderPositions = async (
  table: TPositionedTable,
  existingIds: number[],
  requestedIds: number[]
) => {
  const order = mergeOrder(existingIds, requestedIds);

  if (order.length === 0) return order;

  const cases = order.map(
    (id, index) => sql`when ${table.id} = ${id} then ${index + 1}`
  );

  await db
    .update(table)
    .set({
      position: sql`case ${sql.join(cases, sql` `)} end`,
      updatedAt: Date.now()
    })
    .where(inArray(table.id, order));

  return order;
};

export { reorderPositions };
