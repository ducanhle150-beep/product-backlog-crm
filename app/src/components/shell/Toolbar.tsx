import { IconAdjustmentsHorizontal, IconArrowsSort, IconBell, IconChevronDown, IconDotsVertical, IconFilter, IconLayoutSidebar, IconPlus, IconSearch } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { MEMBERS } from '../../data/seed';
import { useStore } from '../../store/useStore';
import { useUi } from '../../store/ui';
import { AvatarStack, Button } from '../ui/primitives';

export function PageHeader({ title, icon }: { title: string; icon: ReactNode }) {
  return (
    <header className="page-header">
      <span className="row">{icon}<strong>{title}</strong></span>
      <button className="icon-btn icon-btn--bordered" aria-label="Thêm"><IconDotsVertical size={15} /></button>
    </header>
  );
}

export function ProjectToolbar({ go, tabs, onNewIssue }: { go(path: string): void; tabs?: ReactNode; onNewIssue(): void }) {
  const { query, setQuery } = useUi();
  const inboxCount = useStore((s) => s.ideas.filter((i) => i.status === 'inbox').length);
  return (
    <div className="project-toolbar">
      <button className="project-switch">
        <span className="project-badge">FRA</span>
        <strong>MIDA Fraud Feature</strong>
        <IconChevronDown size={14} className="muted" />
      </button>
      {tabs}
      <label className="search">
        <IconSearch size={15} className="muted" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm issue theo mã hoặc tiêu đề..." />
      </label>
      <div className="grow" />
      <button className="icon-btn bell" onClick={() => go('backlog/ideas')} title="Ideas inbox">
        <IconBell size={17} stroke={1.6} />
        {inboxCount > 0 && <span className="bell__count">{inboxCount}</span>}
      </button>
      <Button variant="primary" icon={<IconPlus size={15} />} onClick={onNewIssue}>New issue</Button>
    </div>
  );
}

const FRAUD_MEMBERS = MEMBERS.map((m) => m.id);

export function FilterBar({ right }: { right?: ReactNode }) {
  const { onlyMine, toggleMine } = useUi();
  return (
    <div className="filter-bar">
      <button className="icon-btn"><IconLayoutSidebar size={16} stroke={1.6} /></button>
      <button className="filter-btn"><IconFilter size={15} stroke={1.6} /> Filter</button>
      <button className={`pill ${onlyMine ? 'is-on' : ''}`} onClick={toggleMine}>Only mine</button>
      <AvatarStack ids={FRAUD_MEMBERS} />
      <div className="grow" />
      {right}
    </div>
  );
}

export function BoardFilterRight({ done, total }: { done: number; total: number }) {
  return (
    <span className="row" style={{ gap: 16 }}>
      <span className="muted">{done} of {total} done</span>
      <button className="filter-btn"><IconArrowsSort size={15} stroke={1.6} /> Sắp xếp</button>
      <button className="filter-btn"><IconAdjustmentsHorizontal size={15} stroke={1.6} /> Display</button>
    </span>
  );
}
