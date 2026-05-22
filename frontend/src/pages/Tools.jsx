import React, { useEffect, useState } from "react";
import axios from "axios";
import Sidebar from "../components/Sidebar.jsx";

const featured = [
  {
    title: "Weekly check in",
    desc: "Automatically send a weekly message asking for updates from the team",
    badge: "Workflows",
  },
  {
    title: "Google Sheets feedback log",
    desc: "Request information in a form and add it to a Google Sheet from Slack",
    badge: "Workflows",
  },
  {
    title: "New hire onboarding",
    desc: "Let newcomers join team channels from a simple link",
    badge: "Workflows",
  },
];

function Tools() {
  const [users, setUsers] = useState([]);
  const [channels, setChannels] = useState([]);
  const [activeArea, setActiveArea] = useState("more");

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
    <div className="flex h-screen bg-[#101418] text-white">
      <Sidebar
        users={users}
        channels={channels}
        selectedId={null}
        activeArea={activeArea}
        onSelectArea={setActiveArea}
        refreshChannels={fetchChannels}
      />

      <main className="flex-1 min-w-0 flex flex-col bg-[#101418]">
        <header className="h-14 border-b border-white/10 px-5 flex items-center justify-between">
          <div className="font-semibold">Tools</div>
          <button className="rounded-md bg-emerald-500/90 px-3 py-2 text-sm font-semibold text-black hover:bg-emerald-500">
            + New
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="flex gap-8">
            <aside className="w-60 shrink-0 hidden lg:block">
              <div className="rounded-lg border border-white/10 bg-[#101418] p-3">
                <div className="text-xs text-white/50 uppercase tracking-wide px-2">
                  Tools
                </div>
                <div className="mt-2 space-y-1">
                  <button className="w-full text-left px-2 py-2 rounded hover:bg-white/5 text-sm">
                    Workflows
                  </button>
                  <button className="w-full text-left px-2 py-2 rounded hover:bg-white/5 text-sm">
                    Apps
                  </button>
                  <button className="w-full text-left px-2 py-2 rounded hover:bg-white/5 text-sm">
                    Channel Templates
                  </button>
                </div>
              </div>
            </aside>

            <section className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold">Workflows</div>
                  <div className="text-xs text-white/50 mt-1">
                    Publishing and creating workflows is a paid feature, available
                    with your free trial through April 13th.
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-white/10 bg-gradient-to-r from-blue-700/25 to-slate-900/20 p-6 relative overflow-hidden">
                <div className="text-xl font-semibold">Start off simple with templates</div>
                <div className="text-sm text-white/60 mt-1 max-w-xl">
                  Ready-to-use workflow templates to automate some of the most common
                  everyday tasks.
                </div>
                <button className="mt-4 text-sm text-cyan-200 hover:underline">
                  Learn more
                </button>
                <div className="absolute right-6 top-6 w-24 h-24 rounded-xl border border-white/10 bg-white/5" />
              </div>

              <div className="mt-6">
                <div className="text-sm font-semibold text-white/90">
                  Featured templates
                </div>
                <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {featured.map((f) => (
                    <div
                      key={f.title}
                      className="rounded-xl border border-white/10 bg-[#101418] p-4 hover:bg-[#171c22] transition"
                    >
                      <div className="text-xs text-white/60">{f.badge}</div>
                      <div className="mt-1 font-semibold">{f.title}</div>
                      <div className="mt-2 text-sm text-white/60">{f.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Tools;

