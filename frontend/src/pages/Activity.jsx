import React, { useEffect, useState } from "react";
import axios from "axios";
import Sidebar from "../components/Sidebar.jsx";

function Activity() {
  const [users, setUsers] = useState([]);
  const [channels, setChannels] = useState([]);
  const [activeArea, setActiveArea] = useState("activity");

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
          <div className="font-semibold">Activity</div>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-8">
          <div className="max-w-2xl">
            <div className="text-white/60 text-sm">
              No activity yet. When you start chatting, reactions, mentions, and other
              updates will show up here.
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Activity;

