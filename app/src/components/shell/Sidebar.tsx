import { useState } from 'react';
import type { Icon } from '@tabler/icons-react';
import {
  IconApps, IconBuildingStore, IconCalendarTime, IconChevronDown, IconChevronRight, IconConfetti,
  IconDeviceDesktopAnalytics, IconHome, IconLayoutGrid, IconLayoutKanban, IconLayoutSidebarLeftCollapse,
  IconListDetails, IconListTree, IconMail, IconMessageCircle, IconProgressCheck, IconRun, IconSearch, IconSettings, IconTarget, IconUserShield,
} from '@tabler/icons-react';
import './shell.css';

interface Item { name: string; icon: Icon; color: string; suffix?: string; route?: string; chevron?: boolean }

const WORK_ITEMS: Item[] = [
  { name: 'Product Backlog', icon: IconListDetails, color: '#3b82f6', route: 'backlog/list' },
  { name: 'Bảng', icon: IconLayoutKanban, color: '#f0543c', route: 'board' },
  { name: 'Hôm nay', icon: IconLayoutGrid, color: '#3b82f6' },
  { name: 'Dự án', suffix: 'Dự án', icon: IconListTree, color: '#3b82f6' },
  { name: 'Sprint', suffix: 'Sprint', icon: IconRun, color: '#c9a26b', route: 'backlog/sprint' },
  { name: 'Ứng dụng', suffix: 'Ứng dụng', icon: IconApps, color: '#22c55e' },
  { name: 'Quyền truy cập app', suffix: 'Quyền truy cập app', icon: IconUserShield, color: '#05a2c2' },
  { name: 'Trạng thái issue', icon: IconProgressCheck, color: '#d6409f' },
];

const TOP: Item[] = [
  { name: 'Bảng điều khiển', icon: IconLayoutGrid, color: '#9a9a9a' },
  { name: 'BD Prospects', icon: IconTarget, color: '#f97316', chevron: true },
  { name: 'Hỗ trợ khách hàng', icon: IconBuildingStore, color: '#3e63dd', chevron: true },
];
const BOTTOM: Item[] = [
  { name: 'CS Shift', icon: IconCalendarTime, color: '#22c55e', chevron: true },
  { name: 'Email Marketing', icon: IconMail, color: '#f97316', chevron: true },
  { name: 'Team Moments', icon: IconConfetti, color: '#f97316', chevron: true },
  { name: 'Health Monitor', icon: IconDeviceDesktopAnalytics, color: '#3e63dd' },
  { name: 'Admin', icon: IconSettings, color: '#f97316', chevron: true },
];

export function Sidebar({ route, go }: { route: string[]; go(path: string): void }) {
  const [open, setOpen] = useState(true);
  const active = route[0] === 'board' ? 'Bảng' : route[0] === 'backlog' ? (route[1] === 'sprint' ? 'Sprint' : 'Product Backlog') : '';

  const row = (it: Item, nested = false) => {
    const I = it.icon;
    return (
      <button
        key={it.name}
        className={`nav-item ${nested ? 'nav-item--nested' : ''} ${nested && active === it.name ? 'is-active' : ''} ${!it.route && nested ? 'is-disabled' : ''}`}
        onClick={() => it.route && go(it.route)}
        title={!it.route && nested ? 'Ngoài phạm vi prototype' : undefined}
      >
        <I size={17} stroke={1.6} color={it.color} />
        <span className="truncate">
          {it.name}
          {it.suffix && <span className="nav-item__suffix"> · {it.suffix}</span>}
        </span>
        {it.chevron && <IconChevronRight size={14} className="nav-item__chev" />}
      </button>
    );
  };

  return (
    <aside className="sidebar">
      <div className="sidebar__ws">
        <span className="ws-badge">S</span>
        <span className="truncate grow">SAE Workspace</span>
        <IconChevronDown size={14} className="muted" />
        <IconSearch size={16} className="muted" />
        <IconLayoutSidebarLeftCollapse size={16} className="muted" />
      </div>
      <div className="sidebar__home">
        <span className="home-pill"><IconHome size={15} stroke={1.7} /> Trang chủ</span>
        <IconMessageCircle size={16} className="muted" />
        <IconSettings size={16} className="muted" />
      </div>
      <div className="sidebar__label">Workspace</div>
      {TOP.map((i) => row(i))}
      <button className="nav-item" onClick={() => setOpen(!open)}>
        <IconLayoutKanban size={17} stroke={1.6} color="#f97316" />
        <span className="truncate">Quản lý công việc</span>
        {open ? <IconChevronDown size={14} className="nav-item__chev" /> : <IconChevronRight size={14} className="nav-item__chev" />}
      </button>
      {open && <div className="nav-tree">{WORK_ITEMS.map((i) => row(i, true))}</div>}
      {BOTTOM.map((i) => row(i))}
      <div className="sidebar__foot muted small">Prototype · dữ liệu demo</div>
    </aside>
  );
}
