// a settings form is dirty by value, not by identity: a toggle flipped back to its original state,
// or a rebuilt array holding the same members, counts as clean
const hasUnsavedChanges = (values: unknown, baseline: unknown) =>
  JSON.stringify(values) !== JSON.stringify(baseline);

export { hasUnsavedChanges };
