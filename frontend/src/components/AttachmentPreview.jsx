import React from "react";
import { ExternalLink, FileText, FolderDown } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

function buildAttachmentUrl(attachment) {
  if (!attachment) return "";
  if (/^https?:\/\//i.test(attachment)) {
    // Proxy absolute external attachments through backend to avoid client-side CORS/auth issues
    return `${API_BASE}/api/files/proxy?url=${encodeURIComponent(attachment)}`;
  }
  return `${API_BASE}${attachment.startsWith("/") ? "" : "/"}${attachment}`;
}

function getAttachmentKind(attachment) {
  const cleanUrl = String(attachment || "").split("?")[0].toLowerCase();
  if (/\.(jpeg|jpg|gif|png|webp|bmp|svg)$/.test(cleanUrl)) return "image";
  if (/\.pdf$/.test(cleanUrl)) return "pdf";
  if (/\.(mp3|wav|ogg|webm|m4a)$/.test(cleanUrl)) return "audio";
  return "file";
}

function getFileName(attachment) {
  try {
    const url = new URL(buildAttachmentUrl(attachment));
    const name = decodeURIComponent(url.pathname.split("/").pop() || "");
    return name || "Attachment";
  } catch {
    return String(attachment || "").split("/").pop() || "Attachment";
  }
}

function AttachmentPreview({ attachment, compact = false, previewUrl = null }) {
  const href = buildAttachmentUrl(attachment);
  const kind = getAttachmentKind(attachment);
  const fileName = getFileName(attachment);

  if (!href) return null;

  if (kind === "image") {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="inline-block">
        <img
          src={href}
          alt={fileName}
          className={
            compact
              ? "w-24 h-24 object-cover rounded-lg border border-white/10"
              : "max-w-xs max-h-80 object-contain rounded-lg border border-white/10"
          }
        />
      </a>
    );
  }

  if (kind === "pdf") {
    return (
      <div
        className={
          compact
            ? "w-72 max-w-full rounded-lg border border-white/10 bg-black/20 overflow-hidden"
            : "w-[min(560px,80vw)] rounded-lg border border-white/10 bg-black/20 overflow-hidden"
        }
      >
        <div className="h-9 px-3 flex items-center justify-between gap-3 border-b border-white/10 bg-white/5">
          <div className="min-w-0 flex items-center gap-2 text-sm text-white/85">
            <FileText size={16} className="shrink-0 text-red-300" strokeWidth={2} />
            <span className="truncate">{fileName}</span>
          </div>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 text-white/55 hover:text-white"
            title="Open PDF"
          >
            <ExternalLink size={15} strokeWidth={2} />
          </a>
        </div>
        <iframe
          title={fileName}
          src={href}
          className={compact ? "w-full h-36 bg-white" : "w-full h-80 bg-white"}
        />
      </div>
    );
  }

  if (kind === "audio") {
    return <audio controls src={previewUrl || href} className="w-80 max-w-full" />;
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-400 hover:underline inline-flex items-center gap-1.5 text-sm"
    >
      <FolderDown size={14} strokeWidth={2} /> Download attachment
    </a>
  );
}

export default AttachmentPreview;
