export function mediaCountFor(product: {
  media?: { length: number };
}): number {
  return product.media?.length ?? 0;
}
