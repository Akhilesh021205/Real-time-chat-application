import React, { useState, useEffect } from "react";
import { Star } from "lucide-react";
import Sidebar from "../components/Sidebar.jsx";
import axios from "axios";
import { useAuth } from "../context/AuthContext.jsx";
import { useNavigate } from "react-router";

export default function Starred() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [channels, setChannels] = useState([]);
  const [activeArea, setActiveArea] = useState("starred");
  const [starredItems, setStarredItems] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [uRes, cRes] = await Promise.all([
          axios.get("http://localhost:4000/api/users"),
          axios.get("http://localhost:4000/api/channels", { withCredentials: true })
        ]);
        setUsers(uRes.data);
        setChannels(cRes.data);

        // Load starred items from localStorage
        const loadedStars = JSON.parse(localStorage.getItem("starredItems") || "[]");
        setStarredItems(loadedStars);
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
  }, []);

  const removeStar = (id) => {
    const updated = starredItems.filter(item => item.id !== id);
    localStorage.setItem("starredItems", JSON.stringify(updated));
    setStarredItems(updated);
    window.dispatchEvent(new Event("starredUpdated"));
  };

  return (
    <div className="flex h-screen bg-[#101418] text-white">
      <Sidebar 
        users={users} 
        channels={channels} 
        activeArea={activeArea} 
        onSelectArea={setActiveArea} 
      />

      <main className="flex-1 flex flex-col bg-[#101418] relative">
        <header className="h-16 border-b border-white/10 px-8 flex items-center justify-between bg-panel/30 backdrop-blur-md">
          <div className="flex items-center gap-3">
             <Star size={24} className="text-yellow-500" fill="currentColor" strokeWidth={2} />
             <h1 className="text-xl font-bold tracking-tight text-white/90">Starred Items</h1>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="bg-panel border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4">
              <h2 className="text-lg font-bold text-white/80 px-2 flex items-center gap-2">
                 Your Collection
              </h2>

              {starredItems.length === 0 ? (
                <div className="py-20 text-center space-y-4">
                  <Star size={64} className="mx-auto text-gray-700 opacity-30" strokeWidth={1.5} />
                  <div className="text-gray-500 font-medium">No items starred yet. Star a channel or DM to find it here quickly.</div>
                </div>
              ) : (
                <div className="space-y-3">
                  {starredItems.map((item) => (
                    <div 
                      key={item.id}
                      className="group flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 transition-all hover:scale-[1.01] cursor-pointer shadow-lg"
                      onClick={() =>
                        navigate(item.type === "channel" ? `/chat/${item.id}` : `/dms/${item.id}`)
                      }
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg shadow-xl ${item.type === 'channel' ? 'bg-indigo-600/30' : 'bg-pink-600/30'}`}>
                          {item.type === 'channel' ? '#' : item.name[0]}
                        </div>
                        <div>
                          <div className="font-bold text-white group-hover:text-accent transition-colors">{item.name}</div>
                          <div className="text-xs text-slate-500 uppercase tracking-widest font-bold opacity-60">{item.type}</div>
                        </div>
                      </div>
                      
                      <button 
                         onClick={(e) => {
                           e.stopPropagation();
                           removeStar(item.id);
                         }}
                         className="px-4 py-2 border border-white/10 bg-white/5 rounded-xl text-xs font-bold text-gray-500 hover:text-white hover:bg-red-500 transition-all active:scale-95"
                      >
                         Unstar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
