export function colorScore(a, b) {
  if (!a || !b) return 0;
  const A = String(a).toLowerCase();
  const B = String(b).toLowerCase();
  if (A === B) return 100;
  const setA = new Set(A.split(/\s|,|\//g).filter(Boolean));
  const setB = new Set(B.split(/\s|,|\//g).filter(Boolean));
  for (const t of setA) if (setB.has(t)) return 50;
  return 0;
}
export function distanceScoreKm(km) {
  const s = 1 - Math.min(km, 15) / 15;
  return Math.max(0, Math.round(s * 100));
}
export function timeScoreHours(diffHours) {
  const s = 1 - Math.min(diffHours, 72) / 72;
  return Math.max(0, Math.round(s * 100));
}
export function ageScore(a, b) { if (!a || !b) return 0; return a === b ? 100 : 0; }
export function sizeScore(a, b) { if (!a || !b) return 0; return a === b ? 100 : 0; }
export function breedScore(a, b) {
  if (!a || !b) return 0;
  if (a === b) return 100;
  const SIM = new Map([
    [["golden_retriever", "labrador_retriever"].toString(), 0.8],
    [["labrador_retriever", "golden_retriever"].toString(), 0.8],
  ]);
  const direct = SIM.get([a, b].toString());
  if (typeof direct === "number") return Math.round(direct * 100);
  return 25;
}
export function totalConfidence({ dKm, hDiff, breedS, colorS, sizeS, ageS }) {
  return Math.round(
    0.30 * distanceScoreKm(dKm) +
    0.20 * timeScoreHours(hDiff) +
    0.25 * breedS +
    0.15 * colorS +
    0.05 * sizeS +
    0.05 * ageS
  );
}