const getDefaultValue = (value: unknown): unknown => {
  if (typeof value === 'string') return '';
  if (typeof value === 'number') return -1;
  if (typeof value === 'boolean') return false;
  if (Array.isArray(value)) return [];
  if (value !== null && typeof value === 'object') return {};

  return null;
};

interface IClearFields {
  <T extends Record<string, unknown>>(obj: T[], fields: (keyof T)[]): T[];
  <T extends Record<string, unknown>>(obj: T, fields: (keyof T)[]): T;
}

const clearFields: IClearFields = <T extends Record<string, unknown>>(
  obj: T | T[],
  fields: (keyof T)[]
): T | T[] => {
  if (Array.isArray(obj)) {
    return obj.map((item) => {
      if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
        const newObj = { ...item };

        fields.forEach((field) => {
          newObj[field] = getDefaultValue(item[field]) as T[keyof T];
        });

        return newObj;
      }
      return item;
    });
  }

  const newObj = { ...obj };

  fields.forEach((field) => {
    newObj[field] = getDefaultValue(obj[field]) as T[keyof T];
  });

  return newObj;
};

export { clearFields };
