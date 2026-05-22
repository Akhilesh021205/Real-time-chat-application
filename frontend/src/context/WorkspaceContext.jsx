import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

const WorkspaceContext = createContext(null);
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

export const WorkspaceProvider = ({ children }) => {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState([]);
  const [currentWorkspace, setCurrentWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchWorkspaces = async () => {
    if (!user) {
      console.log("[WorkspaceContext] fetchWorkspaces ignored: no user loaded");
      return;
    }
    console.log(`[WorkspaceContext] fetchWorkspaces started for user: ${user.username} (${user._id})`);
    try {
      const res = await axios.get(`${API_BASE}/api/workspaces/user`, { withCredentials: true });
      console.log("[WorkspaceContext] API response workspaces count:", res.data.length);
      res.data.forEach((ws, idx) => {
        console.log(`  [${idx}] WS ID: ${ws._id}, Name: ${ws.name}, Owner ID: ${ws.owner?._id || ws.owner}`);
      });

      setWorkspaces(res.data);
      
      // Determine user's owned workspace
      const ownedWs = res.data.find(ws => {
        const wsOwnerId = ws.owner?._id?.toString() || ws.owner?.toString();
        return wsOwnerId === user._id.toString();
      });
      console.log("[WorkspaceContext] User's owned workspace identified as:", ownedWs ? `${ownedWs.name} (${ownedWs._id})` : "None");

      // Load last selected workspace from localStorage if available
      const storageKey = `slackClone.lastWorkspaceId_${user._id}`;
      const lastWsId = localStorage.getItem(storageKey);
      console.log(`[WorkspaceContext] LocalStorage key [${storageKey}] retrieved:`, lastWsId);

      let workspaceToSelect = null;

      if (lastWsId) {
        const savedWs = res.data.find(ws => ws._id === lastWsId);
        if (savedWs) {
          const savedWsOwnerId = savedWs.owner?._id?.toString() || savedWs.owner?.toString();
          const isOwnedSaved = savedWsOwnerId === user._id.toString();
          console.log(`[WorkspaceContext] Found saved workspace: ${savedWs.name}. Owned by current user? ${isOwnedSaved}`);
          
          if (isOwnedSaved) {
            console.log(`[WorkspaceContext] Rule 1 matched: Restoring user's own saved workspace -> ${savedWs.name}`);
            workspaceToSelect = savedWs;
          }
        }
      }

      if (!workspaceToSelect && ownedWs) {
        console.log(`[WorkspaceContext] Rule 2 matched: Selecting user's owned workspace -> ${ownedWs.name}`);
        workspaceToSelect = ownedWs;
      }

      if (!workspaceToSelect && res.data.length > 0) {
        console.log(`[WorkspaceContext] Rule 3 matched: Fallback to first accessible workspace -> ${res.data[0].name}`);
        workspaceToSelect = res.data[0];
      }

      console.log("[WorkspaceContext] Selected workspace set to:", workspaceToSelect ? `${workspaceToSelect.name} (${workspaceToSelect._id})` : "null");
      setCurrentWorkspace(workspaceToSelect);
    } catch (err) {
      console.error("[WorkspaceContext] Error fetching workspaces:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchWorkspaces();
    } else {
      setWorkspaces([]);
      setCurrentWorkspace(null);
      setLoading(false);
    }
  }, [user]);

  const selectWorkspace = (ws) => {
    setCurrentWorkspace(ws);
    if (ws && user) {
      localStorage.setItem(`slackClone.lastWorkspaceId_${user._id}`, ws._id);
    }
  };

  const createWorkspace = async (name) => {
    try {
      const res = await axios.post(`${API_BASE}/api/workspaces/create`, { name }, { withCredentials: true });
      await fetchWorkspaces();
      return res.data;
    } catch (err) {
      throw err;
    }
  };

  const connectWorkspaces = async (workspaceId, targetWorkspaceId) => {
    try {
      await axios.post(`${API_BASE}/api/workspaces/connect-workspaces`, { workspaceId, targetWorkspaceId }, { withCredentials: true });
      await fetchWorkspaces();
    } catch (err) {
      throw err;
    }
  };

  const deleteWorkspace = async (workspaceId) => {
    try {
      await axios.delete(`${API_BASE}/api/workspaces/${workspaceId}`, { withCredentials: true });
      // Clear current workspace if we just deleted it
      if (currentWorkspace?._id === workspaceId) {
        setCurrentWorkspace(null);
        if (user) {
          localStorage.removeItem(`slackClone.lastWorkspaceId_${user._id}`);
        }
      }
      await fetchWorkspaces();
    } catch (err) {
      throw err;
    }
  };

  const leaveWorkspace = async (workspaceId) => {
    try {
      await axios.post(`${API_BASE}/api/workspaces/${workspaceId}/leave`, {}, { withCredentials: true });
      // Clear current workspace if we just left it
      if (currentWorkspace?._id === workspaceId) {
        setCurrentWorkspace(null);
        if (user) {
          localStorage.removeItem(`slackClone.lastWorkspaceId_${user._id}`);
        }
      }
      await fetchWorkspaces();
    } catch (err) {
      throw err;
    }
  };

  return (
    <WorkspaceContext.Provider value={{ 
      workspaces, 
      currentWorkspace, 
      setCurrentWorkspace: selectWorkspace, 
      loading, 
      refreshWorkspaces: fetchWorkspaces,
      createWorkspace,
      connectWorkspaces,
      deleteWorkspace,
      leaveWorkspace
    }}>
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => useContext(WorkspaceContext);
