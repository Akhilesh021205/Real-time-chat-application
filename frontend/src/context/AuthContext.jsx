import React, { createContext, useContext, useEffect, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const AuthContext = createContext(null);

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
      return raw ? JSON.parse(raw) : null;
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
        setUser(data?.user || null);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    loadCurrentUser();
  }, []);

  useEffect(() => {
    try {
      if (user) localStorage.setItem('slackClone.currentUser', JSON.stringify(user));
      else localStorage.removeItem('slackClone.currentUser');
    } catch {}
  }, [user]);

  const register = async (username, email, password) => {
    const data = await fetchJson('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    });

    if (data?.user) {
      localStorage.clear();
      setUser(data.user);
    }
    return data;
  };

  const login = async (email, password) => {
    const data = await fetchJson('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (data?.user) {
      localStorage.clear();
      setUser(data.user);
    }
    return data;
  };

  const logout = async () => {
    try {
      await fetchJson('/api/auth/logout', { method: 'POST' });
    } catch {}

    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, register, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);