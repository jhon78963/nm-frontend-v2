const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseProductIdsInput(value: string): string[] {
  return value
    .split(',')
    .map((id) => id.trim())
    .filter((id) => UUID_REGEX.test(id));
}

export function formatProductIdsInput(ids: string[]): string {
  return ids.join(', ');
}
