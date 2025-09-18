// src/App.jsx
// ==============================
// PetFinder – App (English UI)
// ==============================
// This file wires the core flows:
// - Lost + Sighting data stores (persisted with useLocalStore)
// - "Save Lost & Match" flow
// - Support multiple "My Lost Pets" (focus + found/removal)
// - Smart Alerts test harness (User2 Lost/Sighting triggers)
// - Notifications center + simple user preferences
// - Routing between Home / Data / Map / Alert Test / Notifications / Dev

import React, { useMemo, useState } from "react";

// Components
import LostForm from "./components/LostForm";
import SightingForm from "./components/SightingForm";
import MapLeafletPanel from "./components/MapLeafletPanel";
import DevTestPanel from "./components/DevTestPanel";
import NotificationsPanel from "./components/NotificationsPanel";
import AlertTestPanel from "./components/AlertTestPanel";

// Utils
import { useLocalStore, uid } from "./utils/datastore";
import { haversineKm } from "./utils/geo";
import { computeSearchRadiusKm } from "./utils/searchZone";
import {
  breedScore,
  colorScore,
  sizeScore,
  ageScore,
  totalConfidence,
  distanceScoreKm,
  timeScoreHours,
} from "./utils/scoring";

// Seeds
import { seededLostPets, seededSightings } from "./data/seed";

// --------------------------------------
// Matching helpers (Lost ↔ Sighting)
// --------------------------------------
function scoreLostToSighting(lost, sight) {
  const dKm = haversineKm(lost.geo.lat, lost.geo.lng, sight.geo.lat, sight.geo.lng);
  const hDiff = Math.abs((new Date(sight.time) - new Date(lost.lastSeenAt)) / 36e5);
  const breedS = breedScore(lost.breed, sight.breed);
  const colorS = colorScore(lost.color, sight.color);
  const sizeS = sizeScore(lost.size || "", sight.size || "");
  const ageS = ageScore(lost.age || "", sight.age || "");
  const conf = totalConfidence({ dKm, hDiff, breedS, colorS, sizeS, ageS });
  const distS = distanceScoreKm(dKm);
  const timeS = timeScoreHours(hDiff);
  const formula = `0.30*${distS} + 0.20*${timeS} + 0.25*${breedS} + 0.15*${colorS} + 0.05*${sizeS} + 0.05*${ageS}`;
  return {
    sight,
    metrics: {
      distanceKm: Number(dKm.toFixed(2)),
      timeDiffH: Number(hDiff.toFixed(1)),
      breedS,
      colorS,
      sizeS,
      ageS,
      distS,
      timeS,
      conf,
      formula,
    },
  };
}

// --------------------------------------
// Smart Alerts helpers
// --------------------------------------
function hoursSinceISO(iso) {
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return 0;
  return Math.max(0, (Date.now() - t.getTime()) / 36e5);
}

// Simple area risk based on recent sightings: count within 2km in last 72h
function areaRiskFromSightings({ lat, lng }, sightings = []) {
  const cutoffH = 72;
  const radiusKm = 2;
  let cnt = 0;
  for (const s of sightings || []) {
    const h = hoursSinceISO(s.time);
    if (h <= cutoffH) {
      const d = haversineKm(lat, lng, s.geo.lat, s.geo.lng);
      if (d <= radiusKm) cnt++;
    }
  }
  if (cnt >= 5) return "critical";
  if (cnt >= 1) return "normal";
  return "low";
}

function urgencyFrom(risk, hoursSince) {
  if (risk === "critical") return "high";
  if (hoursSince < 6) return "high";
  if (risk === "normal") return "medium";
  return "low";
}

