"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { buildApiUrl, setUnauthorizedHandler } from "@/lib/api/client";
import type { UserProfile } from "@/types";

const TOKEN_STORAGE_KEY = "rn_token";

type RegisterRole = "buyer" | "agent" | "admin";

class AuthBootstrapError extends Error {
  constructor(public status?: number) {
    super("Unable to load current user");
    this.name = "AuthBootstrapError";
  }
}

interface AuthContextValue {
  user: UserProfile | null;
  token: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: RegisterRole;
  }) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function getStoredToken() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

function persistToken(token: string) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
  }
}

function clearStoredToken() {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

async function fetchCurrentUser(token: string) {
  let res: Response;

  try {
    res = await fetch(buildApiUrl("/api/v1/auth/me"), {
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
    });
  } catch {
    throw new AuthBootstrapError();
  }

  if (!res.ok) {
    throw new AuthBootstrapError(res.status);
  }

  return (await res.json()) as UserProfile;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const bootstrap = async () => {
      const storedToken = getStoredToken();

      if (!storedToken) {
        setLoading(false);
        return;
      }

      try {
        const me = await fetchCurrentUser(storedToken);
        setToken(storedToken);
        setUser(me);
      } catch (error) {
        if (error instanceof AuthBootstrapError && error.status === 401) {
          clearStoredToken();
          setToken(null);
          setUser(null);
        } else {
          setToken(storedToken);
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    };

    void bootstrap();
  }, []);

  const signIn = async (email: string, password: string) => {
    const body = new URLSearchParams({
      username: email,
      password,
      scope: "",
    });

    const res = await fetch(buildApiUrl("/api/v1/auth/login"), {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    const payload = await res.json().catch(() => null);

    if (!res.ok || !payload?.access_token) {
      throw new Error(
        payload?.detail ?? payload?.message ?? "Login failed. Please try again.",
      );
    }

    persistToken(payload.access_token);
    setToken(payload.access_token);

    const me = await fetchCurrentUser(payload.access_token);
    setUser(me);
  };

  const signUp = async ({
    email,
    password,
    firstName,
    lastName,
    role,
  }: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: RegisterRole;
  }) => {
    const backendRole = role === "buyer" ? "seeker" : role;

    const res = await fetch(buildApiUrl("/api/v1/auth/register"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
        first_name: firstName,
        last_name: lastName,
        user_role: backendRole,
      }),
    });

    const payload = await res.json().catch(() => null);

    if (!res.ok) {
      throw new Error(
        payload?.detail ??
          payload?.message ??
          "Registration failed. Please try again.",
      );
    }

    await signIn(email, password);
  };

  const signOut = async () => {
    clearStoredToken();
    setToken(null);
    setUser(null);

    if (typeof window !== "undefined") {
      window.location.assign("/login");
    }
  };

  useEffect(() => {
    setUnauthorizedHandler(() => signOut());

    return () => {
      setUnauthorizedHandler(null);
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return ctx;
}
