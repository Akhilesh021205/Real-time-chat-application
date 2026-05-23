import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router";
import {
  Search,
  UserPlus,
  Hash,
  MessageSquare,
  Upload,
  Plus,
  Bell,
  Pencil,
  ChevronRight,
} from "lucide-react";
import Sidebar from "../components/Sidebar.jsx";
import Modal from "../components/Modal.jsx";
import EditProfileModal, { resolveProfilePic } from "../components/EditProfileModal.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useWorkspace } from "../context/WorkspaceContext.jsx";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

function formatRelativeTime(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now - d;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function Home() {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const location = useLocation();

  const [users, setUsers] = useState([]);
  const [channels, setChannels] = useState([]);
  const [activeArea, setActiveArea] = useState("home");
  const [recentActivity, setRecentActivity] = useState([]);
  const [loadingActivity, setLoadingActivity] = useState(true);

  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [createError, setCreateError] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isInviting, setIsInviting] = useState(false);

  useEffect(() => {
    if (location.state?.openEditProfile) {
      setEditProfileOpen(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, navigate]);

  const fetchUsers = useCallback(async () => {
    try {
      const params = currentWorkspace?._id ? { workspaceId: currentWorkspace._id } : {};
      const res = await axios.get(`${API_BASE}/api/users`, {
        params,
        withCredentials: true,
      });
      setUsers(res.data);
    } catch (err) {
      console.error(err);
    }
  }, [currentWorkspace?._id]);

  const fetchChannels = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/channels`, { withCredentials: true });
      setChannels(res.data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const loadActivity = useCallback(async () => {
    setLoadingActivity(true);
    try {
      const res = await axios.get(`${API_BASE}/api/activity`, { withCredentials: true });
      setRecentActivity((res.data || []).slice(0, 6));
    } catch {
      setRecentActivity([]);
    } finally {
      setLoadingActivity(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchChannels();
    loadActivity();
  }, [fetchUsers, fetchChannels, loadActivity]);

  const workspaceChannels = useMemo(() => {
    const list = (channels || []).filter((c) => !c.isDM);
    if (!currentWorkspace?._id) return list.slice(0, 6);
    return list
      .filter((c) => !c.workspace || c.workspace === currentWorkspace._id)
      .slice(0, 6);
  }, [channels, currentWorkspace?._id]);

  const workspaceTitle = currentWorkspace?.name || user?.username || "Workspace";
  const profileUrl = resolveProfilePic(user?.profilePic);
  const userInitial = (user?.username?.[0] || "U").toUpperCase();

  const handleCreateChannel = async () => {
    if (!newChannelName.trim()) return;
    setIsCreating(true);
    setCreateError("");
    try {
      await axios.post(
        `${API_BASE}/api/channels/create`,
        { name: newChannelName.trim(), workspaceId: currentWorkspace?._id },
        { withCredentials: true }
      );
      setNewChannelName("");
      setCreateOpen(false);
      fetchChannels();
    } catch (err) {
      setCreateError(err?.response?.data?.message || "Failed to create channel");
    } finally {
      setIsCreating(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setIsInviting(true);
    setInviteError("");
    setInviteSuccess("");
    try {
      const res = await axios.post(
        `${API_BASE}/api/workspaces/invite`,
        { email: inviteEmail.trim(), workspaceId: currentWorkspace?._id },
        { withCredentials: true }
      );
      setInviteSuccess(res.data?.message || "Invitation sent.");
      setInviteEmail("");
      if (res.data?.emailSent !== false) {
        setTimeout(() => setInviteOpen(false), 1200);
      }
    } catch (err) {
      setInviteError(err?.response?.data?.message || "Invite failed");
    } finally {
      setIsInviting(false);
    }
  };

  const quickActions = [
    {
      label: "Upload files",
      desc: "Share documents",
      icon: Upload,
      onClick: () => navigate("/files"),
    },
    {
      label: "Create channel",
      desc: "New team space",
      icon: Hash,
      onClick: () => setCreateOpen(true),
    },
    {
      label: "Start DM",
      desc: "Message someone",
      icon: MessageSquare,
      onClick: () => navigate("/dms"),
    },
    {
      label: "View activity",
      desc: "Mentions & updates",
      icon: Bell,
      onClick: () => navigate("/activity"),
    },
  ];

  return (
    <div className="flex h-screen bg-[#0a0a0b] text-white overflow-hidden">
      <Sidebar
        users={users}
        channels={channels}
        selectedId={null}
        activeArea={activeArea}
        onSelectArea={setActiveArea}
        refreshChannels={fetchChannels}
      />

      <main className="flex-1 min-w-0 flex flex-col bg-[#101418]">
        {/* Top header */}
        <header className="h-14 shrink-0 border-b border-white/10 px-5 md:px-6 flex items-center justify-between gap-4 bg-[#101418]">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-accent/90">
              Home
            </p>
            <h1 className="text-base font-semibold truncate text-white/95">{workspaceTitle}</h1>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => navigate("/chat")}
              className="p-2 rounded-lg border border-white/10 text-white/70 hover:text-white hover:bg-white/5 transition-colors"
              title="Search"
            >
              <Search size={18} strokeWidth={2} />
            </button>
            <button
              type="button"
              onClick={() => setInviteOpen(true)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 text-sm text-white/80 hover:bg-white/5 transition-colors"
            >
              <UserPlus size={16} strokeWidth={2} />
              Invite
            </button>
            <button
              type="button"
              onClick={() => setEditProfileOpen(true)}
              className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-lg border border-white/10 hover:bg-white/5 transition-colors"
              title="Edit profile"
            >
              <div className="w-8 h-8 rounded-lg overflow-hidden bg-[#11161b] border border-white/10 flex items-center justify-center shrink-0">
                {profileUrl ? (
                  <img src={profileUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm font-bold text-accent">{userInitial}</span>
                )}
              </div>
              <Pencil size={14} className="text-white/50 hidden sm:block" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="max-w-4xl mx-auto px-5 md:px-6 py-6 space-y-8">
            {/* Welcome */}
            <section className="rounded-xl border border-white/10 bg-[#11161b] p-6 md:p-8">
              <h2 className="text-xl md:text-2xl font-semibold text-white tracking-tight">
                Welcome to your workspace
              </h2>
              <p className="mt-2 text-sm text-white/55 max-w-lg leading-relaxed">
                {currentWorkspace
                  ? `You're in ${currentWorkspace.name}. Jump into channels, message teammates, or invite new members.`
                  : "Organize conversations in channels, send direct messages, and keep your team in sync."}
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setCreateOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent hover:bg-accent/90 text-sm font-medium text-white transition-colors"
                >
                  <Plus size={16} strokeWidth={2} />
                  Create channel
                </button>
                <button
                  type="button"
                  onClick={() => setInviteOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 text-sm text-white/90 hover:bg-white/5 transition-colors"
                >
                  <UserPlus size={16} strokeWidth={2} />
                  Invite members
                </button>
                <button
                  type="button"
                  onClick={() => setEditProfileOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-accent/30 text-sm text-accent hover:bg-accent/10 transition-colors"
                >
                  <Pencil size={16} strokeWidth={2} />
                  Edit profile
                </button>
              </div>
            </section>

            {/* Quick actions */}
            <section>
              <h3 className="text-xs font-bold uppercase tracking-wider text-white/45 mb-3 px-0.5">
                Quick actions
              </h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {quickActions.map(({ label, desc, icon: Icon, onClick }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={onClick}
                    className="text-left rounded-xl border border-white/10 bg-[#11161b] p-4 hover:border-accent/30 hover:bg-[#171c22] transition-colors group"
                  >
                    <div className="w-9 h-9 rounded-lg bg-accent/15 border border-accent/20 flex items-center justify-center text-accent mb-3 group-hover:bg-accent/25 transition-colors">
                      <Icon size={18} strokeWidth={2} />
                    </div>
                    <div className="text-sm font-medium text-white/90">{label}</div>
                    <div className="text-xs text-white/45 mt-0.5">{desc}</div>
                  </button>
                ))}
              </div>
            </section>

            {/* Recent channels */}
            <section>
              <div className="flex items-center justify-between mb-3 px-0.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-white/45">
                  Recent channels
                </h3>
                {workspaceChannels.length > 0 && (
                  <button
                    type="button"
                    onClick={() => navigate("/chat")}
                    className="text-xs text-accent hover:underline"
                  >
                    View all
                  </button>
                )}
              </div>
              <div className="rounded-xl border border-white/10 bg-[#11161b] divide-y divide-white/5 overflow-hidden">
                {workspaceChannels.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-white/50">
                    No channels yet.{" "}
                    <button
                      type="button"
                      onClick={() => setCreateOpen(true)}
                      className="text-accent hover:underline"
                    >
                      Create one
                    </button>
                  </div>
                ) : (
                  workspaceChannels.map((ch) => (
                    <button
                      key={ch._id}
                      type="button"
                      onClick={() => navigate(`/chat/${ch._id}`)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.03] transition-colors group"
                    >
                      <span className="w-8 h-8 rounded-lg bg-[#11161b] border border-white/10 flex items-center justify-center text-white/50 group-hover:border-accent/30 group-hover:text-accent transition-colors">
                        <Hash size={16} strokeWidth={2} />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-white/90 block truncate">
                          {ch.name}
                        </span>
                        <span className="text-xs text-white/40">
                          {ch.members?.length || 0} members
                        </span>
                      </span>
                      <ChevronRight size={16} className="text-white/25 group-hover:text-white/50 shrink-0" />
                    </button>
                  ))
                )}
              </div>
            </section>

            {/* Recent activity */}
            <section>
              <div className="flex items-center justify-between mb-3 px-0.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-white/45">
                  Recent activity
                </h3>
                <button
                  type="button"
                  onClick={() => navigate("/activity")}
                  className="text-xs text-accent hover:underline"
                >
                  Open activity
                </button>
              </div>
              <div className="rounded-xl border border-white/10 bg-[#11161b] divide-y divide-white/5 overflow-hidden">
                {loadingActivity ? (
                  <div className="px-4 py-8 text-sm text-white/45 text-center">Loading…</div>
                ) : recentActivity.length === 0 ? (
                  <div className="px-4 py-8 text-sm text-white/50 text-center">
                    No recent activity yet.
                  </div>
                ) : (
                  recentActivity.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => item.link && navigate(item.link)}
                      className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-white/[0.03] transition-colors"
                    >
                      <span className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0 mt-0.5">
                        <Bell size={14} className="text-accent" />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-white/90 block truncate">
                          {item.title}
                        </span>
                        <span className="text-xs text-white/45 line-clamp-1">{item.preview}</span>
                      </span>
                      <span className="text-[11px] text-white/35 shrink-0">
                        {formatRelativeTime(item.createdAt)}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </section>
          </div>
        </div>
      </main>

      <EditProfileModal open={editProfileOpen} onClose={() => setEditProfileOpen(false)} />

      <Modal
        open={createOpen}
        title="Create channel"
        onClose={() => {
          setCreateOpen(false);
          setCreateError("");
          setNewChannelName("");
        }}
        footer={
          <>
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="px-4 py-2 rounded-lg border border-white/10 text-sm hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreateChannel}
              disabled={isCreating || !newChannelName.trim()}
              className="px-4 py-2 rounded-lg bg-accent text-sm font-medium disabled:opacity-50"
            >
              {isCreating ? "Creating…" : "Create"}
            </button>
          </>
        }
      >
        <input
          type="text"
          value={newChannelName}
          onChange={(e) => setNewChannelName(e.target.value)}
          placeholder="e.g. general"
          className="w-full rounded-lg border border-white/10 bg-[#11161b] px-3 py-2.5 text-sm focus:border-accent/50 focus:outline-none"
          onKeyDown={(e) => e.key === "Enter" && handleCreateChannel()}
        />
        {createError && <p className="mt-2 text-sm text-red-400">{createError}</p>}
      </Modal>

      <Modal
        open={inviteOpen}
        title="Invite to workspace"
        onClose={() => {
          setInviteOpen(false);
          setInviteError("");
          setInviteSuccess("");
          setInviteEmail("");
        }}
        footer={
          <>
            <button
              type="button"
              onClick={() => setInviteOpen(false)}
              className="px-4 py-2 rounded-lg border border-white/10 text-sm hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleInvite}
              disabled={isInviting || !inviteEmail.trim()}
              className="px-4 py-2 rounded-lg bg-accent text-sm font-medium disabled:opacity-50"
            >
              {isInviting ? "Sending…" : "Send invite"}
            </button>
          </>
        }
      >
        <p className="text-sm text-white/55 mb-3">
          Invite someone to <strong className="text-white/80">{workspaceTitle}</strong> by email.
        </p>
        <input
          type="email"
          value={inviteEmail}
          onChange={(e) => setInviteEmail(e.target.value)}
          placeholder="colleague@company.com"
          className="w-full rounded-lg border border-white/10 bg-[#11161b] px-3 py-2.5 text-sm focus:border-accent/50 focus:outline-none"
        />
        {inviteError && <p className="mt-2 text-sm text-red-400">{inviteError}</p>}
        {inviteSuccess && <p className="mt-2 text-sm text-emerald-400">{inviteSuccess}</p>}
      </Modal>
    </div>
  );
}

export default Home;
