// src/components/AlertTestPanel.jsx
import React from "react";
import LostForm from "./LostForm";
import SightingForm from "./SightingForm";
import { MapContainer, TileLayer, CircleMarker, Popup, LayersControl, LayerGroup, Circle } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export default function AlertTestPanel({
  user, prefs,
  onU2LostAdd, onU2SightingAdd,
  u2Lost = [], u2Sights = [],
  // 👇 ใหม่: handler ล้างข้อมูล User2
  onClearU2Lost,
  onClearU2Sights,
  onClearU2All,
}) {
  const center = [user?.lat ?? 13.7563, user?.lng ?? 100.5018];

  const ask = (msg, fn) => {
    if (!fn) return;
    if (confirm(msg)) fn();
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Toolbar ล้างข้อมูล User2 */}
      <section className="bg-white rounded-2xl shadow p-4 md:col-span-2">
        <div className="flex items-center justify-between">
          <div className="font-medium">Alert Test Tools</div>
          <div className="flex gap-2">
            <button
              className="px-3 py-1 rounded border"
              onClick={() => ask("ล้าง Users2 Lost ทั้งหมด?", onClearU2Lost)}
            >
              Clear U2 Lost
            </button>
            <button
              className="px-3 py-1 rounded border"
              onClick={() => ask("ล้าง Users2 Sightings ทั้งหมด?", onClearU2Sights)}
            >
              Clear U2 Sightings
            </button>
            <button
              className="px-3 py-1 rounded border"
              onClick={() => ask("ล้าง Users2 Lost + Sightings ทั้งหมด?", onClearU2All)}
            >
              Clear U2 All
            </button>
          </div>
        </div>
      </section>

      <section className="bg-white rounded-2xl shadow p-5">
        <h2 className="text-lg font-semibold mb-3">Users 2 • Add Lost</h2>
        <p className="text-xs text-gray-500 mb-2">
          ถ้าโซนค้นหา (Search Zone) ของรายงานนี้มีจุดผู้ใช้อยู่ในรัศมี + อยู่ใน Alert radius ของคุณ ระบบจะสร้าง Notification
        </p>
        <LostForm onAdd={onU2LostAdd} />
      </section>

      <section className="bg-white rounded-2xl shadow p-5">
        <h2 className="text-lg font-semibold mb-3">Users 2 • Add Sighting</h2>
        <p className="text-xs text-gray-500 mb-2">
          ถ้า match กับ “สัตว์ของฉัน” คะแนน ≥ 70 ระบบจะสร้าง Notification
        </p>
        <SightingForm onAdd={onU2SightingAdd} />
      </section>

      <section className="bg-white rounded-2xl shadow p-5 md:col-span-2">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Mini Map • Users 2 Data + My Location</h3>
          <span className="text-xs text-gray-500">จุดม่วง = ฉัน • เขียว = U2 Lost • ส้ม = U2 Sighting</span>
        </div>
        <div className="h-[420px] rounded-xl overflow-hidden border">
          <MapContainer center={center} zoom={12} scrollWheelZoom className="h-full w-full">
            <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <LayersControl position="topright">
              <LayersControl.Overlay checked name="My Location">
                <LayerGroup>
                  <CircleMarker center={[user.lat, user.lng]} radius={7} pathOptions={{ color: "#7c3aed", fillColor: "#7c3aed", fillOpacity: 0.9 }}>
                    <Popup>
                      <div className="text-sm"><b>ME</b><div className="text-xs opacity-70">lat {user.lat.toFixed(4)}, lng {user.lng.toFixed(4)}</div></div>
                    </Popup>
                  </CircleMarker>
                  <Circle center={[user.lat, user.lng]} radius={(prefs?.alertRadiusKm ?? 0) * 1000} pathOptions={{ color: "#a78bfa", fillColor: "#a78bfa", dashArray: "6 6", fillOpacity: 0.08 }} />
                </LayerGroup>
              </LayersControl.Overlay>

              <LayersControl.Overlay checked name="Users2 Lost">
                <LayerGroup>
                  {u2Lost.map((p) => (
                    <CircleMarker key={p.id} center={[p.geo.lat, p.geo.lng]} radius={7} pathOptions={{ color: "#16a34a", fillColor: "#16a34a", fillOpacity: 0.9 }}>
                      <Popup>
                        <div className="text-sm">
                          <div className="font-semibold">U2 Lost #{p.id} · {p.breed} · {p.color}</div>
                          <div className="text-xs opacity-70">{String(p.lastSeenAt).replace("T"," ")}</div>
                          <div className="text-xs opacity-70">lat {p.geo.lat.toFixed(4)}, lng {p.geo.lng.toFixed(4)}</div>
                        </div>
                      </Popup>
                    </CircleMarker>
                  ))}
                </LayerGroup>
              </LayersControl.Overlay>

              <LayersControl.Overlay checked name="Users2 Sightings">
                <LayerGroup>
                  {u2Sights.map((s) => (
                    <CircleMarker key={s.id} center={[s.geo.lat, s.geo.lng]} radius={7} pathOptions={{ color: "#f97316", fillColor: "#f97316", fillOpacity: 0.9 }}>
                      <Popup>
                        <div className="text-sm">
                          <div className="font-semibold">U2 Sighting #{s.id} · {s.breed} · {s.color}</div>
                          <div className="text-xs opacity-70">{String(s.time).replace("T"," ")}</div>
                          <div className="text-xs opacity-70">lat {s.geo.lat.toFixed(4)}, lng {s.geo.lng.toFixed(4)}</div>
                        </div>
                      </Popup>
                    </CircleMarker>
                  ))}
                </LayerGroup>
              </LayersControl.Overlay>
            </LayersControl>
          </MapContainer>
        </div>
      </section>
    </div>
  );
}