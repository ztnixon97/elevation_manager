// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface User {
  id: number;
  username: string;
  role: string;
  profile?: {
    first_name?: string;
    last_name?: string;
    email?: string;
  };
  teams?: Array<{
    id: number;
    name: string;
    role: string;
  }>;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const isAuthenticated = !!token && !!user;

  // Initialize auth state on app start
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedToken = localStorage.getItem('auth_token');
        if (storedToken) {
          setToken(storedToken);
          await refreshUser();
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error);
        localStorage.removeItem('auth_token');
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (username: string, password: string): Promise<void> => {
    try {
      setLoading(true);
      const response = await invoke<[string, string]>('login', { username, password });
      const [newToken, role] = response;
      
      setToken(newToken);
      localStorage.setItem('auth_token', newToken);
      
      // Fetch user data after successful login
      await refreshUser();
    } catch (error) {
      console.error('Login failed:', error);
      throw new Error(typeof error === 'string' ? error : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const register = async (username: string, password: string): Promise<void> => {
    try {
      setLoading(true);
      await invoke<string>('register', { username, password });
      // The register function automatically logs in on success
      await refreshUser();
    } catch (error) {
      console.error('Registration failed:', error);
      throw new Error(typeof error === 'string' ? error : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const logout = (): void => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('auth_token');
  };

  const refreshUser = async (): Promise<void> => {
    try {
      // Fetch current user data
      const userResponse = await invoke<string>('get_me');
      const userData = JSON.parse(userResponse);
      
      // Fetch user profile
      const profileResponse = await invoke<string>('get_me_profile');
      const profileData = JSON.parse(profileResponse);
      
      // Fetch user teams
      const teamsResponse = await invoke<string>('get_user_teams');
      const teamsData = JSON.parse(teamsResponse);
      
      const combinedUser: User = {
        ...userData,
        profile: profileData,
        teams: teamsData
      };
      
      setUser(combinedUser);
    } catch (error) {
      console.error('Failed to refresh user data:', error);
      // If we can't fetch user data, the token might be invalid
      logout();
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated,
    loading,
    login,
    register,
    logout,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};