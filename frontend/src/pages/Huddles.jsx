import React, { useState, useEffect } from "react";
import { Mic, Headphones } from "lucide-react";
import Sidebar from "../components/Sidebar.jsx";
import axios from "axios";
import { useAuth } from "../context/AuthContext.jsx";
import HuddleRoom from "../components/HuddleRoom.jsx";

export default function Huddles() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [channels, setChannels] = useState([]);
  const [activeArea, setActiveArea] = useState("huddles");
  const [showHuddle, setShowHuddle] = useState(false);
  const [huddleContext, setHuddleContext] = useState({ id: "", name: "" });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [uRes, cRes] = await Promise.all([
          axios.get("http://localhost:4000/api/users"),
          axios.get("http://localhost:4000/api/channels", { withCredentials: true })
        ]);
        setUsers(uRes.data);
        setChannels(cRes.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
  }, []);

  const handleStartHuddle = (id, name) => {
    setHuddleContext({ id, name });
    setShowHuddle(true);
  };

  return (
    <div className="flex h-screen bg-[#101418] text-white overflow-hidden">
      <Sidebar 
        users={users} 
        channels={channels} 
        activeArea={activeArea} 
        onSelectArea={setActiveArea} 
      />

      <main className="flex-1 flex flex-col bg-[#101418] relative">
        <header className="h-16 border-b border-white/10 px-8 flex items-center justify-between bg-panel/30 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <Mic size={24} className="text-accent" />
            <h1 className="text-xl font-bold tracking-tight text-white/90">Huddles</h1>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Hero Section */}
            <div className="bg-gradient-to-br from-indigo-600/20 to-purple-600/20 border border-white/10 rounded-3xl p-10 text-center space-y-6 backdrop-blur-xl shadow-2xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center mx-auto shadow-2xl border border-white/5 animate-bounce-subtle">
                <Headphones size={48} className="text-accent" strokeWidth={1.75} />
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-extrabold text-white">Start a meeting</h2>
                <p className="text-gray-400 max-w-md mx-auto leading-relaxed">
                  Start an instant audio or video session with your team members in any channel or your personal room.
                </p>
              </div>
              <button 
                onClick={() => handleStartHuddle(user?._id || "personal", "Personal Meeting Room")}
                className="mt-6 px-10 py-4 bg-white text-indigo-600 font-black rounded-2xl shadow-2xl hover:scale-105 transition-all active:scale-95"
              >
                Start Personal Huddle
              </button>
            </div>

            {/* Channels List */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white/70 px-2 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
                Active Channels
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {channels.map((channel) => (
                  <div 
                    key={channel._id}
                    className="bg-panel border border-white/5 rounded-2xl p-5 flex items-center justify-between hover:border-accent/30 hover:bg-white/5 transition-all group shadow-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-[#3f0e40] rounded-xl flex items-center justify-center font-bold text-lg shadow-inner">
                        #
                      </div>
                      <div>
                        <div className="font-bold text-white group-hover:text-accent transition-colors">#{channel.name}</div>
                        <div className="text-xs text-gray-500 font-medium">Public Channel</div>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleStartHuddle(channel._id, channel.name)}
                      className="px-5 py-2.5 bg-accent/10 hover:bg-accent text-accent hover:text-white rounded-xl text-sm font-bold border border-accent/20 transition-all active:scale-95 shadow-lg shadow-accent/5"
                    >
                      Join Huddle
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {showHuddle && (
          <HuddleRoom 
            room={huddleContext.id} 
            name={huddleContext.name} 
            onClose={() => setShowHuddle(false)} 
          />
        )}
      </main>
    </div>
  );
}
