export const PRESENCE_LABELS = {
  active: "Active",
  away: "Away",
  dnd: "Do not disturb",
  offline: "Offline",
};

export function presenceLabel(status) {
  return PRESENCE_LABELS[status] || "Offline";
}

export function presenceDotClass(status) {
  switch (status) {
    case "active":
      return "bg-emerald-500";
    case "away":
      return "bg-amber-400";
    case "dnd":
      return "bg-red-500";
    default:
      return "bg-gray-500";
  }
}

export function presenceTextClass(status) {
  switch (status) {
    case "active":
      return "text-emerald-400";
    case "away":
      return "text-amber-400";
    case "dnd":
      return "text-red-400";
    default:
      return "text-gray-400";
  }
}
