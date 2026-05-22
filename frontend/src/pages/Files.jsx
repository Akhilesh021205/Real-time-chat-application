import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import {
  Upload,
  Download,
  MoreHorizontal,
  Star,
  Trash2,
  FileText,
  Image as ImageIcon,
  Folder,
  FolderOpen,
  Link2,
} from "lucide-react";
import Sidebar from "../components/Sidebar.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import {
  isImageFile,
  isPdfFile,
  getFileExtension,
  formatFileSize,
  formatRelativeTime,
  getAccentForExt,
  loadStarredFileIds,
  saveStarredFileIds,
} from "../utils/fileHelpers.js";

const FILTERS = [
  { id: "recent", label: "Recent" },
  { id: "images", label: "Images" },
  { id: "pdfs", label: "PDFs" },
  { id: "shared", label: "Shared" },
  { id: "starred", label: "Starred" },
];

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

function fileHref(url) {
  if (!url) return "#";
  return url.startsWith("http") ? url : `${API_BASE}${url}`;
}

function FilesEmptyState({ onUpload }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center animate-fade-in">
      <div className="relative mb-8">
        <div className="w-28 h-28 rounded-[28px] bg-gradient-to-br from-indigo-500/20 via-purple-500/10 to-transparent border border-white/10 flex items-center justify-center backdrop-blur-xl">
          <FolderOpen size={44} className="text-indigo-300/80" strokeWidth={1.5} />
        </div>
        <div className="absolute -right-2 -bottom-2 w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
          <Upload size={20} className="text-white" />
        </div>
      </div>
      <h3 className="text-xl font-semibold text-white tracking-tight mb-2">
        Your workspace is ready for files
      </h3>
      <p className="text-sm text-gray-400 max-w-sm leading-relaxed mb-8">
        Upload images, PDFs, and documents. They&apos;ll appear in Recent Uploads
        and stay organized with filters.
      </p>
      <button
        type="button"
        onClick={onUpload}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all"
      >
        <Upload size={16} />
        Upload your first file
      </button>
    </div>
  );
}

function RecentFileCard({ file, starred, onToggleStar }) {
  const isImg = isImageFile(file);
  const ext = getFileExtension(file.name);
  const href = fileHref(file.url);

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group shrink-0 w-[168px] rounded-[22px] border border-white/[0.08] bg-white/[0.04] backdrop-blur-md overflow-hidden hover:border-indigo-500/40 hover:shadow-[0_8px_32px_rgba(94,67,243,0.15)] hover:-translate-y-1 transition-all duration-300"
    >
      <div className="h-[108px] relative overflow-hidden bg-[#0d1117]">
        {isImg ? (
          <img
            src={href}
            alt={file.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div
            className={`w-full h-full flex flex-col items-center justify-center bg-gradient-to-br ${getAccentForExt(ext)}`}
          >
            <FileText size={32} strokeWidth={1.5} className="opacity-90" />
            <span className="text-[10px] font-bold tracking-widest mt-2 opacity-80">
              {ext}
            </span>
          </div>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            onToggleStar(file._id);
          }}
          className={`absolute top-2 right-2 p-1.5 rounded-xl backdrop-blur-md border border-white/10 transition-all ${
            starred
              ? "bg-amber-500/20 text-amber-300"
              : "bg-black/40 text-white/60 opacity-0 group-hover:opacity-100 hover:text-amber-300"
          }`}
          title={starred ? "Unstar" : "Star"}
        >
          <Star size={14} fill={starred ? "currentColor" : "none"} />
        </button>
      </div>
      <div className="p-3">
        <p className="text-[13px] font-medium text-white truncate">{file.name}</p>
        <p className="text-[11px] text-gray-500 mt-0.5">
          {formatRelativeTime(file.createdAt)}
        </p>
      </div>
    </a>
  );
}

