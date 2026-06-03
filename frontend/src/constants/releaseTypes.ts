export const RELEASE_TYPES = [
  "Studio Album",
  "EP",
  "Compilation",
  "Live Album",
  "Single",
] as const;

export type ReleaseType = (typeof RELEASE_TYPES)[number];

export function releaseTypeFacetOptions(
  facets: { value: string; count: number }[] | undefined
): { value: string; count: number }[] {
  const byValue = new Map((facets ?? []).map((f) => [f.value, f.count]));
  return RELEASE_TYPES.map((value) => ({
    value,
    count: byValue.get(value) ?? 0,
  }));
}
