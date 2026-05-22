import React, { useEffect, useState } from "react";
import { X, Users, Hash, MessageSquare, Paperclip, Activity } from "lucide-react";
import axios from "axios";

function WorkspaceAnalyticsModal({ open, onClose, workspace }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !workspace?._id) return;
    fetchStats();
  }, [open, workspace?._id]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      // Fetch members count
      const membersRes = await axios.get(
        `http://localhost:4000/api/workspaces/${workspace._id}/members`,
        { withCredentials: true }
      );
      // Fetch channels
      const channelsRes = await axios.get(
        `http://localhost:4000/api/channels`,
        { withCredentials: true }
      );
      const workspaceChannels = (channelsRes.data || []).filter(
        (c) => c.workspace === workspace._id && !c.isDM
      );

      const memberList = membersRes.data || [];
      const activeToday = memberList.filter(
        (m) => m.status === "active"
      ).length;

      setStats({
        members: memberList.length,
        channels: workspaceChannels.length,
        messages: null, // placeholder
        files: null,
        activeToday,
        memberList,
      });
    } catch (err) {
      console.error("Analytics fetch failed", err);
      setStats({ members: 0, channels: 0, messages: null, files: null, activeToday: 0 });
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  const statCards = [
    {
      label: "Total Members",
      value: stats?.members ?? "—",
      icon: <Users size={16} />,
      color: "text-indigo-400",
      bg: "bg-indigo-400/10",
      max: null,
    },
    {
      label: "Channels",
      value: stats?.channels ?? "—",
      icon: <Hash size={16} />,
      color: "text-violet-400",
      bg: "bg-violet-400/10",
      max: null,
    },
    {
      label: "Active Now",
      value: stats?.activeToday ?? "—",
      icon: <Activity size={16} />,
      color: "text-emerald-400",
      bg: "bg-emerald-400/10",
      max: stats?.members || 1,
    },
  ];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-app backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-[440px] bg-surface border border-border-default rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border-subtle">
          <div>
            <h2 className="font-bold text-primary text-[17px]">Workspace Analytics</h2>
            <p className="text-xs text-muted mt-0.5 truncate max-w-[260px]">
              {workspace?.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-muted hover:text-primary hover:bg-hover transition-all"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted">
              <div className="w-6 h-6 border-2 border-border-strong border-t-white/60 rounded-full animate-spin mb-3" />
              <span className="text-sm">Loading stats...</span>
            </div>
          ) : (
            <>
              {/* Stat Cards */}
              <div className="grid grid-cols-3 gap-3">
                {statCards.map((card) => (
                  <div
                    key={card.label}
                    className="flex flex-col items-center gap-2 bg-white/[0.03] border border-border-subtle rounded-xl px-4 py-4 hover:bg-white/[0.06] transition-all"
                  >
                    <div className={`w-8 h-8 rounded-lg ${card.bg} ${card.color} flex items-center justify-center`}>
                      {card.icon}
                    </div>
                    <div className="text-2xl font-black text-primary leading-none">
                      {card.value}
                    </div>
                    <div className="text-[11px] text-muted font-medium text-center leading-snug">
                      {card.label}
                    </div>
                    {/* Progress bar for active users */}
                    {card.max !== null && typeof card.value === "number" && (
                      <div className="w-full h-1 bg-active rounded-full overflow-hidden mt-1">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                          style={{ width: `${Math.min(100, (card.value / card.max) * 100)}%` }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Placeholder rows */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between px-4 py-3 bg-white/[0.03] border border-border-subtle rounded-xl hover:bg-white/[0.05] transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-sky-400/10 flex items-center justify-center text-sky-400">
                      <MessageSquare size={14} />
                    </div>
                    <span className="text-sm text-secondary font-medium">Messages sent</span>
                  </div>
                  <span className="text-sm font-bold text-muted">—</span>
                </div>

                <div className="flex items-center justify-between px-4 py-3 bg-white/[0.03] border border-border-subtle rounded-xl hover:bg-white/[0.05] transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-orange-400/10 flex items-center justify-center text-orange-400">
                      <Paperclip size={14} />
                    </div>
                    <span className="text-sm text-secondary font-medium">Files uploaded</span>
                  </div>
                  <span className="text-sm font-bold text-muted">—</span>
                </div>
              </div>

              <p className="text-center text-[11px] text-primary/20 pt-1">
                Detailed metrics coming soon
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default WorkspaceAnalyticsModal;
