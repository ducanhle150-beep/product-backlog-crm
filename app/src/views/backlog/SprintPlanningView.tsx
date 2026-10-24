import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { IconAlertTriangle, IconArrowLeft, IconArrowRight, IconFlag, IconLock, IconPlayerPlay, IconPlus, IconTarget } from '@tabler/icons-react';
import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import type { Issue, Sprint } from '../../data/types';
import { MEMBERS } from '../../data/seed';
import { useStore } from '../../store/useStore';
import { useBacklogIssues, useScoring } from '../../store/hooks';
import { averageVelocity, points, sprintIssues } from '../../lib/metrics';
import { unresolvedBlockers } from '../../lib/readiness';
import { StatusIcon, TypeIcon } from '../../components/ui/icons';
import { Avatar, Badge, Button, Modal, Progress, memberById } from '../../components/ui/primitives';
import { BurndownChart } from '../../components/charts';
import { ReadyDot, ScoreBadge } from './BacklogRow';
import './sprint.css';

function ItemLine({ issue, action, warn }: { issue: Issue; action: ReactNode; warn?: string[] }) {
  const openIssue = useStore((s) => s.openIssue);
  const { ready } = useScoring();
  return (
    <div className="sp-item">
      <ReadyDot pct={ready(issue).pct} />
      <TypeIcon type={issue.type} />
      <span className="issue-key">{issue.key}</span>
      <button className="truncate grow" style={{ textAlign: 'left' }} onClick={() => openIssue(issue.id)}>{issue.title}</button>
      {warn && warn.length > 0 && <span className="sp-warn" title={warn.join('\n')}><IconAlertTriangle size={13} /></span>}
      <ScoreBadge issue={issue} />
      <span className="sp-pts">{issue.storyPoints ?? '–'}</span>
      <Avatar member={memberById(issue.assigneeId)} size={18} />
      {action}
    </div>
  );
}

function GoalBuilder({ sprint, items, capacity }: { sprint: Sprint; items: Issue[]; capacity: number }) {
  const updateSprint = useStore((s) => s.updateSprint);
  const [deliver, setDeliver] = useState('');
  const [so, setSo] = useState('');
  const compose = () =>
    updateSprint(sprint.id, {
      goal: `Mục tiêu là deliver ${deliver || '…'}. Để làm được, cần hoàn thành ${items.length} item. Capacity của team là ${capacity} pt. Vì vậy sprint này sẽ ${so || '…'}.`,
    });
  return (
    <div className="card">
      <div className="card__head"><IconTarget size={16} /> Sprint goal</div>
      <div className="card__body">
        <textarea className="textarea" rows={3} style={{ width: '100%' }} value={sprint.goal} placeholder="Một câu mô tả giá trị sprint mang lại" onChange={(e) => updateSprint(sprint.id, { goal: e.target.value })} />
        <div className="goal-tpl">
          <span>Mục tiêu là deliver</span><input className="input" value={deliver} onChange={(e) => setDeliver(e.target.value)} placeholder="email quota cho merchant" />
          <span>Cần</span><strong>{items.length} item</strong>
          <span>Capacity</span><strong>{capacity} pt</strong>
          <span>Vì vậy sẽ</span><input className="input" value={so} onChange={(e) => setSo(e.target.value)} placeholder="ưu tiên notification trước integrations" />
        </div>
        <Button size="sm" variant="ghost" onClick={compose}>Ghép thành sprint goal</Button>
      </div>
    </div>
  );
}

