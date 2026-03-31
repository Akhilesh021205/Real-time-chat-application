import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import Sidebar from "../components/Sidebar.jsx";

const templates = [
  {
    title: "Welcome [name]! We’re happy you’re here",
    subtitle: "Employee Onboarding",
    desc: "Welcome new people.",
  },
  {
    title: "Task",
    subtitle: "Project tracker",
    desc: "Manage and monitor tasks as a team",
  },
  {
    title: "Hello Women @ Acme",
    subtitle: "Monthly Newsletter",
    desc: "Broadcast your announcements",
  },
  {
    title: "Feedback",
    subtitle: "Feedback tracker",
    desc: "A streamlined approach to feedback",
  },
];

function Files() {
  const [users, setUsers] = useState([]);
  const [channels, setChannels] = useState([]);
  const [activeArea, setActiveArea] = useState("files");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await axios.get("http://localhost:4000/api/users");
        setUsers(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchUsers();
  }, []);

  const fetchChannels = async () => {
    try {
      const res = await axios.get("http://localhost:4000/api/channels", {
        withCredentials: true,
      });
      setChannels(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchChannels();
  }, []);

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
      const res = await axios.post(
        "http://localhost:4000/api/messages/upload",
        formData,
        { withCredentials: true }
      );

      const fileUrl = res.data?.fileUrl;
      if (!fileUrl) throw new Error("Upload succeeded but no fileUrl returned");

      setUploadedFiles((prev) => [
        {
          id: `${Date.now()}-${file.name}`,
          name: file.name,
          url: fileUrl,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
    } catch (err) {
      console.error(err);
      setUploadError(err?.response?.data?.message || "File upload failed");
    } finally {
      setUploading(false);
    }
  };

  const uploadedCountLabel = useMemo(() => {
    if (uploadedFiles.length === 0) return "No uploads yet";
    if (uploadedFiles.length === 1) return "1 upload";
    return `${uploadedFiles.length} uploads`;
  }, [uploadedFiles.length]);

  return (
    <div className="flex h-screen bg-[#0b1220] text-white">
      <Sidebar
        users={users}
        channels={channels}
        selectedId={null}
        activeArea={activeArea}
        onSelectArea={setActiveArea}
        refreshChannels={fetchChannels}
      />

      <main className="flex-1 min-w-0 flex flex-col bg-[#101826]">
        <header className="h-14 border-b border-white/10 px-5 flex items-center justify-between gap-4">
          <div className="font-semibold">Files</div>

          <div className="flex-1 max-w-2xl">
            <div className="flex items-center gap-2 rounded-md border border-white/10 bg-[#0b1220] px-3 py-2">
              <span className="text-white/60">🔎</span>
              <input
                className="w-full bg-transparent outline-none text-sm placeholder:text-white/40"
                placeholder="Search for files"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handlePickFile}
            disabled={uploading}
            className="rounded-md bg-emerald-500/90 px-3 py-2 text-sm font-semibold text-black hover:bg-emerald-500 disabled:opacity-60"
          >
            + New
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="flex items-center justify-between gap-3">
            <div className="font-semibold text-white/90">All files</div>
            <div className="text-xs text-white/50">Recently viewed</div>
          </div>

          <div className="mt-4 rounded-lg border border-white/10 bg-[#0b1220] p-4">
            <div className="text-xs text-white/50 uppercase tracking-wide">
              Pro templates
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {templates.map((t) => (
                <div
                  key={t.title}
                  className="rounded-xl border border-white/10 bg-[#0f172a] hover:bg-[#111c33] transition p-4"
                >
                  <div className="h-20 rounded-lg bg-gradient-to-br from-purple-500/20 to-cyan-500/10 border border-white/10" />
                  <div className="mt-3 text-sm font-semibold">{t.title}</div>
                  <div className="mt-1 text-xs text-white/60">{t.subtitle}</div>
                  <div className="mt-2 text-xs text-white/50">{t.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Uploads */}
          <div className="mt-6 rounded-lg border border-white/10 bg-[#0b1220]">
            <div className="border-b border-white/10 px-4 py-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">Uploads</div>
                <div className="text-xs text-white/50">{uploadedCountLabel}</div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleUploadFile}
                />
                <button
                  type="button"
                  onClick={handlePickFile}
                  disabled={uploading}
                  className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10 disabled:opacity-60"
                >
                  {uploading ? "Uploading..." : "Upload from device"}
                </button>
              </div>
            </div>

            {uploadError && (
              <div className="px-4 py-3 text-xs text-red-400 border-b border-white/10">
                {uploadError}
              </div>
            )}

            <div className="divide-y divide-white/10">
              {uploadedFiles.length === 0 ? (
                <div className="px-4 py-4 text-sm text-white/60">
                  Click <span className="text-white">+ New</span> to upload a file from your laptop.
                </div>
              ) : (
                uploadedFiles.map((f) => (
                  <div key={f.id} className="px-4 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">{f.name}</div>
                      <div className="text-xs text-white/50">
                        Uploaded just now
                      </div>
                    </div>
                    <a
                      className="text-sm text-cyan-200 hover:underline shrink-0"
                      href={`http://localhost:4000${f.url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open
                    </a>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-6 rounded-lg border border-white/10 bg-[#0b1220]">
            <div className="border-b border-white/10 px-4 py-3 flex items-center gap-2">
              <span className="text-xs bg-cyan-500/20 text-cyan-200 border border-cyan-500/30 px-2 py-0.5 rounded">
                AI
              </span>
              <button className="text-xs text-white/70 hover:text-white">
                Created by you
              </button>
              <button className="text-xs text-white/50 hover:text-white">
                Shared with you
              </button>
            </div>
            <div className="divide-y divide-white/10">
              <div className="px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">To-do list</div>
                  <div className="text-xs text-white/50">
                    Slackbot · Last viewed today · 1 min read
                  </div>
                </div>
                <button className="text-white/50 hover:text-white">⋯</button>
              </div>
              <div className="px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">Akhilesh (you)</div>
                  <div className="text-xs text-white/50">
                    Last viewed yesterday · 1 min read
                  </div>
                </div>
                <button className="text-white/50 hover:text-white">⋯</button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Files;

