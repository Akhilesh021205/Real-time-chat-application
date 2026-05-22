import React from "react";
import {
  Laptop,
  Home,
  Bus,
  Calendar,
  Coffee,
  Headphones,
  Plane,
  Thermometer,
} from "lucide-react";

export const STATUS_PRESETS = [
  { id: "laptop", Icon: Laptop, label: "Working remotely" },
  { id: "home", Icon: Home, label: "Working from home" },
  { id: "bus", Icon: Bus, label: "Commuting" },
  { id: "calendar", Icon: Calendar, label: "In a meeting" },
  { id: "coffee", Icon: Coffee, label: "On a break" },
  { id: "headphones", Icon: Headphones, label: "Focusing" },
  { id: "plane", Icon: Plane, label: "Out of office" },
  { id: "sick", Icon: Thermometer, label: "Out sick" },
];

const PRESET_BY_ID = Object.fromEntries(STATUS_PRESETS.map((p) => [p.id, p]));

export function StatusIcon({ iconKey, size = 16, className = "" }) {
  const preset = PRESET_BY_ID[iconKey];
  if (preset) {
    const Icon = preset.Icon;
    return (
      <Icon
        size={size}
        strokeWidth={2}
        className={`shrink-0 text-white/70 ${className}`}
        aria-hidden
      />
    );
  }
  if (iconKey) {
    return <span className={`text-sm leading-none shrink-0 ${className}`}>{iconKey}</span>;
  }
  return null;
}

export function CustomStatusLine({ customStatus, className = "", iconSize = 12 }) {
  if (!customStatus?.text) return null;
  return (
    <span className={`inline-flex items-center gap-1.5 min-w-0 max-w-full ${className}`}>
      {customStatus.emoji && (
        <StatusIcon iconKey={customStatus.emoji} size={iconSize} />
      )}
      <span className="truncate">{customStatus.text}</span>
    </span>
  );
}
