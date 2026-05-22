const IMAGE_EXT = /\.(jpe?g|png|gif|webp|svg|bmp)$/i;
const PDF_EXT = /\.pdf$/i;

export function isImageFile(file) {
  const mime = file?.mimetype || "";
  const name = file?.name || "";
  return mime.startsWith("image/") || IMAGE_EXT.test(name);
}

export function isPdfFile(file) {
  const mime = file?.mimetype || "";
  const name = file?.name || "";
  return mime === "application/pdf" || PDF_EXT.test(name);
}

export function getFileExtension(name = "") {
  const parts = name.split(".");
  return parts.length > 1 ? parts.pop().toUpperCase() : "FILE";
}

export function formatFileSize(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatRelativeTime(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}

export function getAccentForExt(ext) {
  const map = {
    PDF: "from-rose-500/30 to-orange-600/20 text-rose-200",
    DOC: "from-blue-500/30 to-indigo-600/20 text-blue-200",
    DOCX: "from-blue-500/30 to-indigo-600/20 text-blue-200",
    XLS: "from-emerald-500/30 to-teal-600/20 text-emerald-200",
    XLSX: "from-emerald-500/30 to-teal-600/20 text-emerald-200",
    ZIP: "from-amber-500/30 to-yellow-600/20 text-amber-200",
    MP4: "from-purple-500/30 to-violet-600/20 text-purple-200",
    MP3: "from-cyan-500/30 to-blue-600/20 text-cyan-200",
  };
  return map[ext] || "from-indigo-500/25 to-purple-600/15 text-indigo-200";
}

export const STARRED_FILES_KEY = "slackClone.starredFiles";

export function loadStarredFileIds() {
  try {
    return JSON.parse(localStorage.getItem(STARRED_FILES_KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveStarredFileIds(ids) {
  localStorage.setItem(STARRED_FILES_KEY, JSON.stringify(ids));
}
