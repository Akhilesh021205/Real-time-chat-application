import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import {
  Hand,
  Bell,
  Folder,
  MoreHorizontal,
  Settings,
  Mic,
  Star,
  Search,
  Headphones,
  Zap,
  Bot,
  Hash,
  MessageSquare,
} from "lucide-react";
import { useWorkspace } from "../context/WorkspaceContext.jsx";
import { socket } from "../socket/socket";
import { useAuth } from "../context/AuthContext.jsx";
import MessageBubble from "./MessageBubble.jsx";
import MessageInput from "./MessageInput.jsx";
import SearchBox from "./searchBox.jsx";
import ThreadSidebar from "./ThreadSidebar.jsx";
import HuddleRoom from "./HuddleRoom.jsx";
import Modal from "./Modal.jsx";
import { useNavigate } from "react-router";
import { resolveProfilePic } from "./EditProfileModal.jsx";
import { sameId } from "../utils/ids.js";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

function conversationAvatarUrl(person, currentUser) {
  if (!person) return null;
  if (person._id === "slackbot") return "/slackbot-icon.jpg";
  const pic =
    person.profilePic ||
    (currentUser && sameId(person._id, currentUser._id)
      ? currentUser.profilePic
      : null);
  return resolveProfilePic(pic);
}

const AREA_PLACEHOLDERS = {
  activity: { Icon: Bell, label: "Notifications" },
  files: { Icon: Folder, label: "Files" },
  more: { Icon: MoreHorizontal, label: "More" },
  settings: { Icon: Settings, label: "Settings" },
  huddles: { Icon: Mic, label: "Huddles (coming soon)" },
  directories: { Icon: Folder, label: "Directories (coming soon)" },
  starred: { Icon: Star, label: "Starred items (coming soon)" },
  apps: { Icon: Bot, label: "Apps (coming soon)" },
};

