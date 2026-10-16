import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  role: UserRole | null;
  isLoading: boolean;
  login: (identifier: string, pass: string) => Promise<void>;
  register: (payload: any) => Promise<void>;
  logout: () => void;
  quickLogin: (role: 'passenger' | 'driver' | 'admin') => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'monrovia_ride_token';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const setAuthSession = (newToken: string, newUser: User) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);
    setUser(newUser);
  };

  const clearAuthSession = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      if (!token) {
        setIsLoading(false);
        return;
      }
      const res = await api.getMe();
      if (res.success && res.user) {
        setUser(res.user);
      } else {
        clearAuthSession();
      }
    } catch (err) {
      console.warn('Session expired or invalid, clearing auth');
      clearAuthSession();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, [token]);

  const login = async (identifier: string, pass: string) => {
    setIsLoading(true);
    try {
      const res = await api.login(identifier, pass);
      if (res.success && res.token && res.user) {
        setAuthSession(res.token, res.user);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (payload: any) => {
    setIsLoading(true);
    try {
      const res = await api.register(payload);
      if (res.success && res.token && res.user) {
        setAuthSession(res.token, res.user);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    clearAuthSession();
  };

  // Quick switcher for demo and testing evaluation
  const quickLogin = async (targetRole: 'passenger' | 'driver' | 'admin') => {
    const creds = {
      passenger: { id: 'passenger@monrovia.lr', pass: 'Password123!' },
      driver: { id: 'driver@monrovia.lr', pass: 'Password123!' },
      admin: { id: 'admin@monroviaride.lr', pass: 'Password123!' },
    }[targetRole];

    await login(creds.id, creds.pass);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role: user?.role || null,
        isLoading,
        login,
        register,
        logout,
        quickLogin,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
