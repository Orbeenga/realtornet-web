/**
 * Formats a count with singular/plural label for display.
 * Returns empty string when count is 0, null, or undefined.
 *
 * @example
 * formatUnitMeta(2, "bed", "beds") // "2 beds"
 * formatUnitMeta(1, "bath", "baths") // "1 bath"
 * formatUnitMeta(0, "bed", "beds") // ""
 */
export function formatUnitMeta(
  count: number | null | undefined,
  labelSingular: string,
  labelPlural: string,
): string {
  if (count == null || count === 0) return "";
  return `${count} ${count === 1 ? labelSingular : labelPlural}`;
}
