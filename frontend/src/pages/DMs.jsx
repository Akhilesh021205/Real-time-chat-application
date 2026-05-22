import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import axios from "axios";
import { ChevronDown, SquarePen } from "lucide-react";
import Sidebar from "../components/Sidebar.jsx";
import ChatWindow from "../components/ChatWindow.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useWorkspace } from "../context/WorkspaceContext.jsx";
import { socket } from "../socket/socket.js";
import { sameId } from "../utils/ids.js";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

const SLACKBOT = {
  _id: "slackbot",
  username: "Slackbot",
  email: "bot@slack.com",
  status: "active",
};

const DM_AVATAR_COLORS = [
  "bg-cyan-500/80",
  "bg-indigo-500/50",
  "bg-violet-500/40",
  "bg-teal-600/70",
  "bg-[#611f69]/80",
];

function dmAvatarColor(id) {
  if (!id || id === "slackbot") return "bg-[#2B2D31]";
  const str = String(id);
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return DM_AVATAR_COLORS[Math.abs(hash) % DM_AVATAR_COLORS.length];
}

function DMs() {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const { id: routeUserId } = useParams();

  const [users, setUsers] = useState([]);
  const [channels, setChannels] = useState([]);
  const [activeArea, setActiveArea] = useState("chat");
  const [search, setSearch] = useState("");
  const [unreadsOnly, setUnreadsOnly] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [activeDMs, setActiveDMs] = useState([]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const params = currentWorkspace?._id
          ? { workspaceId: currentWorkspace._id }
          : {};
        const res = await axios.get(`${API_BASE}/api/users`, {
          params,
          withCredentials: true,
        });
        setUsers(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchUsers();
  }, [currentWorkspace?._id]);

  const fetchChannels = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/channels`, { withCredentials: true });
      setChannels(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchChannels();
  }, []);

  useEffect(() => {
    const fetchActiveDMs = async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/channels/dms/active`, {
          withCredentials: true,
        });
        setActiveDMs(res.data || []);
      } catch (err) {
        console.error("Error fetching active DMs", err);
      }
    };

    fetchActiveDMs();

    const onNewMessage = (msg) => {
      if (msg.receiver) fetchActiveDMs();
    };
    socket.on("newMessage", onNewMessage);
    return () => socket.off("newMessage", onNewMessage);
  }, []);

  useEffect(() => {
    socket.connect();
    const handleStatusChange = ({ userId, status }) => {
      setUsers((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, status } : u))
      );
    };
    socket.on("userStatusChanged", handleStatusChange);
    return () => socket.off("userStatusChanged", handleStatusChange);
  }, []);

  useEffect(() => {
    setActiveArea("chat");
    if (routeUserId) {
      setSelectedUserId(routeUserId);
      return;
    }
    if (user?._id) {
      navigate(`/dms/${user._id}`, { replace: true });
    }
  }, [routeUserId, user?._id, navigate]);

  const otherUsers = users.filter(
    (u) => u._id !== user?._id && u.email !== user?.email
  );

  const dmContacts = useMemo(() => {
    const list = [];
    const seen = new Set();
    const pushContact = (contact) => {
      if (!contact?._id) return;
      const key = String(contact._id);
      if (seen.has(key)) return;
      seen.add(key);
      list.push(contact);
    };

    if (user) {
      const selfFromApi = users.find((u) => u._id === user._id) || user;
      pushContact({ ...selfFromApi, isSelf: true });
    }
    pushContact(SLACKBOT);
    otherUsers.forEach(pushContact);
    activeDMs.forEach((dm) => {
      const contact = dm.members?.find((m) => !sameId(m._id, user?._id)) || dm.members?.[0];
      if (contact) pushContact(contact);
    });
    return list;
  }, [user, users, otherUsers, activeDMs]);

  const filteredContacts = dmContacts.filter((u) => {
    const label =
      u.isSelf && user?.username
        ? `${user.username} (you)`
        : u.username || "";
    return label.toLowerCase().includes(search.toLowerCase());
  });

  const selectedUser = useMemo(() => {
    if (!selectedUserId) return null;
    if (selectedUserId === "slackbot") return SLACKBOT;
    if (sameId(selectedUserId, user?._id)) {
      const fromList = users.find((u) => sameId(u._id, user._id));
      return fromList ? { ...fromList, ...user } : user;
    }
    const fromUsers = users.find((u) => sameId(u._id, selectedUserId));
    if (fromUsers) return fromUsers;
    const fromActiveDm = activeDMs
      .flatMap((dm) => dm.members || [])
      .find((u) => sameId(u._id, selectedUserId));
    return fromActiveDm || null;
  }, [selectedUserId, user, users, activeDMs]);

  const dmRoomId =
    selectedUser && user?._id
      ? [user._id, selectedUser._id].sort().join("_")
      : null;

  const handleSelectContact = (contactId) => {
    setSelectedUserId(contactId);
    navigate(`/dms/${contactId}`);
  };

  const getStatusDot = (contact) => {
    if (contact._id === "slackbot" || contact.status === "active") {
      return "bg-emerald-500";
    }
    if (contact.status === "away") return "bg-gray-500";
    if (contact.status === "dnd") return "bg-rose-500";
    return "bg-transparent border border-gray-500";
  };

  return (
    <div className="flex h-screen bg-[#0a0a0b] text-white overflow-hidden">
      <Sidebar
        users={users}
        channels={channels}
        selectedId={selectedUserId}
        activeArea={activeArea}
        onSelectArea={setActiveArea}
        refreshChannels={fetchChannels}
      />

      <aside className="w-[280px] shrink-0 flex flex-col border-r border-white/5 bg-[#11161b] text-sm z-10">
        <div className="px-5 py-4 border-b border-white/5 bg-white/[0.02]">
          <div className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.12em] mb-1">
            Direct messages
          </div>
          <button
            type="button"
            className="flex items-center gap-1.5 font-bold text-white text-base hover:text-gray-200 transition-colors"
          >
            All conversations
            <ChevronDown size={14} className="text-gray-500 shrink-0 opacity-70" strokeWidth={2.5} />
          </button>

          <div className="flex items-center justify-between mt-3 mb-3">
            <label className="flex items-center gap-2 cursor-pointer group">
              <span className="text-[13px] text-gray-400 group-hover:text-gray-300">
                Unreads
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={unreadsOnly}
                onClick={() => setUnreadsOnly((v) => !v)}
                className={`relative w-9 h-5 rounded-full transition-colors ${
                  unreadsOnly ? "bg-accent" : "bg-white/10"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                    unreadsOnly ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </label>
            <button
              type="button"
              onClick={() => document.getElementById("dm-find-input")?.focus()}
              className="w-6 h-6 flex items-center justify-center rounded-md bg-white/5 hover:bg-accent text-gray-400 hover:text-white transition-all border border-white/10"
              title="New message"
            >
              <SquarePen size={14} strokeWidth={2} />
            </button>
          </div>

          <input
            id="dm-find-input"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Find a DM"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[13px] text-gray-200 placeholder:text-gray-500 focus:border-accent/40 focus:ring-1 focus:ring-accent/20 outline-none transition-all"
          />
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-3 custom-scrollbar">
          <div className="border-t border-white/5 pt-4 first:border-t-0 first:pt-0">
            <div className="px-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">
              Messages
            </div>
            <div className="mt-1 space-y-0.5">
              {filteredContacts.length === 0 ? (
                <p className="px-3 py-6 text-xs text-gray-500 italic text-center">
                  {search ? "No conversations match your search." : "No conversations yet."}
                </p>
              ) : (
                filteredContacts.map((contact) => {
                  const isSelected = sameId(selectedUserId, contact._id);
                  const displayName = contact.isSelf
                    ? `${contact.username} (you)`
                    : contact.username;
                  const avatarLetter = (contact.username?.[0] || "?").toUpperCase();

                  return (
                    <button
                      key={contact._id}
                      type="button"
                      onClick={() => handleSelectContact(contact._id)}
                      className={`flex items-center gap-2.5 w-full px-3 py-1.5 rounded-xl transition-all ${
                        isSelected
                          ? "bg-accent/15 text-white font-medium"
                          : "text-gray-400 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <div className="relative shrink-0">
                        <div
                          className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold text-white overflow-hidden ${
                            contact.isSelf
                              ? "bg-cyan-500/80"
                              : dmAvatarColor(contact._id)
                          }`}
                        >
                          {contact._id === "slackbot" ? (
                            <img
                              src="/slackbot-icon.jpg"
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : contact.profilePic ? (
                            <img
                              src={
                                contact.profilePic.startsWith("http")
                                  ? contact.profilePic
                                  : `${API_BASE}${contact.profilePic}`
                              }
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            avatarLetter
                          )}
                        </div>
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-[#11161b] ${getStatusDot(
                            contact
                          )}`}
                        />
                      </div>
                      <span className="flex-1 truncate text-[13px]">{displayName}</span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </aside>

      <ChatWindow
        selectedUser={selectedUser}
        selectedChannel={null}
        users={users}
        channelId={null}
        dmRoomId={dmRoomId}
        activeArea={activeArea}
        onSelectArea={setActiveArea}
        workspaceName={currentWorkspace?.name}
        dmLayout
      />
    </div>
  );
}

export default DMs;
