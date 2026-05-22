import React, { createContext, useContext, useEffect, useState } from 'react';
import { socket } from '../socket/socket.js';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const AuthContext = createContext(null);

const isValidUser = (value) => Boolean(value?._id && value?.email && value?.username);

const fetchJson = async (path, options = {}) => {
  const res = await fetch(`${API_URL}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message = data?.message || 'Request failed';
    throw new Error(message);
  }

  return data;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem('slackClone.currentUser');
      const cachedUser = raw ? JSON.parse(raw) : null;
      return isValidUser(cachedUser) ? cachedUser : null;
    } catch {
      return null;
    }
  });

  // ✅ FIXED: moved inside component
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const data = await fetchJson('/api/auth/me');
        setUser(isValidUser(data?.user) ? data.user : null);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    loadCurrentUser();
  }, []);

  useEffect(() => {
    if (!isValidUser(user) || loading) return;
    const pendingInvite = localStorage.getItem("pendingInviteCode");
    if (pendingInvite && !window.location.pathname.startsWith("/join/")) {
      localStorage.removeItem("pendingInviteCode");
      window.location.href = `/join/${pendingInvite}`;
    }
  }, [user, loading]);

  useEffect(() => {
    try {
      if (isValidUser(user)) localStorage.setItem('slackClone.currentUser', JSON.stringify(user));
      else localStorage.removeItem('slackClone.currentUser');
    } catch {}
  }, [user]);

  useEffect(() => {
    if (!user?._id) return;

    if (!socket.connected) socket.connect();
    socket.emit('goOnline', { userId: user._id });

    const onStatusChanged = ({ userId, status }) => {
      if (userId?.toString() !== user._id?.toString()) return;
      setUser((prev) => (prev ? { ...prev, status } : prev));
    };

    socket.on('userStatusChanged', onStatusChanged);
    return () => socket.off('userStatusChanged', onStatusChanged);
  }, [user?._id]);

  const register = async (username, email, password) => {
    const data = await fetchJson('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    });

    return data;
  };

  const login = async (email, password) => {
    const data = await fetchJson('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (isValidUser(data?.user)) {
      const preserveKeys = [
        "pendingInviteCode",
        "pendingChannelInviteCode",
        "slackClone.sidebarCollapsed",
        "slackClone.theme",
        "slackClone.lastWorkspaceId_" + data.user._id,
      ];
      const preserved = {};
      preserveKeys.forEach((key) => {
        const val = localStorage.getItem(key);
        if (val != null) preserved[key] = val;
      });
      localStorage.removeItem("slackClone.currentUser");
      Object.entries(preserved).forEach(([key, val]) => localStorage.setItem(key, val));
      setUser(data.user);
    }
    return data;
  };

  const resetPassword = async (email, newPassword) => {
    return await fetchJson('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, newPassword }),
    });
  };


  const updateStatus = async (text, emoji) => {
    const data = await fetchJson('/api/custom/status', {
      method: 'POST',
      body: JSON.stringify({ text, emoji }),
    });
    if (data) setUser(data);
    return data;
  };

  const updatePresence = async (status) => {
    const data = await fetchJson('/api/custom/presence', {
      method: 'POST',
      body: JSON.stringify({ status }),
    });
    if (data) setUser(data);
    return data;
  };

  const starChannel = async (channelId) => {
    const data = await fetchJson(`/api/custom/star-channel/${channelId}`, {
      method: 'POST',
    });
    if (data) {
      setUser(prev => ({ ...prev, starredChannels: data.starredChannels }));
    }
    return data;
  };

  const updateSidebarSections = async (sections) => {
    const data = await fetchJson('/api/custom/sidebar/sections', {
      method: 'POST',
      body: JSON.stringify({ sections }),
    });
    if (data) setUser(data);
    return data;
  };

  const logout = async () => {
    try {
      await fetchJson('/api/auth/logout', { method: 'POST' });
    } catch {}

    setUser(null);
  };

  const setUserProfile = (nextUser) => {
    setUser(isValidUser(nextUser) ? nextUser : null);
  };

  return (
    <AuthContext.Provider value={{ 
      user, setUser: setUserProfile, loading, register, login, logout, 
      resetPassword, 
      updateStatus, updatePresence, starChannel, updateSidebarSections 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
