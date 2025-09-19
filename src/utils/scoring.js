export const WEIGHTS = {
  distance: 0.25,
  time: 0.20,
  breed: 0.25,
  color: 0.10,
  size: 0.10,
  age: 0.10,
};

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
export function sizeScore(a, b) {
  if (!a || !b) return 0;
  const sizeMap = {
    small: 0,
    medium: 1,
    large: 2,
  };
  const scoreMatrix = [
    [100, 50, 0],
    [50, 100, 50],
    [0, 50, 100],
  ];
  const i = sizeMap[a.toLowerCase()];
  const j = sizeMap[b.toLowerCase()];
  if (i === undefined || j === undefined) return 0;
  return scoreMatrix[i][j];
}
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
    WEIGHTS.distance * distanceScoreKm(dKm) +
    WEIGHTS.time * timeScoreHours(hDiff) +
    WEIGHTS.breed * breedS +
    WEIGHTS.color * colorS +
    WEIGHTS.size * sizeS +
    WEIGHTS.age * ageS
  );
}