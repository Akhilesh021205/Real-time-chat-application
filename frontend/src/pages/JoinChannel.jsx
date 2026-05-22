import React, { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { useParams, useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext.jsx";
import { useWorkspace } from "../context/WorkspaceContext.jsx";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function JoinChannel() {
  const { code } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { refreshWorkspaces, setCurrentWorkspace } = useWorkspace();
  const [error, setError] = useState("");
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    // If user is not logged in after auth finishes loading, redirect to login
    if (!authLoading && !user) {
      // Store the channel invite code in localStorage to join after login
      localStorage.setItem("pendingChannelInviteCode", code);
      navigate("/login");
    }
  }, [user, authLoading, navigate, code]);

  const handleJoin = async () => {
    if (!code) return;
    setJoining(true);
    setError("");
    try {
      const response = await axios.post(
        `${API_BASE}/api/channels/join-by-code`,
        { inviteCode: code },
        { withCredentials: true }
      );
      
      const { channel, workspace } = response.data;
      
      await refreshWorkspaces(); // Refresh global workspaces list
      
      if (workspace) {
        setCurrentWorkspace(workspace);
      }
      
      alert(`Successfully joined channel #${channel.name}!`);
      
      navigate(`/chat/${channel._id}`);
    } catch (err) {
      console.error(err);
      if (err.response?.status === 401) {
        localStorage.setItem("pendingChannelInviteCode", code);
        navigate("/login");
        return;
      }
      setError(err.response?.data?.message || "Channel invite code is invalid or expired");
      setJoining(false);
    }
  };

  useEffect(() => {
    if (user && code) {
      handleJoin();
    }
  }, [user, code]);

  if (authLoading || joining) {
    return (
      <div className="h-screen flex items-center justify-center bg-app text-primary">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-xl font-medium">Joining channel...</p>
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
          <h1 className="text-2xl font-bold mb-4 text-red-400">Join Channel Failed</h1>
          <p className="text-secondary mb-8">{error}</p>
          <button 
            onClick={() => navigate("/home")}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-primary font-bold py-3 px-4 rounded-xl transition-colors shadow-lg"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return null;
}
