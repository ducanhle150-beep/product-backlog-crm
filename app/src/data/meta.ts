import type { BugSeverity, IssueType, Priority, Source, StatusId } from './types';

export const STATUSES: { id: StatusId; name: string; color: string }[] = [
  { id: 'backlog', name: 'Backlog', color: 'var(--st-backlog)' },
  { id: 'planned', name: 'PLANNED', color: 'var(--st-planned)' },
  { id: 'todo', name: 'TO DO', color: 'var(--st-todo)' },
  { id: 'doing', name: 'DOING', color: 'var(--st-doing)' },
  { id: 'reviewing', name: 'REVIEWING', color: 'var(--st-reviewing)' },
  { id: 'retest', name: 'RETEST', color: 'var(--st-retest)' },
  { id: 'done', name: 'DONE', color: 'var(--st-done)' },
];
/** Cột trên Bảng (Kanban) — chỉ task, không có cột Backlog. */
export const BOARD_STATUSES = STATUSES.filter((s) => s.id !== 'backlog');
export const statusName = (id: StatusId) => STATUSES.find((s) => s.id === id)!.name;

export const TYPES: Record<IssueType, { name: string; color: string }> = {
  epic: { name: 'Epic', color: '#8b5cf6' },
  story: { name: 'Story', color: '#22c55e' },
  task: { name: 'Task', color: '#3b82f6' },
  bug: { name: 'Bug', color: '#e5484d' },
  spike: { name: 'Spike', color: '#f59e0b' },
  techdebt: { name: 'Tech debt', color: '#8a8a8a' },
  improvement: { name: 'Improvement', color: '#05a2c2' },
};

export const PRIORITIES: Record<Priority, { name: string; color: string }> = {
  urgent: { name: 'Urgent', color: '#e5484d' },
  high: { name: 'High', color: '#f0543c' },
  medium: { name: 'Medium', color: '#f97316' },
  low: { name: 'Low', color: '#8a8a8a' },
};

export const SEVERITY: Record<BugSeverity, { name: string; desc: string; color: string }> = {
  critical: { name: 'Critical', desc: 'Mất dữ liệu / merchant không đạt được mục tiêu đã mua app — sửa ngay, không chờ backlog.', color: '#e5484d' },
  important: { name: 'Important', desc: 'Cản trở quy trình, app không mang lại giá trị như kỳ vọng — sửa trong 1–2 sprint.', color: '#f97316' },
  minor: { name: 'Less critical', desc: 'Khác dự định nhưng có workaround — có thể không sửa ngay.', color: '#8a8a8a' },
};

export const SOURCES: Record<Source, string> = {
  paying: 'Merchant trả phí',
  trial: 'Free / trial user',
  lead: 'Lead / prospect',
  internal: 'Product team / nội bộ',
  investor: 'Investor / BOD',
  support: 'CS / Support',
};
