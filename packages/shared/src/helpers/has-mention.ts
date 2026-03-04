const hasMention = (
  content: string | null | undefined,
  userId: number | undefined
): boolean => {
  if (!content || !userId) return false;

  const pattern = new RegExp(
    `<span[^>]*(?:\\bdata-type="mention"[^>]*\\bdata-user-id="${userId}"|\\bdata-user-id="${userId}"[^>]*\\bdata-type="mention")[^>]*>`
  );

  return pattern.test(content);
};

export { hasMention };
