import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Sidebar from "../components/Sidebar.jsx";
import { useAuth } from "../context/AuthContext.jsx";

function Home() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [channels, setChannels] = useState([]);
  const [activeArea, setActiveArea] = useState("home");

  const [tab, setTab] = useState("drafts");
  const [drafts, setDrafts] = useState([]);

  // Load real drafts from localStorage
  useEffect(() => {
    const loadedDrafts = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("draft_")) {
        try {
          const item = JSON.parse(localStorage.getItem(key));
          loadedDrafts.push({
            id: key,
            title: item.title || "Room",
            subtitle: item.text || "Draft message...",
            rawText: item.text,
          });
        } catch(e) { /* ignore */ }
      }
    }
    setDrafts(loadedDrafts);
  }, []);

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

  const initial = useMemo(() => {
    const ch = user?.username?.charAt?.(0) || "U";
    return String(ch).toUpperCase();
  }, [user?.username]);

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
        <header className="h-14 border-b border-white/10 px-5 flex items-center justify-between">
          <div className="font-semibold">Drafts &amp; sent</div>
          <div className="flex items-center gap-2">
            {tab === "drafts" && drafts.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  drafts.forEach(d => localStorage.removeItem(d.id));
                  setDrafts([]);
                }}
                className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-sm text-red-200 hover:bg-red-500/15"
                title="Remove all drafts"
              >
                Remove drafts
              </button>
            )}
            <button className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10">
              Edit
            </button>
          </div>
        </header>

        <div className="px-6 pt-4">
          <div className="flex items-center gap-4 text-sm">
            <button
              type="button"
              onClick={() => setTab("drafts")}
              className={`pb-2 border-b-2 ${
                tab === "drafts" ? "border-white text-white" : "border-transparent text-white/60 hover:text-white"
              }`}
            >
              Drafts
            </button>
            <button
              type="button"
              onClick={() => setTab("scheduled")}
              className={`pb-2 border-b-2 ${
                tab === "scheduled" ? "border-white text-white" : "border-transparent text-white/60 hover:text-white"
              }`}
            >
              Scheduled
            </button>
            <button
              type="button"
              onClick={() => setTab("sent")}
              className={`pb-2 border-b-2 ${
                tab === "sent" ? "border-white text-white" : "border-transparent text-white/60 hover:text-white"
              }`}
            >
              Sent
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="rounded-xl border border-white/10 bg-[#0b1220]">
            <div className="p-5 border-b border-white/10 bg-white/5">
              <div className="font-semibold">All your outgoing messages</div>
              <div className="text-sm text-white/60 mt-1">
                Everything you send, draft, and schedule can now be found here.
              </div>
            </div>

            <div className="p-4">
              {tab === "drafts" && (
                <>
                  {drafts.length === 0 ? (
                    <div className="text-sm text-white/60">No drafts.</div>
                  ) : (
                    <div className="space-y-2">
                      {drafts.map((d) => (
                        <div
                          key={d.id}
                          className="flex items-center justify-between rounded-lg border border-white/10 bg-[#0f172a] px-4 py-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded bg-[#0ea5a7] flex items-center justify-center font-extrabold">
                              {initial}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold truncate">{d.title}</div>
                              <div className="text-xs text-white/50 truncate">{d.subtitle}</div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="text-xs text-white/50">—</div>
                            <button
                              type="button"
                              className="text-white/50 hover:text-white"
                              title="Remove draft"
                              onClick={() => {
                                localStorage.removeItem(d.id);
                                setDrafts((prev) => prev.filter((x) => x.id !== d.id));
                              }}
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {tab !== "drafts" && (
                <div className="text-sm text-white/60">
                  Nothing here yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Home;