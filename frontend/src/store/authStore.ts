import { create } from "zustand";
import { persist } from "zustand/middleware";

interface User  { id: string; email: string; role: "owner" | "manager" | "cashier"; }
interface Store { id: string; name: string; currency: string; timezone: string; tax_rate: string; }

interface AuthState {
  accessToken:  string | null;
  refreshToken: string | null;
  user:         User  | null;
  store:        Store | null;
  setAuth: (access: string, refresh: string, user: User, store: Store) => void;
  setAccessToken: (token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken:  null,
      refreshToken: null,
      user:  null,
      store: null,
      setAuth: (accessToken, refreshToken, user, store) =>
        set({ accessToken, refreshToken, user, store }),
      setAccessToken: (accessToken) => set({ accessToken }),
      logout: () => set({ accessToken: null, refreshToken: null, user: null, store: null }),
    }),
    { name: "retailpos-auth" }
  )
);