export default function App() {
  const [tab, setTab] = useState("home");

  // ==============================
  // State: core stores (persisted)
  // ==============================
  const [lost, setLost] = useLocalStore("pf_lost", seededLostPets);
  const [sightings, setSightings] = useLocalStore("pf_sight", seededSightings);
  const [myLostId, setMyLostId] = useLocalStore("pf_myLostId", null);
  // Allow multiple "my" lost pets
  const [myLostIds, setMyLostIds] = useLocalStore("pf_myLostIds", []);
  // Latest match results (from last Save & Match)
  const [results, setResults] = useState([]);

  // ==================================
  // State: Smart Alerts & test scaffolds
  // ==================================
  // My user location + preferences + inbox + User2 sandbox data
  const [user, setUser] = useLocalStore("pf_user", { id: "ME", lat: 13.7563, lng: 100.5018 });
  const [prefs, setPrefs] = useLocalStore("pf_prefs", { alertRadiusKm: 5, frequency: "immediate" }); // immediate | mute
  const [notifs, setNotifs] = useLocalStore("pf_notifs", []);
  const [u2Lost, setU2Lost] = useLocalStore("pf_u2_lost", []);
  const [u2Sights, setU2Sights] = useLocalStore("pf_u2_sights", []);

  // Clear helpers for the Alert Test page
  const clearU2Lost = () => setU2Lost([]);
  const clearU2Sights = () => setU2Sights([]);
  const clearU2All = () => {
    setU2Lost([]);
    setU2Sights([]);
  };

  // ==================================
  // Handlers: Lost add & match (Home)
  // ==================================
  const handleAddAndMatch = (newLost) => {
    // Persist
    setLost((arr) => [...arr, newLost]);
    // Focus on map
    setMyLostId(newLost.id);
    // Track as one of "my" pets
    setMyLostIds((ids) => Array.from(new Set([...(ids || []), newLost.id])));

    // Compute matches against all sightings of same species
    const rows = (sightings || [])
      .filter((s) => s.species === newLost.species)
      .map((s) => scoreLostToSighting(newLost, s))
      .sort((a, b) => b.metrics.conf - a.metrics.conf);

    setResults(rows);
  };

  // Remove a pet once found (delete from store + from my list)
  const handleFoundPet = (petId) => {
    if (!petId) return;
    setLost((arr) => (arr || []).filter((p) => p.id !== petId));
    setMyLostIds((ids) => (ids || []).filter((id) => id !== petId));
    if (myLostId === petId) setMyLostId(null);
  };

  // ==================================
  // Handlers: Smart Alerts (User2 test)
  // ==================================
  // Push a notification into inbox
  const pushNotif = (type, { message, payload = {}, urgency = "low" }) => {
    if (prefs?.frequency === "mute") return; // muted
    const n = {
      id: uid("NT"),
      type,
      urgency, // high | medium | low
      ts: new Date().toISOString(),
      message,
      payload,
      read: false,
    };
    setNotifs((arr) => [n, ...(arr || [])]); // prepend newest
  };

  // User2 → Lost added: notify if my user is inside its search zone & within my radius
  const handleU2LostAdd = (item) => {
    setU2Lost((arr) => [...arr, item]);

    const { km, hours } = computeSearchRadiusKm(item.lastSeenAt);
    const d = haversineKm(item.geo.lat, item.geo.lng, user.lat, user.lng);

    if (d <= km && d <= (prefs?.alertRadiusKm || Infinity)) {
      const risk = areaRiskFromSightings(item.geo, sightings);
      const urgency = urgencyFrom(risk, hours);
      pushNotif("u2_lost_nearby", {
        urgency,
        message: `Lost pet reported near you (~${d.toFixed(1)} km). Suggested search radius ${km} km (${risk}).`,
        payload: { lost: item, distanceKm: d, zoneKm: km, risk },
      });
    }
  };

  // User2 → Sighting added: notify if it matches any of my lost pets with score ≥ 70
  const handleU2SightingAdd = (item) => {
    setU2Sights((arr) => [...arr, item]);

    const myLostList = (lost || []).filter((p) => (myLostIds || []).includes(p.id));
    if (myLostList.length === 0) return;

    const scored = myLostList
      .filter((p) => p.species === item.species)
      .map((p) => ({ lost: p, ...scoreLostToSighting(p, item) }))
      .sort((a, b) => b.metrics.conf - a.metrics.conf);

    const best = scored[0];
    if (best && best.metrics.conf >= 70) {
      const risk = areaRiskFromSightings(item.geo, sightings);
      const hours = Math.abs((new Date(item.time) - new Date(best.lost.lastSeenAt)) / 36e5);
      const urgency = urgencyFrom(risk, hours);
      pushNotif("u2_sighting_match", {
        urgency,
        message: `Possible match for your pet (score ${best.metrics.conf}). Distance ~${best.metrics.distanceKm} km.`,
        payload: { lost: best.lost, sight: item, metrics: best.metrics, risk },
      });
    }
  };

  // ==============================
  // Memos
  // ==============================
  const myLost = useMemo(() => (lost || []).find((p) => p.id === myLostId) || null, [lost, myLostId]);
  const lostList = useMemo(() => lost || [], [lost]);
  const myLostList = useMemo(
    () => (lost || []).filter((p) => (myLostIds || []).includes(p.id)),
    [lost, myLostIds]
  );

  // ==============================
  // Render
  // ==============================
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Header & nav */}
      <header className="sticky top-0 bg-white border-b z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">🐾 PetFinder – Mini Prototype</h1>
          <nav className="flex gap-2 text-sm">
            <button onClick={() => setTab("home")} className={`px-3 py-1 rounded-full border ${tab === "home" ? "bg-gray-900 text-white" : "bg-white"}`}>Home</button>
            <button onClick={() => setTab("data")} className={`px-3 py-1 rounded-full border ${tab === "data" ? "bg-gray-900 text-white" : "bg-white"}`}>Data</button>
            <button onClick={() => setTab("map")} className={`px-3 py-1 rounded-full border ${tab === "map" ? "bg-gray-900 text-white" : "bg-white"}`}>Map</button>
            {/* New tabs */}
            <button onClick={() => setTab("alerttest")} className={`px-3 py-1 rounded-full border ${tab === "alerttest" ? "bg-gray-900 text-white" : "bg-white"}`}>Alert Test</button>
            <button onClick={() => setTab("notify")} className={`px-3 py-1 rounded-full border ${tab === "notify" ? "bg-gray-900 text-white" : "bg-white"}`}>Notifications</button>
            <button onClick={() => setTab("dev")} className={`px-3 py-1 rounded-full border ${tab === "dev" ? "bg-gray-900 text-white" : "bg-white"}`}>Dev</button>
          </nav>
        </div>
      </header>

      {/* ================= HOME ================= */}
      {tab === "home" && (
        <main className="max-w-5xl mx-auto px-4 py-6 grid md:grid-cols-2 gap-6">
          {/* 1) Add Lost + Match */}
          <section className="bg-white rounded-2xl shadow p-5">
            <h2 className="text-lg font-semibold mb-4">1) Report a Lost Pet </h2>
            <LostForm onAdd={handleAddAndMatch} />
            <p className="text-xs mt-3 text-gray-500">
              Scoring weights: Distance 30%, Time 20%, Breed 25%, Color 15%, Size 5%, Age 5% (0–100).
            </p>
          </section>

          {/* 2) My Lost Pets (supports multiple) */}
          <section className="bg-white rounded-2xl shadow p-5">
            <h2 className="text-lg font-semibold mb-4">2) My Lost Pets</h2>
            {myLostList.length === 0 ? (
              <div className="text-sm opacity-70">— No pets yet. Add via "Add Lost Pet" on the left. —</div>
            ) : (
              <ul className="space-y-3 max-h-[420px] overflow-auto pr-1">
                {myLostList.map((p) => {
                  const { km, hours, tier } = computeSearchRadiusKm(p.lastSeenAt);
                  const isSelected = p.id === myLostId;
                  return (
                    <li key={p.id} className={`rounded-xl border p-3 ${isSelected ? "ring-2 ring-indigo-500 border-indigo-300" : ""}`}>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="font-semibold">
                            {p.name || "(no name)"} <span className="opacity-60 text-xs">#{p.id}</span>
                            {isSelected && <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-indigo-600 text-white">focused</span>}
                          </div>
                          <div className="text-sm opacity-80">
                            {p.species} · {p.breed} · {p.color} · {p.size || "?"} · {p.age || "?"}
                          </div>
                          <div className="text-xs opacity-70 mt-1">
                            lat {p.geo.lat.toFixed(3)}, lng {p.geo.lng.toFixed(3)} • {String(p.lastSeenAt).replace("T", " ")}
                          </div>
                          <div className="text-xs mt-1">
                            Recommended Search Zone: <b>{km} km</b> (elapsed ≈ {hours.toFixed(1)}h • tier {tier})
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 shrink-0">
                          {isSelected ? (
                            <button className="px-3 py-1 rounded border" onClick={() => setMyLostId(null)}>Clear focus</button>
                          ) : (
                            <button className="px-3 py-1 rounded border" onClick={() => setMyLostId(p.id)}>Set as focus</button>
                          )}
                          <button className="px-3 py-1 rounded border" onClick={() => setTab("map")}>View on map</button>
                          <button
                            className="px-3 py-1 rounded border bg-emerald-600 text-white"
                            onClick={() => {
                              if (window.confirm("Mark as found? This will remove the record.")) {
                                handleFoundPet(p.id);
                              }
                            }}
                          >
                            Found
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* 3) Ranked results (latest) */}
          <section className="bg-white rounded-2xl shadow p-5 md:col-span-2">
            <h2 className="text-lg font-semibold mb-4">3) Top Matches</h2>
            {results.length === 0 ? (
              <div className="text-sm opacity-70">No results yet. Try "Save Lost & Match".</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="py-2 pr-4">Rank</th>
                      <th className="py-2 pr-4">Sighting</th>
                      <th className="py-2 pr-4">Distance (km)</th>
                      <th className="py-2 pr-4">Time diff (h)</th>
                      <th className="py-2 pr-4">Breed</th>
                      <th className="py-2 pr-4">Color</th>
                      <th className="py-2 pr-4">Size</th>
                      <th className="py-2 pr-4">Age</th>
                      <th className="py-2 pr-4">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((row, idx) => (
                      <tr key={row.sight.id} className="border-b align-top hover:bg-gray-50">
                        <td className="py-2 pr-4">{idx + 1}</td>
                        <td className="py-2 pr-4">
                          <div className="font-medium">#{row.sight.id} · {row.sight.breed} · {row.sight.color}</div>
                          <div className="text-xs opacity-70">
                            {String(row.sight.time).replace("T", " ")} · lat {row.sight.geo.lat.toFixed(3)}, lng {row.sight.geo.lng.toFixed(3)}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">formula: {row.metrics.formula}</div>
                        </td>
                        <td className="py-2 pr-4">{row.metrics.distanceKm}</td>
                        <td className="py-2 pr-4">{row.metrics.timeDiffH}</td>
                        <td className="py-2 pr-4">{row.metrics.breedS}</td>
                        <td className="py-2 pr-4">{row.metrics.colorS}</td>
                        <td className="py-2 pr-4">{row.metrics.sizeS}</td>
                        <td className="py-2 pr-4">{row.metrics.ageS}</td>
                        <td className="py-2 pr-4 font-semibold">{row.metrics.conf}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </main>
      )}

      {/* ================= DATA ================= */}
      {tab === "data" && (
        <main className="max-w-5xl mx-auto px-4 py-6 grid md:grid-cols-2 gap-6">
          {/* Note: Add Lost moved to Home */}
          <SightingForm onAdd={(item) => setSightings((arr) => [...arr, item])} />
          <section className="bg-white rounded-2xl shadow p-5 md:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Persisted Records</h2>
              <div className="flex gap-2">
                <button
                  className="px-3 py-1 rounded border"
                  onClick={() => {
                    setLost(seededLostPets);
                    setSightings(seededSightings);
                    setMyLostId(null);
                    setMyLostIds([]);
                    setResults([]);
                  }}
                >
                  Reset to examples
                </button>
                <button
                  className="px-3 py-1 rounded border"
                  onClick={() => {
                    setLost([]);
                    setSightings([]);
                    setMyLostId(null);
                    setMyLostIds([]);
                    setResults([]);
                  }}
                >
                  Clear all
                </button>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <div className="font-semibold mb-2">Lost ({lost?.length || 0})</div>
                <ul className="space-y-2 max-h-64 overflow-auto pr-1">
                  {lost?.map((p) => (
                    <li key={p.id} className="text-sm p-2 border rounded">
                      <div className="font-medium">{p.name || "(no name)"} <span className="opacity-50">#{p.id}</span></div>
                      <div className="opacity-80">{p.species} · {p.breed} · {p.color} · {p.size || "?"} · {p.age || "?"}</div>
                      <div className="text-xs opacity-60">lat {p.geo.lat}, lng {p.geo.lng} · {String(p.lastSeenAt).replace("T", " ")}</div>
                      <div className="mt-1">
                        {/* This only sets the focus on the map */}
                        <button className="px-2 py-1 text-xs rounded border" onClick={() => setMyLostId(p.id)}>Focus on map</button>
                      </div>
                    </li>
                  ))}
                  {(!lost || lost.length === 0) && <li className="text-sm opacity-70">—</li>}
                </ul>
              </div>
              <div>
                <div className="font-semibold mb-2">Sightings ({sightings?.length || 0})</div>
                <ul className="space-y-2 max-h-64 overflow-auto pr-1">
                  {sightings?.map((s) => (
                    <li key={s.id} className="text-sm p-2 border rounded">
                      <div className="font-medium">#{s.id}</div>
                      <div className="opacity-80">{s.species} · {s.breed} · {s.color}</div>
                      <div className="text-xs opacity-60">lat {s.geo.lat}, lng {s.geo.lng} · {String(s.time).replace("T", " ")}</div>
                      {s.notes && <div className="text-xs opacity-70">note: {s.notes}</div>}
                    </li>
                  ))}
                  {(!sightings || sightings.length === 0) && <li className="text-sm opacity-70">—</li>}
                </ul>
              </div>
            </div>
          </section>
        </main>
      )}

      {/* ================= MAP ================= */}
      {tab === "map" && (
        <main className="max-w-5xl mx-auto px-4 py-6">
          {/* If desired, MapLeafletPanel can render the user point + radius */}
          <MapLeafletPanel lost={lost} sightings={sightings} myLostId={myLostId} user={user} prefs={prefs} />
        </main>
      )}

      {/* ============== ALERT TEST ============== */}
      {tab === "alerttest" && (
        <main className="max-w-5xl mx-auto px-4 py-6">
          <AlertTestPanel
            user={user}
            prefs={prefs}
            onU2LostAdd={handleU2LostAdd}
            onU2SightingAdd={handleU2SightingAdd}
            u2Lost={u2Lost}
            u2Sights={u2Sights}
            onClearU2Lost={clearU2Lost}
            onClearU2Sights={clearU2Sights}
            onClearU2All={clearU2All}
          />
        </main>
      )}

      {/* ============ NOTIFICATIONS ============ */}
      {tab === "notify" && (
        <main className="max-w-5xl mx-auto px-4 py-6">
          <NotificationsPanel
            user={user}
            setUser={setUser}
            prefs={prefs}
            setPrefs={setPrefs}
            notifs={notifs}
            setNotifs={setNotifs}
          />
        </main>
      )}

      {/* ================= DEV ================= */}
      {tab === "dev" && (
        <main className="max-w-5xl mx-auto px-4 py-6">
          <DevTestPanel />
        </main>
      )}

      {/* Footer */}
      <footer className="py-8 text-center text-xs text-gray-500">
        © 2025 PetFinder demo · Software Testing – Prototype only
      </footer>
    </div>
  );
}