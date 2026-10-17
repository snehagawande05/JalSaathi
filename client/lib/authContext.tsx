"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "./supabase";
import { apiFetch } from "./api";
import type { UserProfile } from "./types";

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<UserProfile | null>;
  logout: () => Promise<void>;
  quickLogin: (account: "admin" | "citizen1" | "citizen2" | "citizen3") => Promise<void>;
  refreshProfile: () => Promise<UserProfile | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const DEMO_ACCOUNTS = {
  admin: { email: "admin@jalsaathi.demo", password: "Demo@12345", name: "Demo Admin", role: "admin" as const },
  citizen1: { email: "citizen1@jalsaathi.demo", password: "Demo@12345", name: "Asha Patil", role: "citizen" as const },
  citizen2: { email: "citizen2@jalsaathi.demo", password: "Demo@12345", name: "Rohan Deshmukh", role: "citizen" as const },
  citizen3: { email: "citizen3@jalsaathi.demo", password: "Demo@12345", name: "Meera Joshi", role: "citizen" as const },
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchProfile = useCallback(async (): Promise<UserProfile | null> => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session?.user) {
        setUser(null);
        setLoading(false);
        return null;
      }

      // Fetch user profile from Express server
      const profile = await apiFetch<UserProfile>("/api/me");
      const fullProfile: UserProfile = {
        ...profile,
        email: sessionData.session.user.email,
      };
      setUser(fullProfile);
      return fullProfile;
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        await fetchProfile();
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const login = async (email: string, password: string): Promise<UserProfile | null> => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      throw new Error(error.message);
    }
    const profile = await fetchProfile();
    return profile;
  };

  const logout = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    setLoading(false);
  };

  const quickLogin = async (account: keyof typeof DEMO_ACCOUNTS) => {
    const creds = DEMO_ACCOUNTS[account];
    await login(creds.email, creds.password);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        quickLogin,
        refreshProfile: fetchProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
