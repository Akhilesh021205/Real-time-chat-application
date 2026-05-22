import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router";
import Sidebar from "../components/Sidebar.jsx";
import ChatWindow from "../components/ChatWindow.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useWorkspace } from "../context/WorkspaceContext.jsx";
import axios from "axios";
import { socket } from "../socket/socket.js";
import { sameId } from "../utils/ids.js";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

const SLACKBOT = {
  _id: "slackbot",
  username: "Slackbot",
  email: "bot@slack.com",
};

function Chat() {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const { id } = useParams();
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [channels, setChannels] = useState([]);
  const [activeArea, setActiveArea] = useState("chat");
  const [dataReady, setDataReady] = useState(false);

  useEffect(() => {
    setActiveArea("chat");
  }, [id]);

  useEffect(() => {
    socket.connect();
    let cancelled = false;

    const load = async () => {
      setDataReady(false);
      try {
        const params = currentWorkspace?._id
          ? { workspaceId: currentWorkspace._id }
          : {};
        const [usersRes, channelsRes] = await Promise.all([
          axios.get(`${API_BASE}/api/users`, { params, withCredentials: true }),
          axios.get(`${API_BASE}/api/channels`, { withCredentials: true }),
        ]);
        if (!cancelled) {
          setUsers(usersRes.data);
          setChannels(channelsRes.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setDataReady(true);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [currentWorkspace?._id]);

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

  const selectedChannel = useMemo(
    () => channels.find((c) => sameId(c._id, id)),
    [channels, id]
  );

  const selectedUser = useMemo(() => {
    if (!id || selectedChannel) return null;
    if (id === "slackbot") return SLACKBOT;
    return users.find((u) => sameId(u._id, id)) || null;
  }, [id, selectedChannel, users]);

  // Only set channelId when we have a real channel — never guess from URL (user ids look the same)
  const channelId = selectedChannel?._id ?? null;

  const isDM = !!selectedUser && !channelId;
  const dmRoomId =
    isDM && user?._id && selectedUser?._id
      ? [String(user._id), String(selectedUser._id)].sort().join("_")
      : null;

  /* Default to first channel only on /chat with no id */
  useEffect(() => {
    if (!dataReady || id) return;
    if (channels.length > 0) {
      navigate(`/chat/${channels[0]._id}`, { replace: true });
    }
  }, [dataReady, channels, id, navigate]);

  /* Invalid channel id in URL — only after lists have loaded */
  useEffect(() => {
    if (!dataReady || !id || id === "slackbot") return;
    if (selectedChannel) return;
    // User ids belong on /dms; redirect there instead of snapping to Java
    const matchedUser = users.find((u) => sameId(u._id, id));
    if (matchedUser) {
      navigate(`/dms/${id}`, { replace: true });
      return;
    }
    if (channels.length > 0) {
      navigate(`/chat/${channels[0]._id}`, { replace: true });
    } else {
      navigate("/dms", { replace: true });
    }
  }, [dataReady, id, selectedChannel, users, channels, navigate]);

  return (
    <div className="flex h-screen bg-[#101418] text-white overflow-hidden">

      <Sidebar
        users={users}
        channels={channels}
        selectedId={id}
        activeArea={activeArea}
        onSelectArea={setActiveArea}
        refreshChannels={fetchChannels}
      />

      <ChatWindow
        selectedUser={selectedUser}
        selectedChannel={selectedChannel}
        users={users}
        channelId={channelId}
        dmRoomId={dmRoomId}
        activeArea={activeArea}
        onSelectArea={setActiveArea}
        workspaceName={currentWorkspace?.name}
      />
    </div>
  );
}

export default Chat;