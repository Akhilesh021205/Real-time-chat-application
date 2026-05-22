import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router";
import {
  Home,
  MessageSquare,
  Bell,
  Folder,
  MoreHorizontal,
  Settings,
  Plus,
  Search,
  Headphones,
  Contact,
  Star,
  FileText,
  Hash,
  ChevronRight,
  ChevronLeft,
  Trash2,
  LogOut,
} from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { useWorkspace } from "../context/WorkspaceContext.jsx";
import Modal from "./Modal.jsx";
import WorkspaceMembersModal from "./WorkspaceMembersModal.jsx";
import WorkspaceAnalyticsModal from "./WorkspaceAnalyticsModal.jsx";
import WorkspaceSettingsModal from "./WorkspaceSettingsModal.jsx";
import { socket } from "../socket/socket.js";
import EditProfileModal from "./EditProfileModal.jsx";
import StatusUpdateModal from "./StatusUpdateModal.jsx";
import { resolveProfilePic } from "./EditProfileModal.jsx";
import { sameId } from "../utils/ids.js";
import { isWorkspaceOwner } from "../utils/workspace.js";
import {
  presenceLabel,
  presenceDotClass,
  presenceTextClass,
} from "../utils/presence.js";
import { CustomStatusLine } from "./StatusIcon.jsx";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

