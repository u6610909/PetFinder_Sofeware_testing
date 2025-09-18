import React, { useState } from "react";
import { uid } from "../utils/datastore";
import { fileToDataURL } from "../utils/datastore";

// =============================
// Helpers: time formatting
// =============================
function pad2(n) { return String(n).padStart(2, "0"); }
function nowLocalInputValue() {
  const d = new Date();
  const y = d.getFullYear();
  const m = pad2(d.getMonth() + 1);
  const day = pad2(d.getDate());
  const hh = pad2(d.getHours());
  const mm = pad2(d.getMinutes());
  return `${y}-${m}-${day}T${hh}:${mm}`;
}

// =============================
// Breed options (English-only labels)
// =============================
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
// =============================
// Size & Age options (English labels)
// =============================
const SIZE_OPTS = [
  { value: "", label: "-- Select size --" },
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large", label: "Large" },
];
const DOG_AGE_OPTS = [
  { value: "", label: "-- Select age --" },
  { value: "puppy", label: "Puppy" },
  { value: "adult", label: "Adult" },
];
const CAT_AGE_OPTS = [
  { value: "", label: "-- Select age --" },
  { value: "kitten", label: "Kitten" },
  { value: "adult", label: "Adult" },
];

// =============================
// Component: SightingForm
// =============================
export default function SightingForm({ onAdd }) {
  // -- Local state
  const [state, setState] = useState({
    species: "dog", breed: "", color: "", size: "", age: "", notes: "",
    time: nowLocalInputValue(), lat: 13.7563, lng: 100.5018, photoFile: null,
  });

  // -- Change handler for inputs
  const onChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "photo") {
      setState((s) => ({ ...s, photoFile: files?.[0] || null }));
      return;
    }
    if (name === "time") {
      setState((s) => ({ ...s, time: value }));
      return;
    }
    setState((s) => ({ ...s, [name]: name === "lat" || name === "lng" ? Number(value) : value }));
  };

  // -- Submit handler: prevent future time, then create item
  const onSubmit = async (e) => {
    e.preventDefault();
    const maxNow = nowLocalInputValue();
    if (state.time > maxNow) {
      alert("Invalid time: future date/time is not allowed.");
      return;
    }
    const photo = await fileToDataURL(state.photoFile);
    const item = {
      id: uid("SG"),
      species: state.species,
      breed: state.breed,
      color: state.color,
      size: state.size,
      age: state.age,
      notes: state.notes,
      time: state.time,
      photo: photo || null,
      geo: { lat: Number(state.lat), lng: Number(state.lng) },
    };
    onAdd(item);
    setState((s) => ({ ...s, notes: "", breed: "", color: "", size: "", age: "" }));
  };

  // -- Breed options by species
  const BREEDS = state.species === "dog" ? DOG_BREEDS : CAT_BREEDS;
  const AGE_OPTS = state.species === "dog" ? DOG_AGE_OPTS : CAT_AGE_OPTS;

  return (
    <section className="bg-white rounded-2xl shadow p-5">
      {/* // Title */}
      <h2 className="text-lg font-semibold mb-3">Add Sighting</h2>

      {/* // Form fields */}
      <form onSubmit={onSubmit} className="grid grid-cols-2 gap-3">
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
          <input name="color" value={state.color} onChange={onChange} className="mt-1 w-full rounded-xl border px-3 py-2" placeholder="e.g., black / cream" />
        </div>
        <div>
          <label className="block text-sm font-medium">Size</label>
          <select
            name="size"
            value={state.size}
            onChange={onChange}
            className="mt-1 w-full rounded-xl border px-3 py-2"
          >
            {SIZE_OPTS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">Age</label>
          <select
            name="age"
            value={state.age}
            onChange={onChange}
            className="mt-1 w-full rounded-xl border px-3 py-2"
          >
            {AGE_OPTS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">Time</label>
          <input type="datetime-local" name="time" value={state.time} max={nowLocalInputValue()} onChange={onChange} className="mt-1 w-full rounded-xl border px-3 py-2" />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium">Notes</label>
          <input name="notes" value={state.notes} onChange={onChange} className="mt-1 w-full rounded-xl border px-3 py-2" placeholder="Additional details (optional)" />
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
          <label className="block text-sm font-medium">Photo (optional)</label>
          <input type="file" name="photo" accept="image/*" onChange={onChange} className="mt-1 w-full" />
        </div>
        <div className="col-span-2">
          <button className="px-4 py-2 rounded-xl bg-orange-500 text-white">Save Sighting</button>
        </div>
      </form>
    </section>
  );
}