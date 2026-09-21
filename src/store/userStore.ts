import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createGuestUser } from "@/services/authService";

type TYPE_USER_STATE = {
  userId: string | null;
  username: string | null;
  isLoading: boolean;
  error: string | null;
  hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
  fetchGuestUser: () => Promise<void>;
};

export const useUserStore = create<TYPE_USER_STATE>()(
  persist(
    (set, get) => ({
      userId: null,
      username: null,
      isLoading: false,
      error: null,
      hasHydrated: false,

      setHasHydrated: (value) => set({ hasHydrated: value }),

      fetchGuestUser: async () => {
        // Already have a guest user (from a previous session or an earlier
        // call this session) — don't create a new one.
        if (get().userId) return;

        set({ isLoading: true, error: null });

        try {
          const res = await createGuestUser();
          set({
            userId: res?.data?.id,
            username: res?.data?.username,
            isLoading: false,
          });
        } catch (error) {
          console.error(error);
          set({ error: "Failed to create guest user", isLoading: false });
        }
      },
    }),
    {
      name: "guest-user-storage",
      partialize: (state) => ({
        userId: state.userId,
        username: state.username,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
