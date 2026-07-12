// Weight is always stored canonically in kilograms (weigh_ins.weight_kg).
// Convert at the edges for display/entry only.

export function kgToLbs(kg: number): number {
  return kg * 2.2046226218;
}

export function lbsToKg(lbs: number): number {
  return lbs / 2.2046226218;
}

export function displayWeight(kg: number, unit: "lbs" | "kg"): number {
  const value = unit === "lbs" ? kgToLbs(kg) : kg;
  return Math.round(value * 10) / 10;
}

export function toKg(value: number, unit: "lbs" | "kg"): number {
  return unit === "lbs" ? lbsToKg(value) : value;
}
