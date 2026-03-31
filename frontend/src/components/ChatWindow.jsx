import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { socket } from "../socket/socket";
import { useAuth } from "../context/AuthContext.jsx";
import MessageBubble from "./MessageBubble.jsx";
import MessageInput from "./MessageInput.jsx";
import SearchBox from "./searchBox.jsx";
import ThreadSidebar from "./ThreadSidebar.jsx";
import HuddleRoom from "./HuddleRoom.jsx";
import Modal from "./Modal.jsx";

function ChatWindow({
  selectedUser,
  selectedChannel,
  users = [],
  channelId,
  dmRoomId,
  activeArea,
  onSelectArea,
}) {
  const { user } = useAuth();

  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [activeThread, setActiveThread] = useState(null);

  const listEndRef = useRef(null);

  const username = user?.username;
  const userId = user?._id;

  /* ROOM (channel ID for channels, OR computed roomId for DMs) */
  const room = useMemo(() => {
    if (!username) return null;
    if (selectedChannel && channelId) return channelId;
    if (selectedUser && dmRoomId) return dmRoomId;
    return null;
  }, [channelId, dmRoomId, username, selectedChannel, selectedUser]);

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

        const isDM = !!selectedUser && !selectedChannel;
        const endpoint = isDM
          ? `http://localhost:4000/api/messages/dm/${selectedUser._id}`
          : `http://localhost:4000/api/messages/${channelId}`;

        const res = await axios.get(endpoint, { withCredentials: true });
        setMessages(res.data);
      } catch (err) {
        console.error(err);
      }
    };

    fetchMessages();
  }, [room, selectedChannel, selectedUser, channelId]);

  /* SOCKET */
  useEffect(() => {
    if (activeArea !== "chat") return;
    if (!username || !room) return;

    socket.connect();

    const joinEvent = selectedChannel ? "joinChannel" : "joinDM";
    const leaveEvent = selectedChannel ? "leaveChannel" : "leaveDM";

    socket.emit(joinEvent, { room, userId, username });

    const onNewMessage = (msg) => {
      const normalized = {
        ...msg,
        text: msg.text || msg.content || "",
        username: msg.username || msg.sender?.username || "User",
      };

      setMessages((prev) => {
        if (prev.some((m) => m.createdAt === normalized.createdAt)) return prev;
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

    socket.off("newMessage"); 
    socket.on("newMessage", onNewMessage);

    socket.off("messageEdited");
    socket.on("messageEdited", onMessageUpdated);

    socket.off("messageReacted");
    socket.on("messageReacted", onMessageUpdated);

    socket.off("messageUpdated");
    socket.on("messageUpdated", onMessageUpdated);

    socket.off("typing");
    socket.on("typing", onTyping);

    socket.off("stop_typing");
    socket.on("stop_typing", onStopTyping);

    return () => {
      const leaveEvent = selectedChannel ? "leaveChannel" : "leaveDM";
      socket.emit(leaveEvent, { channelId: room, room, userId, username });
      socket.off("newMessage", onNewMessage);
      socket.off("messageEdited", onMessageUpdated);
      socket.off("messageReacted", onMessageUpdated);
      socket.off("messageUpdated", onMessageUpdated);
      socket.off("typing", onTyping);
      socket.off("stop_typing", onStopTyping);
    };
  }, [room, username, userId, activeArea, selectedChannel]);

  /* AUTO SCROLL & MARK AS READ */
  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: "smooth" });

    // Mark messages as read when viewing the room
    if (room && messages.length > 0) {
      axios.post(`http://localhost:4000/api/messages/read/${room}`, {}, { withCredentials: true }).catch(console.error);
    }
  }, [messages, room]);

  /* SEND */
  const handleSend = async (text, attachmentUrl) => {
    if (!room || !username || (!text.trim() && !attachmentUrl)) return;

    // AI BOT INTERCEPT
    if (selectedUser?._id === "slackbot") {
      const tempId = "msg_" + Date.now();
      const userMsg = {
        _id: tempId,
        content: text || "",
        sender: { username, _id: userId || "me" },
        createdAt: new Date().toISOString()
      };
      
      const botThinkingId = "bot_" + Date.now();
      const botThinkingMsg = {
        _id: botThinkingId,
        content: "🤖 *Thinking...*",
        sender: { username: "Slackbot", _id: "slackbot" },
        createdAt: new Date().toISOString()
      };

      setMessages((prev) => [...prev, userMsg, botThinkingMsg]);
      
      // Auto scroll
      setTimeout(() => {
        listEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 50);

      try {
        const res = await axios.post("http://localhost:4000/api/bot/chat", { prompt: text }, {
          withCredentials: true
        });
        
        setMessages((prev) => 
          prev.map(m => m._id === botThinkingId ? { ...m, content: res.data.content } : m)
        );
      } catch (err) {
        setMessages((prev) => 
          prev.map(m => m._id === botThinkingId ? { ...m, content: "❌ **Error contacting AI server.** Check your connection or API key." } : m)
        );
      }
      return;
    }

    try {
      const isDM = !!selectedUser && !selectedChannel;
      const payload = isDM
        ? { content: text || "", receiverId: selectedUser._id, attachment: attachmentUrl }
        : { content: text || "", channelId: room, attachment: attachmentUrl };

      await axios.post("http://localhost:4000/api/messages/send", payload, {
        withCredentials: true,
      });
    } catch (err) {
      console.error(err);
    }
  };

  /* TYPING */
  const handleTypingChange = (isTyping) => {
    if (!room || !username) return;

    socket.emit(isTyping ? "typing" : "stop_typing", {
      room,
      username,
    });
  };

  const isDM = !!selectedUser && !selectedChannel;
  const workspaceName = user?.username || "My Workspace";
  const headerContextLabel = isDM ? "Direct messages" : workspaceName;

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
    const message = `🎙️ Join my meeting: ${huddleLink.trim()}`;
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
        <h1 className="text-2xl font-bold mb-4">
          👋 Welcome to your workspace
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
        {activeArea === "activity" && "🔔 Notifications"}
        {activeArea === "files" && "📁 Files"}
        {activeArea === "more" && "⋯ More"}
        {activeArea === "settings" && "⚙️ Settings"}
        {activeArea === "huddles" && "🎙️ Huddles (coming soon)"}
        {activeArea === "directories" && "📁 Directories (coming soon)"}
        {activeArea === "starred" && "⭐ Starred items (coming soon)"}
        {activeArea === "apps" && "🤖 Apps (coming soon)"}
        {activeArea === "search" && <SearchBox onSelectArea={onSelectArea} />}
      </div>
    );
  }

  /* CHAT */
  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="flex flex-col flex-1 bg-transparent backdrop-blur-sm">

      {/* HEADER */}
      <div className="bg-panel backdrop-blur-md border border-white/5 rounded-xl shadow-xl rounded-none border-x-0 border-t-0 border-b-white/5 px-6 py-4 flex items-center justify-between z-10 sticky top-0 bg-sidebar/50">
        <div className="flex-1">
          <div className="text-xs text-gray-400">{headerContextLabel}</div>

          <div className="flex items-center gap-3 mt-1">
            <div className="w-9 h-9 bg-[#611f69] rounded flex items-center justify-center font-bold">
              {selectedChannel?.name?.[0] || selectedUser?.username?.[0] || "?"}
            </div>

            <div>
              <div className="font-semibold flex items-center gap-2">
                {selectedChannel?.name ? `# ${selectedChannel.name}` : selectedUser?.username || "Select a user"}
                {selectedUser?._id !== "slackbot" && (
                  <button onClick={handleToggleStar} className={`text-sm ${isStarred ? "text-yellow-400" : "text-gray-500 hover:text-white"}`} title="Add to Starred">
                    {isStarred ? "★" : "☆"}
                  </button>
                )}
              </div>
              <div className="text-xs text-green-400">
                {selectedChannel
                  ? "# Channel"
                  : selectedUser
                  ? `Direct message with ${selectedUser.username}`
                  : "Select a user"}
              </div>
            </div>
          </div>
        </div>

        {/* HUDDLE / CALL CONTROLS */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => onSelectArea("search")}
            className="text-gray-400 hover:text-white mt-1"
          >
            🔍
          </button>
          
          {selectedUser?._id !== "slackbot" && selectedUser?._id && (
            <button 
              onClick={() => {
                setShowLinkModal(true);
                setHuddleLink("");
              }}
              className="flex items-center gap-2 px-3 py-1.5 bg-[#4a154b] hover:bg-[#541554] text-white rounded-md font-medium shadow-xl border border-white/5 transition-transform active:scale-95"
            >
              <span className="text-lg">🎧</span> Huddle
            </button>
          )}
        </div>
      </div>
      
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
            <div className="text-4xl text-accent">⚡</div>
            <p className="text-sm text-white/70">
              Generate an instant Huddle room and automatically share the invite link with the chat.
            </p>
            <button
              onClick={() => {
                const randomId = Math.random().toString(36).substring(2, 12);
                const meetLink = `${window.location.origin}/huddles?join=${randomId}`;
                handleSend(`🎙️ Join my instant Huddle: ${meetLink}`, null);
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
              className="w-full rounded-lg border border-white/10 bg-[#111827] px-3 py-2 outline-none focus:border-accent text-sm text-white"
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
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-2 custom-scrollbar">

        {!selectedUser ? (
          <div className="text-center text-gray-400 mt-20">
            Select a user to start chatting
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-400 mt-20">
            Say hello 👋 to {selectedUser.username}
          </div>
        ) : (
          messages.map((m, i) => (
            <MessageBubble
              key={i}
              message={m}
              previousMessage={messages[i - 1]}
              currentUser={user}
              onReply={(msg) => setActiveThread(msg)}
            />
          ))
        )}

        <div ref={listEndRef} />
      </div>

      {/* INPUT */}
      <div className="p-4 z-10 bg-panel backdrop-blur-md border border-white/5 rounded-xl shadow-xl rounded-none border-x-0 border-b-0 border-t-white/5 bg-sidebar/50">
        <MessageInput
          onSend={handleSend}
          onTypingChange={handleTypingChange}
          disabled={!room}
          users={users}
          currentUser={user}
          placeholder={
            selectedUser
              ? room
                ? `Message ${selectedUser.username}`
                : "Connecting..."
              : "Select a user first"
          }
          draftKey={room ? `draft_${room}` : null}
          draftContext={{ title: selectedChannel ? selectedChannel.name : selectedUser ? selectedUser.username : "Draft" }}
        />

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