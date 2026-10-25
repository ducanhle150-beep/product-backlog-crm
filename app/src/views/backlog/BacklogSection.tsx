import type { Icon } from '@tabler/icons-react';
import { IconBulb, IconChartBar, IconListNumbers, IconListDetails, IconRun, IconSettings } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { useStore } from '../../store/useStore';
import { FilterBar } from '../../components/shell/Toolbar';
import { ListView } from './ListView';
import './backlog.css';

export const SUBTABS: { id: string; name: string; icon: Icon; desc: string; secondary?: boolean }[] = [
  { id: 'list', name: 'Danh sách', icon: IconListDetails, desc: 'Product backlog theo rank, sprint, epic + chế độ Refinement' },
  { id: 'prioritize', name: 'Ưu tiên', icon: IconListNumbers, desc: 'Chấm điểm theo method, áp dụng thứ tự' },
  { id: 'sprint', name: 'Sprint Planning', icon: IconRun, desc: 'Sprint goal, committed vs velocity — Start sprint đẩy item sang Bảng' },
  { id: 'ideas', name: 'Ideas', icon: IconBulb, desc: 'Danh sách ý tưởng trước khi vào backlog' },
  { id: 'insights', name: 'Insights', icon: IconChartBar, desc: 'Backlog health, DEEP, phân bổ (velocity/burndown ở Bảng)' },
  { id: 'settings', name: 'Thiết lập', icon: IconSettings, desc: 'Strategic goals, DoR/DoD, method', secondary: true },
];

export function BacklogSection({ tab, go, views }: { tab: string; go(p: string): void; views: Record<string, ReactNode> }) {
  const inbox = useStore((s) => s.ideas.filter((i) => i.status === 'inbox' || i.status === 'parking').length);
  const current = SUBTABS.find((t) => t.id === tab) ?? SUBTABS[0];
  return (
    <>
      <FilterBar />
      <nav className="subtabs">
        {SUBTABS.map((t, idx) => {
          const I = t.icon;
          return (
            <button key={t.id} className={`subtab ${t.id === current.id ? 'is-active' : ''} ${t.secondary ? 'subtab--secondary' : ''} ${t.secondary && !SUBTABS[idx - 1]?.secondary ? 'subtab--push' : ''}`} onClick={() => go(`backlog/${t.id}`)} title={t.desc}>
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
