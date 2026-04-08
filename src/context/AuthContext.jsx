import { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);

const STORAGE_KEY = "sms_auth";

const normalizeUser = (input, fallback = null) => {
  if (!input) return null;
  const base = fallback || {};
  const role = input.role || base.role;
  if (!role) return null;
  return {
    id: input.id ?? base.id ?? null,
    role,
    email: input.email || base.email || "",
    name: input.name || base.name || "",
    department: input.department || base.department || "",
    photo: input.photo || base.photo || "",
    experience: input.experience ?? base.experience ?? 0,
    token: input.token || base.token || "",
  };
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return null;
      return normalizeUser(JSON.parse(stored));
    } catch {
      return null;
    }
  });

  const login = (...args) => {
    const nextUser =
      args.length === 1 && typeof args[0] === "object"
        ? normalizeUser(args[0])
        : normalizeUser({
            role: args[0],
            email: args[1],
            name: args[2],
            department: args[3],
            photo: args[4],
            experience: args[5],
            token: args[6],
          });

    setUser(nextUser);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
  };

  const updateProfile = (updates) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = normalizeUser({ ...prev, ...updates }, prev);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
