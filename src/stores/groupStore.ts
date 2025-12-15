import { create } from 'zustand';

interface Group {
  id: string;
  name: string;
  description: string | null;
  invite_code: string;
  created_by: string;
  created_at: string;
}

interface GroupMember {
  id: string;
  user_id: string;
  group_id: string;
  role: 'admin' | 'member';
  joined_at: string;
  profile?: {
    name: string;
    email: string;
    avatar_url: string | null;
  };
}

interface GroupState {
  groups: Group[];
  activeGroup: Group | null;
  members: GroupMember[];
  setGroups: (groups: Group[]) => void;
  setActiveGroup: (group: Group | null) => void;
  setMembers: (members: GroupMember[]) => void;
  addGroup: (group: Group) => void;
  removeGroup: (groupId: string) => void;
}

export const useGroupStore = create<GroupState>((set) => ({
  groups: [],
  activeGroup: null,
  members: [],
  setGroups: (groups) => set({ groups }),
  setActiveGroup: (activeGroup) => set({ activeGroup }),
  setMembers: (members) => set({ members }),
  addGroup: (group) => set((state) => ({ groups: [...state.groups, group] })),
  removeGroup: (groupId) => set((state) => ({ 
    groups: state.groups.filter(g => g.id !== groupId) 
  })),
}));