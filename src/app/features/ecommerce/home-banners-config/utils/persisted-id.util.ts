const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function toPersistedId(id?: string): string | undefined {
  if (!id?.trim()) {
    return undefined;
  }

  return UUID_REGEX.test(id) ? id : undefined;
}
