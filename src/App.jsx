// src/App.jsx
import React, { useMemo, useState, useEffect } from "react";
import LostForm from "./components/LostForm";
import SightingForm from "./components/SightingForm";
import MapLeafletPanel from "./components/MapLeafletPanel";
import DevTestPanel from "./components/DevTestPanel";

import { useLocalStore } from "./utils/datastore";
import { haversineKm } from "./utils/geo";
import { computeSearchRadiusKm } from "./utils/searchZone";
import {
  breedScore, colorScore, sizeScore, ageScore,
  totalConfidence, distanceScoreKm, timeScoreHours
} from "./utils/scoring";

import { seededLostPets, seededSightings } from "./data/seed";

// ✅ ช่วยคำนวณคะแนน Lost ↔ Sighting
function scoreLostToSighting(lost, sight) {
  const dKm = haversineKm(lost.geo.lat, lost.geo.lng, sight.geo.lat, sight.geo.lng);
  const hDiff = Math.abs((new Date(sight.time) - new Date(lost.lastSeenAt)) / 36e5);
  const breedS = breedScore(lost.breed, sight.breed);
  const colorS = colorScore(lost.color, sight.color);
  const sizeS = sizeScore(lost.size || "", sight.size || "");
  const ageS  = ageScore(lost.age  || "", sight.age  || "");
  const conf  = totalConfidence({ dKm, hDiff, breedS, colorS, sizeS, ageS });
  const distS = distanceScoreKm(dKm);
  const timeS = timeScoreHours(hDiff);
  const formula = `0.30*${distS} + 0.20*${timeS} + 0.25*${breedS} + 0.15*${colorS} + 0.05*${sizeS} + 0.05*${ageS}`;
  return {
    sight,
    metrics: {
      distanceKm: Number(dKm.toFixed(2)),
      timeDiffH : Number(hDiff.toFixed(1)),
      breedS, colorS, sizeS, ageS, distS, timeS, conf, formula
    }
  };
}

