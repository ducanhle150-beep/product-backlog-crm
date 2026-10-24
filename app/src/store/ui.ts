import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { ME } from '../data/seed';
import type { Issue } from '../data/types';

/** State UI không lưu: search, filter. */
interface Ui {
  query: string;
  onlyMine: boolean;
  memberFilter: string[];
  setQuery(q: string): void;
  toggleMine(): void;
  toggleMember(id: string): void;
}

export const useUi = create<Ui>()((set) => ({
  query: '',
  onlyMine: false,
  memberFilter: [],
  setQuery: (query) => set({ query }),
  toggleMine: () => set((s) => ({ onlyMine: !s.onlyMine })),
  toggleMember: (id) => set((s) => ({ memberFilter: s.memberFilter.includes(id) ? s.memberFilter.filter((m) => m !== id) : [...s.memberFilter, id] })),
}));

export function useIssueFilter() {
  const { query, onlyMine, memberFilter } = useUi();
  const q = query.trim().toLowerCase();
  return (i: Issue) => {
    if (i.archived) return false;
    if (q && !i.key.toLowerCase().includes(q) && !i.title.toLowerCase().includes(q)) return false;
    if (onlyMine && i.assigneeId !== ME) return false;
    if (memberFilter.length && !memberFilter.includes(i.assigneeId ?? '')) return false;
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
