// removes the named fields rather than blanking them. it used to substitute a same-typed
// placeholder ('', -1, false, {}), which meant a redacted field still appeared in the
// response and in the inferred client type: callers could read it, get a plausible value and
// never know it was redacted. the numeric case was the sharp one, since -1 reads as an id
interface IOmitFields {
  <T extends Record<string, unknown>, K extends keyof T>(
    obj: T[],
    fields: K[]
  ): Omit<T, K>[];
  <T extends Record<string, unknown>, K extends keyof T>(
    obj: T,
    fields: K[]
  ): Omit<T, K>;
}

const omitField = <T extends Record<string, unknown>, K extends keyof T>(
  item: T,
  fields: K[]
): Omit<T, K> => {
  const result = { ...item };

  fields.forEach((field) => {
    delete result[field];
  });

  return result;
};

const clearFields = (<T extends Record<string, unknown>, K extends keyof T>(
  obj: T | T[],
  fields: K[]
) => {
  if (Array.isArray(obj)) {
    return obj.map((item) => omitField(item, fields));
  }

  return omitField(obj, fields);
}) as IOmitFields;

export { clearFields };
