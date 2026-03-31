import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import axios from "axios";
import Sidebar from "../components/Sidebar.jsx";
import { useAuth } from "../context/AuthContext.jsx";

function DMs() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [channels, setChannels] = useState([]);
  const [activeArea, setActiveArea] = useState("chat");
  const [search, setSearch] = useState("");

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

  const handleOpenDM = (otherUserId) => {
    navigate(`/chat/${otherUserId}`);
  };

  const otherUsers = users.filter(
    (u) => u._id !== user?._id && u.email !== user?.email
  );
  const filtered = otherUsers.filter((u) =>
    u.username?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-[#0b1220] text-white overflow-hidden">
      <Sidebar
        users={users}
        channels={channels}
        selectedId={null}
        activeArea={activeArea}
        onSelectArea={setActiveArea}
        refreshChannels={fetchChannels}
      />

      <main className="flex-1 min-w-0 flex flex-col bg-[#101826]">
        {/* Header */}
        <header className="h-16 border-b border-white/10 px-8 flex items-center justify-between bg-panel/30 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <span className="text-2xl">💬</span>
            <h1 className="text-xl font-bold tracking-tight text-white/90">Direct Messages</h1>
          </div>
          <div className="text-sm text-gray-400">
            {otherUsers.length} {otherUsers.length === 1 ? "person" : "people"} available
          </div>
        </header>

        {/* Search */}
        <div className="px-8 py-4 border-b border-white/5">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search people..."
            className="w-full max-w-md bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-all placeholder:text-gray-600"
          />
        </div>

        {/* Users List */}
        <div className="flex-1 overflow-y-auto px-8 py-6 custom-scrollbar">
          <div className="max-w-3xl mx-auto space-y-2">
            {filtered.length === 0 ? (
              <div className="text-center py-20 space-y-4">
                <div className="text-5xl opacity-20">👤</div>
                <div className="text-gray-400 font-medium">
                  {search ? "No users match your search." : "No other users found."}
                </div>
              </div>
            ) : (
              filtered.map((u) => (
                <button
                  key={u._id}
                  onClick={() => handleOpenDM(u._id)}
                  className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl border border-white/5 bg-panel/30 hover:bg-white/5 hover:border-accent/30 transition-all group"
                >
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center font-black text-lg text-accent shadow-lg border border-accent/10 group-hover:scale-105 transition-transform">
                    {u.username[0].toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 text-left min-w-0">
                    <div className="font-bold text-white group-hover:text-accent transition-colors truncate">
                      {u.username}
                    </div>
                    <div className="text-xs text-gray-500 truncate">{u.email}</div>
                  </div>

                  {/* Status */}
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${u.status === "active" ? "bg-emerald-400" : "bg-gray-600"}`} />
                    <span className="text-xs text-gray-400 capitalize">{u.status || "offline"}</span>
                  </div>

                  {/* Arrow */}
                  <div className="text-gray-600 group-hover:text-accent transition-colors text-lg">
                    →
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default DMs;
