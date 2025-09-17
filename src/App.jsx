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

export default function App() {
  const [tab, setTab] = useState("home");

  const [lost, setLost] = useLocalStore("pf_lost", seededLostPets);
  const [sightings, setSightings] = useLocalStore("pf_sight", seededSightings);
  const [myLostId, setMyLostId] = useLocalStore("pf_myLostId", null);

  const DOG_BREEDS = [
    { value: "golden_retriever", label: "Golden Retriever / โกลเด้น" },
    { value: "labrador_retriever", label: "Labrador Retriever / ลาบราดอร์" },
    { value: "siberian_husky", label: "Siberian Husky / ไซบีเรียน" },
    { value: "pomeranian", label: "Pomeranian / ปอม" },
    { value: "thai_ridgeback", label: "Thai Ridgeback / ไทยหลังอาน" },
  ];
  const CAT_BREEDS = [
    { value: "siamese", label: "Siamese / วิเชียรมาศ" },
    { value: "persian", label: "Persian / เปอร์เซีย" },
    { value: "british_shorthair", label: "British Shorthair" },
    { value: "scottish_fold", label: "Scottish Fold" },
    { value: "thai_domestic", label: "Thai Domestic / ไทยบ้าน" },
  ];

  // Matching form (compare “input” vs lost list)
  const [form, setForm] = useState({
    name: "", species: "dog", breed: "", color: "", size: "", age: "",
    lastSeenAt: new Date().toISOString().slice(0, 16), lat: 13.7563, lng: 100.5018,
  });
  const [results, setResults] = useState([]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: name === "lat" || name === "lng" ? Number(value) : value }));
  };

  const compute = () => {
    try {
      const inputTime = new Date(form.lastSeenAt);
      const now = new Date();
      const inputTs = isNaN(inputTime.getTime()) ? now : inputTime;

      const scored = (lost || []).map((p) => {
        const dKm = haversineKm(form.lat, form.lng, p.geo.lat, p.geo.lng);
        const hDiff = Math.abs((inputTs - new Date(p.lastSeenAt)) / 36e5);
        const breedS = breedScore(form.breed, p.breed);
        const colorS = colorScore(form.color, p.color);
        const sizeS = sizeScore(form.size, p.size || "");
        const ageS = ageScore(form.age, p.age || "");
        const conf = totalConfidence({ dKm, hDiff, breedS, colorS, sizeS, ageS });
        const distS = distanceScoreKm(dKm);
        const timeS = timeScoreHours(hDiff);
        const formula = `0.30*${distS} + 0.20*${timeS} + 0.25*${breedS} + 0.15*${colorS} + 0.05*${sizeS} + 0.05*${ageS}`;
        return {
          ...p,
          metrics: {
            distanceKm: Number(dKm.toFixed(2)),
            timeDiffH: Number(hDiff.toFixed(1)),
            breedS, colorS, sizeS, ageS, distS, timeS, conf, formula,
          },
        };
      });

      scored.sort((a, b) => b.metrics.conf - a.metrics.conf);
      setResults(scored);
    } catch (e) {
      console.error(e);
      alert("Error computing matches. Please check inputs.");
    }
  };

  const reset = () => {
    setForm({
      name: "", species: "dog", breed: "", color: "", size: "", age: "",
      lastSeenAt: new Date().toISOString().slice(0, 16), lat: 13.7563, lng: 100.5018,
    });
    setResults([]);
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
          {/* 1) Matching Form */}
          <section className="bg-white rounded-2xl shadow p-5">
            <h2 className="text-lg font-semibold mb-4">1) ใส่ข้อมูลสัตว์หาย (สำหรับจับคู่)</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-sm font-medium">ชื่อสัตว์ (ใส่หรือไม่ก็ได้)</label>
                <input name="name" value={form.name} onChange={onChange} className="mt-1 w-full rounded-xl border px-3 py-2" placeholder="Milo" />
              </div>
              <div>
                <label className="block text-sm font-medium">ชนิด</label>
                <select name="species" value={form.species} onChange={onChange} className="mt-1 w-full rounded-xl border px-3 py-2">
                  <option value="dog">Dog</option><option value="cat">Cat</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium">สายพันธุ์ (เลือกได้ 5 แบบ)</label>
                <select name="breed" value={form.breed} onChange={onChange} className="mt-1 w-full rounded-xl border px-3 py-2">
                  <option value="">-- เลือกสายพันธุ์ --</option>
                  {(form.species === "dog" ? DOG_BREEDS : CAT_BREEDS).map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium">สี</label>
                <input name="color" value={form.color} onChange={onChange} className="mt-1 w-full rounded-xl border px-3 py-2" placeholder="gold / black / gray white" />
              </div>
              <div>
                <label className="block text-sm font-medium">ขนาด</label>
                <select name="size" value={form.size} onChange={onChange} className="mt-1 w-full rounded-xl border px-3 py-2">
                  <option value="">-- เลือกขนาด --</option>
                  <option value="small">เล็ก</option><option value="medium">กลาง</option><option value="large">ใหญ่</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium">อายุ</label>
                <select name="age" value={form.age} onChange={onChange} className="mt-1 w-full rounded-xl border px-3 py-2">
                  <option value="">-- เลือกอายุ --</option>
                  {form.species === "dog"
                    ? (<><option value="puppy">ลูกหมา</option><option value="adult">หมาโต</option></>)
                    : (<><option value="kitten">ลูกแมว</option><option value="adult">แมวโต</option></>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium">เวลา/วันที่พบล่าสุด</label>
                <input type="datetime-local" name="lastSeenAt" value={form.lastSeenAt} onChange={onChange} className="mt-1 w-full rounded-xl border px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium">ละติจูด (lat)</label>
                <input name="lat" type="number" step="0.0001" value={form.lat} onChange={onChange} className="mt-1 w-full rounded-xl border px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium">ลองจิจูด (lng)</label>
                <input name="lng" type="number" step="0.0001" value={form.lng} onChange={onChange} className="mt-1 w-full rounded-xl border px-3 py-2" />
              </div>
            </div>

            <div className="mt-4 flex gap-3">
              <button onClick={compute} className="px-4 py-2 rounded-xl bg-indigo-600 text-white shadow hover:opacity-90">ค้นหาแมตช์</button>
              <button onClick={reset} className="px-4 py-2 rounded-xl border">ล้างฟอร์ม</button>
            </div>

            <p className="text-xs mt-3 text-gray-500">เกณฑ์คะแนน: Distance 30%, Time 20%, Breed 25%, Color 15%, Size 5%, Age 5% (0–100).</p>
          </section>

          {/* 2) My Lost */}
          <section className="bg-white rounded-2xl shadow p-5">
            <h2 className="text-lg font-semibold mb-4">2) สัตว์ที่ฉันแจ้งหาย</h2>
            {!myLost ? (
              <div className="text-sm opacity-70">ยังไม่ได้เลือกสัตว์ของฉันจากการบันทึกในแท็บ Sighting (ส่วน Add Lost)</div>
            ) : (
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-semibold">{myLost.name || "(ไม่มีชื่อ)"} <span className="opacity-60 text-xs">#{myLost.id}</span></div>
                  <div className="text-sm opacity-80">{myLost.species} · {myLost.breed} · {myLost.color} · {myLost.size || "?"} · {myLost.age || "?"}</div>
                  <div className="text-xs opacity-70 mt-1">lat {myLost.geo.lat.toFixed(3)}, lng {myLost.geo.lng.toFixed(3)} • {String(myLost.lastSeenAt).replace("T"," ")}</div>
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

          {/* 3) Ranked Results */}
          <section className="bg-white rounded-2xl shadow p-5 md:col-span-2">
            <h2 className="text-lg font-semibold mb-4">3) ผลลัพธ์การจัดอันดับที่ใกล้เคียงที่สุด</h2>
            {results.length === 0 ? (
              <div className="text-sm opacity-70">ยังไม่มีผลลัพธ์ ลองกด "ค้นหาแมตช์"</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="py-2 pr-4">อันดับ</th><th className="py-2 pr-4">สัตว์หาย</th><th className="py-2 pr-4">สายพันธุ์/สี</th>
                      <th className="py-2 pr-4">ระยะทาง (km)</th><th className="py-2 pr-4">เวลาต่าง (ชม.)</th>
                      <th className="py-2 pr-4">Breed</th><th className="py-2 pr-4">Color</th><th className="py-2 pr-4">Size</th><th className="py-2 pr-4">Age</th><th className="py-2 pr-4">คะแนนรวม</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r, idx) => (
                      <tr key={r.id} className="border-b align-top hover:bg-gray-50">
                        <td className="py-2 pr-4">{idx + 1}</td>
                        <td className="py-2 pr-4 font-medium">{r.name || "(ไม่มีชื่อ)"} <span className="text-xs opacity-60">#{r.id}</span></td>
                        <td className="py-2 pr-4">{r.breed} · {r.color}</td>
                        <td className="py-2 pr-4">{r.metrics.distanceKm}</td>
                        <td className="py-2 pr-4">{r.metrics.timeDiffH}</td>
                        <td className="py-2 pr-4">{r.metrics.breedS}</td>
                        <td className="py-2 pr-4">{r.metrics.colorS}</td>
                        <td className="py-2 pr-4">{r.metrics.sizeS}</td>
                        <td className="py-2 pr-4">{r.metrics.ageS}</td>
                        <td className="py-2 pr-4 font-semibold">{r.metrics.conf}
                          <div className="text-xs text-gray-500 mt-1">สูตร: {r.metrics.formula}</div>
                        </td>
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
          <LostForm onAdd={(item) => { setLost((arr) => [...arr, item]); setMyLostId(item.id); }} />
          <SightingForm onAdd={(item) => setSightings((arr) => [...arr, item])} />
          <section className="bg-white rounded-2xl shadow p-5 md:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">รายการในระบบ (Persisted)</h2>
              <div className="flex gap-2">
                <button className="px-3 py-1 rounded border" onClick={() => { setLost(seededLostPets); setSightings(seededSightings); setMyLostId(null); }}>Reset เป็นตัวอย่าง</button>
                <button className="px-3 py-1 rounded border" onClick={() => { setLost([]); setSightings([]); setMyLostId(null); }}>ล้างทั้งหมด</button>
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