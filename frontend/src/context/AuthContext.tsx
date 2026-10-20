"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  role: "rider" | "customer" | "driver" | "admin";
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  role: "rider" | "customer";
  isLoading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<{ data?: any; error: Error | null }>;
  signUpWithEmail: (
    email: string,
    password: string,
    fullName: string,
    role?: "rider" | "customer",
    phone?: string
  ) => Promise<{ data?: any; error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  role: "customer",
  isLoading: true,
  signInWithEmail: async () => ({ error: null }),
  signUpWithEmail: async () => ({ error: null }),
  signOut: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Sync profile from Supabase profiles table
  const syncProfile = async (currentUser: User | null) => {
    if (!currentUser) {
      setProfile(null);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", currentUser.id)
        .single();

      if (data && !error) {
        setProfile(data as UserProfile);
        return;
      }
    } catch {
      // Fallback below
    }

    // Fallback to user_metadata if table row is pending trigger
    const metaRole = currentUser.user_metadata?.role;
    const fallback: UserProfile = {
      id: currentUser.id,
      email: currentUser.email || "",
      full_name: currentUser.user_metadata?.full_name || currentUser.email?.split("@")[0] || "RideX User",
      phone: currentUser.user_metadata?.phone || "",
      role: metaRole === "rider" ? "rider" : "customer",
    };
    setProfile(fallback);
  };

  useEffect(() => {
    // 1. Check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      syncProfile(currentUser).finally(() => {
        setIsLoading(false);
      });
    });

    // 2. Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      await syncProfile(currentUser);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithEmail = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (data?.user) {
      setUser(data.user);
      setSession(data.session);
      await syncProfile(data.user);
    }
    return { data, error };
  };

  const signUpWithEmail = async (
    email: string,
    password: string,
    fullName: string,
    role: "rider" | "customer" = "customer",
    phone?: string
  ) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role,
          phone: phone || "",
        },
      },
    });
    if (data?.user) {
      setUser(data.user);
      setSession(data.session);
      await syncProfile(data.user);
    }
    return { data, error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  // Derive resolved role: 'rider' or 'customer'
  const resolvedRole: "rider" | "customer" =
    profile?.role === "rider" ||
    profile?.role === "driver" ||
    user?.user_metadata?.role === "rider"
      ? "rider"
      : "customer";

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        role: resolvedRole,
        isLoading,
        signInWithEmail,
        signUpWithEmail,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

