import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface WorkspaceState {
  activeOrgId: string | null;
  setActiveOrg: (id: string) => void;
  clearActiveOrg: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      activeOrgId: null,
      setActiveOrg: (id) => set({ activeOrgId: id }),
      clearActiveOrg: () => set({ activeOrgId: null }),
    }),
    { name: 'workspace-storage' },
  ),
);
