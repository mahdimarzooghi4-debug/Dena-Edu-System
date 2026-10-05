/** Deterministic tie-breaking keeps equivalent workload assignments stable. */
export function selectLeastLoadedSupportOperator(
  operatorIds: string[],
  openWorkloads: Map<string, number>,
) {
  return [...operatorIds].sort((left, right) =>
    (openWorkloads.get(left) ?? 0) - (openWorkloads.get(right) ?? 0) ||
    left.localeCompare(right),
  )[0] ?? null;
}
