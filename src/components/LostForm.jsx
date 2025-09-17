import React, { useState } from "react";
import { uid, fileToDataURL } from "../utils/datastore";

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

// Format current local time as "YYYY-MM-DDTHH:MM" for datetime-local
function nowLocalInputValue() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function LostForm({ onAdd }) {
  const [state, setState] = useState({
    name: "", species: "dog", breed: "", color: "", size: "", age: "",
    lastSeenAt: nowLocalInputValue(), lat: 13.7563, lng: 100.5018, photoFile: null,
  });

  const onChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "photo") {
      setState((s) => ({ ...s, photoFile: files?.[0] || null }));
    } else if (name === "lastSeenAt") {
      // Allow any user input; validation will occur on submit
      setState((s) => ({ ...s, lastSeenAt: value }));
    } else {
      setState((s) => ({ ...s, [name]: name === "lat" || name === "lng" ? Number(value) : value }));
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    // Disallow future datetime
    const selected = new Date(state.lastSeenAt);
    const now = new Date();
    if (isNaN(selected.getTime()) || selected > now) {
      alert("คุณใส่เวลาไม่ถูก");
      return;
    }
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
    setState((s) => ({ ...s, name: "", color: "", size: "", age: "", breed: "", photoFile: null }));
  };

  const BREEDS = state.species === "dog" ? DOG_BREEDS : CAT_BREEDS;

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
            {BREEDS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
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
          <input type="datetime-local" name="lastSeenAt" value={state.lastSeenAt} onChange={onChange} max={nowLocalInputValue()} className="mt-1 w-full rounded-xl border px-3 py-2" />
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