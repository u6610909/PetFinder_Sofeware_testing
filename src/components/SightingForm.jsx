import React, { useState } from "react";
import { uid } from "../utils/datastore";
import { fileToDataURL } from "../utils/datastore";

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

export default function SightingForm({ onAdd }) {
  const [state, setState] = useState({
    species: "dog", breed: "", color: "", notes: "",
    time: new Date().toISOString().slice(0, 16), lat: 13.7563, lng: 100.5018, photoFile: null,
  });
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
  const BREEDS = state.species === "dog" ? DOG_BREEDS : CAT_BREEDS;

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
            {BREEDS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
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