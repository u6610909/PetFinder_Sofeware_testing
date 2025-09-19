// =============================================
// searchZone.js
// Helpers for computing recommended search radius.
// - Base radius by elapsed hours since last seen
//   <6h => 2km, <24h => 5km, <72h => 10km, >=72h => 15km
// - If gpsEnabled: clamp radius to <= 1km
// - If specialNeeds: reduce radius by 40%
// =============================================

export function hoursSince(dateStr) {
  const t = new Date(dateStr);
  const now = new Date();
  if (isNaN(t.getTime())) return 0;
  return Math.max(0, (now - t) / 36e5);
}

export function baseRadiusByHours(h) {
  if (h < 6) return 2;      // km
  if (h < 24) return 5;     // km
  if (h < 72) return 10;    // km
  return 15;                // km
}

export function computeSearchRadiusKm(lastSeenAt, opts = {}) {
  const { gpsEnabled = false, specialNeeds = false } = opts;
  const h = hoursSince(lastSeenAt);
  let r = baseRadiusByHours(h);
  if (gpsEnabled) r = Math.min(r, 1);   // clamp <= 1 km
  if (specialNeeds) r = r * 0.6;        // -40%
  const km = Number(r.toFixed(2));
  return { km, hours: h, tier: searchTierText(h) };
}

export function searchTierText(h) {
  if (h < 6)  return "< 6h → 2 km";
  if (h < 24) return "< 24h → 5 km";
  if (h < 72) return "< 72h → 10 km";
  return "≥ 72h → 15 km";
}