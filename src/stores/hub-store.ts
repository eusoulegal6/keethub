import { create } from "zustand";

interface HubState {
  search: string;
  activeCategory: string | null;
  setSearch: (v: string) => void;
  setCategory: (v: string | null) => void;
}

export const useHubStore = create<HubState>((set) => ({
  search: "",
  activeCategory: null,
  setSearch: (search) => set({ search }),
  setCategory: (activeCategory) => set({ activeCategory }),
}));
