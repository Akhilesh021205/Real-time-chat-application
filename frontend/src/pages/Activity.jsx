import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router";
import {
  Settings,
  Search,
  List,
  LayoutGrid,
  ChevronDown,
  Reply,
  AtSign,
  MessageSquare,
  Bell,
  CheckCheck,
} from "lucide-react";
import Sidebar from "../components/Sidebar.jsx";
import { API_URL } from "../config/api.js";

const API_BASE = API_URL;

const TABS = [
  { id: "all", label: "All" },
  { id: "dm", label: "DMs" },
  { id: "mention", label: "@ Mentions" },
  { id: "thread", label: "Threads" },
];

function formatTime(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const sameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  if (sameDay) {
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function Activity() {
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [channels, setChannels] = useState([]);
  const [activeArea, setActiveArea] = useState("activity");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [unreadsOnly, setUnreadsOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState("list");
  const [selected, setSelected] = useState(null);
  const [markingAllRead, setMarkingAllRead] = useState(false);

  const fetchChannels = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/channels`, {
        withCredentials: true,
      });
      setChannels(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadActivity = useCallback(async () => {
    setLoading(true);
    try {
      const [actRes, usersRes] = await Promise.all([
        axios.get(`${API_BASE}/api/activity`, { withCredentials: true }),
        axios.get(`${API_BASE}/api/users`, { withCredentials: true }),
      ]);
      setItems(actRes.data || []);
      setUsers(usersRes.data);
    } catch (err) {
      console.error(err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChannels();
    loadActivity();
  }, [loadActivity]);

  const filtered = useMemo(() => {
    let list = [...items];
    if (activeTab !== "all") {
      list = list.filter((i) => i.type === activeTab);
    }
    if (unreadsOnly) {
      list = list.filter((i) => !i.read);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (i) =>
          i.title?.toLowerCase().includes(q) ||
          i.preview?.toLowerCase().includes(q) ||
          i.context?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [items, activeTab, unreadsOnly, search]);

  useEffect(() => {
    if (filtered.length === 0) {
      setSelected(null);
      return;
    }
    if (!selected || !filtered.some((i) => i.id === selected.id)) {
      setSelected(filtered[0]);
    }
  }, [filtered, selected]);

  const markRead = async (item) => {
    if (!item || item.read) return;
    if (item.rawId) {
      try {
        await axios.put(`${API_BASE}/api/activity/read`, {
          source: item.source,
          rawId: item.rawId,
        }, { withCredentials: true });
      } catch (err) {
        console.error(err);
      }
    }
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, read: true } : i))
    );
    window.dispatchEvent(new Event("activityReadUpdated"));
  };

  const markAllRead = async () => {
    if (markingAllRead || items.every((item) => item.read)) return;
    setMarkingAllRead(true);
    try {
      await axios.put(`${API_BASE}/api/activity/read-all`, {}, { withCredentials: true });
      setItems((prev) => prev.map((item) => ({ ...item, read: true })));
      setSelected((prev) => (prev ? { ...prev, read: true } : prev));
      window.dispatchEvent(new Event("activityReadUpdated"));
    } catch (err) {
      console.error(err);
    } finally {
      setMarkingAllRead(false);
    }
  };

  const openItem = (item) => {
    setSelected(item);
    markRead(item);
    if (item.link) navigate(item.link);
  };

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

      <div className="flex-1 flex min-w-0 min-h-0">
        {/* Activity list column */}
        <div className="w-[380px] shrink-0 flex flex-col border-r border-white/10 bg-[#101418]">
          <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-white/5">
            <h1 className="text-[22px] font-bold tracking-tight">Activity</h1>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={markAllRead}
                disabled={markingAllRead || items.every((item) => item.read)}
                className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed"
                title="Mark all as read"
              >
                <CheckCheck size={18} />
              </button>
              <button
                type="button"
                onClick={() => navigate("/settings")}
                className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5"
                title="Notification preferences"
              >
                <Settings size={18} />
              </button>
            </div>
          </div>

          <div className="px-4 pt-3 flex gap-1 overflow-x-auto no-scrollbar border-b border-white/5 pb-0">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-2 text-sm font-semibold rounded-t-lg border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? "text-white border-indigo-500"
                    : "text-gray-500 border-transparent hover:text-gray-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="px-4 py-3 flex items-center gap-2 border-b border-white/5 flex-wrap">
            <button
              type="button"
              onClick={() => setUnreadsOnly((v) => !v)}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                unreadsOnly
                  ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-300"
                  : "border-white/10 text-gray-400 hover:bg-white/5"
              }`}
            >
              Unreads
              <ChevronDown size={12} />
            </button>
            <div className="flex-1 min-w-[120px] flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
              <Search size={14} className="text-gray-500 shrink-0" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search"
                className="flex-1 bg-transparent text-xs outline-none placeholder:text-gray-600"
              />
            </div>
            <div className="flex rounded-lg border border-white/10 overflow-hidden">
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`p-1.5 ${viewMode === "list" ? "bg-white/10 text-white" : "text-gray-500"}`}
                title="List view"
              >
                <List size={14} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`p-1.5 ${viewMode === "grid" ? "bg-white/10 text-white" : "text-gray-500"}`}
                title="Compact view"
              >
                <LayoutGrid size={14} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {loading ? (
              <div className="py-16 text-center text-sm text-gray-500">Loading activity…</div>
            ) : filtered.length === 0 ? (
              <div className="py-16 px-6 text-center text-sm text-gray-500">
                {search || unreadsOnly
                  ? "No items match your filters."
                  : "No activity yet. Messages, mentions, and DMs will appear here."}
              </div>
            ) : viewMode === "grid" ? (
              <div className="p-3 grid grid-cols-1 gap-2">
                {filtered.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => openItem(item)}
                    className={`text-left p-3 rounded-xl border transition-all ${
                      selected?.id === item.id
                        ? "border-indigo-500/50 bg-indigo-500/10"
                        : "border-white/5 bg-white/[0.02] hover:bg-white/5"
                    } ${!item.read ? "ring-1 ring-indigo-500/20" : ""}`}
                  >
                    <ActivityCardContent item={item} compact />
                  </button>
                ))}
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {filtered.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => openItem(item)}
                    className={`w-full text-left px-4 py-3 flex gap-3 hover:bg-white/[0.04] transition-colors ${
                      selected?.id === item.id ? "bg-indigo-500/10" : ""
                    }`}
                  >
                    <ActivityAvatar item={item} />
                    <ActivityCardContent item={item} />
                    <span className="text-[11px] text-gray-500 shrink-0 pt-0.5">
                      {formatTime(item.createdAt)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Detail pane */}
        <main className="flex-1 min-w-0 flex flex-col bg-[#101418]">
          {selected ? (
            <>
              <header className="h-14 border-b border-white/10 px-6 flex items-center gap-3 shrink-0">
                <ActivityAvatar item={selected} large />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold flex items-center gap-2">
                    {selected.title}
                    {selected.isApp && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-gray-400 font-bold">
                        App
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">{selected.context}</div>
                </div>
                {selected.link && (
                  <button
                    type="button"
                    onClick={() => navigate(selected.link)}
                    className="text-sm font-semibold text-indigo-400 hover:text-indigo-300"
                  >
                    Open conversation
                  </button>
                )}
              </header>
              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                <p className="text-[15px] text-gray-200 leading-relaxed whitespace-pre-wrap">
                  {selected.preview}
                </p>
                <p className="mt-4 text-xs text-gray-500">
                  {formatTime(selected.createdAt)}
                  {!selected.read && (
                    <span className="ml-2 text-indigo-400">· Unread</span>
                  )}
                </p>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500 text-sm px-8 text-center">
              Select a notification to view the details.
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function ActivityAvatar({ item, large }) {
  const size = large ? "w-10 h-10" : "w-9 h-9";
  if (item.isApp) {
    return (
      <img
        src="/slackbot-icon.jpg"
        alt=""
        className={`${size} rounded-lg object-cover shrink-0`}
      />
    );
  }
  const initial = item.title?.[0]?.toUpperCase() || "?";
  return (
    <div
      className={`${size} rounded-lg bg-gradient-to-br from-indigo-600/80 to-purple-600/80 flex items-center justify-center font-bold text-sm shrink-0`}
    >
      {initial}
    </div>
  );
}

function ActivityCardContent({ item, compact }) {
  const TypeIcon =
    item.type === "mention"
      ? AtSign
      : item.type === "thread"
        ? Reply
        : item.type === "dm"
          ? MessageSquare
          : Bell;

  return (
    <div className={`flex-1 min-w-0 ${compact ? "" : ""}`}>
      <div className="flex items-center gap-2">
        {!compact && <TypeIcon size={12} className="text-gray-600 shrink-0" />}
        <span className={`font-semibold truncate ${!item.read ? "text-white" : "text-gray-300"}`}>
          {item.title}
        </span>
        {item.isApp && (
          <span className="text-[10px] px-1 py-0.5 rounded bg-white/10 text-gray-500 font-bold shrink-0">
            App
          </span>
        )}
      </div>
      <p className="text-sm text-gray-500 truncate mt-0.5">{item.preview}</p>
      {compact && (
        <span className="text-[10px] text-gray-600 mt-1 block">
          {formatTime(item.createdAt)}
        </span>
      )}
    </div>
  );
}

export default Activity;
