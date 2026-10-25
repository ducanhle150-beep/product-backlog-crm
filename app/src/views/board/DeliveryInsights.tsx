// Insights bên Bảng: số liệu delivery của team (velocity, burndown, tiến độ sprint). Backlog health nằm ở Product Backlog → Insights.
import { IconAlertTriangle, IconCircleCheck } from '@tabler/icons-react';
import { differenceInCalendarDays, format, isBefore, parseISO, startOfDay } from 'date-fns';
import type { Issue } from '../../data/types';
import { BOARD_STATUSES } from '../../data/meta';
import { useStore } from '../../store/useStore';
import { averageVelocity, points, sprintIssues } from '../../lib/metrics';
import { BurndownChart, VelocityChart } from '../../components/charts';
import { StatusIcon } from '../../components/ui/icons';
import { Progress } from '../../components/ui/primitives';
import { BarList } from '../backlog/InsightsView';
import '../backlog/insights.css';

type Level = 'good' | 'warn' | 'bad';
const LEVEL_COLOR: Record<Level, string> = { good: 'var(--success)', warn: '#f59e0b', bad: 'var(--danger-text)' };

export function DeliveryInsights({ go }: { go(path: string): void }) {
  const issues = useStore((s) => s.issues);
  const sprints = useStore((s) => s.sprints);
  const active = sprints.find((s) => s.state === 'active');
  const velocity = averageVelocity(sprints, issues);
  const items: Issue[] = active ? sprintIssues(active, issues) : [];
  const done = items.filter((i) => i.status === 'done');
  const committed = points(items);
  const remaining = committed - points(done);
  const daysLeft = active ? Math.max(0, differenceInCalendarDays(parseISO(active.endDate), new Date())) : 0;
  const added = active ? active.scopeChanges.filter((c) => c.delta > 0).reduce((a, c) => a + c.delta, 0) : 0;
  const reviewing = items.filter((i) => i.status === 'reviewing').length;
  const overdue = items.filter((i) => i.dueDate && i.status !== 'done' && isBefore(parseISO(i.dueDate), startOfDay(new Date())));

  const signals: { level: Level; text: string }[] = [];
  if (active && committed > velocity * 1.15) signals.push({ level: 'bad', text: `${active.name} commit ${committed} pt, vượt velocity TB ${velocity} pt — rủi ro carry-over lớn.` });
  if (reviewing > 4) signals.push({ level: 'warn', text: `${reviewing} issue kẹt ở REVIEWING — cân nhắc giới hạn WIP.` });
  if (overdue.length) signals.push({ level: 'warn', text: `${overdue.length} issue quá hạn: ${overdue.map((i) => i.key).join(', ')}.` });
  if (active && daysLeft > 0 && remaining / daysLeft > velocity / 10 * 1.5) signals.push({ level: 'warn', text: `Còn ${remaining} pt trong ${daysLeft} ngày — cần ~${Math.ceil(remaining / daysLeft)} pt/ngày, nhanh hơn nhịp thường (~${Math.round(velocity / 10)} pt/ngày).` });
  if (added) signals.push({ level: 'warn', text: `Scope tăng +${added} pt sau khi sprint bắt đầu.` });
  if (!signals.length) signals.push({ level: 'good', text: 'Sprint đang đúng nhịp.' });

  if (!active) {
    return (
      <div className="view-scroll">
        <div className="card" style={{ marginBottom: 14 }}>
          <div className="card__body">Không có sprint đang chạy. <button className="link-btn" onClick={() => go('backlog/sprint')}>Mở Sprint Planning →</button></div>
        </div>
        <div className="card"><div className="card__head">Velocity</div><div className="card__body"><VelocityChart sprints={sprints} issues={issues} /></div></div>
      </div>
    );
  }

  return (
    <div className="view-scroll insights">
      <div className="ins-head">
        <h2>{active.name}</h2>
        <span className="muted">{format(parseISO(active.startDate), 'MMM d')} – {format(parseISO(active.endDate), 'MMM d')} · 🎯 {active.goal}</span>
      </div>
      <div className="kpi-row">
        <div className="card kpi"><div className="muted small">Tiến độ</div><strong>{points(done)} / {committed} pt</strong><Progress value={(points(done) / Math.max(1, committed)) * 100} color="var(--success)" /></div>
        <div className="card kpi"><div className="muted small">Còn lại</div><strong>{daysLeft} ngày</strong><span className="muted small">{remaining} pt chưa xong</span></div>
        <div className="card kpi"><div className="muted small">Velocity TB (3 sprint)</div><strong>{velocity} pt</strong><span className="small" style={{ color: committed > velocity * 1.15 ? LEVEL_COLOR.bad : 'var(--text-3)' }}>Sprint này commit {committed} pt</span></div>
        <div className="card kpi"><div className="muted small">Scope change</div><strong>+{added} pt</strong><span className="muted small">thêm sau khi start</span></div>
        <div className="card kpi"><div className="muted small">Issue quá hạn</div><strong>{overdue.length}</strong><span className="muted small">trên {items.length} issue</span></div>
      </div>
      <div className="ins-grid">
        <div className="card">
          <div className="card__head">Burndown <span className="muted small">— ideal vs còn lại; Scope tăng khi thêm issue sau start</span></div>
          <div className="card__body"><BurndownChart sprint={active} issues={items} /></div>
        </div>
        <div className="card">
          <div className="card__head">Velocity <span className="muted small">— committed vs completed mỗi sprint</span></div>
          <div className="card__body"><VelocityChart sprints={sprints} issues={issues} /></div>
        </div>
        <div className="card">
          <div className="card__head">Issue theo trạng thái</div>
          <div className="card__body">
            <BarList rows={BOARD_STATUSES.map((s) => ({ label: s.name, value: items.filter((i) => i.status === s.id).length, color: s.color }))} />
            <div className="row small muted" style={{ gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
              {BOARD_STATUSES.map((s) => <span key={s.id} className="row" style={{ gap: 4 }}><StatusIcon status={s.id} />{points(items.filter((i) => i.status === s.id))} pt</span>)}
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card__head">Delivery signals</div>
          <div className="card__body">
            {signals.map((s, i) => (
              <div key={i} className="signal" style={{ borderLeftColor: LEVEL_COLOR[s.level] }}>
                {s.level === 'good' ? <IconCircleCheck size={15} color={LEVEL_COLOR.good} /> : <IconAlertTriangle size={15} color={LEVEL_COLOR[s.level]} />}
                <span>{s.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
