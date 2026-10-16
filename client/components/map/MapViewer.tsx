"use client";

import React, { useMemo, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import Link from "next/link";
import { NAGPUR_CENTER, ISSUE_TYPE_LABELS, STATUS_META } from "@/lib/constants";
import type { Issue, Hotspot } from "@/lib/types";
import { ThumbsUp, ArrowRight, Flame } from "lucide-react";

interface MapViewerProps {
  issues: Issue[];
  hotspots?: Hotspot[];
  selectedIssueId?: string | null;
  onSelectIssue?: (issue: Issue) => void;
  className?: string;
  zoom?: number;
  center?: { lat: number; lng: number };
}

function getMarkerIcon(status: string, isSelected: boolean = false) {
  const colors: Record<string, { bg: string; ring: string }> = {
    reported: { bg: "#EF4444", ring: "#FCA5A5" },
    verified: { bg: "#F59E0B", ring: "#FCD34D" },
    in_progress: { bg: "#3B82F6", ring: "#93C5FD" },
    resolved: { bg: "#10B981", ring: "#6EE7B7" },
    rejected: { bg: "#64748B", ring: "#CBD5E1" },
  };
  const c = colors[status] || colors.reported;
  const size = isSelected ? 34 : 26;
  const dotSize = isSelected ? 20 : 16;

  return L.divIcon({
    className: "custom-div-pin",
    html: `
      <div style="position: relative; width: ${size}px; height: ${size}px; display: flex; align-items: center; justify-content: center;">
        <span style="position: absolute; width: ${size}px; height: ${size}px; border-radius: 50%; background: ${c.ring}; opacity: ${isSelected ? 0.9 : 0.45}; transform: scale(${isSelected ? 1.2 : 1}); transition: all 0.2s;"></span>
        <span style="position: relative; width: ${dotSize}px; height: ${dotSize}px; border-radius: 50%; background: ${c.bg}; border: 2.5px solid #ffffff; box-shadow: 0 3px 6px rgba(0,0,0,0.25);"></span>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();

  useEffect(() => {
    // Invalidate size and ensure map centers directly on Nagpur at proper zoom
    map.invalidateSize();
    map.setView(center, zoom, { animate: false });

    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => clearTimeout(timer);
  }, [map, center, zoom]);

  return null;
}

export default function MapViewer({
  issues,
  hotspots = [],
  selectedIssueId,
  onSelectIssue,
  className = "h-[480px] w-full rounded-2xl overflow-hidden",
  zoom = 12.5,
  center = { lat: NAGPUR_CENTER.lat, lng: NAGPUR_CENTER.lng },
}: MapViewerProps) {
  const validIssues = useMemo(() => {
    return issues.filter((i) => i.lat !== null && i.lng !== null);
  }, [issues]);

  return (
    <div className={`relative ${className} shadow-sm border border-slate-200/80`}>
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={zoom}
        minZoom={10}
        maxZoom={18}
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%" }}
      >
        <MapController center={[center.lat, center.lng]} zoom={zoom} />

        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Hotspot Circles */}
        {hotspots.map((hs, idx) => (
          <Circle
            key={`hs-${idx}`}
            center={[hs.lat, hs.lng]}
            radius={hs.radius_m || 200}
            pathOptions={{
              color: "#EF4444",
              fillColor: "#EF4444",
              fillOpacity: 0.18,
              weight: 2,
              dashArray: "4, 6",
            }}
          >
            <Popup>
              <div className="p-1 max-w-[200px]">
                <div className="flex items-center gap-1.5 text-rose-600 font-bold text-xs mb-1">
                  <Flame className="h-4 w-4" />
                  <span>Hotspot Cluster</span>
                </div>
                <p className="text-xs font-semibold text-slate-800 capitalize">
                  {ISSUE_TYPE_LABELS[hs.type] || hs.type}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Ward: <span className="font-medium text-slate-700">{hs.ward_name}</span>
                </p>
                <div className="mt-2 flex items-center justify-between text-[11px] bg-rose-50 text-rose-800 px-2 py-1 rounded-md">
                  <span>Recurrence: {hs.recurrence_count} reports</span>
                  <span className="font-bold">Score: {Math.round(hs.priority_score)}</span>
                </div>
              </div>
            </Popup>
          </Circle>
        ))}

        {/* Issue Pins */}
        {validIssues.map((issue) => {
          const isSelected = issue.id === selectedIssueId;
          const statusMeta = STATUS_META[issue.status] || STATUS_META.reported;

          return (
            <Marker
              key={issue.id}
              position={[issue.lat, issue.lng]}
              icon={getMarkerIcon(issue.status, isSelected)}
              eventHandlers={{
                click: () => onSelectIssue?.(issue),
              }}
            >
              <Popup>
                <div className="p-1 max-w-[230px]">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-xs font-bold text-slate-900">
                      {ISSUE_TYPE_LABELS[issue.type] || issue.type}
                    </span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${statusMeta.badge}`}>
                      {statusMeta.label}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                    {issue.description}
                  </p>

                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1 text-slate-500">
                      <ThumbsUp className="h-3.5 w-3.5" />
                      <span>{issue.upvote_count}</span>
                    </div>

                    <Link
                      href={`/issues/${issue.id}`}
                      className="inline-flex items-center gap-1 font-semibold text-sky-600 hover:text-sky-700 hover:underline"
                    >
                      <span>Details</span>
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
