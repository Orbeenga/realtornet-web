"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  buildApiUrl,
  clearStoredAuthTokens,
  getStoredAccessToken,
  getStoredRefreshToken,
  persistAuthTokens,
  refreshAccessToken,
  setUnauthorizedHandler,
} from "@/lib/api/client";
import type { UserProfile } from "@/types";

type RegisterRole = "buyer" | "agent" | "admin";

interface SignOutOptions {
  redirectToLogin?: boolean;
}

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
  signOut: (options?: SignOutOptions) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function getStoredToken() {
  return getStoredAccessToken();
}

async function fetchCurrentUser(token: string) {
  let res: Response;

  try {
    res = await fetch(buildApiUrl("/api/v1/auth/me/"), {
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
  const queryClient = useQueryClient();
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
          const storedRefreshToken = getStoredRefreshToken();

          if (storedRefreshToken) {
            try {
              const refreshedToken = await refreshAccessToken();
              const me = await fetchCurrentUser(refreshedToken);
              setToken(refreshedToken);
              setUser(me);
            } catch {
              clearStoredAuthTokens();
              setToken(null);
              setUser(null);
            }
          } else {
            clearStoredAuthTokens();
            setToken(null);
            setUser(null);
          }
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

    const res = await fetch(buildApiUrl("/api/v1/auth/login/"), {
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

    persistAuthTokens(payload.access_token, payload.refresh_token);
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

    const res = await fetch(buildApiUrl("/api/v1/auth/register/"), {
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

  const signOut = useCallback(async (options: SignOutOptions = {}) => {
    const { redirectToLogin = true } = options;

    clearStoredAuthTokens();
    queryClient.clear();
    setToken(null);
    setUser(null);

    if (redirectToLogin && typeof window !== "undefined") {
      window.location.assign("/login");
    }
  }, [queryClient]);

  useEffect(() => {
    setUnauthorizedHandler(() =>
      signOut({
        redirectToLogin:
          typeof window !== "undefined" &&
          window.location.pathname.startsWith("/account"),
      }),
    );

    return () => {
      setUnauthorizedHandler(null);
    };
  }, [signOut]);

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
