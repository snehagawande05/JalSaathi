"use client";

import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import { NAGPUR_CENTER } from "@/lib/constants";

interface LocationPickerProps {
  lat: number;
  lng: number;
  onChange: (coords: { lat: number; lng: number }) => void;
  className?: string;
}

const pickerIcon = L.divIcon({
  className: "custom-picker-pin",
  html: `
    <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
      <span style="position: absolute; width: 34px; height: 34px; border-radius: 50%; background: #0284c7; opacity: 0.35; animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>
      <div style="position: relative; width: 26px; height: 26px; border-radius: 50%; background: #0284c7; border: 3px solid #ffffff; box-shadow: 0 4px 10px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
        </svg>
      </div>
    </div>
  `,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

function MapClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      onClick(Number(e.latlng.lat.toFixed(6)), Number(e.latlng.lng.toFixed(6)));
    },
  });
  return null;
}

function MapController({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    map.setView(center, 13, { animate: false });
    const timer = setTimeout(() => map.invalidateSize(), 200);
    return () => clearTimeout(timer);
  }, [map, center]);
  return null;
}

export default function LocationPickerMap({
  lat,
  lng,
  onChange,
  className = "h-[400px] w-full rounded-2xl overflow-hidden",
}: LocationPickerProps) {
  const [position, setPosition] = useState<[number, number]>([
    lat || NAGPUR_CENTER.lat,
    lng || NAGPUR_CENTER.lng,
  ]);

  const handleMapClick = (newLat: number, newLng: number) => {
    setPosition([newLat, newLng]);
    onChange({ lat: newLat, lng: newLng });
  };

  return (
    <div className={`relative ${className} border border-slate-200/80 shadow-xs`}>
      <MapContainer
        center={[lat || NAGPUR_CENTER.lat, lng || NAGPUR_CENTER.lng]}
        zoom={13}
        minZoom={10}
        maxZoom={18}
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%" }}
      >
        <MapController center={[lat || NAGPUR_CENTER.lat, lng || NAGPUR_CENTER.lng]} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapClickHandler onClick={handleMapClick} />
        <Marker
          position={position}
          icon={pickerIcon}
          draggable={true}
          eventHandlers={{
            dragend: (e) => {
              const marker = e.target;
              const { lat: dLat, lng: dLng } = marker.getLatLng();
              const fLat = Number(dLat.toFixed(6));
              const fLng = Number(dLng.toFixed(6));
              setPosition([fLat, fLng]);
              onChange({ lat: fLat, lng: fLng });
            },
          }}
        />
      </MapContainer>
    </div>
  );
}
