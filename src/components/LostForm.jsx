// =============================================
// LostForm.jsx
// Form to add a Lost Pet.
// - Validates that "lastSeenAt" is not in the future.
// - Provides checkboxes for GPS-enabled and Special Needs:
//   * GPS clamps the recommended search zone to ≤ 1 km (handled by consumers of this data).
//   * Special Needs reduces the recommended search zone (e.g., ~40%) to account for slower movement.
// - Emits the new lost item via onAdd.
// Only UI text and comments were converted to English. Core logic remains unchanged.
// =============================================

import React, { useState } from "react";
import { uid, fileToDataURL } from "../utils/datastore";

// ---------------------------------------------
// Breed options (static)
// ---------------------------------------------
const DOG_BREEDS = [
  { value: "golden_retriever", label: "Golden Retriever" },
  { value: "labrador_retriever", label: "Labrador Retriever" },
  { value: "siberian_husky", label: "Siberian Husky" },
  { value: "pomeranian", label: "Pomeranian" },
  { value: "thai_ridgeback", label: "Thai Ridgeback" },
];
const CAT_BREEDS = [
  { value: "siamese", label: "Siamese" },
  { value: "persian", label: "Persian" },
  { value: "british_shorthair", label: "British Shorthair" },
  { value: "scottish_fold", label: "Scottish Fold" },
  { value: "thai_domestic", label: "Thai Domestic" },
];

// ---------------------------------------------
// Datetime helper: format current local time as
// "YYYY-MM-DDTHH:MM" for <input type="datetime-local">
// ---------------------------------------------
function nowLocalInputValue() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ---------------------------------------------
// Component
// ---------------------------------------------
export default function LostForm({ onAdd }) {
  // State (form fields)
  const [state, setState] = useState({
    name: "", species: "dog", breed: "", color: "", size: "", age: "",
    lastSeenAt: nowLocalInputValue(), lat: 13.7563, lng: 100.5018, photoFile: null,
    hasGPS: false, specialNeeds: false,
  });

  // Handle field changes
  const onChange = (e) => {
    const { name, value, files, type, checked } = e.target;
    if (name === "photo") {
      setState((s) => ({ ...s, photoFile: files?.[0] || null }));
    } else if (name === "lastSeenAt") {
      // Let the user type freely; we'll validate on submit.
      setState((s) => ({ ...s, lastSeenAt: value }));
    } else if (type === "checkbox") {
      setState((s) => ({ ...s, [name]: Boolean(checked) }));
    } else {
      setState((s) => ({ ...s, [name]: name === "lat" || name === "lng" ? Number(value) : value }));
    }
  };

  // Submit handler: validate time is not in the future, then emit item
  const onSubmit = async (e) => {
    e.preventDefault();
    const selected = new Date(state.lastSeenAt);
    const now = new Date();
    if (isNaN(selected.getTime()) || selected > now) {
      alert("Invalid time: future dates are not allowed.");
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
      hasGPS: !!state.hasGPS,
      specialNeeds: !!state.specialNeeds,
      lastSeenAt: state.lastSeenAt,
      photo: photo || null,
      geo: { lat: Number(state.lat), lng: Number(state.lng) },
    };
    onAdd(item);
    setState((s) => ({ ...s, name: "", color: "", size: "", age: "", breed: "", photoFile: null }));
  };

  // Choose breed options by species
  const BREEDS = state.species === "dog" ? DOG_BREEDS : CAT_BREEDS;

  // ---------------------------------------------
  // Render
  // ---------------------------------------------
  return (
    <section className="bg-white rounded-2xl shadow p-5">
      <h2 className="text-lg font-semibold mb-3">Add Lost Pet</h2>
      <form onSubmit={onSubmit} className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-sm font-medium">Name</label>
          <input name="name" value={state.name} onChange={onChange} className="mt-1 w-full rounded-xl border px-3 py-2" placeholder="Pet name" />
        </div>
        <div>
          <label className="block text-sm font-medium">Species</label>
          <select name="species" value={state.species} onChange={onChange} className="mt-1 w-full rounded-xl border px-3 py-2">
            <option value="dog">Dog</option><option value="cat">Cat</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">Breed</label>
          <select name="breed" value={state.breed} onChange={onChange} className="mt-1 w-full rounded-xl border px-3 py-2">
            <option value="">-- Select --</option>
            {BREEDS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">Color</label>
          <input name="color" value={state.color} onChange={onChange} className="mt-1 w-full rounded-xl border px-3 py-2" placeholder="e.g. black / cream" />
        </div>
        <div>
          <label className="block text-sm font-medium">Size</label>
          <select name="size" value={state.size} onChange={onChange} className="mt-1 w-full rounded-xl border px-3 py-2">
            <option value="">-- Select --</option>
            <option value="small">Small</option><option value="medium">Medium</option><option value="large">Large</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">Age</label>
          <select name="age" value={state.age} onChange={onChange} className="mt-1 w-full rounded-xl border px-3 py-2">
            {state.species === "dog"
              ? (<><option value="">-- Select --</option><option value="puppy">Puppy</option><option value="adult">Adult</option></>)
              : (<><option value="">-- Select --</option><option value="kitten">Kitten</option><option value="adult">Adult</option></>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">Last seen (date & time)</label>
          <input type="datetime-local" name="lastSeenAt" value={state.lastSeenAt} onChange={onChange} max={nowLocalInputValue()} className="mt-1 w-full rounded-xl border px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium">Latitude (lat)</label>
          <input name="lat" type="number" step="0.0001" value={state.lat} onChange={onChange} className="mt-1 w-full rounded-xl border px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium">Longitude (lng)</label>
          <input name="lng" type="number" step="0.0001" value={state.lng} onChange={onChange} className="mt-1 w-full rounded-xl border px-3 py-2" />
        </div>
        <div className="col-span-2 flex items-center gap-6 mt-1">
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" name="hasGPS" checked={state.hasGPS} onChange={onChange} />
            GPS-enabled (clamp search zone ≤ 1 km)
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" name="specialNeeds" checked={state.specialNeeds} onChange={onChange} />
            Special needs (reduce search zone by ~40%)
          </label>
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium">Photo (optional)</label>
          <input type="file" name="photo" accept="image/*" onChange={onChange} className="mt-1 w-full" />
        </div>
        <div className="col-span-2">
          <button className="px-4 py-2 rounded-xl bg-emerald-600 text-white">Save Lost Pet</button>
        </div>
      </form>
    </section>
  );
}