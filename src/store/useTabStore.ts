import { create } from 'zustand';

interface TabState {
  visibleTabs: string[]; // paths of tabs visible to other users
  setVisibleTabs: (tabs: string[]) => void;
  toggleTabVisibility: (path: string) => void;
}

const getInitialVisibleTabs = (): string[] => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('visible_tabs_for_others');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
  }
  // Default: all tabs are visible initially
  return ['/', '/operacao', '/capacidade', '/analise', '/analistas', '/salesforce', '/history'];
};

export const useTabStore = create<TabState>((set, get) => ({
  visibleTabs: getInitialVisibleTabs(),
  setVisibleTabs: (tabs) => {
    localStorage.setItem('visible_tabs_for_others', JSON.stringify(tabs));
    set({ visibleTabs: tabs });
  },
  toggleTabVisibility: (path) => {
    const current = get().visibleTabs;
    const next = current.includes(path)
      ? current.filter(p => p !== path)
      : [...current, path];
    get().setVisibleTabs(next);
  },
}));
