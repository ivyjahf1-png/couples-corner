/**
 * Genotype options for the profile "Genotype" selector.
 * Common hemoglobin/medical genotype codes, plus a freeform custom option.
 * The value itself is a plain string, so the combobox also accepts custom text.
 */
export const GENOTYPES: string[] = [
  "AA",
  "AS",
  "AC",
  "SS",
  "SC",
  "CC",
  "S\u00B0",
  "C\u00B0",
  "Thalassemia trait",
  "Other",
];

/** Suggest genotypes matching the query (case-insensitive). */
export function searchGenotypes(query: string, max = 8): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return GENOTYPES.slice(0, max);
  return GENOTYPES.filter((g) => g.toLowerCase().includes(q)).slice(0, max);
}