function Sidebar({ users, channels, selectedId, activeArea, onSelectArea, refreshChannels }) {
  const { user, logout, updatePresence } = useAuth();
  const {
    workspaces: allWorkspaces,
    currentWorkspace,
    setCurrentWorkspace,
    refreshWorkspaces,
    deleteWorkspace,
    leaveWorkspace,
  } = useWorkspace();
  const navigate = useNavigate();
  const location = useLocation();
  const hideWorkspacePanel =
    location.pathname === "/dms" || location.pathname.startsWith("/dms/");

  /** DMs always use /dms — never /chat/:userId (avoids channel auto-select bug) */
  const dmPath = (userId) => `/dms/${userId}`;
  const [isCollapsed, setIsCollapsed] = useState(
    () => localStorage.getItem("slackClone.sidebarCollapsed") === "true"
  );
  const [profileOpen, setProfileOpen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [notificationsPaused, setNotificationsPaused] = useState(
    () => localStorage.getItem("slackClone.notifMuteWs") === "true"
  );
  const [presenceBusy, setPresenceBusy] = useState(false);
  const profileRef = useRef(null);
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const workspaceMenuRef = useRef(null);

  const [starredItems, setStarredItems] = useState([]);
  
  useEffect(() => {
    const loadStars = () => {
      setStarredItems(JSON.parse(localStorage.getItem("starredItems") || "[]"));
    };
    loadStars();
    window.addEventListener("starredUpdated", loadStars);
    return () => window.removeEventListener("starredUpdated", loadStars);
  }, []);

  const [joinOpen, setJoinOpen] = useState(false);
  const [joinChannelId, setJoinChannelId] = useState("");
  const [joinError, setJoinError] = useState("");

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [createError, setCreateError] = useState("");
  const [isCreatingChannel, setIsCreatingChannel] = useState(false);

  const [membersModalOpen, setMembersModalOpen] = useState(false);
  const [analyticsModalOpen, setAnalyticsModalOpen] = useState(false);
  const [workspaceSettingsOpen, setWorkspaceSettingsOpen] = useState(false);
  const [editWorkspaceOpen, setEditWorkspaceOpen] = useState(false);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [editWsName, setEditWsName] = useState("");
  const [editWsError, setEditWsError] = useState("");
  const [isUpdatingWorkspace, setIsUpdatingWorkspace] = useState(false);
  const [isDeletingWorkspace, setIsDeletingWorkspace] = useState(false);

  const [activeDMs, setActiveDMs] = useState([]);
  const [workspaceMembers, setWorkspaceMembers] = useState([]);
  const [unreadActivityCount, setUnreadActivityCount] = useState(0);

  const toggleSidebar = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    localStorage.setItem("slackClone.sidebarCollapsed", String(next));
  };

  const userInitial = useMemo(() => {
    const ch = user?.username?.charAt?.(0) || "U";
    return String(ch).toUpperCase();
  }, [user?.username]);

  const userProfilePic = useMemo(
    () => resolveProfilePic(user?.profilePic),
    [user?.profilePic]
  );

  const userPresence = user?.status || "offline";
  const hasCustomStatus = Boolean(user?.customStatus?.text);
  const isAway = userPresence === "away";

  const toggleNotificationsPaused = () => {
    const next = !notificationsPaused;
    setNotificationsPaused(next);
    localStorage.setItem("slackClone.notifMuteWs", String(next));
    window.dispatchEvent(new CustomEvent("slackCloneSettingsChanged"));
  };

  const loadUnreadActivityCount = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/activity`, {
        withCredentials: true,
      });
      const unreadCount = (res.data || []).filter((item) => !item.read).length;
      setUnreadActivityCount(unreadCount);
    } catch (err) {
      console.error("Error fetching unread activity", err);
    }
  }, []);

  const handleToggleAway = async () => {
    if (presenceBusy) return;
    setPresenceBusy(true);
    try {
      await updatePresence(isAway ? "active" : "away");
    } catch (err) {
      console.error(err);
    } finally {
      setPresenceBusy(false);
    }
  };

  useEffect(() => {
    const fetchActiveDMs = async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/channels/dms/active`, {
          withCredentials: true,
        });
        setActiveDMs(res.data);
      } catch (err) {
        console.error("Error fetching active DMs", err);
      }
    };

    fetchActiveDMs();

    const onNewMessage = (msg) => {
      if (msg.receiver) fetchActiveDMs();
    };
    socket.on("newMessage", onNewMessage);
    return () => socket.off("newMessage", onNewMessage);
  }, [user]);

  useEffect(() => {
    loadUnreadActivityCount();

    const refreshUnreadActivity = () => loadUnreadActivityCount();
    const intervalId = window.setInterval(refreshUnreadActivity, 30000);

    socket.on("notificationCreated", refreshUnreadActivity);
    socket.on("newMessage", refreshUnreadActivity);
    window.addEventListener("activityReadUpdated", refreshUnreadActivity);

    return () => {
      window.clearInterval(intervalId);
      socket.off("notificationCreated", refreshUnreadActivity);
      socket.off("newMessage", refreshUnreadActivity);
      window.removeEventListener("activityReadUpdated", refreshUnreadActivity);
    };
  }, [loadUnreadActivityCount]);

  useEffect(() => {
    if (!currentWorkspace?._id) {
      setWorkspaceMembers([]);
      return;
    }
    axios
      .get(`${API_BASE}/api/workspaces/${currentWorkspace._id}/members`, {
        withCredentials: true,
      })
      .then((res) => setWorkspaceMembers(res.data))
      .catch(console.error);
  }, [currentWorkspace?._id]);

  useEffect(() => {
    const handleStatusChange = ({ userId, status }) => {
      setWorkspaceMembers((prev) =>
        prev.map((member) =>
          sameId(member._id, userId) ? { ...member, status } : member
        )
      );
      setActiveDMs((prev) =>
        prev.map((dm) => ({
          ...dm,
          members: (dm.members || []).map((member) =>
            sameId(member._id, userId) ? { ...member, status } : member
          ),
        }))
      );
    };

    socket.on("userStatusChanged", handleStatusChange);
    return () => socket.off("userStatusChanged", handleStatusChange);
  }, []);

  useEffect(() => {
    const onDown = (e) => {
      const target = e.target;
      if (profileOpen) {
        if (profileRef.current && target && profileRef.current.contains(target)) return;
        setProfileOpen(false);
      }
      if (workspaceMenuOpen) {
        if (workspaceMenuRef.current && target && workspaceMenuRef.current.contains(target)) return;
        setWorkspaceMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [profileOpen, workspaceMenuOpen]);

  const handleJoinChannel = async () => {
    const channelId = joinChannelId.trim();
    if (!channelId) {
      setJoinError("Please enter a channel ID.");
      return;
    }

    try {
      await axios.post(
        `http://localhost:4000/api/channels/${channelId}/join`,
        {},
        { withCredentials: true }
      );
      refreshChannels?.();
      navigate(`/chat/${channelId}`);
      onSelectArea("chat");
      setJoinOpen(false);
      setJoinChannelId("");
      setJoinError("");
    } catch (err) {
      console.error(err);
      setJoinError(err?.response?.data?.message || "Unable to join channel");
    }
  };

  const handleInvite = async () => {
    const email = inviteEmail.trim();
    if (!email) {
      setInviteError("Please enter an email address.");
      return;
    }
    if (!currentWorkspace?._id) {
      setInviteError("Select a workspace first.");
      return;
    }
    try {
      await axios.post(
        "http://localhost:4000/api/workspaces/invite",
        { email, workspaceId: currentWorkspace._id },
        { withCredentials: true }
      );
      setInviteSuccess("Invitation sent");
      setInviteError("");
      setInviteEmail("");
    } catch (err) {
      console.error(err);
      setInviteSuccess("");
      setInviteError(err?.response?.data?.message || "Invite failed");
    }
  };

  const handleCreateChannel = async () => {
    if (!newChannelName.trim()) return;
    setIsCreatingChannel(true);
    setCreateError("");
    try {
      await axios.post(
        "http://localhost:4000/api/channels/create",
        { 
          name: newChannelName.trim(),
          workspaceId: currentWorkspace?._id 
        },
        { withCredentials: true }
      );
      setNewChannelName("");
      setCreateOpen(false);
      if (refreshChannels) {
        refreshChannels();
      } else {
        // Fallback refresh for other pages
        window.location.reload();
      }
    } catch (err) {
      console.error(err);
      setCreateError(err.response?.data?.message || "Failed to create channel");
    } finally {
      setIsCreatingChannel(false);
    }
  };

  const menu = [
    { label: "Home", icon: <Home size={22} strokeWidth={2} />, key: "home" },
    { label: "DMs", icon: <MessageSquare size={22} strokeWidth={2} />, key: "chat" },
    { label: "Activity", icon: <Bell size={22} strokeWidth={2} />, key: "activity" },
    { label: "Files", icon: <Folder size={22} strokeWidth={2} />, key: "files" },
    { label: "Settings", icon: <Settings size={22} strokeWidth={2} />, key: "settings" },
  ];

  const channelList = (channels || []).filter(
    (c) => !currentWorkspace || c.workspace === currentWorkspace._id || !c.workspace
  );

  const getLiveUser = (person) => {
    if (!person?._id) return person;
    const liveUser =
      workspaceMembers.find((member) => sameId(member._id, person._id)) ||
      (users || []).find((member) => sameId(member._id, person._id));
    return liveUser ? { ...person, ...liveUser } : person;
  };

  const userOwnsWorkspace = useMemo(
    () => isWorkspaceOwner(currentWorkspace, user?._id),
    [currentWorkspace, user?._id]
  );

  const handleEditWorkspace = async () => {
    if (!editWsName.trim() || !currentWorkspace?._id) return;
    setIsUpdatingWorkspace(true);
    setEditWsError("");
    try {
      await axios.put(
        `${API_BASE}/api/workspaces/update/${currentWorkspace._id}`,
        { name: editWsName.trim() },
        { withCredentials: true }
      );
      await refreshWorkspaces?.();
      setEditWorkspaceOpen(false);
      setWorkspaceMenuOpen(false);
    } catch (err) {
      setEditWsError(err?.response?.data?.message || "Failed to update workspace");
    } finally {
      setIsUpdatingWorkspace(false);
    }
  };

  const handleLeaveWorkspace = async () => {
    if (!currentWorkspace?._id || userOwnsWorkspace) return;
    try {
      await leaveWorkspace(currentWorkspace._id);
      setLeaveConfirmOpen(false);
      setWorkspaceMenuOpen(false);
      navigate("/home");
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to leave workspace");
    }
  };

  const handleDeleteWorkspace = async () => {
    if (!currentWorkspace?._id || !userOwnsWorkspace) return;
    if (
      !window.confirm(
        `Delete "${currentWorkspace.name}" permanently? All channels and messages in this workspace will be removed.`
      )
    ) {
      return;
    }
    setIsDeletingWorkspace(true);
    try {
      await deleteWorkspace(currentWorkspace._id);
      setWorkspaceMenuOpen(false);
      navigate("/home");
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to delete workspace");
    } finally {
      setIsDeletingWorkspace(false);
    }
  };

  return (
    <aside className="flex">

      {/* ICON BAR */}
      <div className="w-[80px] bg-gray-900/95 backdrop-blur-2xl border-r border-white/5 flex flex-col items-center py-5 justify-between shadow-2xl relative z-30">

        <div className="flex flex-col items-center gap-5 w-full">
          {isCollapsed && !hideWorkspacePanel && (
            <button
              type="button"
              onClick={toggleSidebar}
              title="Expand sidebar"
              className="w-11 h-11 rounded-2xl bg-gray-900 hover:bg-gray-800 text-white flex items-center justify-center shadow-lg shadow-gray-900/25 transition-all hover:scale-105"
            >
              <ChevronRight size={20} strokeWidth={2.5} />
            </button>
          )}

          <div className="flex flex-col gap-3 max-h-[280px] overflow-y-auto no-scrollbar py-1 px-2 w-full items-center">
            {(allWorkspaces || []).map((ws) => (
              <button
                key={ws._id}
                type="button"
                onClick={() => setCurrentWorkspace(ws)}
                title={ws.name}
                className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-white transition-all duration-300 relative ${
                  currentWorkspace?._id === ws._id
                    ? "scale-110 shadow-md border-2 border-white/10 bg-gray-800"
                    : "opacity-60 hover:opacity-100 hover:scale-105 bg-gray-800 border border-transparent hover:border-white/10"
                }`}
              >
                {currentWorkspace?._id === ws._id && (
                  <span className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-7 bg-white/10 rounded-r-full" />
                )}
                {ws.name?.charAt(0)?.toUpperCase() || "W"}
              </button>
            ))}
            <button
              type="button"
              onClick={() => navigate("/launch")}
              title="Add workspace"
              className="w-11 h-11 rounded-2xl border-2 border-dashed border-white/15 flex items-center justify-center text-white/40 hover:text-white hover:border-white/10 transition-all"
            >
              <Plus size={20} />
            </button>
          </div>

          <div className="w-10 h-px bg-white/5" />

          <button
            type="button"
            onClick={() => navigate("/tools")}
            className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-all"
            title="Search"
          >
            <Search size={20} strokeWidth={2} />
          </button>

          <div className="flex flex-col gap-3 w-full px-2">
            {menu.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  onSelectArea?.(item.key);
                  if (item.key === "home") navigate("/home");
                  if (item.key === "chat") navigate("/dms");
                  if (item.key === "activity") navigate("/activity");
                  if (item.key === "files") navigate("/files");
                  if (item.key === "settings") navigate("/settings");
                }}
                className={`group relative flex flex-col items-center justify-center w-full py-2 rounded-xl transition-all duration-200 ${
                  activeArea === item.key
                    ? "text-white bg-gray-800"
                    : "text-white/40 hover:text-white hover:bg-white/5"
                }`}
              >
                {activeArea === item.key && (
                  <span className="absolute inset-y-1.5 -left-0.5 w-1 bg-white/10 rounded-r-full" />
                )}
                <span className="relative mb-0.5 group-hover:scale-110 transition-transform">
                  {item.icon}
                  {item.key === "activity" && unreadActivityCount > 0 && (
                    <span
                      className="absolute -right-1.5 -top-1.5 min-w-[14px] h-[14px] px-1 rounded-full bg-red-500 text-[9px] leading-[14px] text-white font-bold text-center shadow-lg shadow-red-500/30 ring-2 ring-gray-900"
                      aria-label={`${unreadActivityCount} unread activity items`}
                    >
                      {unreadActivityCount > 9 ? "9+" : unreadActivityCount}
                    </span>
                  )}
                </span>
                <span className="text-[9px] font-bold tracking-widest uppercase opacity-80">
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-center gap-4 mb-1">
          <button
            type="button"
            onClick={() => navigate("/launch")}
            className="w-11 h-11 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/70 hover:text-white transition-all"
            title="Create"
          >
            <Plus size={22} />
          </button>

          <div className="relative" ref={profileRef}>
          <button
            type="button"
            onClick={() => setProfileOpen((v) => !v)}
            className="w-11 h-11 rounded-2xl bg-gray-900 p-[2px] shadow-lg shadow-accent/20 hover:scale-105 transition-transform"
            title={user?.username || "Profile"}
          >
            <div className="w-full h-full rounded-[14px] bg-gray-900 overflow-hidden flex items-center justify-center font-bold text-sm text-white">
              {userProfilePic ? (
                <img src={userProfilePic} alt="" className="w-full h-full object-cover" />
              ) : (
                userInitial
              )}
            </div>
          </button>
          <span
            className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#0a0a0b] ${presenceDotClass(userPresence)}`}
          />

          {profileOpen && (
            <div className="absolute bottom-14 left-2 w-64 bg-panel backdrop-blur-md border border-white/5 rounded-xl shadow-xl text-white shadow-2xl overflow-hidden animate-slide-up origin-bottom-left">
              <div className="p-4 border-b border-white/5 bg-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gray-800 shadow-md flex items-center justify-center font-extrabold border border-white/10 overflow-hidden">
                    {userProfilePic ? (
                      <img src={userProfilePic} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-accent">{userInitial}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{user?.username || "User"}</div>
                    <div className={`text-xs flex items-center gap-2 ${presenceTextClass(userPresence)}`}>
                      <span className={`inline-block w-2 h-2 rounded-full ${presenceDotClass(userPresence)}`} />
                      {presenceLabel(userPresence)}
                    </div>
                    {hasCustomStatus && (
                      <div className="text-xs text-white/50 mt-0.5">
                        <CustomStatusLine customStatus={user.customStatus} iconSize={12} />
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  className="mt-3 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90 hover:bg-white/10 text-left truncate"
                  onClick={() => {
                    setProfileOpen(false);
                    setStatusModalOpen(true);
                  }}
                >
                  {hasCustomStatus ? (
                    <CustomStatusLine customStatus={user.customStatus} iconSize={14} />
                  ) : (
                    "Update your status"
                  )}
                </button>
              </div>

              <div className="px-4 py-2 text-sm space-y-2">
                <button
                  type="button"
                  disabled={presenceBusy}
                  className="block w-full text-left text-white/80 hover:text-white disabled:opacity-50"
                  onClick={handleToggleAway}
                >
                  {isAway ? "Set yourself as active" : "Set yourself as away"}
                </button>
                <button
                  type="button"
                  className="flex w-full items-center justify-between text-white/80 hover:text-white"
                  onClick={toggleNotificationsPaused}
                >
                  <span>Pause notifications</span>
                  <span className="text-white/50">{notificationsPaused ? "On" : "Off"}</span>
                </button>
              </div>

              <div className="border-t border-white/10 px-4 py-3 text-sm space-y-2">
                <button
                  type="button"
                  className="block w-full text-left text-white/80 hover:text-white"
                  onClick={() => {
                    setProfileOpen(false);
                    setEditProfileOpen(true);
                  }}
                >
                  Edit profile
                </button>
                <button
                  type="button"
                  className="block w-full text-left text-white/80 hover:text-white"
                  onClick={() => {
                    setProfileOpen(false);
                    navigate("/settings");
                  }}
                >
                  Preferences
                </button>
              </div>

              <div className="border-t border-white/10 p-3">
                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    logout();
                  }}
                  className="w-full text-left text-sm text-white/90 hover:text-white"
                >
                  Sign out of {user?.username || "account"}
                </button>
              </div>
            </div>
          )}
          </div>
        </div>
      </div>

      {/* WORKSPACE PANEL — hidden on /dms */}
      <div
        className={`${
          hideWorkspacePanel || isCollapsed
            ? "w-0 overflow-hidden opacity-0 pointer-events-none border-r-0"
            : "w-[280px] opacity-100"
        } bg-[#101418] backdrop-blur-3xl border-r border-white/5 flex flex-col text-sm relative z-10 transition-all duration-300 ease-in-out`}
      >
        <div
          className="px-5 py-4 border-b border-white/5 flex items-center justify-between gap-2 bg-[#11161b] relative"
          ref={workspaceMenuRef}
        >
          <div className="min-w-0 flex-1">
            <div className="text-[10px] text-indigo-400/90 font-bold uppercase tracking-[0.12em] mb-1">
              Active workspace
            </div>
            <button
              type="button"
              className="font-bold text-white text-base hover:text-indigo-300 transition-colors truncate text-left w-full flex items-center gap-1"
              onClick={() => setWorkspaceMenuOpen((v) => !v)}
            >
              <span className="truncate">
                {currentWorkspace?.name || user?.username || "Workspace"}
              </span>
              <MoreHorizontal size={14} className="shrink-0 opacity-50" />
            </button>

            {workspaceMenuOpen && currentWorkspace && (
              <div className="absolute left-4 right-4 top-full mt-1 z-50 bg-[#101418] border border-white/10 rounded-xl shadow-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-white/5">
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                    Workspace settings
                  </div>
                  <div className="mt-1 font-bold text-white truncate">
                    {currentWorkspace.name}
                  </div>
                </div>

                <div className="p-1.5">
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 text-sm text-gray-200"
                    onClick={() => {
                      setWorkspaceMenuOpen(false);
                      setWorkspaceSettingsOpen(true);
                    }}
                  >
                    Workspace settings
                  </button>
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 text-sm text-gray-200"
                    onClick={() => {
                      setEditWsName(currentWorkspace.name || "");
                      setEditWsError("");
                      setEditWorkspaceOpen(true);
                      setWorkspaceMenuOpen(false);
                    }}
                  >
                    Edit workspace
                  </button>
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 text-sm text-gray-200"
                    onClick={() => {
                      setWorkspaceMenuOpen(false);
                      setMembersModalOpen(true);
                    }}
                  >
                    Manage members
                  </button>
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 text-sm text-gray-200"
                    onClick={() => {
                      setWorkspaceMenuOpen(false);
                      setAnalyticsModalOpen(true);
                    }}
                  >
                    Workspace analytics
                  </button>

                  <div className="my-1 border-t border-white/10" />

                  {userOwnsWorkspace ? (
                    <button
                      type="button"
                      disabled={isDeletingWorkspace}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-red-500/10 text-sm text-red-400 disabled:opacity-50"
                      onClick={handleDeleteWorkspace}
                    >
                      <Trash2 size={16} />
                      {isDeletingWorkspace ? "Deleting…" : "Delete workspace"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-red-500/10 text-sm text-red-400"
                      onClick={() => setLeaveConfirmOpen(true)}
                    >
                      <LogOut size={16} />
                      Leave workspace
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => {
                setInviteOpen(true);
                setInviteError("");
                setInviteSuccess("");
              }}
              title="Invite people"
              className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-all"
            >
              <Plus size={16} />
            </button>
            <button
              type="button"
              onClick={toggleSidebar}
              title="Collapse sidebar"
              className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-all"
            >
              <ChevronLeft size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4 custom-scrollbar">
          <div className="space-y-0.5 px-1">
            <button
              type="button"
              onClick={() => {
                onSelectArea("huddles");
                navigate("/huddles");
              }}
              className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all text-[13px]"
            >
              <Headphones size={16} strokeWidth={2} />
              Huddles
            </button>
            <button
              type="button"
              onClick={() => {
                onSelectArea("directories");
                navigate("/directories");
              }}
              className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all text-[13px]"
            >
              <Contact size={16} strokeWidth={2} />
              Directories
            </button>
            <button
              type="button"
              onClick={() => navigate("/canvas")}
              className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all text-[13px]"
            >
              <FileText size={16} strokeWidth={2} />
              Canvas
            </button>
          </div>

          <div className="border-t border-white/5 pt-4">
            <div className="px-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">
              Starred
            </div>
            <div className="mt-2 space-y-1">
              {starredItems.length === 0 ? (
                 <div className="px-3 py-1 text-xs text-gray-500 italic">No starred items</div>
              ) : (
                starredItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      navigate(`/chat/${item.id}`);
                      onSelectArea("chat");
                    }}
                    className={`flex items-center gap-2.5 w-full px-3 py-1.5 rounded hover:bg-white/5 transition-colors group text-gray-300 hover:text-white truncate ${sameId(selectedId, item.id) ? "bg-accent/40 text-white font-medium" : ""}`}
                  >
                    <Star size={14} className="text-amber-400/90 shrink-0 fill-amber-400/30" />
                    <span className="text-[13px]">{item.type === 'channel' ? `# ${item.name}` : item.name}</span>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="border-t border-white/5 pt-4">
            <div className="px-3 flex items-center justify-between text-[10px] font-bold text-gray-500 uppercase tracking-widest group/header mb-1">
              <span>Channels</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCreateOpen(true);
                }}
                className="w-6 h-6 flex items-center justify-center rounded-md bg-white/5 hover:bg-accent text-white transition-all shadow-lg border border-white/10 active:scale-90"
                title="Create Channel"
              >
                <span className="text-lg font-bold leading-none">+</span>
              </button>
            </div>
            <div className="mt-2 space-y-1">
              {channelList.length === 0 ? (
                <div className="px-3 py-2 text-xs text-gray-500">
                  No channels yet
                </div>
              ) : (
                channelList.map((channel) => {
                  const isActive = sameId(selectedId, channel._id);
                  return (
                    <button
                      key={channel._id}
                      onClick={() => {
                        navigate(`/chat/${channel._id}`);
                        onSelectArea("chat");
                      }}
                      className={`flex items-center gap-2.5 w-full px-3 py-1.5 rounded-lg transition-colors group ${
                        isActive ? "bg-accent/40 text-white font-medium shadow-sm border border-accent/20" : "text-gray-300 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <Hash size={14} className="text-gray-500 shrink-0" />
                      <span className="text-[13px] truncate">{channel.name}</span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="border-t border-white/5 pt-4">
            <div className="px-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">
              Messages
            </div>
            <div className="mt-1 space-y-0.5">
              <button
                type="button"
                onClick={() => {
                  navigate(dmPath(user._id));
                  onSelectArea("chat");
                }}
                className={`flex items-center gap-2.5 w-full px-3 py-1.5 rounded-xl transition-all ${
                  sameId(selectedId, user?._id)
                    ? "bg-indigo-500/15 text-white font-medium"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <div className="w-6 h-6 rounded-lg bg-cyan-500/80 flex items-center justify-center text-[10px] font-bold text-white relative shrink-0">
                  {userInitial}
                  <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border border-[#11161b]" />
                </div>
                <span className="text-[13px] truncate">{user?.username} (you)</span>
              </button>

              {activeDMs
                .filter((dm) => {
                  const u = dm.members?.find((m) => !sameId(m._id, user?._id)) || dm.members?.[0];
                  return u && !sameId(u._id, user?._id);
                })
                .map((dm) => {
                const otherUser = getLiveUser(
                  dm.members?.find((m) => !sameId(m._id, user?._id)) || dm.members?.[0]
                );
                if (!otherUser) return null;
                const isSelf = sameId(otherUser._id, user?._id);
                const isActive = sameId(selectedId, otherUser._id);
                return (
                  <button
                    key={dm._id}
                    type="button"
                    onClick={() => {
                      navigate(isSelf ? dmPath(user._id) : dmPath(otherUser._id));
                      onSelectArea("chat");
                    }}
                    className={`flex items-center gap-2.5 w-full px-3 py-1.5 rounded-xl transition-all ${
                      isActive
                        ? "bg-indigo-500/15 text-white font-medium"
                        : "text-gray-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <div className="w-6 h-6 rounded-lg bg-indigo-500/50 flex items-center justify-center text-[10px] font-bold relative shrink-0">
                      {otherUser.username?.[0]?.toUpperCase()}
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-[#11161b] ${
                          otherUser.status === "active" ? "bg-emerald-500" : "bg-gray-500"
                        }`}
                      />
                    </div>
                    <span className="text-[13px] truncate">
                      {isSelf ? `${otherUser.username} (you)` : otherUser.username}
                    </span>
                  </button>
                );
              })}

              {workspaceMembers
                .filter((u) => u._id !== user?._id)
                .filter((u) => !activeDMs.some((dm) => dm.members?.some((m) => sameId(m._id, u._id))))
                .map((u) => (
                  <button
                    key={u._id}
                    type="button"
                    onClick={() => {
                      navigate(dmPath(u._id));
                      onSelectArea("chat");
                    }}
                    className={`flex items-center gap-2.5 w-full px-3 py-1.5 rounded-xl transition-all ${
                      sameId(selectedId, u._id)
                        ? "bg-indigo-500/15 text-white font-medium"
                        : "text-gray-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <div className="w-6 h-6 rounded-lg bg-violet-500/40 flex items-center justify-center text-[10px] font-bold shrink-0 relative">
                      {u.username?.[0]?.toUpperCase()}
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-[#11161b] ${
                          u.status === "active" ? "bg-emerald-500" : "bg-gray-500"
                        }`}
                      />
                    </div>
                    <span className="text-[13px] truncate">{u.username}</span>
                  </button>
                ))}
            </div>
          </div>

          <div className="border-t border-white/5 pt-4">
            <div className="px-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">
              Apps
            </div>
            <button
              type="button"
                onClick={() => {
                onSelectArea("apps");
                navigate("/dms/slackbot");
              }}
              className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all"
            >
              <img src="/slackbot-icon.jpg" alt="" className="w-5 h-5 rounded object-cover" />
              <span className="text-[13px]">Slackbot</span>
            </button>
          </div>
        </div>
      </div>

      {/* Join channel modal */}
      <Modal
        open={joinOpen}
        title="Join a channel"
        onClose={() => {
          setJoinOpen(false);
          setJoinError("");
        }}
        footer={
          <>
            <button
              type="button"
              className="px-4 py-2 rounded-md border border-white/10 bg-white/5 hover:bg-white/10"
              onClick={() => {
                setJoinOpen(false);
                setJoinError("");
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="px-4 py-2 rounded-md bg-emerald-500/90 text-black font-semibold hover:bg-emerald-500"
              onClick={handleJoinChannel}
            >
              Join
            </button>
          </>
        }
      >
        <div className="text-sm text-white/70">
          Enter a channel ID to join.
        </div>
        <input
          value={joinChannelId}
          onChange={(e) => setJoinChannelId(e.target.value)}
          placeholder="Channel ID"
          className="mt-3 w-full rounded-md border border-white/10 bg-[#101418] px-3 py-2 outline-none focus:border-emerald-500 text-sm"
        />
        {joinError && <div className="mt-2 text-xs text-red-400">{joinError}</div>}
      </Modal>

      {/* Invite user modal */}
      <Modal
        open={inviteOpen}
        title="Invite user"
        onClose={() => {
          setInviteOpen(false);
          setInviteError("");
          setInviteSuccess("");
        }}
        footer={
          <>
            <button
              type="button"
              className="px-4 py-2 rounded-md border border-white/10 bg-white/5 hover:bg-white/10"
              onClick={() => {
                setInviteOpen(false);
                setInviteError("");
                setInviteSuccess("");
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="px-4 py-2 rounded-md bg-emerald-500/90 text-black font-semibold hover:bg-emerald-500"
              onClick={handleInvite}
            >
              Invite
            </button>
          </>
        }
      >
        <div className="text-sm text-white/70">Invite user by email.</div>
        <input
          value={inviteEmail}
          onChange={(e) => setInviteEmail(e.target.value)}
          placeholder="name@example.com"
          className="mt-3 w-full rounded-md border border-white/10 bg-[#101418] px-3 py-2 outline-none focus:border-emerald-500 text-sm"
        />
        {inviteError && <div className="mt-2 text-xs text-red-400">{inviteError}</div>}
        {inviteSuccess && <div className="mt-2 text-xs text-emerald-400">{inviteSuccess}</div>}
      </Modal>

      {/* NEW: Create Channel Modal */}
      <Modal
        open={createOpen}
        title="Create a Channel"
        onClose={() => {
          setCreateOpen(false);
          setNewChannelName("");
          setCreateError("");
        }}
        footer={
          <>
            <button
              type="button"
              className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
              onClick={() => {
                setCreateOpen(false);
                setNewChannelName("");
                setCreateError("");
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isCreatingChannel}
              className="px-4 py-2 rounded-md bg-accent text-white font-semibold hover:bg-accent/90 disabled:opacity-50 transition-colors"
              onClick={handleCreateChannel}
            >
              {isCreatingChannel ? "Creating..." : "Create"}
            </button>
          </>
        }
      >
        <div className="text-sm text-white/70 mb-3">
          Channels are where your team communicates. Give yours a name that everyone can recognize.
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Channel Name</label>
          <input
            autoFocus
            value={newChannelName}
            onChange={(e) => setNewChannelName(e.target.value)}
            placeholder="e.g. project-x"
            className="w-full rounded-md border border-white/10 bg-[#101418] px-3 py-2 outline-none focus:border-accent text-sm text-white"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !isCreatingChannel) handleCreateChannel();
            }}
          />
        </div>
        {createError && <div className="mt-2 text-xs text-red-400">{createError}</div>}
      </Modal>

      <WorkspaceSettingsModal
        open={workspaceSettingsOpen}
        onClose={() => setWorkspaceSettingsOpen(false)}
        workspace={currentWorkspace}
        onManageMembers={() => setMembersModalOpen(true)}
        onEditWorkspace={() => {
          setEditWsName(currentWorkspace?.name || "");
          setEditWsError("");
          setEditWorkspaceOpen(true);
        }}
        onInviteByEmail={() => {
          setInviteOpen(true);
          setInviteError("");
          setInviteSuccess("");
        }}
        onDeleteWorkspace={handleDeleteWorkspace}
        isDeletingWorkspace={isDeletingWorkspace}
      />

      <WorkspaceMembersModal
        open={membersModalOpen}
        onClose={() => setMembersModalOpen(false)}
        workspace={currentWorkspace}
        onStartDM={(member) => navigate(dmPath(member._id))}
      />

      <WorkspaceAnalyticsModal
        open={analyticsModalOpen}
        onClose={() => setAnalyticsModalOpen(false)}
        workspace={currentWorkspace}
      />

      <Modal
        open={leaveConfirmOpen}
        title="Leave workspace?"
        onClose={() => setLeaveConfirmOpen(false)}
        footer={
          <>
            <button
              type="button"
              className="px-4 py-2 rounded-md border border-white/10 bg-white/5 hover:bg-white/10 text-sm"
              onClick={() => setLeaveConfirmOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="px-4 py-2 rounded-md bg-red-500/90 text-white font-semibold hover:bg-red-500 text-sm"
              onClick={handleLeaveWorkspace}
            >
              Leave workspace
            </button>
          </>
        }
      >
        <p className="text-sm text-white/70">
          You will leave{" "}
          <span className="font-semibold text-white">
            {currentWorkspace?.name || "this workspace"}
          </span>
          . You can rejoin later only if you have an invite.
        </p>
      </Modal>

      <Modal
        open={editWorkspaceOpen}
        title="Edit workspace"
        onClose={() => {
          setEditWorkspaceOpen(false);
          setEditWsError("");
        }}
        footer={
          <>
            <button
              type="button"
              className="px-4 py-2 rounded-md border border-white/10 bg-white/5 hover:bg-white/10 text-sm"
              onClick={() => {
                setEditWorkspaceOpen(false);
                setEditWsError("");
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isUpdatingWorkspace || !userOwnsWorkspace}
              className="px-4 py-2 rounded-md bg-accent text-white font-semibold hover:bg-accent/90 disabled:opacity-50 text-sm"
              onClick={handleEditWorkspace}
            >
              {isUpdatingWorkspace ? "Saving..." : "Save"}
            </button>
          </>
        }
      >
        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
          Workspace name
        </label>
        <input
          autoFocus
          value={editWsName}
          onChange={(e) => setEditWsName(e.target.value)}
          disabled={!userOwnsWorkspace}
          className="mt-2 w-full rounded-md border border-white/10 bg-[#101418] px-3 py-2 text-sm text-white outline-none focus:border-accent disabled:opacity-50"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !isUpdatingWorkspace) handleEditWorkspace();
          }}
        />
        {!userOwnsWorkspace && (
          <p className="mt-2 text-xs text-amber-400/90">Only the workspace owner can rename it.</p>
        )}
        {editWsError && <p className="mt-2 text-xs text-red-400">{editWsError}</p>}
      </Modal>

      <StatusUpdateModal
        open={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
      />

      <EditProfileModal
        open={editProfileOpen}
        onClose={() => setEditProfileOpen(false)}
      />
    </aside>
  );
}

export default Sidebar;