function ChatWindow({
  selectedUser,
  selectedChannel,
  users = [],
  channelId,
  dmRoomId,
  activeArea,
  onSelectArea,
  dmLayout = false,
  workspaceName: workspaceNameProp,
}) {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const navigate = useNavigate();

  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [activeThread, setActiveThread] = useState(null);

  const listEndRef = useRef(null);

  const username = user?.username;
  const userId = user?._id;

  /* ROOM (channel ID for channels, OR computed roomId for DMs) */
  const room = useMemo(() => {
    if (!username) return null;
    if (channelId) return String(channelId);
    if (selectedUser && dmRoomId) return dmRoomId;
    return null;
  }, [channelId, dmRoomId, username, selectedUser]);

  const hasConversation = !!(selectedChannel || selectedUser);

  /* RESET */
  useEffect(() => {
    setMessages([]);
    setActiveThread(null);
  }, [channelId, selectedUser]);

  /* LOAD HISTORY */
  useEffect(() => {
    if (!room) return;

    const fetchMessages = async () => {
      try {
        if (selectedUser?._id === "slackbot") {
          setMessages([{
            _id: "slackbot_welcome",
            content: "Hi there! I'm Slackbot. I can echo your messages to help you test the chat interface.",
            sender: { username: "Slackbot", _id: "slackbot" },
            createdAt: new Date().toISOString()
          }]);
          return;
        }

        const isDM = !!selectedUser && !channelId;
        const endpoint = isDM
          ? `${API_BASE}/api/messages/dm/${selectedUser._id}`
          : `${API_BASE}/api/messages/${channelId}`;

        const res = await axios.get(endpoint, { withCredentials: true });
        // Dedupe any accidental duplicate messages by _id
        const deduped = [];
        const seen = new Set();
        (res.data || []).forEach((m) => {
          const id = m._id || m.createdAt || JSON.stringify(m);
          if (!seen.has(id)) {
            seen.add(id);
            deduped.push(m);
          }
        });
        setMessages(deduped);
      } catch (err) {
        console.error(err);
      }
    };

    fetchMessages();
  }, [room, selectedChannel, selectedUser, channelId]);

  /* SOCKET */
  useEffect(() => {
    const canUseSocket =
      activeArea === "chat" ||
      activeArea === "home" ||
      !!selectedUser ||
      !!selectedChannel;
    if (!canUseSocket) return;
    if (!username || !room) return;

    socket.connect();

    const joinEvent = channelId ? "joinChannel" : "joinDM";
    const leaveEvent = channelId ? "leaveChannel" : "leaveDM";

    socket.emit(joinEvent, { channelId: room, room, userId, username });

    const onNewMessage = (msg) => {
      const normalized = {
        ...msg,
        text: msg.text || msg.content || "",
        username: msg.username || msg.sender?.username || "User",
      };

      setMessages((prev) => {
        // dedupe by id or createdAt
        if (normalized._id && prev.some((m) => m._id === normalized._id)) return prev;
        if (normalized.createdAt && prev.some((m) => m.createdAt === normalized.createdAt)) return prev;
        return [...prev, normalized];
      });
    };

    const onTyping = ({ username: u }) => {
      if (u !== username) {
        setTypingUsers((prev) => [...new Set([...prev, u])]);
      }
    };

    const onStopTyping = ({ username: u }) => {
      setTypingUsers((prev) => prev.filter((x) => x !== u));
    };

    const onMessageUpdated = (editedMsg) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === editedMsg._id ? { ...m, ...editedMsg } : m))
      );
    };

    const onMessageDeleted = ({ messageId }) => {
      setMessages((prev) => prev.filter((m) => m._id !== messageId));
    };

    socket.off("newMessage"); 
    socket.on("newMessage", onNewMessage);

    socket.off("messageEdited");
    socket.on("messageEdited", onMessageUpdated);

    socket.off("messageReacted");
    socket.on("messageReacted", onMessageUpdated);

    socket.off("messageUpdated");
    socket.on("messageUpdated", onMessageUpdated);

    socket.off("messageDeleted");
    socket.on("messageDeleted", onMessageDeleted);

    socket.off("typing");
    socket.on("typing", onTyping);

    socket.off("stop_typing");
    socket.on("stop_typing", onStopTyping);

    return () => {
      const leaveEvent = channelId ? "leaveChannel" : "leaveDM";
      socket.emit(leaveEvent, { channelId: room, room, userId, username });
      socket.off("newMessage", onNewMessage);
      socket.off("messageEdited", onMessageUpdated);
      socket.off("messageReacted", onMessageUpdated);
      socket.off("messageUpdated", onMessageUpdated);
      socket.off("messageDeleted", onMessageDeleted);
      socket.off("typing", onTyping);
      socket.off("stop_typing", onStopTyping);
    };
  }, [room, username, userId, activeArea, selectedChannel, selectedUser]);

  /* AUTO SCROLL & MARK AS READ */
  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: "smooth" });

    // Mark messages as read when viewing the room
    if (room && messages.length > 0) {
      axios.post(`${API_BASE}/api/messages/read/${room}`, {}, { withCredentials: true }).catch(console.error);
    }
  }, [messages, room]);

  /* SEND */
  const handleSend = async (text, attachmentUrl) => {
    if (!room || !username || (!text.trim() && !attachmentUrl)) return;

    // AI BOT INTERCEPT
    if (selectedUser?._id === "slackbot") {
      const history = messages
        .slice(-10)
        .map((m) => {
          const content = m.text || m.content || "";
          const senderName = m.username || m.sender?.username || "";
          const senderId = m.sender?._id || m.sender;
          return {
            role: senderId === "slackbot" || senderName === "Slackbot" ? "assistant" : "user",
            content,
          };
        })
        .filter((m) => m.content && !m.content.includes("*Thinking...*"));

      const tempId = "msg_" + (crypto && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()));
      const userMsg = {
        _id: tempId,
        content: text || "",
        attachment: attachmentUrl || null,
        sender: { username, _id: userId || "me" },
        createdAt: new Date().toISOString()
      };
      
      const botThinkingId = "bot_" + (crypto && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()));
      const botThinkingMsg = {
        _id: botThinkingId,
        content: "*Thinking...*",
        sender: { username: "Slackbot", _id: "slackbot" },
        createdAt: new Date().toISOString()
      };

      setMessages((prev) => [...prev, userMsg, botThinkingMsg]);
      
      // Auto scroll
      setTimeout(() => {
        listEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 50);

      try {
        const res = await axios.post(
          `${API_BASE}/api/bot/chat`,
          { prompt: text, attachmentUrl, history },
          { withCredentials: true }
        );
        
        setMessages((prev) => 
          prev.map(m => m._id === botThinkingId ? { ...m, content: res.data.content } : m)
        );
      } catch (err) {
        setMessages((prev) => 
          prev.map(m => m._id === botThinkingId ? { ...m, content: "**Error contacting AI server.** Check your connection or API key." } : m)
        );
      }
      return;
    }

    // Optimistic UI: add a temporary local message so user sees the message immediately
    const tempId = "tmp_" + (crypto && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()));
    const tempMessage = {
      _id: tempId,
      content: text || "",
      text: text || "",
      attachment: attachmentUrl || null,
      sender: { username, _id: userId || "me" },
      createdAt: new Date().toISOString(),
      pending: true,
    };

    setMessages((prev) => [...prev, tempMessage]);
    // Auto scroll to bottom
    setTimeout(() => listEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);

    try {
      const isDM = !!selectedUser && !channelId;
      const payload = isDM
        ? { content: text || "", receiverId: selectedUser._id, attachment: attachmentUrl }
        : { content: text || "", channelId: room, attachment: attachmentUrl };

      const res = await axios.post(`${API_BASE}/api/messages/send`, payload, {
        withCredentials: true,
      });
      const sentMessage = res.data;
      const normalized = {
        ...sentMessage,
        text: sentMessage.text || sentMessage.content || "",
        username: sentMessage.username || sentMessage.sender?.username || username,
      };

      setMessages((prev) => {
        // Replace temp message if present and dedupe by _id
        if (prev.some((m) => m._id === tempId)) {
          const mapped = prev.map((m) => (m._id === tempId ? normalized : m));
          const seen = new Set();
          return mapped.filter((item) => {
            if (!item || !item._id) return true;
            if (seen.has(item._id)) return false;
            seen.add(item._id);
            return true;
          });
        }
        // Otherwise avoid duplicates and append
        if (!normalized?._id || prev.some((m) => m._id === normalized._id)) return prev;
        return [...prev, normalized];
      });
    } catch (err) {
      console.error(err);
      const reason = err?.response?.data?.message || err.message || "Failed to send";
      // mark temp message as failed so user can retry and show reason
      setMessages((prev) =>
        prev.map((m) => (m._id === tempId ? { ...m, pending: false, failed: true, failedReason: reason } : m))
      );
    }
  };

  const handleRetry = async (tempId) => {
    const msg = messages.find((m) => m._id === tempId);
    if (!msg) return;
    // optimistic: set pending true and clear failed
    setMessages((prev) => prev.map((m) => (m._id === tempId ? { ...m, pending: true, failed: false } : m)));

    try {
      const isDM = !!selectedUser && !channelId;
      const payload = isDM
        ? { content: msg.content || msg.text || "", receiverId: selectedUser._id, attachment: msg.attachment }
        : { content: msg.content || msg.text || "", channelId: room, attachment: msg.attachment };

      const res = await axios.post(`${API_BASE}/api/messages/send`, payload, {
        withCredentials: true,
      });
      const sentMessage = res.data;
      const normalized = {
        ...sentMessage,
        text: sentMessage.text || sentMessage.content || "",
        username: sentMessage.username || sentMessage.sender?.username || username,
      };

      setMessages((prev) => {
        const mapped = prev.map((m) => (m._id === tempId ? normalized : m));
        const seen = new Set();
        return mapped.filter((item) => {
          if (!item || !item._id) return true;
          if (seen.has(item._id)) return false;
          seen.add(item._id);
          return true;
        });
      });
    } catch (err) {
      console.error("Retry failed", err);
      const reason = err?.response?.data?.message || err.message || "Retry failed";
      setMessages((prev) => prev.map((m) => (m._id === tempId ? { ...m, pending: false, failed: true, failedReason: reason } : m)));
    }
  };

  const handleDeleteMessage = (messageId) => {
    setMessages((prev) => prev.filter((m) => m._id !== messageId));
  };

  const isDM = !!selectedUser && !selectedChannel;

  /* TYPING */
  const handleTypingChange = (isTyping) => {
    if (!room || !username) return;

    socket.emit(isTyping ? "typing" : "stop_typing", {
      room,
      username,
    });
  };

  const workspaceName =
    workspaceNameProp || currentWorkspace?.name || user?.username || "Workspace";
  const headerContextLabel = isDM ? "Direct messages" : workspaceName;
  const channelDisplayName = selectedChannel?.name || (channelId ? "channel" : "");
  const headerAvatarUrl = useMemo(
    () => (selectedChannel ? null : conversationAvatarUrl(selectedUser, user)),
    [selectedChannel, selectedUser, user]
  );

  /* STARRED ITEMS LOGIC */
  const [isStarred, setIsStarred] = useState(false);
  
  useEffect(() => {
    const checkStar = () => {
      const stored = JSON.parse(localStorage.getItem("starredItems") || "[]");
      const currentId = selectedChannel?._id || selectedUser?._id;
      setIsStarred(stored.some(i => i.id === currentId));
    };
    checkStar();
    window.addEventListener("starredUpdated", checkStar);
    return () => window.removeEventListener("starredUpdated", checkStar);
  }, [selectedChannel, selectedUser]);

  const handleToggleStar = () => {
    const currentId = selectedChannel?._id || selectedUser?._id;
    if (!currentId || currentId === "slackbot") return;

    let stored = JSON.parse(localStorage.getItem("starredItems") || "[]");
    if (isStarred) {
      stored = stored.filter(i => i.id !== currentId);
    } else {
      stored.push({
        id: currentId,
        type: selectedChannel ? "channel" : "user",
        name: selectedChannel?.name || selectedUser?.username
      });
    }
    localStorage.setItem("starredItems", JSON.stringify(stored));
    setIsStarred(!isStarred);
    window.dispatchEvent(new Event("starredUpdated")); // sync sidebar
  };

  /* HUDDLE OVERLAY STATE */
  const [showHuddle, setShowHuddle] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [huddleLink, setHuddleLink] = useState("");
  const [huddleTab, setHuddleTab] = useState("create");

  const handleShareHuddle = () => {
    if (!huddleLink.trim()) return;
    
    // Broadcast the meeting link
    const message = `Join my meeting: ${huddleLink.trim()}`;
    handleSend(message, null);
    
    // Close modal and optionally open the link in a new tab
    setShowLinkModal(false);
    setHuddleLink("");
    
    // Attempt to open the link if it looks valid
    try {
      let urlStr = huddleLink.trim();
      if (!urlStr.startsWith('http://') && !urlStr.startsWith('https://')) {
        urlStr = 'https://' + urlStr;
      }
      window.open(urlStr, "_blank");
    } catch (e) {
      // ignore
    }
  };

  /* ================= UI ================= */

  /* 🔥 HOME SCREEN */
  if (activeArea === "home") {
    return (
      <div className="flex-1 p-10 text-white">
        <h1 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <Hand size={28} className="text-accent" />
          Welcome to your workspace
        </h1>

        <p className="text-gray-400 mb-6">
          Start chatting with your team or explore features.
        </p>

        <div className="grid grid-cols-2 gap-4 max-w-3xl">
          {["Run project", "Chat", "Collaborate", "Invite"].map((item) => (
            <div key={item} className="bg-panel backdrop-blur-md border border-white/5 rounded-xl shadow-xl p-6 rounded-xl hover:bg-white/5 cursor-pointer transition-colors border border-white/5">
              <h3 className="font-semibold text-lg">{item}</h3>
              <p className="text-sm text-gray-400 mt-1">Get started</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* OTHER SCREENS */
  if (activeArea !== "chat") {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400">
        {AREA_PLACEHOLDERS[activeArea] ? (
          (() => {
            const { Icon, label } = AREA_PLACEHOLDERS[activeArea];
            return (
              <div className="flex items-center gap-2">
                <Icon size={20} />
                <span>{label}</span>
              </div>
            );
          })()
        ) : null}
        {activeArea === "search" && <SearchBox onSelectArea={onSelectArea} />}
      </div>
    );
  }

  /* CHAT */
  return (
    <div className="flex flex-1 overflow-hidden min-w-0">
      <div className="flex flex-col flex-1 min-w-0 bg-[#101418]">

      {/* HEADER */}
      <div className="h-14 shrink-0 border-b border-white/10 px-5 flex items-center justify-between bg-[#101418]">
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
            {headerContextLabel}
          </div>

          <div className="flex items-center gap-2.5 mt-0.5">
            <div className="w-8 h-8 rounded-lg bg-[#4a154b] flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden">
              {selectedChannel ? (
                <Hash size={16} strokeWidth={2.5} />
              ) : headerAvatarUrl ? (
                <img
                  src={headerAvatarUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                (selectedUser?.username?.[0] || "?").toUpperCase()
              )}
            </div>

            <div className="min-w-0">
              <div className="font-semibold text-[15px] flex items-center gap-2 truncate">
                {selectedChannel
                  ? `# ${selectedChannel.name}`
                  : selectedUser?.username || "Select a conversation"}
                {hasConversation &&
                  (selectedChannel || channelId || (selectedUser && selectedUser._id !== "slackbot")) && (
                  <button
                    type="button"
                    onClick={handleToggleStar}
                    className={`shrink-0 ${isStarred ? "text-yellow-400" : "text-white/40 hover:text-white"}`}
                    title="Star"
                  >
                    <Star size={14} fill={isStarred ? "currentColor" : "none"} strokeWidth={2} />
                  </button>
                )}
              </div>
              <div className="text-xs text-white/45 truncate">
                {selectedChannel
                  ? selectedChannel.isPrivate
                    ? "Private channel"
                    : "Public channel"
                  : selectedUser
                  ? selectedUser._id === "slackbot"
                    ? "Assistant"
                    : `Direct message`
                  : "Pick a channel or DM from the sidebar"}
              </div>
            </div>
          </div>
        </div>

        {/* HUDDLE / CALL CONTROLS */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => onSelectArea("search")}
            className="text-gray-400 hover:text-white mt-1 p-1"
            title="Search"
          >
            <Search size={18} strokeWidth={2} />
          </button>
          
          {selectedUser?._id !== "slackbot" && selectedUser?._id && (
            <button 
              onClick={() => {
                setShowLinkModal(true);
                setHuddleLink("");
              }}
              className="flex items-center gap-2 px-3 py-1.5 bg-[#4a154b] hover:bg-[#541554] text-white rounded-md font-medium shadow-xl border border-white/5 transition-transform active:scale-95"
            >
              <Headphones size={18} strokeWidth={2} /> Huddle
            </button>
          )}
        </div>
      </div>

      {dmLayout && isDM && selectedUser && (
        <div className="flex items-center gap-6 px-6 h-9 border-b border-white/5 bg-[#11161b] text-[13px] shrink-0">
          <button
            type="button"
            className="text-white font-bold border-b-2 border-white h-full flex items-center -mb-px"
          >
            Messages
          </button>
          <button
            type="button"
            onClick={() => navigate("/canvas")}
            className="text-gray-400 hover:text-gray-200 transition-colors"
          >
            Add canvas
          </button>
        </div>
      )}
      
      {showHuddle && (
        <HuddleRoom room={room} onClose={() => setShowHuddle(false)} name={selectedChannel?.name || selectedUser?.username} />
      )}

      {/* NEW: Link Sharing Modal */}
      <Modal
        open={showLinkModal}
        title="Huddle Meeting"
        onClose={() => {
          setShowLinkModal(false);
          setHuddleLink("");
          setHuddleTab("create");
        }}
        footer={null}
      >
        <div className="flex bg-white/5 rounded-lg p-1 mb-4">
          <button
            onClick={() => setHuddleTab("create")}
            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${
              huddleTab === "create" ? "bg-accent text-white shadow" : "text-gray-400 hover:text-white"
            }`}
          >
            Create Instant Meeting
          </button>
          <button
            onClick={() => setHuddleTab("join")}
            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${
              huddleTab === "join" ? "bg-accent text-white shadow" : "text-gray-400 hover:text-white"
            }`}
          >
            Join Meeting
          </button>
        </div>

        {huddleTab === "create" ? (
          <div className="text-center py-4 space-y-4">
            <div className="flex justify-center text-accent">
              <Zap size={40} strokeWidth={2} />
            </div>
            <p className="text-sm text-white/70">
              Generate an instant Huddle room and automatically share the invite link with the chat.
            </p>
            <button
              onClick={() => {
                const randomId = Math.random().toString(36).substring(2, 12);
                const meetLink = `${window.location.origin}/huddles?join=${randomId}`;
                handleSend(`Join my instant Huddle: ${meetLink}`, null);
                setShowLinkModal(false);
                setHuddleTab("create");
                setShowHuddle(true);
              }}
              className="w-full py-2.5 rounded-lg bg-accent text-white font-bold hover:bg-accent/90 transition-colors shadow-lg shadow-accent/20 active:scale-95"
            >
              Start & Share Instant Huddle
            </button>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <p className="text-sm text-white/70">
              Paste an existing Huddle link below.
            </p>
            <input
              autoFocus
              value={huddleLink}
              onChange={(e) => setHuddleLink(e.target.value)}
              placeholder="e.g. http://localhost:5173/huddles?join=xyz"
              className="w-full rounded-lg border border-white/10 bg-[#101418] px-3 py-2 outline-none focus:border-accent text-sm text-white"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleShareHuddle();
              }}
            />
            <button
              disabled={!huddleLink.trim()}
              onClick={handleShareHuddle}
              className="w-full py-2.5 rounded-lg bg-emerald-500/90 text-black font-bold hover:bg-emerald-500 disabled:opacity-50 transition-colors active:scale-95"
            >
              Share & Join Huddle
            </button>
          </div>
        )}
      </Modal>

      {/* MESSAGES */}
      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-3 custom-scrollbar">

        {!hasConversation ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="w-14 h-14 rounded-xl bg-[#11161b] border border-white/10 flex items-center justify-center text-white/30 mb-4">
              <MessageSquare size={28} strokeWidth={1.5} />
            </div>
            <p className="text-white/70 font-medium">Select a channel or conversation</p>
            <p className="text-sm text-white/40 mt-1 max-w-sm">
              Choose a channel under Channels or a person under Messages to start chatting.
            </p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[280px] text-center px-6">
            {selectedChannel || channelId ? (
              <>
                <div className="w-16 h-16 rounded-2xl bg-[#11161b] border border-white/10 flex items-center justify-center text-white/50 mb-5">
                  <Hash size={32} strokeWidth={1.75} />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  Welcome to #{channelDisplayName}!
                </h2>
                <p className="text-sm text-white/50 max-w-md">
                  This is the start of the #{channelDisplayName} channel. Say hello and share updates with your team.
                </p>
              </>
            ) : selectedUser?._id === user?._id ? (
              <>
                <div className="w-16 h-16 rounded-2xl bg-accent/20 border border-accent/30 flex items-center justify-center text-2xl font-bold text-accent mb-5 overflow-hidden">
                  {headerAvatarUrl ? (
                    <img
                      src={headerAvatarUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    user?.username?.[0]?.toUpperCase()
                  )}
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  {user?.username}{" "}
                  <span className="text-sm text-white/40 font-normal">(you)</span>
                </h2>
                <p className="text-sm text-white/50 max-w-md leading-relaxed">
                  This is your space. Draft messages, list to-dos, or keep links handy.
                </p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-2xl bg-[#11161b] border border-white/10 flex items-center justify-center text-2xl font-bold text-accent mb-5 overflow-hidden">
                  {headerAvatarUrl ? (
                    <img
                      src={headerAvatarUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    (selectedUser?.username?.[0] || "?").toUpperCase()
                  )}
                </div>
                <h2 className="text-xl font-bold text-white mb-2">
                  {selectedUser?.username}
                </h2>
                <p className="text-sm text-white/50">
                  This is the beginning of your direct message history.
                </p>
              </>
            )}
          </div>
        ) : (
          messages.map((m, i) => (
            <MessageBubble
              key={`${m._id || m.createdAt || i}-${i}`}
              message={m}
              previousMessage={messages[i - 1]}
              currentUser={user}
              onReply={(msg) => setActiveThread(msg)}
              onDelete={handleDeleteMessage}
              onRetry={handleRetry}
            />
          ))
        )}

        <div ref={listEndRef} />
      </div>

      {/* INPUT */}
      <div className="shrink-0 px-4 pb-4 pt-2 border-t border-white/10 bg-[#101418]">
        <div className="rounded-xl border border-white/10 bg-[#101418] overflow-hidden">
        <MessageInput
          onSend={handleSend}
          onTypingChange={handleTypingChange}
          disabled={!room || !hasConversation}
          users={users}
          currentUser={user}
          placeholder={
            !hasConversation
              ? "Select a channel or conversation"
              : selectedChannel || channelId
              ? `Message #${selectedChannel?.name || "channel"}`
              : selectedUser
              ? dmLayout && selectedUser._id === user?._id
                ? "Jot something down"
                : `Message ${selectedUser.username}`
              : "Type a message"
          }
          draftKey={room ? `draft_${room}` : null}
          draftContext={{
            title: selectedChannel?.name || selectedUser?.username || "Draft",
          }}
        />
        </div>

        {typingUsers.length > 0 && (
          <div className="text-xs text-gray-400 mt-2">
            {typingUsers.join(", ")} typing...
          </div>
        )}
      </div>
    </div>
    
    {/* THREAD SIDEBAR */}
    {activeThread && (
      <ThreadSidebar 
        parentMessage={activeThread} 
        currentUser={user}
        users={users}
        onClose={() => setActiveThread(null)}
        room={room}
      />
    )}
    </div>
  );
}

export default ChatWindow;
