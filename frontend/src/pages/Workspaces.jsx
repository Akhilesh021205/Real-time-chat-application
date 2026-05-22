import React, { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar.jsx";
import axios from "axios";
import { useAuth } from "../context/AuthContext.jsx";
import { useNavigate } from "react-router";
import { Globe, User, MessageSquare, Building2, Users } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function Workspaces() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [channels, setChannels] = useState([]);
  const [activeArea, setActiveArea] = useState("directories");
  const [workspaces, setWorkspaces] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Creation State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newWsName, setNewWsName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [uRes, cRes, wRes] = await Promise.all([
        axios.get(`${API_BASE}/api/users`, { withCredentials: true }),
        axios.get(`${API_BASE}/api/channels`, { withCredentials: true }),
        axios.get(`${API_BASE}/api/workspaces/user`, { withCredentials: true })
      ]);
      setUsers(uRes.data);
      setChannels(cRes.data);
      setWorkspaces(wRes.data);
    } catch (err) {
      console.error("Failed to fetch workspaces", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateWorkspace = async (e) => {
    e.preventDefault();
    if (!newWsName.trim()) return;
    
    setIsCreating(true);
    try {
      await axios.post(`${API_BASE}/api/workspaces/create`,
        { name: newWsName.trim() }, 
        { withCredentials: true }
      );
      setNewWsName("");
      setShowCreateModal(false);
      fetchData(); // Refresh list
    } catch (err) {
      console.error("Creation failed", err);
      alert("Failed to create workspace. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const activeUserCount = users.filter(u => u.status === 'active').length;

  return (
    <div className="flex h-screen bg-[#101418] text-white overflow-hidden">
      <Sidebar 
        users={users} 
        channels={channels} 
        activeArea={activeArea} 
        onSelectArea={setActiveArea} 
      />

      <main className="flex-1 min-w-0 flex flex-col bg-[#101418] relative">
        <header className="h-16 border-b border-white/10 px-8 flex items-center justify-between bg-panel/30 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
             <Globe size={24} className="text-accent" />
             <h1 className="text-xl font-bold tracking-tight text-white/90">Directories: All Workspaces</h1>
          </div>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-accent hover:bg-accent/90 rounded-lg text-sm font-bold shadow-lg transition-all active:scale-95"
          >
            + Create Workspace
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="max-w-5xl mx-auto space-y-10">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { label: "Active Users Across Orgs", value: activeUserCount, Icon: User, color: "text-blue-400" },
                { label: "Total Channels", value: channels.length, Icon: MessageSquare, color: "text-green-400" },
                { label: "Your Workspaces", value: workspaces.length, Icon: Building2, color: "text-pink-400" },
              ].map((stat) => (
                <div key={stat.label} className="bg-panel border border-white/5 rounded-2xl p-6 backdrop-blur-md space-y-2 shadow-xl">
                  <stat.Icon size={28} className={stat.color} strokeWidth={2} />
                  <div className={`text-3xl font-black ${stat.color} tracking-tight`}>{stat.value}</div>
                  <div className="text-xs text-gray-400 font-bold uppercase tracking-wider">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Workspaces List */}
            <div className="space-y-6">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-lg font-semibold text-white/70">Managed Workspaces</h3>
                {isLoading && <div className="text-xs text-accent animate-pulse font-bold">Syncing...</div>}
              </div>

              {workspaces.length === 0 && !isLoading ? (
                <div className="bg-panel/30 border border-dashed border-white/10 rounded-3xl p-12 text-center space-y-4">
                  <Building2 size={56} className="mx-auto opacity-20" strokeWidth={1.5} />
                  <div className="text-gray-400">You haven't joined any workspaces yet.</div>
                  <button onClick={() => setShowCreateModal(true)} className="text-accent font-bold hover:underline">Create your first one</button>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {workspaces.map((ws) => {
                    const wsActiveUsers = (ws.members || []).filter(m => m.status === 'active').length;
                    return (
                      <div 
                        key={ws._id}
                        className="bg-panel/50 border border-white/5 rounded-3xl p-6 flex flex-col justify-between hover:border-accent/40 hover:bg-white/5 transition-all group backdrop-blur-3xl shadow-2xl"
                      >
                        <div className="space-y-4">
                          <div className="flex items-start justify-between">
                            <div className="w-14 h-14 bg-gradient-to-br from-[#4a154b] to-[#611f69] rounded-2xl flex items-center justify-center font-black text-2xl shadow-xl border border-white/10">
                              {ws.name[0]}
                            </div>
                            <div className="px-3 py-1 bg-white/5 rounded-full text-[10px] font-bold uppercase tracking-widest text-gray-400 group-hover:bg-accent/20 group-hover:text-accent transition-all">
                              {wsActiveUsers} Active
                            </div>
                          </div>
                          <div>
                            <h4 className="text-xl font-extrabold text-white group-hover:text-accent transition-colors">{ws.name}</h4>
                            <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                              {ws.owner?._id === user?._id ? "Owned by you" : `Managed by ${ws.owner?.username || "Admin"}`}
                            </p>
                          </div>
                        </div>

                        <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="text-xs flex items-center gap-1.5 text-gray-400">
                              <Users size={14} className="opacity-60" /> <strong>{ws.members?.length || 0}</strong> members
                            </div>
                          </div>
                          <button 
                            onClick={() => navigate("/home")}
                            className="px-6 py-2.5 bg-white/5 border border-white/10 hover:border-accent hover:bg-accent hover:text-white rounded-xl text-xs font-bold transition-all active:scale-95 shadow-lg shadow-black/20"
                          >
                            Launch
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Create Workspace Modal */}
        {showCreateModal && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#101418]/80 backdrop-blur-sm p-4">
            <div className="bg-[#1a1c1e] border border-white/10 w-full max-w-md rounded-3xl shadow-3xl p-8 animate-in fade-in zoom-in duration-200">
              <h3 className="text-2xl font-black text-white mb-2">Create Workspace</h3>
              <p className="text-gray-400 text-sm mb-6">Give your new workspace a name. You can invite others later.</p>
              
              <form onSubmit={handleCreateWorkspace} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Workspace Name</label>
                  <input 
                    autoFocus
                    type="text"
                    value={newWsName}
                    onChange={(e) => setNewWsName(e.target.value)}
                    placeholder="e.g. Acme Corp, Marketing..."
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-all placeholder:text-gray-600"
                  />
                </div>
                
                <div className="flex items-center gap-3">
                  <button 
                    disabled={isCreating}
                    type="submit"
                    className="flex-1 py-4 bg-accent hover:bg-accent/90 disabled:opacity-50 text-white font-bold rounded-2xl shadow-xl shadow-accent/20 transition-all active:scale-95"
                  >
                    {isCreating ? "Creating..." : "Create Workspace"}
                  </button>
                  <button 
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-6 py-4 bg-white/5 hover:bg-white/10 text-white font-bold rounded-2xl transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
