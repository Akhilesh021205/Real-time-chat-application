import React, { useEffect, useState } from "react";
import axios from "axios";
import { X, Copy, Check, Users, Pencil, LogOut, Trash2 } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { useWorkspace } from "../context/WorkspaceContext.jsx";
import { isWorkspaceOwner } from "../utils/workspace.js";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function WorkspaceSettingsModal({
  open,
  onClose,
  workspace,
  onManageMembers,
  onEditWorkspace,
  onInviteByEmail,
  onDeleteWorkspace,
  isDeletingWorkspace = false,
}) {
  const { user } = useAuth();
  const { leaveWorkspace, refreshWorkspaces } = useWorkspace();
  const [inviteCode, setInviteCode] = useState("");
  const [loadingCode, setLoadingCode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const isOwner = isWorkspaceOwner(workspace, user?._id);

  useEffect(() => {
    if (!open || !workspace?._id) return;
    setLoadingCode(true);
    axios
      .get(`${API_BASE}/api/workspaces/${workspace._id}/invite-code`, {
        withCredentials: true,
      })
      .then((res) => setInviteCode(res.data.inviteCode || ""))
      .catch(console.error)
      .finally(() => setLoadingCode(false));
  }, [open, workspace?._id]);

  const copyCode = async () => {
    if (!inviteCode) return;
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert(`Invite code: ${inviteCode}`);
    }
  };

  const handleLeave = async () => {
    if (!workspace?._id || isOwner) return;
    if (!window.confirm(`Leave "${workspace.name}"?`)) return;
    setLeaving(true);
    try {
      await leaveWorkspace(workspace._id);
      onClose();
      await refreshWorkspaces?.();
    } catch (err) {
      alert(err?.response?.data?.message || "Could not leave workspace");
    } finally {
      setLeaving(false);
    }
  };

  if (!open || !workspace) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-[#101418] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
              Workspace settings
            </p>
            <h2 className="text-lg font-bold text-white truncate">{workspace.name}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
              Invite code
            </label>
            <p className="text-xs text-gray-500 mt-1 mb-2">
              Share this code so others can join your workspace.
            </p>
            <div className="flex gap-2">
              <div className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 font-mono text-lg tracking-widest text-white">
                {loadingCode ? "…" : inviteCode || "—"}
              </div>
              <button
                type="button"
                onClick={copyCode}
                disabled={!inviteCode}
                className="px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-2 disabled:opacity-40"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
          </div>

          <div className="grid gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onInviteByEmail?.();
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/10 text-sm font-medium"
            >
              Invite people by email
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onManageMembers?.();
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-white/5 text-sm text-gray-200 text-left"
            >
              <Users size={16} className="text-gray-400" />
              Manage members
            </button>
            {isOwner && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEditWorkspace?.();
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-white/5 text-sm text-gray-200 text-left"
              >
                <Pencil size={16} className="text-gray-400" />
                Edit workspace name
              </button>
            )}
          </div>

          <div className="border-t border-white/10 pt-4">
            {isOwner ? (
              <button
                type="button"
                disabled={isDeletingWorkspace}
                onClick={() => {
                  onClose();
                  onDeleteWorkspace?.();
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-red-500/10 text-sm text-red-400 text-left disabled:opacity-50"
              >
                <Trash2 size={16} />
                {isDeletingWorkspace ? "Deleting workspace…" : "Delete workspace"}
              </button>
            ) : (
              <button
                type="button"
                disabled={leaving}
                onClick={handleLeave}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-red-500/10 text-sm text-red-400 text-left disabled:opacity-50"
              >
                <LogOut size={16} />
                {leaving ? "Leaving…" : "Leave workspace"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
