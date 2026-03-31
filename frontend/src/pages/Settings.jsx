import React, { useEffect, useState } from "react";
import axios from "axios";
import Sidebar from "../components/Sidebar.jsx";
import { useAuth } from "../context/AuthContext.jsx";

function Settings() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [channels, setChannels] = useState([]);
  const [activeArea, setActiveArea] = useState("settings");
  const [activeSubTab, setActiveSubTab] = useState("Edit workspace");

  // Workspace State
  const [workspace, setWorkspace] = useState(null);
  const [wsName, setWsName] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoadingWs, setIsLoadingWs] = useState(true);

  const fetchData = async () => {
    try {
      const [uRes, cRes, wRes] = await Promise.all([
        axios.get("http://localhost:4000/api/users"),
        axios.get("http://localhost:4000/api/channels", { withCredentials: true }),
        axios.get("http://localhost:4000/api/workspaces/user", { withCredentials: true })
      ]);
      setUsers(uRes.data);
      setChannels(cRes.data);
      
      if (wRes.data.length > 0) {
        const primaryWs = wRes.data[0];
        setWorkspace(primaryWs);
        setWsName(primaryWs.name);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingWs(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateWorkspace = async (e) => {
    e.preventDefault();
    if (!wsName.trim() || !workspace) return;
    setIsUpdating(true);
    try {
      await axios.put(`http://localhost:4000/api/workspaces/update/${workspace._id}`, 
        { name: wsName.trim() }, 
        { withCredentials: true }
      );
      fetchData();
      alert("Workspace updated successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to update workspace.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemoveMember = async (userIdToRemove) => {
    if (!workspace) return;
    if (!window.confirm("Are you sure you want to remove this member?")) return;

    try {
      await axios.post("http://localhost:4000/api/workspaces/remove-member", 
        { workspaceId: workspace._id, userIdToRemove }, 
        { withCredentials: true }
      );
      fetchData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to remove member.");
    }
  };

  const isOwner = workspace?.owner?._id === user?._id;

  return (
    <div className="flex h-screen bg-[#0b1220] text-white overflow-hidden">
      <Sidebar
        users={users}
        channels={channels}
        selectedId={null}
        activeArea={activeArea}
        onSelectArea={setActiveArea}
        refreshChannels={fetchData}
      />

      <main className="flex-1 min-w-0 flex flex-col bg-[#101826]">
        <header className="h-16 border-b border-white/10 px-8 flex items-center justify-between bg-panel/30 backdrop-blur-md">
          <div className="font-bold text-lg flex items-center gap-2">
            <span className="text-gray-400">Settings /</span>
             Admin Tools
          </div>
          <button className="text-sm font-bold text-accent hover:underline">
            Manage billing
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-8 py-8 custom-scrollbar">
          <div className="max-w-6xl mx-auto grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
            {/* Sidebar Navigation */}
            <aside className="space-y-6">
              <div>
                <div className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] px-3 mb-4">
                  Workspace settings
                </div>
                <nav className="space-y-1">
                  {[
                    { label: "Edit workspace", icon: "✏️" },
                    { label: "Manage members", icon: "👥" },
                    { label: "Manage roles", icon: "👑" },
                    { label: "Apps & workflows", icon: "🤖" },
                    { label: "Data exports", icon: "📦" },
                    { label: "Workspace analytics", icon: "📊" },
                  ].map((item) => (
                    <button
                      key={item.label}
                      onClick={() => setActiveSubTab(item.label)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                        activeSubTab === item.label 
                        ? "bg-accent text-white shadow-xl shadow-accent/20" 
                        : "text-gray-400 hover:text-white hover:bg-white/5"
                      }`}
                      type="button"
                    >
                      <span className="opacity-70">{item.icon}</span>
                      {item.label}
                    </button>
                  ))}
                </nav>
              </div>
            </aside>

            {/* Main Content Area */}
            <section className="bg-panel border border-white/5 rounded-[40px] p-10 backdrop-blur-3xl shadow-3xl min-h-[600px] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2" />
              
              {isLoadingWs ? (
                <div className="h-full flex items-center justify-center font-bold text-accent animate-pulse">
                   Syncing Admin Tools...
                </div>
              ) : !workspace ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                   <div className="text-5xl opacity-20">🏢</div>
                   <h3 className="text-xl font-bold">No Workspace Selected</h3>
                   <p className="text-sm text-gray-500 max-w-xs">You need to select a workspace from the directory to manage its settings.</p>
                </div>
              ) : (
                <div className="space-y-10 relative">
                  <div>
                    <h2 className="text-3xl font-black text-white tracking-tight">{activeSubTab}</h2>
                    <p className="mt-2 text-gray-400 font-medium">{workspace.name} &bull; Organization Settings</p>
                  </div>

                  <div className="h-px bg-white/5 w-full" />

                  {activeSubTab === "Edit workspace" && (
                    <div className="max-w-xl space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <form onSubmit={handleUpdateWorkspace} className="space-y-6">
                         <div className="space-y-2">
                           <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Workspace Name</label>
                           <input 
                             type="text"
                             value={wsName}
                             onChange={(e) => setWsName(e.target.value)}
                             disabled={!isOwner}
                             className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-all font-bold placeholder:text-gray-700 disabled:opacity-50"
                           />
                         </div>

                         {isOwner ? (
                           <button 
                             type="submit"
                             disabled={isUpdating}
                             className="px-8 py-4 bg-accent hover:bg-accent/90 text-white font-black rounded-2xl shadow-xl shadow-accent/20 transition-all active:scale-95 disabled:opacity-50"
                           >
                             {isUpdating ? "Saving..." : "Save Changes"}
                           </button>
                         ) : (
                           <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-xs text-red-200 flex items-center gap-3">
                              <span>⚠️</span>
                              Only the Workspace Owner can modify profile settings.
                           </div>
                         )}
                      </form>
                    </div>
                  )}

                  {activeSubTab === "Manage members" && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <div className="bg-white/5 rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="bg-white/5 border-b border-white/10">
                              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Member</th>
                              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Role</th>
                              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {workspace.members.map((m) => (
                              <tr key={m._id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                <td className="px-6 py-5 flex items-center gap-4">
                                  <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center font-black shadow-lg">
                                    {m.username[0].toUpperCase()}
                                  </div>
                                  <div>
                                    <div className="font-bold text-white">{m.username}</div>
                                    <div className="text-xs text-gray-500">{m.email}</div>
                                  </div>
                                </td>
                                <td className="px-6 py-5">
                                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${m._id === workspace.owner._id ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' : 'bg-gray-500/10 text-gray-400 border border-gray-500/20'}`}>
                                    {m._id === workspace.owner._id ? 'Owner' : 'Member'}
                                  </span>
                                </td>
                                <td className="px-6 py-5">
                                  {isOwner && m._id !== workspace.owner._id && (
                                    <button 
                                      onClick={() => handleRemoveMember(m._id)}
                                      className="text-xs font-bold text-red-400 hover:text-red-300 transition-colors"
                                    >
                                      Remove
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {activeSubTab !== "Edit workspace" && activeSubTab !== "Manage members" && (
                    <div className="py-20 flex flex-col items-center justify-center text-center space-y-4 opacity-30">
                       <div className="text-6xl">🔒</div>
                       <h3 className="text-xl font-bold">{activeSubTab}</h3>
                       <p className="text-sm max-w-xs">This feature is restricted by organizational policies or coming soon.</p>
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Settings;
