import React, { useMemo, useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, LayersControl, LayerGroup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

// =============================================
// Utilities
// =============================================
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function colorScore(a, b) {
  if (!a || !b) return 0;
  const A = String(a).toLowerCase();
  const B = String(b).toLowerCase();
  if (A === B) return 100;
  const setA = new Set(A.split(/\s|,|\//g).filter(Boolean));
  const setB = new Set(B.split(/\s|,|\//g).filter(Boolean));
  for (const t of setA) if (setB.has(t)) return 50;
  return 0;
}
function distanceScoreKm(km) {
  const s = 1 - Math.min(km, 15) / 15;
  return Math.max(0, Math.round(s * 100));
}
function timeScoreHours(diffHours) {
  const s = 1 - Math.min(diffHours, 72) / 72;
  return Math.max(0, Math.round(s * 100));
}
function ageScore(a, b) { if (!a || !b) return 0; return a === b ? 100 : 0; }
function sizeScore(a, b) { if (!a || !b) return 0; return a === b ? 100 : 0; }
function breedScore(a, b) {
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
function totalConfidence({ dKm, hDiff, breedS, colorS, sizeS, ageS }) {
  return Math.round(
    0.30 * distanceScoreKm(dKm) +
    0.20 * timeScoreHours(hDiff) +
    0.25 * breedS +
    0.15 * colorS +
    0.05 * sizeS +
    0.05 * ageS
  );
}

// === helpers for datastore ===
function uid(prefix = "ID") {
  const ts = Date.now().toString(36);
  const rnd = Math.random().toString(36).slice(2, 6);
  return (prefix + ts + rnd).toUpperCase();
}
function fileToDataURL(file) {
  return new Promise((res, rej) => {
    if (!file) return res(null);
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}
function useLocalStore(key, seed) {
  const [items, setItems] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw);
    } catch {}
    localStorage.setItem(key, JSON.stringify(seed));
    return seed;
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(items)); } catch {}
  }, [key, items]);
  return [items, setItems];
}

// =============================================
// Seed data (Lost + Sighting)
// =============================================
const seededLostPets = [
  { id: "LP001", name: "Milo", species: "dog", breed: "golden_retriever", color: "gold", size: "large", age: "adult", lastSeenAt: "2025-09-01T10:00", geo: { lat: 13.7563, lng: 100.5018 } },
  { id: "LP002", name: "Luna", species: "dog", breed: "labrador_retriever", color: "black", size: "large", age: "adult", lastSeenAt: "2025-09-01T20:30", geo: { lat: 13.745, lng: 100.534 } },
  { id: "LP003", name: "Kuma", species: "dog", breed: "siberian_husky", color: "gray white", size: "large", age: "adult", lastSeenAt: "2025-08-31T22:15", geo: { lat: 13.72, lng: 100.515 } },
  { id: "LP004", name: "Pom", species: "dog", breed: "pomeranian", color: "cream", size: "small", age: "adult", lastSeenAt: "2025-08-30T18:00", geo: { lat: 13.818, lng: 100.56 } },
  { id: "LP005", name: "Dang", species: "dog", breed: "thai_ridgeback", color: "red brown", size: "medium", age: "adult", lastSeenAt: "2025-09-01T06:45", geo: { lat: 13.67, lng: 100.606 } },
  { id: "LP006", name: "Mali", species: "cat", breed: "siamese", color: "cream brown", size: "medium", age: "adult", lastSeenAt: "2025-09-01T12:10", geo: { lat: 13.735, lng: 100.523 } },
  { id: "LP007", name: "Nin", species: "cat", breed: "persian", color: "white", size: "medium", age: "kitten", lastSeenAt: "2025-09-01T08:20", geo: { lat: 13.71, lng: 100.485 } },
  { id: "LP008", name: "Bao", species: "cat", breed: "thai_domestic", color: "tabby brown", size: "small", age: "adult", lastSeenAt: "2025-08-31T19:30", geo: { lat: 13.79, lng: 100.58 } },
];
const seededSightings = [
  { id: "SG101", species: "dog", breed: "labrador_retriever", color: "black", notes: "เห็นวิ่งข้างสวนลุม", time: "2025-09-01T21:00", geo: { lat: 13.742, lng: 100.541 } },
  { id: "SG102", species: "dog", breed: "pomeranian", color: "cream", notes: "มีปลอกคอสีฟ้า", time: "2025-08-30T18:20", geo: { lat: 13.82, lng: 100.565 } },
  { id: "SG103", species: "cat", breed: "siamese", color: "cream brown", notes: "ร้องอยู่ใต้สะพาน", time: "2025-09-01T12:40", geo: { lat: 13.733, lng: 100.525 } },
];

// =============================================
// Main App
// =============================================
export default function App() {
  const [tab, setTab] = useState("home");

  // --- Local data store (persist) ---
  const [lost, setLost] = useLocalStore("pf_lost", seededLostPets);
  const [sightings, setSightings] = useLocalStore("pf_sight", seededSightings);

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

  // --- Matching form (เหมือนเดิม แต่จะเทียบกับ lost ใน store) ---
  const [form, setForm] = useState({
    name: "",
    species: "dog",
    breed: "",
    color: "",
    size: "",
    age: "",
    lastSeenAt: new Date().toISOString().slice(0, 16),
    lat: 13.7563,
    lng: 100.5018,
  });
  const [results, setResults] = useState([]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: name === "lat" || name === "lng" ? Number(value) : value }));
  };
  const currentBreedOpts = form.species === "dog" ? DOG_BREEDS : CAT_BREEDS;

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

  const lostList = useMemo(() => lost || [], [lost]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="sticky top-0 bg-white border-b z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">🐾 PetFinder – Mini Prototype</h1>
          <nav className="flex gap-2 text-sm">
            <button onClick={() => setTab("home")} className={`px-3 py-1 rounded-full border ${tab === "home" ? "bg-gray-900 text-white" : "bg-white"}`}>Home</button>
            <button onClick={() => setTab("data")} className={`px-3 py-1 rounded-full border ${tab === "data" ? "bg-gray-900 text-white" : "bg-white"}`}>Data</button>
            <button onClick={() => setTab("map")} className={`px-3 py-1 rounded-full border ${tab === "map" ? "bg-gray-900 text-white" : "bg-white"}`}>Map</button>
            <button onClick={() => setTab("dev")} className={`px-3 py-1 rounded-full border ${tab === "dev" ? "bg-gray-900 text-white" : "bg-white"}`}>Dev</button>
          </nav>
        </div>
      </header>

      {tab === "home" && (
        <main className="max-w-5xl mx-auto px-4 py-6 grid md:grid-cols-2 gap-6">
          {/* Matching Form */}
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
                  <option value="dog">Dog</option>
                  <option value="cat">Cat</option>
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
                  {[{ value: "small", label: "เล็ก" },{ value: "medium", label: "กลาง" },{ value: "large", label: "ใหญ่" }].map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium">อายุ</label>
                <select name="age" value={form.age} onChange={onChange} className="mt-1 w-full rounded-xl border px-3 py-2">
                  <option value="">-- เลือกอายุ --</option>
                  {(form.species === "dog"
                    ? [{ value: "puppy", label: "ลูกหมา" }, { value: "adult", label: "หมาโต" }]
                    : [{ value: "kitten", label: "ลูกแมว" }, { value: "adult", label: "แมวโต" }]
                  ).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
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

          {/* Lost list (from store) */}
          <section className="bg-white rounded-2xl shadow p-5">
            <h2 className="text-lg font-semibold mb-4">2) สัตว์หายในระบบ (persisted)</h2>
            <ul className="space-y-3">
              {lostList.map((p) => (
                <li key={p.id} className="rounded-xl border p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold">{p.name || "(ไม่มีชื่อ)"} <span className="text-xs opacity-60">#{p.id}</span></div>
                      <div className="text-sm opacity-80">{p.species} · {p.breed} · {p.color} · {p.size || "?"} · {p.age || "?"}</div>
                    </div>
                    <div className="text-xs text-right opacity-70">
                      <div>lat {p.geo.lat.toFixed(3)}, lng {p.geo.lng.toFixed(3)}</div>
                      <div>{String(p.lastSeenAt).replace("T", " ")}</div>
                    </div>
                  </div>
                </li>
              ))}
              {lostList.length === 0 && <li className="text-sm opacity-70">ยังไม่มีข้อมูล</li>}
            </ul>
          </section>

          {/* Results */}
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
          <LostForm onAdd={(item) => setLost((arr) => [...arr, item])} />
          <SightingForm onAdd={(item) => setSightings((arr) => [...arr, item])} />
          <section className="bg-white rounded-2xl shadow p-5 md:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">รายการในระบบ (Persisted)</h2>
              <div className="flex gap-2">
                <button className="px-3 py-1 rounded border" onClick={() => { setLost(seededLostPets); setSightings(seededSightings); }}>Reset เป็นตัวอย่าง</button>
                <button className="px-3 py-1 rounded border" onClick={() => { setLost([]); setSightings([]); }}>ล้างทั้งหมด</button>
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
          <MapLeafletPanel lost={lost} sightings={sightings} />
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

// =============================================
// Forms (Persist to localStorage via onAdd)
// =============================================
function LostForm({ onAdd }) {
  const [state, setState] = useState({
    name: "", species: "dog", breed: "", color: "", size: "", age: "",
    lastSeenAt: new Date().toISOString().slice(0, 16), lat: 13.7563, lng: 100.5018, photoFile: null,
  });
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
  const onChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "photo") setState((s) => ({ ...s, photoFile: files?.[0] || null }));
    else setState((s) => ({ ...s, [name]: name === "lat" || name === "lng" ? Number(value) : value }));
  };
  const onSubmit = async (e) => {
    e.preventDefault();
    const photo = await fileToDataURL(state.photoFile);
    const item = {
      id: uid("LP"),
      name: state.name,
      species: state.species,
      breed: state.breed,
      color: state.color,
      size: state.size,
      age: state.age,
      lastSeenAt: state.lastSeenAt,
      photo: photo || null,
      geo: { lat: Number(state.lat), lng: Number(state.lng) },
    };
    onAdd(item);
    // reset mini
    setState((s) => ({ ...s, name: "", color: "", size: "", age: "", breed: "" }));
  };
  return (
    <section className="bg-white rounded-2xl shadow p-5">
      <h2 className="text-lg font-semibold mb-3">Add Lost Pet</h2>
      <form onSubmit={onSubmit} className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-sm font-medium">ชื่อ</label>
          <input name="name" value={state.name} onChange={onChange} className="mt-1 w-full rounded-xl border px-3 py-2" placeholder="ชื่อสัตว์" />
        </div>
        <div>
          <label className="block text-sm font-medium">ชนิด</label>
          <select name="species" value={state.species} onChange={onChange} className="mt-1 w-full rounded-xl border px-3 py-2">
            <option value="dog">Dog</option><option value="cat">Cat</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">สายพันธุ์</label>
          <select name="breed" value={state.breed} onChange={onChange} className="mt-1 w-full rounded-xl border px-3 py-2">
            <option value="">-- เลือก --</option>
            {(state.species === "dog" ? DOG_BREEDS : CAT_BREEDS).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">สี</label>
          <input name="color" value={state.color} onChange={onChange} className="mt-1 w-full rounded-xl border px-3 py-2" placeholder="เช่น black / cream" />
        </div>
        <div>
          <label className="block text-sm font-medium">ขนาด</label>
          <select name="size" value={state.size} onChange={onChange} className="mt-1 w-full rounded-xl border px-3 py-2">
            <option value="">-- เลือก --</option>
            <option value="small">เล็ก</option><option value="medium">กลาง</option><option value="large">ใหญ่</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">อายุ</label>
          <select name="age" value={state.age} onChange={onChange} className="mt-1 w-full rounded-xl border px-3 py-2">
            {state.species === "dog"
              ? (<><option value="">-- เลือก --</option><option value="puppy">ลูกหมา</option><option value="adult">หมาโต</option></>)
              : (<><option value="">-- เลือก --</option><option value="kitten">ลูกแมว</option><option value="adult">แมวโต</option></>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">เวลา/วันที่พบล่าสุด</label>
          <input type="datetime-local" name="lastSeenAt" value={state.lastSeenAt} onChange={onChange} className="mt-1 w-full rounded-xl border px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium">lat</label>
          <input name="lat" type="number" step="0.0001" value={state.lat} onChange={onChange} className="mt-1 w-full rounded-xl border px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium">lng</label>
          <input name="lng" type="number" step="0.0001" value={state.lng} onChange={onChange} className="mt-1 w-full rounded-xl border px-3 py-2" />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium">รูป (ไม่บังคับ)</label>
          <input type="file" name="photo" accept="image/*" onChange={onChange} className="mt-1 w-full" />
        </div>
        <div className="col-span-2">
          <button className="px-4 py-2 rounded-xl bg-emerald-600 text-white">บันทึก Lost</button>
        </div>
      </form>
    </section>
  );
}

function SightingForm({ onAdd }) {
  const [state, setState] = useState({
    species: "dog", breed: "", color: "", notes: "",
    time: new Date().toISOString().slice(0, 16), lat: 13.7563, lng: 100.5018, photoFile: null,
  });
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
  const onChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "photo") setState((s) => ({ ...s, photoFile: files?.[0] || null }));
    else setState((s) => ({ ...s, [name]: name === "lat" || name === "lng" ? Number(value) : value }));
  };
  const onSubmit = async (e) => {
    e.preventDefault();
    const photo = await fileToDataURL(state.photoFile);
    const item = {
      id: uid("SG"),
      species: state.species,
      breed: state.breed,
      color: state.color,
      notes: state.notes,
      time: state.time,
      photo: photo || null,
      geo: { lat: Number(state.lat), lng: Number(state.lng) },
    };
    onAdd(item);
    setState((s) => ({ ...s, notes: "", breed: "", color: "" }));
  };
  return (
    <section className="bg-white rounded-2xl shadow p-5">
      <h2 className="text-lg font-semibold mb-3">Add Sighting</h2>
      <form onSubmit={onSubmit} className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium">ชนิด</label>
          <select name="species" value={state.species} onChange={onChange} className="mt-1 w-full rounded-xl border px-3 py-2">
            <option value="dog">Dog</option><option value="cat">Cat</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">สายพันธุ์</label>
          <select name="breed" value={state.breed} onChange={onChange} className="mt-1 w-full rounded-xl border px-3 py-2">
            <option value="">-- เลือก --</option>
            {(state.species === "dog" ? DOG_BREEDS : CAT_BREEDS).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">สี</label>
          <input name="color" value={state.color} onChange={onChange} className="mt-1 w-full rounded-xl border px-3 py-2" placeholder="เช่น black / cream" />
        </div>
        <div>
          <label className="block text-sm font-medium">เวลา</label>
          <input type="datetime-local" name="time" value={state.time} onChange={onChange} className="mt-1 w-full rounded-xl border px-3 py-2" />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium">โน้ต</label>
          <input name="notes" value={state.notes} onChange={onChange} className="mt-1 w-full rounded-xl border px-3 py-2" placeholder="รายละเอียดเพิ่มเติม (ไม่บังคับ)" />
        </div>
        <div>
          <label className="block text-sm font-medium">lat</label>
          <input name="lat" type="number" step="0.0001" value={state.lat} onChange={onChange} className="mt-1 w-full rounded-xl border px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium">lng</label>
          <input name="lng" type="number" step="0.0001" value={state.lng} onChange={onChange} className="mt-1 w-full rounded-xl border px-3 py-2" />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium">รูป (ไม่บังคับ)</label>
          <input type="file" name="photo" accept="image/*" onChange={onChange} className="mt-1 w-full" />
        </div>
        <div className="col-span-2">
          <button className="px-4 py-2 rounded-xl bg-orange-500 text-white">บันทึก Sighting</button>
        </div>
      </form>
    </section>
  );
}

// =============================================
// Map (Leaflet + OpenStreetMap) — REAL MAP
// =============================================
function MapLeafletPanel({ lost = [], sightings = [] }) {
  const center = [13.7563, 100.5018];
  const Z = 12;
  return (
    <div className="bg-white rounded-2xl shadow p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Map (Leaflet) – เลื่อน/ซูมได้ • Lost=เขียว • Sighting=ส้ม</h2>
        <span className="text-xs text-gray-500">Drag / scroll เพื่อเลื่อนรอบๆ แผนที่</span>
      </div>
      <div className="h-[520px] rounded-xl overflow-hidden border">
        <MapContainer center={center} zoom={Z} scrollWheelZoom className="h-full w-full">
          <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <LayersControl position="topright">
            <LayersControl.Overlay checked name="Lost">
              <LayerGroup>
                {lost.map((p) => (
                  <CircleMarker key={p.id} center={[p.geo.lat, p.geo.lng]} radius={7} pathOptions={{ color: "#16a34a", fillColor: "#16a34a", fillOpacity: 0.9 }}>
                    <Popup>
                      <div className="text-sm">
                        <div className="font-semibold">Lost: {p.name || "(ไม่มีชื่อ)"} <span className="opacity-60 text-xs">#{p.id}</span></div>
                        <div className="opacity-80">{p.species} · {p.breed} · {p.color} · {p.size || "?"} · {p.age || "?"}</div>
                        <div className="opacity-70 text-xs mt-1">{String(p.lastSeenAt).replace("T"," ")}</div>
                        <div className="opacity-70 text-xs">lat {p.geo.lat.toFixed(4)}, lng {p.geo.lng.toFixed(4)}</div>
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}
              </LayerGroup>
            </LayersControl.Overlay>
            <LayersControl.Overlay checked name="Sightings">
              <LayerGroup>
                {sightings.map((s) => (
                  <CircleMarker key={s.id} center={[s.geo.lat, s.geo.lng]} radius={7} pathOptions={{ color: "#f97316", fillColor: "#f97316", fillOpacity: 0.9 }}>
                    <Popup>
                      <div className="text-sm">
                        <div className="font-semibold">Sighting <span className="opacity-60 text-xs">#{s.id}</span></div>
                        <div className="opacity-80">{s.species} · {s.breed} · {s.color}</div>
                        <div className="opacity-70 text-xs mt-1">{String(s.time).replace("T"," ")}</div>
                        <div className="opacity-70 text-xs">{s.notes || "—"}</div>
                        <div className="opacity-70 text-xs">lat {s.geo.lat.toFixed(4)}, lng {s.geo.lng.toFixed(4)}</div>
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}
              </LayerGroup>
            </LayersControl.Overlay>
          </LayersControl>
        </MapContainer>
      </div>
      <div className="mt-3 text-xs text-gray-500">* ใช้ OpenStreetMap + react-leaflet • บันทึกข้อมูลแล้วขึ้น marker ทันที (persisted)</div>
    </div>
  );
}

// =============================================
// Dev test panel (unit-like tests) – ไม่แก้ของเดิม และเพิ่ม 2 tests ใหม่
// =============================================
function DevTestPanel() {
  const tests = [
    { name: "breedScore exact match", run: () => breedScore("golden_retriever", "golden_retriever"), expect: 100 },
    { name: "breedScore similar (golden vs labrador)", run: () => breedScore("golden_retriever", "labrador_retriever"), expect: 80 },
    { name: "breedScore fallback unrelated -> 25", run: () => breedScore("pomeranian", "siamese"), expect: 25 },
    { name: "colorScore exact", run: () => colorScore("black", "black"), expect: 100 },
    { name: "colorScore partial token overlap", run: () => colorScore("gray white", "gray"), expect: 50 },
    { name: "colorScore no overlap -> 0", run: () => colorScore("gold", "black"), expect: 0 },
    { name: "distanceScore 0km -> 100", run: () => distanceScoreKm(0), expect: 100 },
    { name: "distanceScore 15km -> 0", run: () => distanceScoreKm(15), expect: 0 },
    { name: "timeScore 0h -> 100", run: () => timeScoreHours(0), expect: 100 },
    { name: "timeScore 72h -> 0", run: () => timeScoreHours(72), expect: 0 },
    { name: "sizeScore exact", run: () => sizeScore("small", "small"), expect: 100 },
    { name: "sizeScore different", run: () => sizeScore("small", "large"), expect: 0 },
    { name: "ageScore exact", run: () => ageScore("adult", "adult"), expect: 100 },
    { name: "ageScore different", run: () => ageScore("puppy", "adult"), expect: 0 },
    // เพิ่มใหม่สำหรับ datastore helper
    { name: "uid() has prefix", run: () => uid("LP").startsWith("LP"), expect: true },
    { name: "uid() mostly unique", run: () => { const a=uid("X"); const b=uid("X"); return a !== b; }, expect: true },
  ];

  const results = tests.map((t) => {
    const got = t.run();
    const pass = Object.is(got, t.expect);
    return { name: t.name, expect: t.expect, got, pass };
  });
  const allPass = results.every((r) => r.pass);

  return (
    <div className="bg-white rounded-2xl shadow p-5">
      <h2 className="text-lg font-semibold mb-3">Dev • Unit-like Tests</h2>
      <div className="text-sm mb-3">ผลการทดสอบฟังก์ชันคะแนน + ยูทิลิตี้ datastore:</div>
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left border-b">
            <th className="py-2 pr-4">Test</th><th className="py-2 pr-4">Expected</th><th className="py-2 pr-4">Got</th><th className="py-2 pr-4">Result</th>
          </tr>
        </thead>
        <tbody>
          {results.map((r, i) => (
            <tr key={i} className="border-b">
              <td className="py-2 pr-4">{r.name}</td>
              <td className="py-2 pr-4">{String(r.expect)}</td>
              <td className="py-2 pr-4">{String(r.got)}</td>
              <td className={`py-2 pr-4 font-semibold ${r.pass ? 'text-green-600' : 'text-red-600'}`}>{r.pass ? 'PASS' : 'FAIL'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className={`mt-4 text-sm font-semibold ${allPass ? 'text-green-700' : 'text-red-700'}`}>Summary: {allPass ? 'ALL PASS' : 'SOME TESTS FAILED'}</div>
      <div className="text-xs text-gray-500 mt-2">* ถ้ามีพฤติกรรมที่อยากเปลี่ยน (เช่น รูปภาพบังคับ/ไม่บังคับ) บอกได้เลยครับ</div>
    </div>
  );
}