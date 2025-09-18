// src/components/NotificationsPanel.jsx
// Notification Center component: manages user location & alert preferences and renders the notification list
import React, { useMemo, useState } from "react";
// -------------------- Imports --------------------

 // -------------------- Component --------------------
export default function NotificationsPanel({
  user, setUser,
  prefs, setPrefs,
  notifs, setNotifs
}) {
  // Local form state for editing user location and alert preferences
  const [form, setForm] = useState({
    lat: user?.lat ?? 13.7563,
    lng: user?.lng ?? 100.5018,
    alertRadiusKm: prefs?.alertRadiusKm ?? 5,
    frequency: prefs?.frequency ?? "immediate",
  });

  // Handle form field changes (casts numerical fields to Number)
  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({
      ...f,
      [name]: name === "lat" || name === "lng" || name === "alertRadiusKm" ? Number(value) : value
    }));
  };

  const onSave = (e) => {
    e.preventDefault();
    setUser((u) => ({ ...(u || { id: "ME" }), lat: Number(form.lat), lng: Number(form.lng) }));
    setPrefs((p) => ({ ...(p || {}), alertRadiusKm: Number(form.alertRadiusKm), frequency: form.frequency }));
    alert("Notification preferences saved");
  };

  // Mark all notifications as read
  const markAllRead = () => {
    setNotifs((arr) => (arr || []).map((n) => ({ ...n, read: true })));
  };
  // Clear all notifications (with confirmation)
  const clearAll = () => {
    if (confirm("Clear all notifications?")) setNotifs([]);
  };

  // Group notifications by urgency for quick filtering/rendering
  const grouped = useMemo(() => {
    const g = { high: [], medium: [], low: [] };
    for (const n of notifs || []) g[n.urgency || "low"].push(n);
    return g;
  }, [notifs]);

  // Small colored badge for urgency labels
  const Badge = ({ urgency }) => {
    const map = {
      high: "bg-red-600", medium: "bg-amber-500", low: "bg-gray-400"
    };
    return <span className={`px-2 py-0.5 text-xs rounded-full text-white ${map[urgency]}`}>{urgency}</span>;
  };

  return (
    <div className="bg-white rounded-2xl shadow p-5">
      {/* // Header */}
      <h2 className="text-lg font-semibold mb-4">Notification Center</h2>

      {/* // Settings form (user location, alert radius, frequency) */}
      <form onSubmit={onSave} className="grid grid-cols-2 gap-3 mb-5">
        <div className="col-span-2 font-medium">Settings</div>
        <div>
          <label className="block text-sm font-medium">My lat</label>
          <input name="lat" type="number" step="0.0001" value={form.lat} onChange={onChange} className="mt-1 w-full rounded-xl border px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium">My lng</label>
          <input name="lng" type="number" step="0.0001" value={form.lng} onChange={onChange} className="mt-1 w-full rounded-xl border px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium">Alert radius (km)</label>
          <input name="alertRadiusKm" type="number" step="0.1" min="0" value={form.alertRadiusKm} onChange={onChange} className="mt-1 w-full rounded-xl border px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium">Frequency</label>
          <select name="frequency" value={form.frequency} onChange={onChange} className="mt-1 w-full rounded-xl border px-3 py-2">
            <option value="immediate">Immediate</option>
            <option value="mute">Mute (disable alerts)</option>
          </select>
        </div>
      <div className="col-span-2">
        <button className="px-4 py-2 rounded-xl bg-indigo-600 text-white">Save</button>
      </div>
      </form>

      {/* // Toolbar for bulk actions */}
      <div className="flex items-center justify-between mb-2">
        <div className="font-medium">Recent notifications</div>
        <div className="flex gap-2">
          <button onClick={markAllRead} className="px-3 py-1 rounded border">Mark all read</button>
          <button onClick={clearAll} className="px-3 py-1 rounded border">Clear</button>
        </div>
      </div>

      {(notifs || []).length === 0 ? (
        <div className="text-sm opacity-70">— No notifications —</div>
      ) : (
        <>
          {/* // Notification list */}
          <ul className="space-y-2 max-h-[420px] overflow-auto pr-1">
            {(notifs || []).map((n) => (
              <li key={n.id} className={`p-3 rounded border ${n.read ? "opacity-60" : ""}`}>
                {/* // Notification header: type + urgency badge */}
                <div className="flex items-center justify-between">
                  <div className="font-medium">{n.type}</div>
                  <Badge urgency={n.urgency || "low"} />
                </div>
                {/* // Notification message */}
                <div className="text-sm mt-1">{n.message}</div>
                {/* // Timestamp */}
                <div className="text-xs opacity-60 mt-1">{new Date(n.ts).toLocaleString()}</div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}