import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import axios from "axios";
import {
  Plus,
  Sparkles,
  FileUp,
  ClipboardList,
  Trash2,
  ChevronRight,
} from "lucide-react";
import Sidebar from "../components/Sidebar.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

function formatEditedTime(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `Edited ${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Edited ${hrs}h ago`;
  return `Edited ${d.toLocaleDateString()}`;
}

function UserAvatar({ person, size = "sm" }) {
  const dim = size === "sm" ? "w-8 h-8 text-xs" : "w-10 h-10 text-sm";
  const pic = person?.profilePic;
  const name = person?.username || "?";

  if (pic) {
    const src = pic.startsWith("http") ? pic : `${API_BASE}${pic}`;
    return (
      <img
        src={src}
        alt=""
        className={`${dim} rounded-xl object-cover border border-white/10 shrink-0`}
      />
    );
  }

  return (
    <div
      className={`${dim} rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center font-bold text-white border border-white/10 shrink-0`}
    >
      {name[0]?.toUpperCase()}
    </div>
  );
}

const CanvasPage = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [channels, setChannels] = useState([]);
  const [canvases, setCanvases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("browse");

  const [activeCanvasId, setActiveCanvasId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [saveStatus, setSaveStatus] = useState("Saved");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const selectedCanvasRef = useRef(null);
  const importInputRef = useRef(null);

  useEffect(() => {
    const loadSidebarData = async () => {
      try {
        const [uRes, cRes] = await Promise.all([
          axios.get(`${API_BASE}/api/users`, { withCredentials: true }),
          axios.get(`${API_BASE}/api/channels`, { withCredentials: true }),
        ]);
        setUsers(uRes.data);
        setChannels(cRes.data);
      } catch (err) {
        console.error(err);
      }
    };
    loadSidebarData();
    fetchCanvases();
  }, []);

  const fetchCanvases = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/canvas`, { withCredentials: true });
      setCanvases(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const selectCanvas = useCallback((canvas) => {
    if (!canvas) return;
    setActiveCanvasId(canvas._id);
    setEditTitle(canvas.title);
    setEditContent(canvas.content || "");
    selectedCanvasRef.current = canvas;
    setSaveStatus("Saved");
    setView("editor");
  }, []);

  const activeCanvasInfo = canvases.find((c) => c._id === activeCanvasId);

  const recentlyEdited = useMemo(
    () =>
      [...canvases]
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
        .slice(0, 6),
    [canvases]
  );

  useEffect(() => {
    if (!activeCanvasId || !selectedCanvasRef.current) return;
    const c = selectedCanvasRef.current;
    if (editTitle === c.title && editContent === (c.content || "")) return;

    setSaveStatus("Saving...");
    const timerId = setTimeout(() => {
      saveCanvas(editTitle, editContent);
    }, 1000);
    return () => clearTimeout(timerId);
  }, [editTitle, editContent, activeCanvasId]);

  const saveCanvas = async (title, content) => {
    if (!activeCanvasId) return;
    try {
      const res = await axios.put(
        `${API_BASE}/api/canvas/${activeCanvasId}`,
        { title, content },
        { withCredentials: true }
      );
      const newCanvas = res.data;
      setCanvases((prev) => prev.map((c) => (c._id === newCanvas._id ? newCanvas : c)));
      selectedCanvasRef.current = newCanvas;
      setSaveStatus("Saved");
    } catch (err) {
      console.error(err);
      setSaveStatus("Error Saving");
    }
  };

  const createCanvas = async (title, content = "") => {
    try {
      const res = await axios.post(
        `${API_BASE}/api/canvas`,
        { title, content },
        { withCredentials: true }
      );
      setCanvases((prev) => [res.data, ...prev]);
      selectCanvas(res.data);
      return res.data;
    } catch (err) {
      console.error(err);
      return null;
    }
  };

  const handleCreate = () => createCanvas("Untitled Canvas");

  const handleAiGenerate = () => {
    const date = new Date().toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
    createCanvas(
      `AI Notes — ${date}`,
      "<h2>Prompt</h2><p>What should we explore?</p><h2>Output</h2><p></p><h2>Follow-ups</h2><ul><li></li></ul>"
    );
  };

  const handleImportNotes = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const text = String(reader.result || "");
      const title = file.name.replace(/\.[^.]+$/, "") || "Imported Notes";
      const html = text
        .split("\n")
        .map((line) => `<p>${line.replace(/</g, "&lt;")}</p>`)
        .join("");
      await createCanvas(title, html || "<p></p>");
    };
    reader.readAsText(file);
  };

  const requestDelete = (canvas, e) => {
    e?.stopPropagation();
    setDeleteTarget({ id: canvas._id, title: canvas.title || "Untitled" });
  };

  const confirmDelete = async () => {
    if (!deleteTarget?.id || deleting) return;
    setDeleting(true);
    const id = deleteTarget.id;
    try {
      await axios.delete(`${API_BASE}/api/canvas/${id}`, { withCredentials: true });
      const newCanvases = canvases.filter((c) => c._id !== id);
      setCanvases(newCanvases);
      if (activeCanvasId === id) {
        setActiveCanvasId(null);
        selectedCanvasRef.current = null;
        setView("browse");
      }
      setDeleteTarget(null);
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#0a0a0b] text-white overflow-hidden">
      <style>{`
        .ql-toolbar.ql-snow {
          border: none !important;
          border-bottom: 1px solid rgba(255,255,255,0.06) !important;
          padding: 12px 0 !important;
          background: transparent !important;
        }
        .ql-container.ql-snow {
          border: none !important;
          font-family: inherit !important;
          font-size: 1.05rem;
        }
        .ql-snow .ql-stroke { stroke: #6b7280 !important; }
        .ql-snow .ql-fill, .ql-snow .ql-stroke.ql-fill { fill: #6b7280 !important; }
        .ql-snow.ql-toolbar button:hover .ql-stroke,
        .ql-snow.ql-toolbar button.ql-active .ql-stroke { stroke: #fff !important; }
        .ql-editor { padding: 16px 0 !important; min-height: 360px; color: #e5e7eb; }
        .ql-editor.ql-blank::before { color: rgba(255,255,255,0.25) !important; font-style: normal !important; }
      `}</style>

      <Sidebar
        users={users}
        channels={channels}
        activeArea="canvas"
        onSelectArea={() => {}}
      />

      <div className="flex-1 flex overflow-hidden min-w-0">
        <aside className="w-[300px] shrink-0 flex flex-col border-r border-white/[0.06] bg-[#12151c] z-10">
          <div className="p-5 border-b border-white/[0.06]">
            <h2 className="text-lg font-bold tracking-tight text-white mb-1">Canvas</h2>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              Docs & boards for your team
            </p>
            <div className="flex flex-wrap gap-2 mt-4">
              <button
                type="button"
                onClick={handleCreate}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Plus size={14} strokeWidth={2.5} />
                New Canvas
              </button>
              <button
                type="button"
                onClick={handleAiGenerate}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-violet-500/30 bg-violet-500/10 text-violet-200 text-xs font-semibold hover:bg-violet-500/20 transition-all"
              >
                <Sparkles size={14} />
                AI Generate
              </button>
              <button
                type="button"
                onClick={() => importInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/10 bg-white/[0.04] text-gray-300 text-xs font-semibold hover:bg-white/[0.08] transition-all"
              >
                <FileUp size={14} />
                Import
              </button>
              <input
                ref={importInputRef}
                type="file"
                accept=".txt,.md,.markdown"
                className="hidden"
                onChange={handleImportNotes}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1">
            {loading ? (
              <p className="text-xs text-gray-500 px-2 py-4">Loading…</p>
            ) : canvases.length === 0 ? (
              <p className="text-xs text-gray-500 px-2 py-4">No canvases yet</p>
            ) : (
              canvases.map((c) => (
                <div
                  key={c._id}
                  role="button"
                  tabIndex={0}
                  onClick={() => selectCanvas(c)}
                  onKeyDown={(e) => e.key === "Enter" && selectCanvas(c)}
                  className={`w-full text-left p-3 rounded-2xl transition-all duration-200 group flex items-start justify-between gap-2 cursor-pointer ${
                    activeCanvasId === c._id && view === "editor"
                      ? "bg-indigo-500/15 border border-indigo-500/30 shadow-[0_0_20px_rgba(94,67,243,0.12)]"
                      : "border border-transparent hover:bg-white/[0.04] hover:border-white/[0.06]"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm text-white truncate">
                      {c.title || "Untitled"}
                    </div>
                    <div className="text-[11px] text-gray-500 mt-1">
                      {formatEditedTime(c.updatedAt)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => requestDelete(c, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-rose-400 hover:text-rose-300 transition-opacity shrink-0"
                    title="Delete canvas"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))
            )}
          </div>
        </aside>

        <div className="flex-1 flex flex-col min-w-0 bg-[#0f1219] relative overflow-hidden">
          <div className="pointer-events-none absolute top-0 right-0 w-[480px] h-[480px] bg-indigo-600/10 rounded-full blur-[120px]" />
          <div className="pointer-events-none absolute bottom-0 left-1/4 w-[360px] h-[360px] bg-violet-600/8 rounded-full blur-[100px]" />

          {view === "browse" || !activeCanvasId ? (
            <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10">
              <div className="max-w-4xl mx-auto px-8 py-10">
                {recentlyEdited.length > 0 && (
                  <section>
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4">
                      Recently edited by team
                    </h2>
                    <div className="space-y-2">
                      {recentlyEdited.map((c) => (
                        <button
                          key={c._id}
                          type="button"
                          onClick={() => selectCanvas(c)}
                          className="w-full flex items-center gap-4 p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-indigo-500/25 hover:shadow-[0_4px_24px_rgba(94,67,243,0.08)] transition-all duration-200 text-left group"
                        >
                          <UserAvatar person={c.createdBy} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">
                              {c.title || "Untitled"}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              <span className="text-gray-400">
                                {c.createdBy?.username || "Teammate"}
                              </span>
                              {" · "}
                              {formatEditedTime(c.updatedAt)}
                            </p>
                          </div>
                          <ChevronRight
                            size={18}
                            className="text-gray-600 group-hover:text-indigo-400 shrink-0 transition-colors"
                          />
                        </button>
                      ))}
                    </div>
                  </section>
                )}

                {canvases.length === 0 && !loading && (
                  <div className="mt-8 p-8 rounded-3xl border border-dashed border-white/10 text-center">
                    <ClipboardList
                      size={40}
                      className="mx-auto text-indigo-400/60 mb-4"
                      strokeWidth={1.5}
                    />
                    <p className="text-sm text-gray-400">
                      Use{" "}
                      <span className="text-white font-medium">New Canvas</span> in the sidebar
                      to get started.
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="shrink-0 px-6 sm:px-10 pt-6 pb-4 border-b border-white/[0.06] flex items-start justify-between gap-4 z-10 bg-[#0f1219]/60 backdrop-blur-md">
                <div className="flex-1 min-w-0 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setView("browse")}
                    className="shrink-0 text-xs text-gray-500 hover:text-white px-2 py-1 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    ← Hub
                  </button>
                  <input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="flex-1 min-w-0 bg-transparent text-2xl sm:text-3xl font-bold outline-none text-white placeholder-gray-600 rounded-xl focus:ring-1 focus:ring-indigo-500/30 px-1"
                    placeholder="Canvas title"
                  />
                </div>
                <div className="shrink-0 flex items-center gap-2 py-1.5 px-3 rounded-full border border-white/10 bg-white/[0.04] text-xs font-medium text-gray-400">
                  {saveStatus === "Saving..." && (
                    <span className="flex items-center gap-2 text-amber-300/90">
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                      Saving…
                    </span>
                  )}
                  {saveStatus === "Saved" && (
                    <span className="flex items-center gap-2 text-emerald-400/90">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      Saved
                    </span>
                  )}
                  {saveStatus === "Error Saving" && (
                    <span className="text-rose-400">Error</span>
                  )}
                </div>
              </div>

              {activeCanvasInfo && (
                <div className="px-10 py-2 text-xs text-gray-500 flex items-center gap-2 z-10">
                  <UserAvatar person={activeCanvasInfo.createdBy} size="sm" />
                  <span>
                    Last edited by{" "}
                    <span className="text-gray-300 font-medium">
                      {activeCanvasInfo.createdBy?.username || user?.username || "You"}
                    </span>
                    {" · "}
                    {new Date(activeCanvasInfo.updatedAt).toLocaleString()}
                  </span>
                </div>
              )}

              <div className="flex-1 overflow-y-auto px-6 sm:px-10 pb-16 z-10 max-w-4xl w-full mx-auto custom-scrollbar">
                <ReactQuill
                  theme="snow"
                  value={editContent}
                  onChange={setEditContent}
                  placeholder="Start writing — your team sees changes as you go…"
                />
              </div>
            </>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete canvas?"
        description={
          deleteTarget
            ? `Are you sure you want to delete "${deleteTarget.title}"? This cannot be undone.`
            : ""
        }
        confirmLabel="Delete canvas"
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        loading={deleting}
      />
    </div>
  );
};

export default CanvasPage;
