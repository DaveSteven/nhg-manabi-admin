import type { MenuItem, SessionUser } from "@/api/schemas";
import { createPersistentStore } from "./createPersistentStore";

interface AuthState {
  token: string | null;
  user: SessionUser | null;
  menus: MenuItem[];
  isAuthenticated: boolean;
  setToken: (token: string) => void;
  setUser: (user: SessionUser) => void;
  setMenus: (menus: MenuItem[]) => void;
  hasPermission: (point: string) => boolean;
  logout: () => void;
}

type PersistedAuthState = Pick<AuthState, "token" | "isAuthenticated">;

export const useAuthStore = createPersistentStore<AuthState>(
  (set, get) => ({
    token: null,
    user: null,
    menus: [],
    isAuthenticated: false,

    setToken: (token) => set({ token, isAuthenticated: true }),
    setUser: (user) => set({ user }),
    setMenus: (menus) => set({ menus }),

    hasPermission: (point) => {
      const { user } = get();
      return user?.permissions.includes(point) ?? false;
    },

    logout: () =>
      set({
        token: null,
        user: null,
        menus: [],
        isAuthenticated: false,
      }),
  }),
  {
    name: "auth-storage",
    partialize: (state) => ({
      token: state.token,
      isAuthenticated: state.isAuthenticated,
    }),
    merge: (persistedState, currentState) => {
      const p = persistedState as Partial<PersistedAuthState> | null;
      return {
        ...currentState,
        token: p?.token ?? currentState.token,
        isAuthenticated: p?.isAuthenticated ?? currentState.isAuthenticated,
        user: null,
        menus: [],
      };
    },
  },
);
