import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { ME } from '../data/seed';
import type { Issue } from '../data/types';

/** Nhóm filter trong menu Filter. '' = "chưa giao" / "không thuộc epic nào". */
export type FilterKey = 'assignee' | 'priority' | 'type' | 'epic';
export type Filters = Record<FilterKey, string[]>;
const EMPTY_FILTERS: Filters = { assignee: [], priority: [], type: [], epic: [] };

/** State UI không lưu: search, filter. */
interface Ui {
  filters: Filters;
  toggleFilter(key: FilterKey, value: string): void;
  clearFilters(): void;
  query: string;
  onlyMine: boolean;
  memberFilter: string[];
  /** id trong useHealthFilters — Danh sách chỉ hiện item thuộc nhóm này. */
  healthFilter: string | null;
  setHealthFilter(id: string | null): void;
  setQuery(q: string): void;
  toggleMine(): void;
  toggleMember(id: string): void;
}

export const useUi = create<Ui>()((set) => ({
  filters: EMPTY_FILTERS,
  toggleFilter: (key, value) =>
    set((s) => {
      const cur = s.filters[key];
      return { filters: { ...s.filters, [key]: cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value] } };
    }),
  clearFilters: () => set({ filters: EMPTY_FILTERS }),
  query: '',
  onlyMine: false,
  memberFilter: [],
  healthFilter: null,
  setHealthFilter: (healthFilter) => set({ healthFilter }),
  setQuery: (query) => set({ query }),
  toggleMine: () => set((s) => ({ onlyMine: !s.onlyMine })),
  toggleMember: (id) => set((s) => ({ memberFilter: s.memberFilter.includes(id) ? s.memberFilter.filter((m) => m !== id) : [...s.memberFilter, id] })),
}));

export function useIssueFilter() {
  const { query, onlyMine, memberFilter, filters: f } = useUi();
  const q = query.trim().toLowerCase();
  return (i: Issue) => {
    if (i.archived) return false;
    if (q && !i.key.toLowerCase().includes(q) && !i.title.toLowerCase().includes(q)) return false;
    if (onlyMine && i.assigneeId !== ME) return false;
    if (memberFilter.length && !memberFilter.includes(i.assigneeId ?? '')) return false;
    if (f.assignee.length && !f.assignee.includes(i.assigneeId ?? '')) return false;
    if (f.priority.length && !f.priority.includes(i.priority)) return false;
    if (f.type.length && !f.type.includes(i.type)) return false;
    if (f.epic.length && !f.epic.includes(i.epicId ?? '')) return false;
    return true;
  };
}

/** Router hash tối giản: #/board, #/backlog/<tab>. */
export function useHashRoute(): [string[], (path: string) => void] {
  const read = () => (window.location.hash.replace(/^#\/?/, '') || 'backlog/list').split('/');
  const [parts, setParts] = useState(read);
  useEffect(() => {
    const on = () => setParts(read());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return [parts, (path) => { window.location.hash = `/${path}`; }];
}
