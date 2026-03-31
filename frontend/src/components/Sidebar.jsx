import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext.jsx";
import Modal from "./Modal.jsx";

function Sidebar({ users, channels, selectedId, activeArea, onSelectArea, refreshChannels }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
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

  const [currentWorkspace, setCurrentWorkspace] = useState(null);

  const userInitial = useMemo(() => {
    const ch = user?.username?.charAt?.(0) || "U";
    return String(ch).toUpperCase();
  }, [user?.username]);

  useEffect(() => {
    const fetchWorkspace = async () => {
      try {
        const res = await axios.get("http://localhost:4000/api/workspaces/user", { withCredentials: true });
        if (res.data && res.data.length > 0) {
          setCurrentWorkspace(res.data[0]);
        }
      } catch (err) {
        console.error("Error fetching workspace", err);
      }
    };
    fetchWorkspace();
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
    try {
      await axios.post(
        "http://localhost:4000/api/workspaces/invite",
        { email },
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
    { label: "Home", icon: "🏠", key: "home" },
    { label: "DMs", icon: "💬", key: "chat" },
    { label: "Activity", icon: "🔔", key: "activity" },
    { label: "Files", icon: "📁", key: "files" },
    { label: "More", icon: "⋯", key: "more" },
    { label: "Settings", icon: "⚙️", key: "settings" },
  ];

  const huddles = [{ label: "Start a huddle", icon: "🎙️" }];
  const directories = [{ label: "All workspaces", icon: "📁" }];
  const starred = [{ label: "Starred", icon: "⭐" }];
  const apps = [{ label: "Slackbot", icon: "🤖" }];
  const channelList = channels || [];

  return (
    <aside className="flex">

      {/* ICON BAR */}
      <div className="w-[72px] bg-sidebar backdrop-blur-xl border-r border-white/5 bg-black/20 flex flex-col items-center py-4 justify-between shadow-2xl relative z-10">

        <div className="flex flex-col items-center gap-4">
          <div className="w-11 h-11 bg-accent/80 backdrop-blur-md shadow-lg shadow-accent/20 rounded-xl flex items-center justify-center font-bold text-lg border border-white/10">
            {userInitial}
          </div>

          {menu.map((item) => (
            <button
              key={item.key}
              onClick={() => {
                onSelectArea?.(item.key);
                if (item.key === "home") navigate("/home");
                if (item.key === "chat") navigate("/dms");
                if (item.key === "activity") navigate("/activity");
                if (item.key === "files") navigate("/files");
                if (item.key === "more") navigate("/tools");
                if (item.key === "settings") navigate("/settings");
              }}
              className={`text-xs flex flex-col items-center p-2.5 rounded-xl transition-all duration-200 ${
                activeArea === item.key
                  ? "bg-white/15 shadow-inner border border-white/10"
                  : "hover:bg-white/5 hover:scale-105"
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>

        {/* Profile menu (bottom-left) */}
        <div className="relative" ref={profileRef}>
          <button
            type="button"
            onClick={() => setProfileOpen((v) => !v)}
            className="w-11 h-11 rounded-xl bg-teal-500/80 backdrop-blur-md shadow-lg shadow-teal-500/20 border border-white/10 flex items-center justify-center font-extrabold hover:scale-105 transition-transform"
            title={user?.username || "Profile"}
          >
            {userInitial}
          </button>

          {profileOpen && (
            <div className="absolute bottom-14 left-2 w-64 bg-panel backdrop-blur-md border border-white/5 rounded-xl shadow-xl text-white shadow-2xl overflow-hidden animate-slide-up origin-bottom-left">
              <div className="p-4 border-b border-white/5 bg-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-teal-500/80 shadow-md flex items-center justify-center font-extrabold border border-white/10">
                    {userInitial}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{user?.username || "User"}</div>
                    <div className="text-xs text-emerald-400 flex items-center gap-2">
                      <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
                      Active
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className="mt-3 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90 hover:bg-white/10 text-left"
                >
                  Update your status
                </button>
              </div>

              <div className="px-4 py-2 text-sm space-y-2">
                <button type="button" className="block w-full text-left text-white/80 hover:text-white">
                  Set yourself as away
                </button>
                <div className="flex items-center justify-between text-white/80">
                  <span>Pause notifications</span>
                  <span className="text-white/50">On</span>
                </div>
              </div>

              <div className="border-t border-white/10 px-4 py-3 text-sm space-y-2">
                <button type="button" className="block w-full text-left text-white/80 hover:text-white">
                  Profile
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

      {/* SIDEBAR CONTENT */}
      <div className="w-[260px] bg-sidebar backdrop-blur-xl border-r border-white/5 bg-black/10 flex flex-col text-sm relative z-0">
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between gap-2 bg-white/5 backdrop-blur-md">
          <div className="min-w-0 flex-1 mr-2">
            <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mb-0.5">Workspace</div>
            <button
              type="button"
              className="font-semibold hover:underline truncate text-left w-full"
              onClick={() => setWorkspaceMenuOpen((v) => !v)}
            >
              {currentWorkspace ? currentWorkspace.name : (user?.username || "My Workspace")}
            </button>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                setJoinOpen(true);
                setJoinError("");
              }}
              title="Join channel"
              className="text-xs text-gray-400 hover:text-white"
            >
              + Join
            </button>
            <button
              onClick={() => {
                setInviteOpen(true);
                setInviteError("");
                setInviteSuccess("");
              }}
              title="Invite to workspace"
              className="text-xs text-gray-400 hover:text-white"
            >
              Invite
            </button>
            <div className="relative" ref={workspaceMenuRef}>
              <button
                type="button"
                className="text-gray-400 hover:text-white"
                title="Workspace settings"
                onClick={() => setWorkspaceMenuOpen((v) => !v)}
              >
                ⚙️
              </button>

              {workspaceMenuOpen && (
                <div className="absolute right-0 top-8 w-72 bg-panel backdrop-blur-md border border-white/5 rounded-xl shadow-xl text-white shadow-2xl overflow-hidden z-50 animate-slide-up origin-top-right">
                  <div className="px-4 py-3 border-b border-white/5 bg-white/5">
                    <div className="text-xs text-white/50">Admin Tools</div>
                    <div className="mt-1 flex items-center justify-between">
                      <div className="font-semibold truncate">{user?.username || "Workspace"}</div>
                      <button
                        type="button"
                        className="text-sm text-cyan-200 hover:underline"
                        onClick={() => {
                          setWorkspaceMenuOpen(false);
                          navigate("/settings");
                        }}
                      >
                        Manage billing
                      </button>
                    </div>
                  </div>

                  <div className="p-2">
                    <button
                      type="button"
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 text-sm"
                      onClick={() => {
                        setWorkspaceMenuOpen(false);
                        navigate("/settings");
                      }}
                    >
                      Workspace settings
                    </button>
                    <button type="button" className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 text-sm">
                      Edit workspace
                    </button>
                    <button type="button" className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 text-sm">
                      Manage members
                    </button>
                    <button type="button" className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 text-sm">
                      Apps & workflows
                    </button>
                    <button type="button" className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 text-sm">
                      Workspace analytics
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
          {/* Huddles */}
          <div>
            <div className="px-3 text-xs text-gray-400 uppercase tracking-wide">
              Huddles
            </div>
            <div className="mt-2 space-y-1">
              {huddles.map((item) => (
                <button
                  key={item.label}
                  onClick={() => {
                    onSelectArea("huddles");
                    navigate("/huddles");
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded hover:bg-[#4a154b] transition-colors"
                >
                  <span className="text-lg">{item.icon}</span>
                  <span className="text-xs">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Directories */}
          <div>
            <div className="px-3 text-[10px] font-medium text-gray-400/80 uppercase tracking-widest mb-1 mt-2">
              Directories
            </div>
            <div className="space-y-0.5">
              {directories.map((item) => (
                <button
                  key={item.label}
                  onClick={() => {
                    onSelectArea("directories");
                    navigate("/directories");
                  }}
                  className="flex items-center gap-2.5 w-full px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors group text-gray-300 hover:text-white"
                >
                  <span className="text-[15px] opacity-70 group-hover:opacity-100 transition-opacity">{item.icon}</span>
                  <span className="text-xs">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Starred */}
          <div>
            <div className="px-3 text-xs text-gray-400 uppercase tracking-wide">
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
                    className={`flex items-center gap-2.5 w-full px-3 py-1.5 rounded hover:bg-white/5 transition-colors group text-gray-300 hover:text-white truncate ${selectedId === item.id ? "bg-accent/40 text-white font-medium" : ""}`}
                  >
                    <span className="text-yellow-500/80 group-hover:text-yellow-400">★</span>
                    <span className="text-[13px]">{item.type === 'channel' ? `# ${item.name}` : item.name}</span>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Channels */}
          <div>
            <div className="px-3 flex items-center justify-between text-xs text-gray-400 uppercase tracking-wide group/header">
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
                  const isActive = selectedId === channel._id;
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
                      <span className="text-gray-500 group-hover:text-gray-400">#</span>
                      <span className="text-[13px]">{channel.name}</span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Direct Messages */}
          <div>
            <div className="px-3 text-xs text-gray-400 uppercase tracking-wide">
              Direct Messages
            </div>
            <div className="mt-2 space-y-1">
              {users
                .filter((u) => u._id !== user?._id && u.email !== user?.email)
                .map((u) => {
                  const isActive = selectedId === u._id;
                  return (
                    <button
                      key={u._id}
                      onClick={() => {
                        navigate(`/chat/${u._id}`);
                        onSelectArea("chat");
                      }}
                      className={`flex items-center gap-3 w-full px-3 py-1.5 rounded-lg transition-colors ${
                        isActive ? "bg-accent/40 text-white font-medium shadow-sm border border-accent/20" : "text-gray-300 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <div className="w-5 h-5 bg-accent/60 backdrop-blur-sm rounded-md flex items-center justify-center text-[10px] font-bold shadow-sm">
                        {u.username[0].toUpperCase()}
                      </div>
                      <span className="text-[13px] truncate">{u.username}</span>
                    </button>
                  );
                })}
            </div>
          </div>

          {/* Apps */}
          <div>
            <div className="px-3 text-xs text-gray-400 uppercase tracking-wide">
              Apps
            </div>
            <div className="mt-2 space-y-1">
              {apps.map((item) => (
                <button
                  key={item.label}
                  onClick={() => {
                    onSelectArea("apps");
                    navigate("/apps");
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded hover:bg-[#4a154b] transition-colors"
                >
                  <span className="text-lg">{item.icon}</span>
                  <span className="text-xs">{item.label}</span>
                </button>
              ))}
            </div>
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
          className="mt-3 w-full rounded-md border border-white/10 bg-[#111827] px-3 py-2 outline-none focus:border-emerald-500 text-sm"
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
          className="mt-3 w-full rounded-md border border-white/10 bg-[#111827] px-3 py-2 outline-none focus:border-emerald-500 text-sm"
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
            className="w-full rounded-md border border-white/10 bg-[#111827] px-3 py-2 outline-none focus:border-accent text-sm text-white"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !isCreatingChannel) handleCreateChannel();
            }}
          />
        </div>
        {createError && <div className="mt-2 text-xs text-red-400">{createError}</div>}
      </Modal>
    </aside>
  );
}

export default Sidebar;