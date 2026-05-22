import React, { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar.jsx";
import axios from "axios";
import { useAuth } from "../context/AuthContext.jsx";
import { useNavigate } from "react-router";
import {
  Bot,
  Code2,
  HardDrive,
  Workflow,
  Package,
  BarChart3,
  LayoutGrid,
} from "lucide-react";

const APP_ICON_MAP = {
  app1: Bot,
  app2: Code2,
  app3: HardDrive,
  app4: Workflow,
  app5: Package,
  app6: BarChart3,
};

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function Apps() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [channels, setChannels] = useState([]);
  const [activeArea, setActiveArea] = useState("apps");
  const [apps, setApps] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [uRes, cRes] = await Promise.all([
          axios.get(`${API_BASE}/api/users`, { withCredentials: true }),
          axios.get(`${API_BASE}/api/channels`, { withCredentials: true })
        ]);
        setUsers(uRes.data);
        setChannels(cRes.data);

        setApps([
          { id: "app1", name: "Slackbot", description: "Your friendly digital assistant", category: "Core Integrations" },
          { id: "app2", name: "GitHub", description: "Get real-time updates on pull requests", category: "Development Tools" },
          { id: "app3", name: "Google Drive", description: "Sharing and storage for all your files", category: "Cloud Storage" },
          { id: "app4", name: "JIRA Cloud", description: "Better bug tracking for your organization", category: "Management" },
          { id: "app5", name: "Dropbox", description: "Keep your team's files in sync", category: "Cloud Storage" },
          { id: "app6", name: "Trello", description: "Manage project boards right within Slack", category: "Productivity" },
        ]);
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
  }, []);

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
             <Bot size={24} className="text-accent" />
             <h1 className="text-xl font-bold tracking-tight text-white/90">Slackbot & Apps</h1>
          </div>
          <button className="px-4 py-2 border border-white/10 hover:bg-white/5 rounded-lg text-sm font-bold transition-all active:scale-95 shadow-lg">
             Manage Apps
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="max-w-6xl mx-auto space-y-12">
            
            <div className="bg-gradient-to-br from-[#4a154b]/30 to-[#611f69]/30 border border-white/10 rounded-[40px] p-12 flex flex-col md:flex-row items-center gap-10 shadow-3xl backdrop-blur-xl group hover:border-accent/30 transition-all">
                <div className="w-40 h-40 bg-white/5 border border-white/10 rounded-[40px] flex items-center justify-center shadow-2xl animate-bob group-hover:rotate-6 transition-transform">
                  <Bot size={72} className="text-accent" strokeWidth={1.5} />
                </div>
                <div className="space-y-6 text-center md:text-left">
                   <h2 className="text-4xl font-black text-white leading-tight">Slackbot Assistant</h2>
                   <p className="text-lg text-gray-400 max-w-lg leading-relaxed font-medium">
                     Your automated teammate. Use Slackbot to set reminders, get help with slash commands, and set up custom responder workflows for your organization.
                   </p>
                   <button 
                     onClick={() => navigate("/dms/slackbot")}
                     className="px-8 py-3.5 bg-accent hover:bg-accent/90 rounded-2xl text-lg font-black transition-all active:scale-95 shadow-2xl shadow-accent/40 border border-accent/20"
                    >
                     Open Conversation
                   </button>
                </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-xl font-extrabold text-white/80">Available Integrations</h3>
                <div className="text-accent text-sm font-bold cursor-pointer hover:underline">See all apps</div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {apps.map((app) => {
                  const AppIcon = APP_ICON_MAP[app.id] || LayoutGrid;
                  return (
                  <div 
                    key={app.id}
                    className="bg-panel/40 border border-white/5 rounded-3xl p-6 hover:bg-white/5 hover:border-accent/40 hover:scale-[1.02] transition-all cursor-pointer group shadow-2xl"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-16 h-16 bg-[#1e293b] rounded-2xl flex items-center justify-center shadow-xl group-hover:shadow-accent/5 transition-all text-accent">
                        <AppIcon size={32} strokeWidth={1.75} />
                      </div>
                      <button className="text-xs font-black text-accent uppercase tracking-widest px-3 py-1.5 bg-accent/10 rounded-full hover:bg-accent hover:text-white transition-all">
                        Install
                      </button>
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-lg font-black text-white group-hover:text-accent transition-colors">{app.name}</h4>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest opacity-60 mb-2">{app.category}</p>
                      <p className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors leading-relaxed line-clamp-2">{app.description}</p>
                    </div>
                  </div>
                );
                })}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
