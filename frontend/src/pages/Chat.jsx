import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import Sidebar from "../components/Sidebar.jsx";
import ChatWindow from "../components/ChatWindow.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import axios from "axios";

function Chat() {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [channels, setChannels] = useState([]);
  const [activeArea, setActiveArea] = useState("chat");

  /* FETCH USERS */
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

  /* FETCH CHANNELS */
  useEffect(() => {
    fetchChannels();
  }, []);

  const selectedUser =
    id === "slackbot"
      ? { _id: "slackbot", username: "Slackbot", email: "bot@slack.com" }
      : users.find((u) => u._id === id);
  const selectedChannel = channels.find((c) => c._id === id);

  /* AUTO SELECT FIRST CHANNEL / USER */
  useEffect(() => {
    // If URL has an unusable id, reset it so auto-selection can work
    const hasInvalidId = id && id !== "slackbot" && !selectedChannel && !selectedUser;
    if (hasInvalidId && (channels.length > 0 || users.length > 0)) {
      navigate("/chat", { replace: true });
      return;
    }

    if (id) return;

    if (channels.length > 0) {
      navigate(`/chat/${channels[0]._id}`);
      return;
    }

    if (users.length > 0) {
      navigate(`/chat/${users[0]._id}`);
    }
  }, [channels, users, id, navigate, selectedChannel, selectedUser]);

  const isDM = !!selectedUser && !selectedChannel;
  const dmRoomId = isDM && user?._id ? [user._id, selectedUser._id].sort().join("_") : null;
  const channelId = selectedChannel ? selectedChannel._id : null;

  return (
    <div className="flex h-screen bg-[#020617] text-white">

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
      />
    </div>
  );
}

export default Chat;