function FileRow({ file, starred, currentUserId, onToggleStar, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const isImg = isImageFile(file);
  const ext = getFileExtension(file.name);
  const href = fileHref(file.url);
  const isShared =
    file.uploader?._id && String(file.uploader._id) !== String(currentUserId);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuOpen]);

  return (
    <div className="group flex items-center gap-4 px-4 py-3.5 rounded-2xl border border-transparent hover:border-white/[0.08] hover:bg-white/[0.04] hover:shadow-[0_4px_24px_rgba(94,67,243,0.08)] transition-all duration-200">
      <div className="shrink-0 w-11 h-11 rounded-xl overflow-hidden border border-white/10">
        {isImg ? (
          <img src={href} alt="" className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div
            className={`w-full h-full flex items-center justify-center text-xs font-bold bg-gradient-to-br ${getAccentForExt(ext)}`}
          >
            {ext.slice(0, 3)}
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-medium text-white truncate">{file.name}</p>
        <p className="text-xs text-gray-500 mt-0.5 flex flex-wrap items-center gap-x-2">
          <span>{formatRelativeTime(file.createdAt)}</span>
          {file.size ? <span>· {formatFileSize(file.size)}</span> : null}
          {isShared && file.uploader?.username ? (
            <span className="text-indigo-400/90">· {file.uploader.username}</span>
          ) : null}
        </p>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <a
          href={href}
          download
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          title="Download"
        >
          <Download size={18} strokeWidth={2} />
        </a>
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            title="More actions"
          >
            <MoreHorizontal size={18} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-44 py-1 rounded-xl border border-white/10 bg-[#1a1f2e]/95 backdrop-blur-xl shadow-2xl z-50 animate-fade-in">
              <button
                type="button"
                onClick={() => {
                  onToggleStar(file._id);
                  setMenuOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white"
              >
                <Star size={14} fill={starred ? "currentColor" : "none"} />
                {starred ? "Unstar" : "Star file"}
              </button>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(href);
                  setMenuOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white"
              >
                <Link2 size={14} />
                Copy link
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onDelete(file._id);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-rose-400 hover:bg-rose-500/10"
              >
                <Trash2 size={14} />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Files() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [channels, setChannels] = useState([]);
  const [activeArea, setActiveArea] = useState("files");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [activeFilter, setActiveFilter] = useState("recent");
  const [starredIds, setStarredIds] = useState(() => loadStarredFileIds());
  const fileInputRef = useRef(null);

  useEffect(() => {
    axios
      .get(`${API_BASE}/api/users`, { withCredentials: true })
      .then((res) => setUsers(res.data))
      .catch(console.error);
  }, []);

  const fetchChannels = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/channels`, { withCredentials: true });
      setChannels(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchFiles = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/files`, { withCredentials: true });
      setUploadedFiles(res.data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchChannels();
    fetchFiles();
  }, [fetchFiles]);

  const handlePickFile = () => {
    setUploadError("");
    fileInputRef.current?.click();
  };

  const handleUploadFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploading(true);
    setUploadError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await axios.post(`${API_BASE}/api/files/upload`, formData, {
        withCredentials: true,
      });
      const newFile = res.data;
      if (!newFile) throw new Error("Upload succeeded but no file data returned");
      setUploadedFiles((prev) => [newFile, ...prev]);
    } catch (err) {
      console.error(err);
      setUploadError(err?.response?.data?.message || "File upload failed");
    } finally {
      setUploading(false);
    }
  };

  const toggleStar = useCallback((fileId) => {
    setStarredIds((prev) => {
      const id = String(fileId);
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      saveStarredFileIds(next);
      return next;
    });
  }, []);

  const handleDeleteFile = async (fileId) => {
    if (!window.confirm("Delete this file permanently?")) return;
    try {
      await axios.delete(`${API_BASE}/api/files/${fileId}`, { withCredentials: true });
      setUploadedFiles((prev) => prev.filter((f) => f._id !== fileId));
      setStarredIds((prev) => {
        const next = prev.filter((id) => id !== String(fileId));
        saveStarredFileIds(next);
        return next;
      });
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to delete file");
    }
  };

  const filteredFiles = useMemo(() => {
    let list = [...uploadedFiles];
    const uid = user?._id;
    switch (activeFilter) {
      case "images":
        list = list.filter(isImageFile);
        break;
      case "pdfs":
        list = list.filter(isPdfFile);
        break;
      case "shared":
        list = list.filter(
          (f) => f.uploader?._id && String(f.uploader._id) !== String(uid)
        );
        break;
      case "starred":
        list = list.filter((f) => starredIds.includes(String(f._id)));
        break;
      default:
        break;
    }
    return list;
  }, [uploadedFiles, activeFilter, starredIds, user?._id]);

  const recentForCarousel = useMemo(() => uploadedFiles.slice(0, 12), [uploadedFiles]);
  const isStarred = (id) => starredIds.includes(String(id));

  return (
    <div className="flex h-screen bg-[#0a0a0b] text-white overflow-hidden">
      <Sidebar
        users={users}
        channels={channels}
        selectedId={null}
        activeArea={activeArea}
        onSelectArea={setActiveArea}
        refreshChannels={fetchChannels}
      />

      <main className="flex-1 min-w-0 flex flex-col bg-[#0f1219] relative">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleUploadFile}
        />

        <header className="sticky top-0 z-20 h-[60px] border-b border-white/[0.06] px-6 sm:px-8 flex items-center justify-between gap-4 bg-[#0f1219]/80 backdrop-blur-xl">
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-white flex items-center gap-2">
              <Folder size={18} className="text-white/90" strokeWidth={2} />
              Files
            </h1>
            <p className="text-[11px] text-gray-500 hidden sm:block">
              Workspace uploads · organized and searchable
            </p>
          </div>
        </header>

        <button
          type="button"
          onClick={handlePickFile}
          disabled={uploading}
          className="fixed top-[72px] right-6 sm:right-10 z-30 inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-white/10 bg-gradient-to-r from-indigo-600/90 to-violet-600/90 backdrop-blur-xl text-white text-sm font-semibold shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 transition-all duration-200"
        >
          <Upload size={16} strokeWidth={2.5} />
          {uploading ? "Uploading…" : "Upload"}
        </button>

        <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
          <div className="max-w-5xl mx-auto px-6 sm:px-8 pb-16 pt-6">
            {uploadError && (
              <div className="mb-4 px-4 py-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-sm text-rose-300">
                {uploadError}
              </div>
            )}

            {uploadedFiles.length > 0 && (
              <section className="mb-10">
                <div className="flex items-end justify-between mb-4">
                  <h2 className="text-sm font-semibold text-gray-300 tracking-wide uppercase">
                    Recent uploads
                  </h2>
                  <span className="text-xs text-gray-500">{uploadedFiles.length} total</span>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1">
                  {recentForCarousel.map((f) => (
                    <RecentFileCard
                      key={f._id}
                      file={f}
                      starred={isStarred(f._id)}
                      onToggleStar={toggleStar}
                    />
                  ))}
                </div>
              </section>
            )}

            <section>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
                <h2 className="text-base font-semibold text-white">All files</h2>
                <div className="flex flex-wrap gap-2">
                  {FILTERS.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setActiveFilter(f.id)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                        activeFilter === f.id
                          ? "bg-indigo-500/20 text-indigo-200 border border-indigo-500/40 shadow-[0_0_20px_rgba(94,67,243,0.2)]"
                          : "bg-white/[0.04] text-gray-400 border border-white/[0.06] hover:text-gray-200 hover:border-white/10"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {uploadedFiles.length === 0 ? (
                <FilesEmptyState onUpload={handlePickFile} />
              ) : filteredFiles.length === 0 ? (
                <div className="py-16 text-center rounded-3xl border border-dashed border-white/10 bg-white/[0.02]">
                  <ImageIcon size={32} className="mx-auto text-gray-600 mb-3" />
                  <p className="text-sm text-gray-400">No files match this filter.</p>
                </div>
              ) : (
                <div className="space-y-1 rounded-3xl border border-white/[0.06] bg-white/[0.02] p-2 backdrop-blur-sm">
                  {filteredFiles.map((f) => (
                    <FileRow
                      key={f._id}
                      file={f}
                      starred={isStarred(f._id)}
                      currentUserId={user?._id}
                      onToggleStar={toggleStar}
                      onDelete={handleDeleteFile}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Files;
