"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { useEffect, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Custom hospital icon
const hospitalIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/1483/1483336.png",
  iconSize: [32, 32],
});

export function HospitalMap({ searchQuery }: { searchQuery: string }) {
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [hospitals, setHospitals] = useState<any[]>([]);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition([pos.coords.latitude, pos.coords.longitude]);
      },
      () => alert("Location access denied"),
      { enableHighAccuracy: true }
    );
  }, []);

  useEffect(() => {
    if (!position) return;

    const fetchHospitals = async () => {
      const query = searchQuery.trim() || "hospital";

      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${query} near (${position[0]}, ${position[1]})&limit=20`;

      const res = await fetch(url, {
        headers: { "User-Agent": "HospitalFinderApp/1.0" },
      });

      const data = await res.json();
      setHospitals(data);
    };

    fetchHospitals();
  }, [position, searchQuery]);

  if (!position) {
    return (
      <div className="w-full h-80 flex items-center justify-center rounded-lg border">
        Getting your location…
      </div>
    );
  }

  return (
    <MapContainer
      center={[position[0], position[1]] as L.LatLngExpression}
      zoom={14}
      className="w-full h-[450px] rounded-lg border z-0"
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

      {/* USER LOCATION */}
      <Marker position={position as L.LatLngExpression}>
        <Popup>You are here</Popup>
      </Marker>

      {/* NEARBY HOSPITALS */}
      {hospitals.map((h, idx) => (
        <Marker
          key={idx}
          position={
            [parseFloat(h.lat), parseFloat(h.lon)] as L.LatLngExpression
          }
          icon={hospitalIcon as L.Icon}
        >
          <Popup>
            <b>{h.display_name.split(",")[0]}</b>
            <br />
            {h.display_name}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
