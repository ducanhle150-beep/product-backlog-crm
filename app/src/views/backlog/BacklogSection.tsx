import type { Icon } from '@tabler/icons-react';
import { IconBulb, IconChartBar, IconChecklist, IconListNumbers, IconListDetails, IconRun, IconSettings, IconSparkles } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { useStore } from '../../store/useStore';
import { FilterBar } from '../../components/shell/Toolbar';
import { ListView } from './ListView';
import './backlog.css';

export const SUBTABS: { id: string; name: string; icon: Icon; desc: string }[] = [
  { id: 'list', name: 'Danh sách', icon: IconListDetails, desc: 'Product backlog theo rank, sprint và epic' },
  { id: 'prioritize', name: 'Ưu tiên', icon: IconListNumbers, desc: 'Chấm điểm theo method, áp dụng thứ tự' },
  { id: 'grooming', name: 'Grooming', icon: IconSparkles, desc: 'Refinement session, DoR, INVEST, planning poker' },
  { id: 'sprint', name: 'Sprint Planning', icon: IconRun, desc: 'Capacity, velocity, sprint goal, carry-over' },
  { id: 'review', name: 'Review', icon: IconChecklist, desc: 'Backlog review, sprint review, retro' },
  { id: 'insights', name: 'Insights', icon: IconChartBar, desc: 'Velocity, burndown, DEEP, health' },
  { id: 'ideas', name: 'Ideas', icon: IconBulb, desc: 'Inbox & parking lot, intake gate' },
  { id: 'settings', name: 'Thiết lập', icon: IconSettings, desc: 'Vision, goals, DoR/DoD, method' },
];

export function BacklogSection({ tab, go, views }: { tab: string; go(p: string): void; views: Record<string, ReactNode> }) {
  const inbox = useStore((s) => s.ideas.filter((i) => i.status === 'inbox').length);
  const current = SUBTABS.find((t) => t.id === tab) ?? SUBTABS[0];
  return (
    <>
      <FilterBar />
      <nav className="subtabs">
        {SUBTABS.map((t) => {
          const I = t.icon;
          return (
            <button key={t.id} className={`subtab ${t.id === current.id ? 'is-active' : ''}`} onClick={() => go(`backlog/${t.id}`)} title={t.desc}>
              <I size={15} stroke={1.6} />
              {t.name}
              {t.id === 'ideas' && inbox > 0 && <span className="subtab__count">{inbox}</span>}
            </button>
          );
        })}
      </nav>
      <div className="backlog-body">
        {current.id === 'list' ? <ListView go={go} /> : views[current.id] ?? <div className="empty">Đang xây dựng…</div>}
      </div>
    </>
  );
}
