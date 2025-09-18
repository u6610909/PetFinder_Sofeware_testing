import React from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, LayersControl, LayerGroup, Circle } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { computeSearchRadiusKm } from "../utils/searchZone";

export default function MapLeafletPanel({ lost = [], sightings = [], myLostId = null }) {
  const center = [13.7563, 100.5018];
  const Z = 12;
  const myLost = (myLostId && (lost || []).find((p) => p.id === myLostId)) || null;

  return (
    <div className="bg-white rounded-2xl shadow p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Map (Leaflet) – Lost=เขียว • Sighting=ส้ม • Zone=น้ำเงิน (เฉพาะสัตว์ของฉัน)</h2>
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

            {/* Recommend Search Zone — show ONLY for myLost */}
            {myLost && (
              <LayersControl.Overlay checked name="Search Zone (mine only)">
                <LayerGroup>
                  {(() => {
                    const { km, tier, hours } = computeSearchRadiusKm(myLost.lastSeenAt, { specialNeeds: !!myLost.specialNeeds });
                    const zoneColor = myLost.specialNeeds ? "#ef4444" : "#3b82f6";
                    return (
                      <Circle
                        center={[myLost.geo.lat, myLost.geo.lng]}
                        radius={km * 1000}
                        pathOptions={{ color: zoneColor, fillColor: zoneColor, fillOpacity: 0.08 }}
                      >
                        <Popup>
                          <div className="text-sm">
                            <div className="font-semibold">Search Zone for {myLost.name || "(ไม่มีชื่อ)"} <span className="opacity-60 text-xs">#{myLost.id}</span></div>
                            <div className="opacity-80">แนะนำรัศมี: <b>{km} กม.</b> (tier {tier}, elapsed ≈ {hours.toFixed(1)} ชม.)</div>
                            <div className="opacity-70 text-xs mt-1">ศูนย์กลาง: lat {myLost.geo.lat.toFixed(4)}, lng {myLost.geo.lng.toFixed(4)}</div>
                          </div>
                        </Popup>
                      </Circle>
                    );
                  })()}
                </LayerGroup>
              </LayersControl.Overlay>
            )}
          </LayersControl>
        </MapContainer>
      </div>
      <div className="mt-3 text-xs text-gray-500">* วงกลม Zone จะแสดงเฉพาะ “สัตว์ของฉัน” ที่ตั้งค่าไว้จากแท็บ Sighting</div>
    </div>
  );
}