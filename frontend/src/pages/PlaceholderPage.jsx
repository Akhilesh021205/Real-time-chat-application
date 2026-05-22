import React, { useState, useEffect } from "react";
import axios from "axios";
import { useLocation } from "react-router";
import Sidebar from "../components/Sidebar.jsx";

function PlaceholderPage({ title, description, icon }) {
  const [users, setUsers] = useState([]);
  const [channels, setChannels] = useState([]);
  const location = useLocation();
  const activeArea = location.pathname.substring(1); // '/huddles' -> 'huddles'

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await axios.get("http://localhost:4000/api/users");
        setUsers(res.data);
      } catch (err) { }
    };
    fetchUsers();
  }, []);

  const fetchChannels = async () => {
    try {
      const res = await axios.get("http://localhost:4000/api/channels", {
        withCredentials: true,
      });
      setChannels(res.data);
    } catch (err) { }
  };

  useEffect(() => {
    fetchChannels();
  }, []);

  return (
    <div className="flex h-screen bg-[#101418] text-white">
      <Sidebar
        users={users}
        channels={channels}
        selectedId={null}
        activeArea={activeArea}
        onSelectArea={() => {}}
        refreshChannels={fetchChannels}
      />

      <main className="flex-1 min-w-0 flex flex-col bg-[#101418] items-center justify-center text-center p-8">
        <div className="w-24 h-24 bg-white/5 rounded-3xl flex items-center justify-center text-5xl mb-6 shadow-2xl border border-white/10">
          {icon}
        </div>
        <h1 className="text-3xl font-bold mb-3 tracking-tight">{title}</h1>
        <p className="text-slate-400 max-w-md break-words">{description}</p>
        <button className="mt-8 px-6 py-2.5 bg-accent hover:bg-accent/90 text-white rounded-lg font-medium shadow-xl">
          Coming Soon
        </button>
      </main>
    </div>
  );
}

export default PlaceholderPage;