function CapacityCard({ sprint, items, velocity }: { sprint: Sprint; items: Issue[]; velocity: number }) {
  const updateSprint = useStore((s) => s.updateSprint);
  const assignees = [...new Set([...Object.keys(sprint.capacity), ...items.map((i) => i.assigneeId).filter((x): x is string => !!x)])];
  const [adding, setAdding] = useState('');
  const total = Object.values(sprint.capacity).reduce((a, b) => a + b, 0);
  const committed = points(items);
  const limit = total || velocity;
  return (
    <div className="card">
      <div className="card__head">Capacity & velocity</div>
      <div className="card__body">
        <div className="cap-summary">
          <div><div className="muted small">Committed</div><strong className={committed > limit ? 'over' : ''}>{committed} pt</strong></div>
          <div><div className="muted small">Capacity</div><strong>{total || '—'} pt</strong></div>
          <div><div className="muted small">Velocity TB 3 sprint</div><strong>{velocity} pt</strong></div>
        </div>
        <Progress value={(committed / Math.max(1, limit)) * 100} color={committed > limit ? 'var(--danger)' : 'var(--accent)'} height={6} />
        {committed > limit && <div className="warn"><IconAlertTriangle size={14} /> Vượt {committed - limit} pt so với {total ? 'capacity' : 'velocity'} — bỏ bớt item hoặc tách nhỏ.</div>}
        <table className="cap-table">
          <tbody>
            {assignees.map((id) => {
              const load = points(items.filter((i) => i.assigneeId === id));
              const cap = sprint.capacity[id] ?? 0;
              return (
                <tr key={id}>
                  <td><span className="row"><Avatar member={memberById(id)} size={18} /><span className="truncate small">{memberById(id)?.name}</span></span></td>
                  <td className={`small ${cap && load > cap ? 'over' : 'muted'}`}>{load} pt</td>
                  <td><input className="input" type="number" min={0} style={{ width: 60 }} value={cap || ''} placeholder="cap" onChange={(e) => updateSprint(sprint.id, { capacity: { ...sprint.capacity, [id]: Number(e.target.value) } })} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="row" style={{ marginTop: 6 }}>
          <select className="select grow" value={adding} onChange={(e) => setAdding(e.target.value)}>
            <option value="">+ Thêm thành viên…</option>
            {MEMBERS.filter((m) => !assignees.includes(m.id)).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <Button size="sm" disabled={!adding} onClick={() => { updateSprint(sprint.id, { capacity: { ...sprint.capacity, [adding]: 5 } }); setAdding(''); }}>Thêm</Button>
        </div>
      </div>
    </div>
  );
}

function CompleteDialog({ sprint, items, onClose }: { sprint: Sprint; items: Issue[]; onClose(): void }) {
  const completeSprint = useStore((s) => s.completeSprint);
  const unfinished = items.filter((i) => i.status !== 'done');
  const [carry, setCarry] = useState<Record<string, 'next' | 'backlog'>>(() => Object.fromEntries(unfinished.map((i) => [i.id, i.priority === 'low' ? 'backlog' : 'next'])));
  return (
    <Modal title={`Hoàn thành ${sprint.name}`} width={640} onClose={onClose}
      footer={<><Button variant="ghost" onClick={onClose}>Huỷ</Button><Button variant="primary" onClick={() => { completeSprint(sprint.id, carry); onClose(); }}>Hoàn thành sprint</Button></>}>
      <p style={{ marginTop: 0 }}>{items.length - unfinished.length}/{items.length} item done · {points(items.filter((i) => i.status === 'done'))}/{points(items)} pt.</p>
      <p className="muted small">Item chưa xong: nếu vẫn ưu tiên cao → sang sprint sau, ngược lại → trả về product backlog.</p>
      {unfinished.map((i) => (
        <div key={i.id} className="sp-item">
          <StatusIcon status={i.status} /><span className="issue-key">{i.key}</span><span className="truncate grow">{i.title}</span>
          <div className="seg seg--sm">
            <button className={carry[i.id] === 'next' ? 'is-active' : ''} onClick={() => setCarry({ ...carry, [i.id]: 'next' })}>Sprint sau</button>
            <button className={carry[i.id] === 'backlog' ? 'is-active' : ''} onClick={() => setCarry({ ...carry, [i.id]: 'backlog' })}>Backlog</button>
          </div>
        </div>
      ))}
    </Modal>
  );
}

function ActiveSprint({ sprint, items }: { sprint: Sprint; items: Issue[] }) {
  const [completing, setCompleting] = useState(false);
  const { byId } = useScoring();
  const done = items.filter((i) => i.status === 'done');
  const daysLeft = differenceInCalendarDays(parseISO(sprint.endDate), new Date());
  const added = sprint.scopeChanges.filter((c) => c.delta > 0);
  const byStatus = ['todo', 'doing', 'reviewing', 'retest', 'done'].map((s) => ({ s, n: items.filter((i) => i.status === s).length }));
  return (
    <div className="sp-active">
      <div className="sp-kpis">
        <div className="card kpi"><div className="muted small">Tiến độ</div><strong>{points(done)} / {points(items)} pt</strong><Progress value={(points(done) / Math.max(1, points(items))) * 100} color={SERIES_OK} /></div>
        <div className="card kpi"><div className="muted small">Còn lại</div><strong>{Math.max(0, daysLeft)} ngày</strong><span className="muted small">kết thúc {format(parseISO(sprint.endDate), 'MMM d')}</span></div>
        <div className="card kpi"><div className="muted small">Scope change</div><strong>+{points(added.map((c) => byId.get(c.issueId)!).filter(Boolean))} pt</strong><span className="muted small">{added.length} item thêm sau khi start</span></div>
        <div className="card kpi"><div className="muted small">Theo trạng thái</div><span className="row" style={{ gap: 10, flexWrap: 'wrap' }}>{byStatus.map(({ s, n }) => <span key={s} className="row small" style={{ gap: 4 }}><StatusIcon status={s as Issue['status']} />{n}</span>)}</span></div>
      </div>
      <div className="sp-two">
        <div className="card">
          <div className="card__head">Burndown <span className="muted small">— scope bị khoá khi sprint chạy; item thêm sau được tính là scope change</span></div>
          <div className="card__body"><BurndownChart sprint={sprint} issues={items} /></div>
        </div>
        <div className="card">
          <div className="card__head"><IconLock size={15} /> Sprint backlog · {items.length}<span className="grow" /><Button size="sm" variant="primary" icon={<IconFlag size={14} />} onClick={() => setCompleting(true)}>Hoàn thành sprint</Button></div>
          <div className="card__body sp-list">{items.map((i) => <ItemLine key={i.id} issue={i} action={<StatusIcon status={i.status} />} />)}</div>
        </div>
      </div>
      {completing && <CompleteDialog sprint={sprint} items={items} onClose={() => setCompleting(false)} />}
    </div>
  );
}
const SERIES_OK = 'var(--success)';

function PlannedSprint({ sprint, items }: { sprint: Sprint; items: Issue[] }) {
  const store = useStore();
  const backlog = useBacklogIssues();
  const { ready, byId } = useScoring();
  const velocity = averageVelocity(store.sprints, store.issues);
  const capacity = Object.values(sprint.capacity).reduce((a, b) => a + b, 0) || velocity;
  const hasActive = store.sprints.some((s) => s.state === 'active');
  const [readyFirst, setReadyFirst] = useState(true);

  const warnings = (i: Issue) => {
    const w: string[] = [];
    const r = ready(i);
    if (!r.ready) w.push(`Chưa đạt DoR: ${r.checks.filter((c) => !c.ok).map((c) => c.text).join('; ')}`);
    const blockers = unresolvedBlockers(i, byId).filter((b) => b.sprintId !== sprint.id || b.rank > i.rank);
    if (blockers.length) w.push(`Phụ thuộc chưa xong: ${blockers.map((b) => b.key).join(', ')}`);
    if ((i.storyPoints ?? 0) > 8) w.push('Quá lớn cho 1 sprint — nên tách');
    return w;
  };
  const candidates = useMemo(() => {
    const list = backlog.filter((i) => i.sprintId !== sprint.id);
    return readyFirst ? [...list].sort((a, b) => Number(ready(b).ready) - Number(ready(a).ready) || a.rank - b.rank) : list;
  }, [backlog, sprint.id, readyFirst, ready]);
  const sorted = [...items].sort((a, b) => a.rank - b.rank);
  const issuesWithWarnings = sorted.filter((i) => warnings(i).length);

  return (
    <div className="sp-plan">
      <div className="sp-plan__meta">
        <label className="field"><span>Tên</span><input className="input" value={sprint.name} onChange={(e) => store.updateSprint(sprint.id, { name: e.target.value })} /></label>
        <label className="field"><span>Bắt đầu</span><input className="input" type="date" value={sprint.startDate} onChange={(e) => store.updateSprint(sprint.id, { startDate: e.target.value })} /></label>
        <label className="field"><span>Kết thúc</span><input className="input" type="date" value={sprint.endDate} onChange={(e) => store.updateSprint(sprint.id, { endDate: e.target.value })} /></label>
        <span className="grow" />
        <Button variant="primary" icon={<IconPlayerPlay size={14} />} disabled={hasActive || !items.length} title={hasActive ? 'Đang có sprint chạy — hoàn thành sprint đó trước' : ''} onClick={() => store.startSprint(sprint.id)}>
          Start sprint
        </Button>
      </div>
      <div className="sp-plan__grid">
        <div className="sp-col">
          <GoalBuilder sprint={sprint} items={items} capacity={capacity} />
          <CapacityCard sprint={sprint} items={items} velocity={velocity} />
        </div>
        <div className="card sp-col--list">
          <div className="card__head">
            Product backlog · {candidates.length}
            <span className="grow" />
            <label className="row small muted" style={{ gap: 5 }}><input type="checkbox" checked={readyFirst} onChange={(e) => setReadyFirst(e.target.checked)} /> Ready lên đầu</label>
          </div>
          <div className="card__body sp-list">
            {candidates.map((i) => (
              <ItemLine key={i.id} issue={i} warn={warnings(i)} action={<button className="icon-btn" title="Đưa vào sprint" onClick={() => store.moveToSprint(i.id, sprint.id)}><IconArrowRight size={15} /></button>} />
            ))}
          </div>
        </div>
        <div className="card sp-col--list">
          <div className="card__head">{sprint.name} · {items.length} item · {points(items)}/{capacity} pt</div>
          <div className="card__body sp-list">
            {issuesWithWarnings.length > 0 && <div className="warn" style={{ marginTop: 0, marginBottom: 8 }}><IconAlertTriangle size={14} /> {issuesWithWarnings.length} item chưa sẵn sàng hoặc có dependency — hover ⚠ để xem.</div>}
            {sorted.map((i) => (
              <ItemLine key={i.id} issue={i} warn={warnings(i)} action={<button className="icon-btn" title="Trả về backlog" onClick={() => store.moveToSprint(i.id, undefined)}><IconArrowLeft size={15} /></button>} />
            ))}
            {!items.length && <div className="muted small" style={{ padding: 12 }}>Chọn item từ backlog (→). Top backlog thường là sprint tới.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

export function SprintPlanningView() {
  const sprints = useStore((s) => s.sprints);
  const issues = useStore((s) => s.issues);
  const createSprint = useStore((s) => s.createSprint);
  const ordered = [...sprints].sort((a, b) => a.startDate.localeCompare(b.startDate));
  const [selected, setSelected] = useState(() => (sprints.find((s) => s.state === 'planned') ?? sprints.find((s) => s.state === 'active') ?? ordered.at(-1))?.id);
  const sprint = sprints.find((s) => s.id === selected);
  const items = sprint ? sprintIssues(sprint, issues) : [];

  return (
    <div className="view-scroll">
      <div className="sp-tabs">
        {ordered.map((s) => (
          <button key={s.id} className={`sp-tab ${s.id === selected ? 'is-active' : ''}`} onClick={() => setSelected(s.id)}>
            <strong>{s.name.replace('FRA ', '')}</strong>
            <Badge color={s.state === 'active' ? '#4ade80' : s.state === 'planned' ? 'var(--accent-text)' : 'var(--text-3)'} bg={s.state === 'active' ? 'var(--success-soft)' : s.state === 'planned' ? 'var(--accent-soft)' : undefined}>
              {s.state === 'active' ? 'Đang chạy' : s.state === 'planned' ? 'Planned' : 'Done'}
            </Badge>
          </button>
        ))}
        <Button size="sm" variant="ghost" icon={<IconPlus size={14} />} onClick={() => setSelected(createSprint().id)}>Tạo sprint</Button>
      </div>
      {sprint && (
        <div className="sp-head">
          <h2>{sprint.name}</h2>
          <span className="muted">{format(parseISO(sprint.startDate), 'MMM d')} – {format(parseISO(sprint.endDate), 'MMM d, yyyy')}</span>
          {sprint.state !== 'planned' && sprint.goal && <span className="sp-goal">🎯 {sprint.goal}</span>}
        </div>
      )}
      {sprint?.state === 'active' && <ActiveSprint sprint={sprint} items={items} />}
      {sprint?.state === 'planned' && <PlannedSprint sprint={sprint} items={items} />}
      {sprint?.state === 'completed' && (
        <div className="card" style={{ maxWidth: 560 }}>
          <div className="card__body">
            <p style={{ marginTop: 0 }}>Committed <strong>{sprint.committedPoints ?? points(items)} pt</strong> · Completed <strong>{sprint.completedPoints ?? points(items.filter((i) => i.status === 'done'))} pt</strong></p>
            {items.map((i) => <ItemLine key={i.id} issue={i} action={<StatusIcon status={i.status} />} />)}
            <p className="muted small">Sprint review & retrospective ở tab Review.</p>
          </div>
        </div>
      )}
    </div>
  );
}
