// Menu Filter giống CRM gốc: chọn nhóm (Người được giao / Ưu tiên / Loại / Epic) → danh sách con, chọn nhiều.
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { IconCheck, IconChevronLeft, IconChevronRight, IconFilter, IconFlag, IconSquareCheck, IconStack2, IconUserCircle } from '@tabler/icons-react';
import type { Icon } from '@tabler/icons-react';
import type { IssueType, Priority } from '../../data/types';
import { MEMBERS } from '../../data/seed';
import { PRIORITIES, TYPES } from '../../data/meta';
import { useStore } from '../../store/useStore';
import { useUi } from '../../store/ui';
import type { FilterKey } from '../../store/ui';
import { PriorityIcon, TypeIcon } from '../ui/icons';
import { Avatar } from '../ui/primitives';
import './filter.css';

interface Option {
  value: string;
  label: string;
  icon: ReactNode;
}

const GROUPS: { key: FilterKey; name: string; icon: Icon }[] = [
  { key: 'assignee', name: 'Người được giao', icon: IconUserCircle },
  { key: 'priority', name: 'Ưu tiên', icon: IconFlag },
  { key: 'type', name: 'Loại', icon: IconSquareCheck },
  { key: 'epic', name: 'Epic', icon: IconStack2 },
];

export function FilterMenu() {
  const { filters, toggleFilter, clearFilters } = useUi();
  const epics = useStore((s) => s.epics);
  const [open, setOpen] = useState(false);
  const [group, setGroup] = useState<FilterKey | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const active = Object.values(filters).reduce((n, v) => n + v.length, 0);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) { setOpen(false); setGroup(null); } };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const options: Record<FilterKey, Option[]> = {
    assignee: [
      { value: '', label: 'Chưa giao', icon: <Avatar size={16} /> },
      ...MEMBERS.map((m) => ({ value: m.id, label: m.name, icon: <Avatar member={m} size={16} /> })),
    ],
    priority: (Object.keys(PRIORITIES) as Priority[]).map((p) => ({ value: p, label: PRIORITIES[p].name, icon: <PriorityIcon priority={p} /> })),
    type: (Object.keys(TYPES) as IssueType[]).filter((t) => t !== 'epic').map((t) => ({ value: t, label: TYPES[t].name, icon: <TypeIcon type={t} /> })),
    epic: [
      { value: '', label: 'Không thuộc epic nào', icon: <span className="fm__swatch fm__swatch--none" /> },
      ...epics.map((e) => ({ value: e.id, label: e.name, icon: <span className="fm__swatch" style={{ background: e.color }} /> })),
    ],
  };
  const current = GROUPS.find((g) => g.key === group);

  return (
    <div className="fm" ref={ref}>
      <button className={`filter-btn ${open ? 'is-open' : ''} ${active ? 'is-active' : ''}`} onClick={() => { setOpen(!open); setGroup(null); }}>
        <IconFilter size={15} stroke={1.6} /> Filter{active > 0 && <span className="fm__count">{active}</span>}
      </button>
      {open && (
        <div className="fm__pop">
          {!current ? (
            <>
              {GROUPS.map((g) => {
                const I = g.icon;
                const n = filters[g.key].length;
                return (
                  <button key={g.key} className="fm__item" onClick={() => setGroup(g.key)}>
                    <I size={17} stroke={1.6} className="muted" />
                    <span className="grow">{g.name}</span>
                    {n > 0 && <span className="fm__count">{n}</span>}
                    <IconChevronRight size={15} className="muted" />
                  </button>
                );
              })}
              {active > 0 && (
                <button className="fm__clear" onClick={() => clearFilters()}>Xoá tất cả filter</button>
              )}
            </>
          ) : (
            <>
              <button className="fm__back" onClick={() => setGroup(null)}>
                <IconChevronLeft size={15} /> <strong>{current.name}</strong>
              </button>
              <div className="fm__list">
                {options[current.key].map((o) => {
                  const on = filters[current.key].includes(o.value);
                  return (
                    <button key={o.value || 'none'} className={`fm__item ${on ? 'is-on' : ''}`} onClick={() => toggleFilter(current.key, o.value)}>
                      {o.icon}
                      <span className="grow truncate">{o.label}</span>
                      {on && <IconCheck size={15} className="fm__check" />}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
