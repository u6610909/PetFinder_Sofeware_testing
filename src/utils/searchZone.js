export function hoursSince(dateStr) {
  const t = new Date(dateStr).getTime();
  const now = Date.now();
  const diffMs = Math.max(0, now - (isNaN(t) ? now : t));
  return diffMs / 36e5;
}
export function baseRadiusByHours(h) {
  if (h < 6) return 2;      // <6h → 2km
  if (h < 24) return 5;     // <24h → 5km
  if (h < 72) return 10;    // <72h → 10km
  return 15;                // >=72h → 15km
}
export function searchTierText(h) {
  if (h < 6) return "<6h";
  if (h < 24) return "<24h";
  if (h < 72) return "<72h";
  return ">=72h";
}
export function computeSearchRadiusKm(lastSeenAt, opts = {}) {
  const h = hoursSince(lastSeenAt);
  let r = baseRadiusByHours(h);
  if (opts.hasGPS) r = Math.min(r, 1);
  if (opts.specialNeeds) r = r * 0.6;
  return { km: Number(r.toFixed(2)), hours: h, tier: searchTierText(h) };
}