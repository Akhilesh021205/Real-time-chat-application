import React, { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { useParams, useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext.jsx";
import { useWorkspace } from "../context/WorkspaceContext.jsx";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function JoinWorkspace() {
  const { inviteCode } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { refreshWorkspaces, setCurrentWorkspace } = useWorkspace();
  const [error, setError] = useState("");
  const [joining, setJoining] = useState(false);
  const [success, setSuccess] = useState("");

  useEffect(() => {
    // If user is not logged in after auth finishes loading, redirect to login
    if (!authLoading && !user) {
      // Store the invite code in localStorage to join after login
      localStorage.setItem("pendingInviteCode", inviteCode);
      navigate("/login");
    }
  }, [user, authLoading, navigate, inviteCode]);

  const handleJoin = async () => {
    if (!inviteCode) return;
    setJoining(true);
    setError("");
    setSuccess("");
    try {
      const response = await axios.post(
        `${API_BASE}/api/workspaces/join/${encodeURIComponent(inviteCode)}`,
        {},
        { withCredentials: true }
      );
      
      const newWorkspace = response.data.workspace;
      
      await refreshWorkspaces(); // Refresh global workspaces list
      
      if (newWorkspace) {
        setCurrentWorkspace(newWorkspace);
      }
      
      localStorage.removeItem("pendingInviteCode");
      setSuccess(response.data?.message || "Successfully joined workspace");
      setTimeout(() => navigate("/home"), 900);
    } catch (err) {
      console.error(err);
      if (err.response?.status === 401) {
        localStorage.setItem("pendingInviteCode", inviteCode);
        navigate("/login");
        return;
      }
      setError(err.response?.data?.message || "Invite link is invalid or expired");
    } finally {
      setJoining(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user && inviteCode) {
      handleJoin();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, inviteCode, authLoading]);

  if (authLoading || joining) {
    return (
      <div className="h-screen flex items-center justify-center bg-app text-primary">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-[#36C5F0] border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-xl font-medium">Joining workspace...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-app text-primary p-6">
        <div className="max-w-md w-full bg-surface-elevated p-8 rounded-2xl border border-red-500/30 shadow-2xl text-center">
          <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full mx-auto mb-6 flex items-center justify-center">
            <AlertTriangle size={32} strokeWidth={2} />
          </div>
          <h1 className="text-2xl font-bold mb-4 text-red-400">Join Failed</h1>
          <p className="text-secondary mb-8">{error}</p>
          <button 
            onClick={() => navigate("/home")}
            className="w-full bg-[#36C5F0] hover:bg-[#2faad1] text-primary font-bold py-3 px-4 rounded-xl transition-colors shadow-lg"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="h-screen flex items-center justify-center bg-app text-primary p-6">
        <div className="max-w-md w-full bg-surface-elevated p-8 rounded-2xl border border-emerald-500/30 shadow-2xl text-center">
          <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full mx-auto mb-6 flex items-center justify-center">
            <CheckCircle2 size={32} strokeWidth={2} />
          </div>
          <h1 className="text-2xl font-bold mb-4 text-emerald-300">Workspace Joined</h1>
          <p className="text-secondary mb-8">{success}</p>
          <button
            onClick={() => navigate("/home")}
            className="w-full bg-[#36C5F0] hover:bg-[#2faad1] text-primary font-bold py-3 px-4 rounded-xl transition-colors shadow-lg"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  return null;
}