export default function App() {
  const [tab, setTab] = useState("home");

  const [lost, setLost] = useLocalStore("pf_lost", seededLostPets);
  const [sightings, setSightings] = useLocalStore("pf_sight", seededSightings);
  const [myLostId, setMyLostId] = useLocalStore("pf_myLostId", null);

  // ✅ ผลลัพธ์การแมตช์: "Lost ที่เพิ่งบันทึก" ↔ "Sightings"
  const [results, setResults] = useState([]);

  // ✅ เมื่อกดบันทึก Lost จากฟอร์ม: บันทึก + หาแมตช์กับ Sightings + ตั้งเป็น "สัตว์ของฉัน"
  const handleAddAndMatch = (newLost) => {
    setLost((arr) => [...arr, newLost]);
    setMyLostId(newLost.id);

    const rows = (sightings || [])
      .filter((s) => s.species === newLost.species)
      .map((s) => scoreLostToSighting(newLost, s))
      .sort((a, b) => b.metrics.conf - a.metrics.conf);

    setResults(rows);
    // อยู่แท็บ Home อยู่แล้ว ถ้าต้องการสลับแท็บก็: setTab("home");
  };

  const myLost = useMemo(() => (lost || []).find((p) => p.id === myLostId) || null, [lost, myLostId]);
  const lostList = useMemo(() => lost || [], [lost]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="sticky top-0 bg-white border-b z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">🐾 PetFinder – Mini Prototype</h1>
          <nav className="flex gap-2 text-sm">
            <button onClick={() => setTab("home")} className={`px-3 py-1 rounded-full border ${tab === "home" ? "bg-gray-900 text-white" : "bg-white"}`}>Home</button>
            <button onClick={() => setTab("data")} className={`px-3 py-1 rounded-full border ${tab === "data" ? "bg-gray-900 text-white" : "bg-white"}`}>Sighting</button>
            <button onClick={() => setTab("map")} className={`px-3 py-1 rounded-full border ${tab === "map" ? "bg-gray-900 text-white" : "bg-white"}`}>Map</button>
            <button onClick={() => setTab("dev")} className={`px-3 py-1 rounded-full border ${tab === "dev" ? "bg-gray-900 text-white" : "bg-white"}`}>Dev</button>
          </nav>
        </div>
      </header>

      {tab === "home" && (
        <main className="max-w-5xl mx-auto px-4 py-6 grid md:grid-cols-2 gap-6">
          {/* 1) รวม Add Lost + Matching ในปุ่มเดียว */}
          <section className="bg-white rounded-2xl shadow p-5">
            <h2 className="text-lg font-semibold mb-4">1) ใส่ข้อมูลสัตว์หาย (บันทึก & หาแมตช์ทันที)</h2>
            <LostForm onAdd={handleAddAndMatch} />
            <p className="text-xs mt-3 text-gray-500">
              เกณฑ์คะแนน: Distance 30%, Time 20%, Breed 25%, Color 15%, Size 5%, Age 5% (0–100).
            </p>
          </section>

          {/* 2) สัตว์ที่ฉันแจ้งหาย */}
          <section className="bg-white rounded-2xl shadow p-5">
            <h2 className="text-lg font-semibold mb-4">2) สัตว์ที่ฉันแจ้งหาย</h2>
            {!myLost ? (
              <div className="text-sm opacity-70">— ยังไม่ได้ตั้งค่าสัตว์ของฉัน —</div>
            ) : (
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-semibold">
                    {myLost.name || "(ไม่มีชื่อ)"} <span className="opacity-60 text-xs">#{myLost.id}</span>
                  </div>
                  <div className="text-sm opacity-80">
                    {myLost.species} · {myLost.breed} · {myLost.color} · {myLost.size || "?"} · {myLost.age || "?"}
                  </div>
                  <div className="text-xs opacity-70 mt-1">
                    lat {myLost.geo.lat.toFixed(3)}, lng {myLost.geo.lng.toFixed(3)} • {String(myLost.lastSeenAt).replace("T"," ")}
                  </div>
                  {(() => {
                    const { km, hours, tier } = computeSearchRadiusKm(myLost.lastSeenAt);
                    return <div className="text-xs mt-2">Recommend Search Zone: <b>{km} km</b> (elapsed ≈ {hours.toFixed(1)}h • tier {tier})</div>;
                  })()}
                </div>
                <div className="flex flex-col gap-2">
                  <button className="px-3 py-1 rounded border" onClick={() => setTab("map")}>ดูบนแผนที่</button>
                  <button className="px-3 py-1 rounded border" onClick={() => setMyLostId(null)}>ล้างการเลือก</button>
                </div>
              </div>
            )}
          </section>

          {/* 3) ผลลัพธ์การจัดอันดับ (แมตช์กับ Sightings ของ Lost ล่าสุดที่บันทึก) */}
          <section className="bg-white rounded-2xl shadow p-5 md:col-span-2">
            <h2 className="text-lg font-semibold mb-4">3) ผลลัพธ์การจัดอันดับที่ใกล้เคียงที่สุด</h2>
            {results.length === 0 ? (
              <div className="text-sm opacity-70">ยังไม่มีผลลัพธ์ ลองกด “บันทึก Lost & หาแมตช์”</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="py-2 pr-4">อันดับ</th>
                      <th className="py-2 pr-4">Sighting</th>
                      <th className="py-2 pr-4">ระยะทาง (km)</th>
                      <th className="py-2 pr-4">เวลาต่าง (ชม.)</th>
                      <th className="py-2 pr-4">Breed</th>
                      <th className="py-2 pr-4">Color</th>
                      <th className="py-2 pr-4">Size</th>
                      <th className="py-2 pr-4">Age</th>
                      <th className="py-2 pr-4">คะแนนรวม</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((row, idx) => (
                      <tr key={row.sight.id} className="border-b align-top hover:bg-gray-50">
                        <td className="py-2 pr-4">{idx + 1}</td>
                        <td className="py-2 pr-4">
                          <div className="font-medium">#{row.sight.id} · {row.sight.breed} · {row.sight.color}</div>
                          <div className="text-xs opacity-70">
                            {String(row.sight.time).replace("T"," ")} · lat {row.sight.geo.lat.toFixed(3)}, lng {row.sight.geo.lng.toFixed(3)}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">สูตร: {row.metrics.formula}</div>
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

      {tab === "data" && (
        <main className="max-w-5xl mx-auto px-4 py-6 grid md:grid-cols-2 gap-6">
          {/* ❌ เอา LostForm ออกจากแท็บนี้ (เพราะย้ายไปใช้ใน Home แล้ว) */}
          <SightingForm onAdd={(item) => setSightings((arr) => [...arr, item])} />
          <section className="bg-white rounded-2xl shadow p-5 md:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">รายการในระบบ (Persisted)</h2>
              <div className="flex gap-2">
                <button
                  className="px-3 py-1 rounded border"
                  onClick={() => { setLost(seededLostPets); setSightings(seededSightings); setMyLostId(null); setResults([]); }}
                >
                  Reset เป็นตัวอย่าง
                </button>
                <button
                  className="px-3 py-1 rounded border"
                  onClick={() => { setLost([]); setSightings([]); setMyLostId(null); setResults([]); }}
                >
                  ล้างทั้งหมด
                </button>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <div className="font-semibold mb-2">Lost ({lost?.length || 0})</div>
                <ul className="space-y-2 max-h-64 overflow-auto pr-1">
                  {lost?.map((p) => (
                    <li key={p.id} className="text-sm p-2 border rounded">
                      <div className="font-medium">{p.name || "(ไม่มีชื่อ)"} <span className="opacity-50">#{p.id}</span></div>
                      <div className="opacity-80">{p.species} · {p.breed} · {p.color} · {p.size || "?"} · {p.age || "?"}</div>
                      <div className="text-xs opacity-60">lat {p.geo.lat}, lng {p.geo.lng} · {String(p.lastSeenAt).replace("T"," ")}</div>
                      <div className="mt-1">
                        <button className="px-2 py-1 text-xs rounded border" onClick={() => setMyLostId(p.id)}>ตั้งเป็นสัตว์ของฉัน</button>
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
                      <div className="text-xs opacity-60">lat {s.geo.lat}, lng {s.geo.lng} · {String(s.time).replace("T"," ")}</div>
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

      {tab === "map" && (
        <main className="max-w-5xl mx-auto px-4 py-6">
          <MapLeafletPanel lost={lost} sightings={sightings} myLostId={myLostId} />
        </main>
      )}

      {tab === "dev" && (
        <main className="max-w-5xl mx-auto px-4 py-6">
          <DevTestPanel />
        </main>
      )}

      <footer className="py-8 text-center text-xs text-gray-500">
        © 2025 PetFinder demo · สำหรับวิชา Software Testing – Prototype ใช้สาธิตเท่านั้น
      </footer>
    </div>
  );
}